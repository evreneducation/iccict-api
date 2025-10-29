import { prisma } from "../config/db.js";
import {
  sendReviewerExpressionStatusEmail,
  sendReviewerExpressionAdminNotification,
} from "../services/emailService.js";
import emailQueue from "../services/emailQueue.js";
import logger from "../config/logger.js";

/* ------------------------- helpers ------------------------- */

/**
 * Accepts:
 *  - array: ["a","b"]
 *  - JSON string: '["a","b"]'
 *  - CSV string:  "a, b"
 *  - scalar: "a"
 * Returns: array<string>
 */
function parseSmartArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((s) => `${s}`.trim()).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (
      (s.startsWith("[") && s.endsWith("]")) ||
      (s.startsWith("{") && s.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed))
          return parsed.map((x) => `${x}`.trim()).filter(Boolean);
      } catch (_) {
        /* ignore */
      }
    }
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

/** read body from multipart (prefers `req.body.data` JSON if present) */
function extractBodyFromMultipart(req) {
  if (req.body && typeof req.body.data === "string") {
    try {
      return JSON.parse(req.body.data);
    } catch {
      throw new Error('Invalid JSON in "data" field');
    }
  }
  return req.body || {};
}

/* ------------------------- controllers ------------------------- */

/**
 * POST /api/reviewer-expression
 * Public endpoint (multipart/form-data):
 *   - Either send individual text fields, OR a single text field `data` with JSON
 *   - File field: cvFile (pdf/docx) -> Cloudinary folder 'cv_reviewer_expression'
 */
export const createReviewerExpression = async (req, res) => {
  const startTime = Date.now();

  try {
    logger.info("Reviewer expression submission started", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    const {
      name,
      email,
      phone,
      currentJobTitle,
      institution,
      education,
      subjectArea,
      methodologicalExpertise,
      researchInterest,
      previousPeerReviewExperience,
      conflictOfInterest,
      cvUrl, // Now expecting URL instead of file
      rolePreference,
    } = req.body;

    if (!name || !currentJobTitle || !institution) {
      logger.warn(
        "Reviewer expression submission failed - missing required fields",
        {
          missingFields: {
            name: !name,
            currentJobTitle: !currentJobTitle,
            institution: !institution,
          },
          ip: req.ip,
        }
      );

      return res.status(400).json({
        success: false,
        message: "name, currentJobTitle and institution are required",
      });
    }

    // normalize role
    function normalizeRolePreference(v) {
      if (!v) return "Reviewer";
      const s = String(v).trim().toLowerCase();
      if (s === "reviewer") return "Reviewer";
      if (s === "session chair" || s === "sessionchair") return "SessionChair";
      return "Reviewer";
    }
    const role = normalizeRolePreference(rolePreference);

    // optional: validate
    const VALID_ROLES = ["Reviewer", "SessionChair"];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid rolePreference. Valid: Reviewer, Session Chair",
      });
    }

    const payload = {
      name,
      email,
      phone,
      currentJobTitle,
      institution,
      education: parseSmartArray(education),
      subjectArea: parseSmartArray(subjectArea),
      methodologicalExpertise: parseSmartArray(methodologicalExpertise),
      researchInterest: parseSmartArray(researchInterest),
      previousPeerReviewExperience: previousPeerReviewExperience || null,
      conflictOfInterest: conflictOfInterest || null,
      cvUrl: cvUrl || null, // Now using URL directly
      status: "PENDING",
      rolePreference: role,
    };

    const created = await prisma.ReviewerExpression.create({ data: payload });

    const processingTime = Date.now() - startTime;

    logger.info("Reviewer expression submission successful", {
      id: created.id,
      email: created.email,
      processingTime: `${processingTime}ms`,
    });

    // Queue admin notification email (non-blocking)
    await emailQueue.addEmail(
      {
        to: created.email,
        from: process.env.BREVO_FROM_EMAIL,
        fromName: "ICCICT 2026",
        subject: `New Reviewer Expression: ${created.name}`,
        html: await sendReviewerExpressionAdminNotification(created),
      },
      "normal"
    );

    res.status(201).json({
      success: true,
      message: "Reviewer expression submitted successfully",
      data: created,
    });
  } catch (error) {
    logger.error("Reviewer expression submission error", {
      error: error.message,
      email: req.body?.email,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error submitting reviewer expression",
      error: error.message,
    });
  }
};

/**
 * GET /api/reviewer-expression/:id
 * Super Admin only
 */
