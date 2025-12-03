import { prisma } from "../config/db.js";
import { sendSpeakerRegistrationEmail } from "../services/emailService.js";
import cloudinary from "../config/cloudinary.js";

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-]{8,}$/;
  return phoneRegex.test(phone);
};

const validateOrcid = (orcid) => {
  if (!orcid) return true; // Optional field
  const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
  return orcidRegex.test(orcid);
};

// -------------------------------------------
// PAPER ID HELPERS (GLOBAL, NEVER RESETS)
// Format: YYMM + global serial (3 digits)
// e.g. 2509011 for 2025 Sep, global #11
// -------------------------------------------
const SERIAL_PAD = 3;

function formatPaperId(date, seq, pad = SERIAL_PAD) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const s = String(seq).padStart(pad, "0");
  return `111_${yy}${mm}${s}`;
}

/**
 * Get the next global serial number by looking at the current
 * maximum serial used in paperId (SUBSTRING from 5th char onward).
 * If query fails (or no rows), fallback to count-based.
 */
async function getNextGlobalSerial() {
  try {
    // Works on MySQL: paperId like 'YYMMSSS' → serial is SUBSTRING from 5
    const rows = await prisma.$queryRawUnsafe(`
      SELECT MAX(CAST(SUBSTRING(paperId, 5) AS UNSIGNED)) AS maxSerial
      FROM speaker
      WHERE paperId IS NOT NULL
    `);
    const maxSerial = Number(rows?.[0]?.maxSerial) || 0;
    return maxSerial + 1;
  } catch (err) {
    // Fallback if raw query not available
    const c = await prisma.speaker.count({ where: { paperId: { not: null } } });
    return c + 1;
  }
}

