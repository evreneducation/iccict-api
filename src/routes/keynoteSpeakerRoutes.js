import express from "express";
import { 
  registerKeynoteSpeaker, 
  getKeynoteSpeakers, 
  getKeynoteSpeakerById, 
  updateKeynoteSpeakerStatus,
  getAllKeynoteSpeakersForAdmin,
  updateKeynoteSpeakerByAdmin,
  deleteKeynoteSpeaker,
  getKeynoteSpeakerStatsForAdmin
} from "../controllers/keynoteSpeakerController.js";
import { keynoteUpload } from "../config/cloudinary.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Error handling middleware for file uploads
const handleUploadError = (err, req, res, next) => {
  if (err) {
    if (err.message.includes('CV must be')) {
      return res.status(400).json({
        message: "Invalid CV format",
        error: "CV must be PDF, DOCX, or LaTeX (.tex, .latex) format",
        success: false
      });
    }
    if (err.message.includes('Photo must be')) {
      return res.status(400).json({
        message: "Invalid photo format",
        error: "Photo must be JPG, JPEG, or PNG format",
        success: false
      });
    }
    if (err.message.includes('Presentation must be')) {
      return res.status(400).json({
        message: "Invalid presentation format",
        error: "Presentation must be PDF, PPT, or PPTX format",
        success: false
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: "File too large",
        error: "File size must be less than 50MB",
        success: false
      });
    }
    return res.status(400).json({
      message: "File upload error",
      error: err.message,
      success: false
    });
  }
  next();
};

// Public routes
// Keynote speaker registration with file uploads
router.post("/register", keynoteUpload.fields([
  { name: 'cvFile', maxCount: 1 },
  { name: 'photoFile', maxCount: 1 },
  { name: 'presentationFile', maxCount: 1 }
]), handleUploadError, registerKeynoteSpeaker);

// Get all keynote speakers (public, limited info)
router.get("/", getKeynoteSpeakers);

// Get specific keynote speaker by ID (public, limited info)
router.get("/:id", getKeynoteSpeakerById);

// Admin-only routes (protected)
// Get all keynote speakers with full details for admin
router.get("/admin/all", authMiddleware, getAllKeynoteSpeakersForAdmin);

// Get keynote speaker statistics for admin dashboard
router.get("/admin/stats", authMiddleware, getKeynoteSpeakerStatsForAdmin);

// Update keynote speaker by admin
router.put("/admin/:id", authMiddleware, updateKeynoteSpeakerByAdmin);

// Update keynote speaker status (for admin)
router.patch("/admin/:id/status", authMiddleware, updateKeynoteSpeakerStatus);

// Delete keynote speaker (admin only)
router.delete("/admin/:id", authMiddleware, deleteKeynoteSpeaker);

export default router; 
