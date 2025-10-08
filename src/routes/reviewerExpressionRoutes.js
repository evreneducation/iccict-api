import express from "express";
import { reviewerExpressionUpload } from "../config/cloudinary.js";
import { verifyToken, requireSuperAdmin } from "../middleware/authMiddleware.js";
import {
  createReviewerExpression,
//   listReviewerExpressions,
  updateReviewerExpressionStatus,
  getReviewerExpressionById,
  deleteReviewerExpression,
  getAllFormFilled
} from "../controllers/reviewerExpressionController.js";

const router = express.Router();

function handleUploadError(err, req, res, next) {
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error"
    });
  }
  next();
}

router.post(
  "/",
  reviewerExpressionUpload.single("cvFile"),
  handleUploadError,
  createReviewerExpression
);

// Super Admin management
router.get("/all", verifyToken, requireSuperAdmin, getAllFormFilled);
router.get("/:id", verifyToken, requireSuperAdmin, getReviewerExpressionById);
router.patch("/:id/status", verifyToken, requireSuperAdmin, updateReviewerExpressionStatus);
router.delete("/:id", verifyToken, requireSuperAdmin, deleteReviewerExpression);

// router.get("/", verifyToken, requireSuperAdmin, listReviewerExpressions);
export default router;