// --------------------------
// CONTROLLERS
// --------------------------
export const registerSpeaker = async (req, res) => {
  try {
    const speakerData = req.body;

    // --------------------------
    // Handle file uploads (yours)
    // --------------------------
    const paperFileUrl = speakerData.paperFileUrl || null;
    const supplementaryFileUrl = speakerData.supplementaryFileUrl || null;
    const paperDocxUrl = speakerData.paperDocxUrl || null;
    const zipFolderUrl = speakerData.zipFolderUrl || null;
    const sourceCodeFileUrl = speakerData.sourceCodeFileUrl || null;

    // Biography validation
    if (speakerData.authorBiography) {
      const bioWords = speakerData.authorBiography.trim().split(/\s+/);
      if (bioWords.length < 50 || bioWords.length > 200) {
        return res.status(400).json({
          message: "Author biography must be between 50 and 200 words",
          success: false,
        });
      }
    }

    // ---------------------------------
    // Referral code → find Admin (yours)
    // ---------------------------------
    const rawReferral =
      typeof speakerData.referralCode === "string"
        ? speakerData.referralCode.trim()
        : "";
    const referralCode =
      rawReferral &&
      rawReferral.toLowerCase() !== "null" &&
      rawReferral.toLowerCase() !== "undefined"
        ? rawReferral
        : "";

    let referredById = null;
    if (referralCode.length > 0) {
      const admin = await prisma.Admin.findUnique({
        where: { referralCode },
      });

      if (!admin) {
        return res.status(400).json({
          message: "Invalid referral code",
          success: false,
        });
      }
      referredById = admin.id;
    }

    // ----------------------------
    // Required fields (your logic)
    // ----------------------------
    const requiredFields = [
      "conferenceTitle",
      "placeDate",
      "paperTitle",
      "paperAbstract",
      "keywords",
      "name",
      "email",
      "phone",
      "institutionName",
      "country",
      "primarySubject",
      "ethicsCompliance",
      "agreeTerms",
      "agreePresentation",
      "agreePublication",
      "agreeReview",
      "agreeDataSharing",
    ];

    const missingFields = requiredFields.filter((field) => {
      if (field === "ethicsCompliance" || field.startsWith("agree")) {
        return !speakerData[field] || speakerData[field] !== "true";
      }
      return !speakerData[field];
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
        success: false,
      });
    }

    // ---------------------------
    // Field validations (yours)
    // ---------------------------
    if (!validateEmail(speakerData.email)) {
      return res
        .status(400)
        .json({ message: "Invalid email format", success: false });
    }

    if (!validatePhone(speakerData.phone)) {
      return res
        .status(400)
        .json({ message: "Invalid phone number format", success: false });
    }

    if (speakerData.orcidId && !validateOrcid(speakerData.orcidId)) {
      return res.status(400).json({
        message: "Invalid ORCID format (should be 0000-0000-0000-0000)",
        success: false,
      });
    }

    // Abstract length (50–500 words)
    const abstractWords = speakerData.paperAbstract
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (abstractWords.length < 50) {
      return res.status(400).json({
        message: "Abstract must be at least 50 words long",
        success: false,
      });
    }
    if (abstractWords.length > 500) {
      return res.status(400).json({
        message: "Abstract must not exceed 500 words",
        success: false,
      });
    }

    // Conditional fields
    if (speakerData.preprintPolicy === "true" && !speakerData.preprintUrl) {
      return res.status(400).json({
        message: "Preprint URL is required when preprint policy is selected",
        success: false,
      });
    }

    if (
      speakerData.aiGeneratedContent === "true" &&
      !speakerData.aiContentDescription
    ) {
      return res.status(400).json({
        message:
          "AI content description is required when AI-generated content is selected",
        success: false,
      });
    }

    // -----------------------------
    // Co-authors JSON validation
    // -----------------------------
    let coAuthors = [];
    const rawCoAuthors = speakerData.coAuthors;

    if (
      rawCoAuthors &&
      (Array.isArray(rawCoAuthors) ||
        (typeof rawCoAuthors === "string" && rawCoAuthors.trim().length > 0))
    ) {
      try {
        coAuthors = Array.isArray(rawCoAuthors)
          ? rawCoAuthors
          : JSON.parse(rawCoAuthors);

        for (let i = 0; i < coAuthors.length; i++) {
          const coAuthor = coAuthors[i];
          if (
            !coAuthor.name ||
            !coAuthor.email ||
            !coAuthor.institutionName ||
            !coAuthor.country
          ) {
            return res.status(400).json({
              message: `Co-author ${i + 1} is missing required fields`,
              success: false,
            });
          }
          if (!validateEmail(coAuthor.email)) {
            return res.status(400).json({
              message: `Invalid email format for co-author ${i + 1}`,
              success: false,
            });
          }
          if (coAuthor.orcidId && !validateOrcid(coAuthor.orcidId)) {
            return res.status(400).json({
              message: `Invalid ORCID format for co-author ${i + 1}`,
              success: false,
            });
          }
        }
      } catch (error) {
        return res.status(400).json({
          message: "Invalid co-authors data format",
          success: false,
        });
      }
    }

    // -------------------------------------
    // Unique email (your existing check)
    // -------------------------------------
    const existingSpeaker = await prisma.speaker.findUnique({
      where: { email: speakerData.email },
    });
    if (existingSpeaker) {
      return res.status(400).json({
        message: "Speaker already registered with this email",
        success: false,
      });
    }

    // -------------------------------------
    // Prepare DB payload (yours)
    // -------------------------------------
    const speakerCreateData = {
      // Conference Information
      conferenceTitle: speakerData.conferenceTitle,
      placeDate: speakerData.placeDate,

      // Paper Information
      paperTitle: speakerData.paperTitle,
      subtitle: speakerData.subtitle || null,
      paperAbstract: speakerData.paperAbstract,
      keywords: speakerData.keywords,

      // Primary Author Information
      name: speakerData.name,
      email: speakerData.email,
      phone: speakerData.phone,
      authorBiography: speakerData.authorBiography || null,
      institutionAddress: speakerData.institutionAddress || null,
      affiliation: speakerData.affiliation || null,
      institutionName: speakerData.institutionName,
      country: speakerData.country,
      orcidId: speakerData.orcidId || null,
      isCorrespondingAuthor: speakerData.correspondingAuthor === "true",

      // Co-authors
      coAuthors: coAuthors.length > 0 ? JSON.stringify(coAuthors) : null,

      // Subject Areas
      primarySubject: speakerData.primarySubject,
      additionalSubjects:
        speakerData.additionalSubjects.length > 0
          ? JSON.stringify(speakerData.additionalSubjects)
          : null,

      // File Uploads
      paperFileUrl,
      paperDocxUrl,
      zipFolderUrl,
      supplementaryFileUrl,
      sourceCodeFileUrl,

      // Declarations
      ethicsCompliance: speakerData.ethicsCompliance === "true",
      dataAvailability: speakerData.dataAvailability === "true",
      preprintPolicy: speakerData.preprintPolicy === "true",
      preprintUrl: speakerData.preprintUrl || null,
      conflictOfInterest: speakerData.conflictOfInterest === "true",

      // Supplementary Questions
      previouslySubmitted: speakerData.previouslySubmitted === "true",
      previousSubmissionInfo: speakerData.previousSubmissionInfo || null,
      willingToReview: speakerData.willingToReview === "true",
      aiGeneratedContent: speakerData.aiGeneratedContent === "true",
      aiContentDescription: speakerData.aiContentDescription || null,
      studentPaper: speakerData.studentPaper === "true",

      // Agreements
      agreeTerms: speakerData.agreeTerms === "true",
      agreePresentation: speakerData.agreePresentation === "true",
      agreePublication: speakerData.agreePublication === "true",
      agreeReview: speakerData.agreeReview === "true",
      agreeDataSharing: speakerData.agreeDataSharing === "true",

      // Additional
      message: speakerData.message || null,
      referralCode: referralCode || null,
      referredById: referredById,

      // Legacy
      attendeeType: "presenter",
      fileUrl: paperFileUrl,
    };

    // --------------------------------------------------------
    // CREATE WITH GLOBAL PAPER ID (unique + concurrency safe)
    // --------------------------------------------------------
    const now = new Date();
    let serial = await getNextGlobalSerial();
    let newSpeaker = null;

    for (let attempt = 0; attempt < 6; attempt++) {
      const candidatePaperId = formatPaperId(now, serial);

      try {
        newSpeaker = await prisma.speaker.create({
          data: {
            ...speakerCreateData,
            paperId: candidatePaperId, // <-- NEW FIELD HERE
          },
        });
        break; // success
      } catch (e) {
        // On unique violation for paperId, bump serial and retry
        if (
          e.code === "P2002" &&
          String(e?.meta?.target || "").includes("paperId")
        ) {
          serial += 1;
          continue;
        }
        // Other errors: rethrow
        throw e;
      }
    }

    if (!newSpeaker) {
      return res.status(500).json({
        message: "Could not allocate a unique Paper ID. Please retry.",
        success: false,
      });
    }

    // ------------------------------------------
    // Create user record if referralCode present
    // ------------------------------------------
    if (referralCode && referredById) {
      await prisma.user.create({
        data: {
          name: speakerData.name,
          email: speakerData.email,
          referredBy: referralCode,
          adminId: referredById,
        },
      });
    }

    // ---------------------------
    // Send confirmation emails
    // (templates can now show ${paperId})
    // ---------------------------
    await sendSpeakerRegistrationEmail(newSpeaker);

    // ---------------------------
    // Final response
    // ---------------------------
    res.status(201).json({
      message: "Paper submission successful",
      user: newSpeaker,
      success: true,
    });
  } catch (error) {
    console.error("Speaker registration error:", error);

    // Prisma error handling (yours)
    if (error.code === "P2000") {
      return res.status(400).json({
        message:
          "One or more fields contain data that is too long. Please check your input and try again.",
        success: false,
      });
    }
    if (error.code === "P2002") {
      return res.status(400).json({
        message:
          "A submission with this email address already exists. Please use a different email or contact support.",
        success: false,
      });
    }
    if (error.code === "P2003") {
      return res.status(400).json({
        message:
          "Invalid reference data. Please check your form and try again.",
        success: false,
      });
    }

    res.status(500).json({
      message:
        "Error submitting paper. Please try again later or contact support if the problem persists.",
      error: error.message,
      success: false,
    });
  }
};

