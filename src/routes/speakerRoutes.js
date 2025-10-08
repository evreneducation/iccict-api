import express from "express";
import { 
  getSpeakers, 
  registerSpeaker, 
  getSpeakerById, 
  updateSpeakerStatus, 
  deleteSpeaker, 
  getSpeakerStats,
  uploadTurnitinReport,
  deleteTurnitinReport
} from "../controllers/speakerController.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// Configure multer for multiple file uploads
const uploadFields = upload.fields([
  { name: 'paperFile', maxCount: 1 },         // PDF only
  { name: 'paperDocxFile', maxCount: 1 },     // DOCX only
  { name: 'zipFolderFile', maxCount: 1 },     // ZIP only
  { name: 'supplementaryFile', maxCount: 1 },
  { name: 'sourceCodeFile', maxCount: 1 }
]);

// Error handling middleware for file uploads
const handleUploadError = (err, req, res, next) => {
  if (err) {
    if (err.message.includes('Only PDF, DOCX, and LaTeX')) {
      return res.status(400).json({
        message: "Invalid file format",
        error: "Only PDF, DOCX, and LaTeX (.tex, .latex) files are allowed",
        success: false
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: "File too large",
        error: "File size must be less than 50MB for paper file and 20MB for supplementary files",
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

// Paper submission route with multiple file uploads
router.post("/register", uploadFields, handleUploadError, registerSpeaker);

// Get all speakers with pagination and filtering
router.get("/speakers", getSpeakers);

// Get speaker statistics
router.get("/stats", getSpeakerStats);

// Get speaker by ID
router.get("/speakers/:id", getSpeakerById);

// Update speaker status (admin only)
router.patch("/speakers/:id/status", updateSpeakerStatus);

// Delete speaker (admin only)
router.delete("/speakers/:id", deleteSpeaker);


// Upload turnitin report
router.post(
  "/speakers/:id/turnitin-report",
  upload.single('turnitinReport'),
  handleUploadError,
  uploadTurnitinReport
);

// Delete turnitin report
router.delete(
  "/speakers/:id/turnitin-report",
  deleteTurnitinReport
);

export default router;