export const getReviewerExpressionById = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await prisma.ReviewerExpression.findUnique({ where: { id } });
    if (!row)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: row });
  } catch (error) {
    logger.error("Error retrieving reviewer expression by ID", {
      error: error.message,
      id: req.params.id,
    });

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateReviewerExpressionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID = ["PENDING", "ACCEPTED", "REJECTED"];
    if (!VALID.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    // We need existing data to sync on ACCEPTED
    const existing = await prisma.ReviewerExpression.findUnique({
      where: { id },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Reviewer record not found" });
    }

    // subjectArea (Json) -> string for ReviewingCommittee.expertise
    const toExpertiseString = (v) => {
      if (Array.isArray(v)) return v.filter(Boolean).join(", ");
      if (typeof v === "string") return v.trim();
      if (v && typeof v === "object")
        return Object.values(v).filter(Boolean).join(", ");
      return "";
    };

    // NEW: define normPhone used below
    const normPhone = (p) => (p == null ? null : String(p).trim() || null);

    const adminId = req.admin?.id; // set by requireSuperAdmin
    if (status === "ACCEPTED" && !adminId) {
      return res.status(500).json({
        success: false,
        message: "Admin context missing (createdBy required)",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Update ReviewerExpression status
      const updated = await tx.ReviewerExpression.update({
        where: { id },
        data: { status },
      });

      // 2) If ACCEPTED, upsert into ReviewingCommittee using email as unique key
      const isReviewer = (existing.rolePreference || "Reviewer") === "Reviewer";
      let committee = null;
      if (status === "ACCEPTED" && isReviewer) {
        const email = (existing.email || "").trim();
        if (email) {
          committee = await tx.reviewingCommittee.upsert({
            where: { email }, // @unique on ReviewingCommittee.email
            create: {
              name: existing.name,
              email,
              designation: existing.currentJobTitle,
              institution: existing.institution,
              expertise: toExpertiseString(existing.subjectArea),
              phone: normPhone(existing.phone), // ← now defined
              isActive: true,
              createdBy: adminId,
            },
            update: {
              name: existing.name,
              designation: existing.currentJobTitle,
              institution: existing.institution,
              expertise: toExpertiseString(existing.subjectArea),
              phone: normPhone(existing.phone), // ← now defined
              isActive: true,
            },
          });
        }
      }

      return { updated, committee };
    });

    // Queue status notification email (non-blocking)
    try {
      await emailQueue.addEmail(
        {
          to: existing.email,
          from: process.env.BREVO_FROM_EMAIL,
          fromName: "ICCICT 2026",
          subject: `Reviewer Expression Status Update - ${status}`,
          html: await sendReviewerExpressionStatusEmail(existing, status),
        },
        "normal"
      );

      logger.info("Reviewer expression status notification queued", {
        email: existing.email,
        status,
      });
    } catch (emailError) {
      logger.error("Failed to queue reviewer expression status notification", {
        error: emailError.message,
        email: existing.email,
        status,
      });
    }

    logger.info("Reviewer expression status updated", {
      id,
      status,
      email: existing.email,
    });

    return res.json({
      success: true,
      message: "Status updated",
      data: result.updated,
      syncedToCommittee: Boolean(result.committee),
      committeeRecord: result.committee
        ? {
            id: result.committee.id,
            name: result.committee.name,
            email: result.committee.email,
            designation: result.committee.designation,
            institution: result.committee.institution,
            expertise: result.committee.expertise,
            isActive: result.committee.isActive,
            createdBy: result.committee.createdBy,
            createdAt: result.committee.createdAt,
            updatedAt: result.committee.updatedAt,
          }
        : null,
    });
  } catch (error) {
    logger.error("Error updating reviewer expression status", {
      error: error.message,
      id: req.params.id,
      status: req.body.status,
    });

    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Reviewer record not found" });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/reviewer-expression/:id
 * Super Admin only
 */
export const deleteReviewerExpression = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.ReviewerExpression.delete({ where: { id } });

    logger.info("Reviewer expression deleted", {
      id,
    });

    return res.json({ success: true, message: "Reviewer record deleted" });
  } catch (error) {
    logger.error("Error deleting reviewer expression", {
      error: error.message,
      id: req.params.id,
    });

    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllFormFilled = async (req, res) => {
  try {
    const rows = await prisma.ReviewerExpression.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    logger.error("Error retrieving all reviewer expressions", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ success: false, message: "Server error" });
  }
};