export const getSpeakers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status && status !== "ALL") {
      where.reviewStatus = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { paperTitle: { contains: search, mode: "insensitive" } },
        { institutionName: { contains: search, mode: "insensitive" } },
        { paperId: { contains: search, mode: "insensitive" } }, // <— allow searching by Paper ID
      ];
    }

    const [speakers, total] = await Promise.all([
      prisma.speaker.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          referredBy: {
            select: { id: true, email: true, referralCode: true },
          },
        },
      }),
      prisma.speaker.count({ where }),
    ]);

    res.status(200).json({
      speakers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      success: true,
    });
  } catch (error) {
    console.error("Error retrieving speakers:", error);
    res.status(500).json({
      message: "Error retrieving speakers",
      error: error.message,
      success: false,
    });
  }
};

export const getSpeakerById = async (req, res) => {
  try {
    const { id } = req.params;

    const speaker = await prisma.speaker.findUnique({
      where: { id },
      include: {
        referredBy: {
          select: {
            id: true,
            email: true,
            referralCode: true,
          },
        },
      },
    });

    if (!speaker) {
      return res.status(404).json({
        message: "Speaker not found",
        success: false,
      });
    }

    res.status(200).json({ speaker, success: true });
  } catch (error) {
    console.error("Error retrieving speaker:", error);
    res.status(500).json({
      message: "Error retrieving speaker",
      error: error.message,
      success: false,
    });
  }
};

