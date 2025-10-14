import express from "express";
import {
  createUploader,
  uploadToCloudinary,
  validateFile,
} from "../services/fileUploadService.js";
import logger from "../config/logger.js";

const router = express.Router();

// Upload endpoint for keynote speaker files
router.post(
  "/keynote/:fileType",
  createUploader("keynote").single("file"),
  async (req, res) => {
    try {
      const { fileType } = req.params;
      const { file } = req;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file provided",
        });
      }

      // Validate file
      const validation = validateFile(file, "keynote");
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(file, "keynote", fileType);

      if (result.success) {
        res.json({
          success: true,
          message: "File uploaded successfully",
          data: {
            url: result.url,
            downloadUrl: result.downloadUrl,
            publicId: result.publicId,
            size: result.size,
            format: result.format,
            fileName: result.fileName,
            originalName: result.originalName,
            extension: result.extension,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "File upload failed",
          error: result.error,
        });
      }
    } catch (error) {
      logger.error("Keynote file upload error", {
        error: error.message,
        fileType: req.params.fileType,
      });

      res.status(500).json({
        success: false,
        message: "File upload failed",
        error: error.message,
      });
    }
  }
);

// Upload endpoint for reviewer CV
router.post(
  "/reviewer/cv",
  createUploader("reviewer").single("file"),
  async (req, res) => {
    try {
      const { file } = req;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file provided",
        });
      }

      // Validate file
      const validation = validateFile(file, "reviewer");
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(file, "reviewer", "cv");

      if (result.success) {
        res.json({
          success: true,
          message: "CV uploaded successfully",
          data: {
            url: result.url,
            downloadUrl: result.downloadUrl,
            publicId: result.publicId,
            size: result.size,
            format: result.format,
            fileName: result.fileName,
            originalName: result.originalName,
            extension: result.extension,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "CV upload failed",
          error: result.error,
        });
      }
    } catch (error) {
      logger.error("Reviewer CV upload error", {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "CV upload failed",
        error: error.message,
      });
    }
  }
);

// Upload endpoint for speaker files
router.post(
  "/speaker/:fileType",
  createUploader("speaker").single("file"),
  async (req, res) => {
    try {
      const { fileType } = req.params;
      const { file } = req;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file provided",
        });
      }

      // Validate file
      const validation = validateFile(file, "speaker");
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(file, "speaker", fileType);

      if (result.success) {
        res.json({
          success: true,
          message: "File uploaded successfully",
          data: {
            url: result.url,
            downloadUrl: result.downloadUrl,
            publicId: result.publicId,
            size: result.size,
            format: result.format,
            fileName: result.fileName,
            originalName: result.originalName,
            extension: result.extension,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "File upload failed",
          error: result.error,
        });
      }
    } catch (error) {
      logger.error("Speaker file upload error", {
        error: error.message,
        fileType: req.params.fileType,
      });

      res.status(500).json({
        success: false,
        message: "File upload failed",
        error: error.message,
      });
    }
  }
);

// Upload endpoint for sponsor files
router.post(
  "/sponsor/:fileType",
  createUploader("sponsor").single("file"),
  async (req, res) => {
    try {
      const { fileType } = req.params;
      const { file } = req;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file provided",
        });
      }

      // Validate file
      const validation = validateFile(file, "sponsor");
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(file, "sponsor", fileType);

      if (result.success) {
        res.json({
          success: true,
          message: "File uploaded successfully",
          data: {
            url: result.url,
            downloadUrl: result.downloadUrl,
            publicId: result.publicId,
            size: result.size,
            format: result.format,
            fileName: result.fileName,
            originalName: result.originalName,
            extension: result.extension,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "File upload failed",
          error: result.error,
        });
      }
    } catch (error) {
      logger.error("Sponsor file upload error", {
        error: error.message,
        fileType: req.params.fileType,
      });

      res.status(500).json({
        success: false,
        message: "File upload failed",
        error: error.message,
      });
    }
  }
);

// general file uploads
// general file uploads
router.post(
  "/upload/:type/:fileType",
  (req, res, next) => {
    // Create uploader dynamically based on :type
    return createUploader(req.params.type).single("file")(req, res, next);
  },
  async (req, res) => {
    try {
      const { type, fileType } = req.params;
      const { file } = req;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file provided",
        });
      }

      // Validate file based on type
      const validation = validateFile(file, type);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(file, type, fileType);

      if (result.success) {
        res.json({
          success: true,
          message: "File uploaded successfully",
          data: {
            url: result.url,
            downloadUrl: result.downloadUrl,
            publicId: result.publicId,
            size: result.size,
            format: result.format,
            fileName: result.fileName,
            originalName: result.originalName,
            extension: result.extension,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "File upload failed",
          error: result.error,
        });
      }
    } catch (error) {
      logger.error("File upload error", {
        error: error.message,
        type: req.params.type,
        fileType: req.params.fileType,
      });

      res.status(500).json({
        success: false,
        message: "File upload failed",
        error: error.message,
      });
    }
  }
);

export default router;