export const updateSpeakerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewStatus, sentToCommittee, committeeMembers } = req.body;

    const speaker = await prisma.speaker.findUnique({
      where: { id },
    });

    if (!speaker) {
      return res.status(404).json({
        message: "Speaker not found",
        success: false,
      });
    }

    const updatedSpeaker = await prisma.speaker.update({
      where: { id },
      data: {
        reviewStatus: reviewStatus || speaker.reviewStatus,
        sentToCommittee:
          sentToCommittee !== undefined
            ? sentToCommittee
            : speaker.sentToCommittee,
        committeeMembers: committeeMembers || speaker.committeeMembers,
      },
    });

    res.status(200).json({
      message: "Speaker status updated successfully",
      speaker: updatedSpeaker,
      success: true,
    });
  } catch (error) {
    console.error("Error updating speaker status:", error);
    res.status(500).json({
      message: "Error updating speaker status",
      error: error.message,
      success: false,
    });
  }
};

export const deleteSpeaker = async (req, res) => {
  try {
    const { id } = req.params;

    const speaker = await prisma.speaker.findUnique({
      where: { id },
    });

    if (!speaker) {
      return res.status(404).json({
        message: "Speaker not found",
        success: false,
      });
    }

    // Delete speaker and any referred 'User' rows in a single transaction
    await prisma.$transaction(async (tx) => {
      await tx.speaker.delete({ where: { id } });

      // Clean up the referral mirror rows
      await tx.user.deleteMany({
        where: {
          email: speaker.email,
          adminId: speaker.referredById || undefined,
          referredBy: speaker.referralCode || undefined,
        },
      });
    });

    res.status(200).json({
      message: "Speaker deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error deleting speaker:", error);
    res.status(500).json({
      message: "Error deleting speaker",
      error: error.message,
      success: false,
    });
  }
};

export const getSpeakerStats = async (req, res) => {
  try {
    const [
      total,
      pending,
      underReview,
      approved,
      rejected,
      needsRevision,
      sentToCommittee,
    ] = await Promise.all([
      prisma.speaker.count(),
      prisma.speaker.count({ where: { reviewStatus: "PENDING" } }),
      prisma.speaker.count({ where: { reviewStatus: "UNDER_REVIEW" } }),
      prisma.speaker.count({ where: { reviewStatus: "APPROVED" } }),
      prisma.speaker.count({ where: { reviewStatus: "REJECTED" } }),
      prisma.speaker.count({ where: { reviewStatus: "NEEDS_REVISION" } }),
      prisma.speaker.count({ where: { sentToCommittee: true } }),
    ]);

    res.status(200).json({
      stats: {
        total,
        pending,
        underReview,
        approved,
        rejected,
        needsRevision,
        sentToCommittee,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error retrieving speaker stats:", error);
    res.status(500).json({
      message: "Error retrieving speaker statistics",
      error: error.message,
      success: false,
    });
  }
};

export const uploadTurnitinReport = async (req, res) => {
  try {
    const { id } = req.params;

    const speaker = await prisma.speaker.findUnique({ where: { id } });
    if (!speaker) {
      return res
        .status(404)
        .json({ message: "Speaker not found", success: false });
    }

    if (
      !req.file &&
      !(req.files && req.files.turnitinReport && req.files.turnitinReport[0])
    ) {
      return res
        .status(400)
        .json({ message: "No report file uploaded", success: false });
    }

    // Cloudinary multer gives you .path
    const reportFile = req.file ? req.file : req.files.turnitinReport[0];
    const url = reportFile.path;

    const updated = await prisma.speaker.update({
      where: { id },
      data: { turnitinReportUrl: url },
    });

    return res.status(200).json({
      message: "Turnitin report uploaded successfully",
      speaker: updated,
      success: true,
    });
  } catch (err) {
    console.error("Error uploading Turnitin report:", err);
    return res.status(500).json({
      message: "Failed to upload Turnitin report",
      error: err.message,
      success: false,
    });
  }
};

// Extract Cloudinary public_id (and resource_type) from a URL
function extractCloudinaryPublicId(fileUrl) {
  try {
    const u = new URL(fileUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    // Example: /<cloud_name>/<resource_type>/upload/v171234/Turnetin_Reports/turnitinReport_...pdf
    const uploadIdx = parts.findIndex((p) => p === "upload");
    if (uploadIdx === -1) return null;

    // resource type is the segment before 'upload' (e.g. 'raw', 'image')
    const resourceType = parts[uploadIdx - 1] || "raw";

    // skip optional version segment like v171234
    let after = parts.slice(uploadIdx + 1);
    if (after[0] && /^v\d+$/.test(after[0])) after = after.slice(1);

    // the rest joined is the public_id (you included the extension in public_id when uploading)
    const publicId = after.join("/"); // e.g. Turnetin_Reports/turnitinReport_...pdf

    return { publicId, resourceType };
  } catch (_) {
    return null;
  }
}

export const deleteTurnitinReport = async (req, res) => {
  try {
    const { id } = req.params;

    const speaker = await prisma.speaker.findUnique({ where: { id } });
    if (!speaker) {
      return res
        .status(404)
        .json({ message: "Speaker not found", success: false });
    }

    if (!speaker.turnitinReportUrl) {
      return res
        .status(400)
        .json({ message: "No Turnitin report on record", success: false });
    }

    const info = extractCloudinaryPublicId(speaker.turnitinReportUrl);

    // Try to delete from Cloudinary first (best-effort)
    if (info?.publicId) {
      try {
        const resp = await cloudinary.uploader.destroy(info.publicId, {
          resource_type: info.resourceType || "raw",
          invalidate: true,
        });
        // resp.result is often "ok" | "not found"
        console.log("[TurnitinDelete] Cloudinary destroy:", {
          publicId: info.publicId,
          resourceType: info.resourceType,
          result: resp?.result,
        });
      } catch (err) {
        // Don’t block DB cleanup if the file is already gone
        console.error(
          "[TurnitinDelete] Cloudinary destroy failed:",
          err?.message
        );
      }
    } else {
      console.warn(
        "[TurnitinDelete] Could not parse Cloudinary public_id from URL; skipping remote delete"
      );
    }

    // Clear the URL in DB
    const updated = await prisma.speaker.update({
      where: { id },
      data: { turnitinReportUrl: null },
    });

    return res.status(200).json({
      message: "Turnitin report deleted",
      speaker: updated,
      success: true,
    });
  } catch (err) {
    console.error("Error deleting Turnitin report:", err);
    return res.status(500).json({
      message: "Failed to delete Turnitin report",
      error: err.message,
      success: false,
    });
  }
};
