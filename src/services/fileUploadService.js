import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import logger from "../config/logger.js";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// File upload configurations for different types
const uploadConfigs = {
  keynote: {
    folder: "iccict/keynote_speakers",
    allowedTypes: [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    transformations: {
      cv: { quality: "auto", format: "pdf" },
      photo: { width: 500, height: 500, crop: "fill", quality: "auto" },
      presentation: { quality: "auto" },
    },
  },
  reviewer: {
    folder: "iccict/reviewer_cv",
    allowedTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    transformations: { quality: "auto" },
  },
  speaker: {
    folder: "iccict/speakers",
    allowedTypes: [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      // ZIP variants
      "application/zip",
      "application/x-zip-compressed",
      // keep this if you already added it, helps some browsers
      "application/octet-stream",
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    transformations: {
      cv: { quality: "auto", format: "pdf" },
      photo: { width: 500, height: 500, crop: "fill", quality: "auto" },
    },
  },
  sponsor: {
    folder: "iccict/sponsors",
    allowedTypes: ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
    maxSize: 5 * 1024 * 1024, // 5MB
    transformations: { quality: "auto" },
  },
};

// Multer configuration for memory storage
const storage = multer.memoryStorage();

const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`),
      false
    );
  }
};

// Create multer instances for different upload types
export const createUploader = (type) => {
  const config = uploadConfigs[type];
  if (!config) {
    throw new Error(`Invalid upload type: ${type}`);
  }

  return multer({
    storage,
    fileFilter: fileFilter(config.allowedTypes),
    limits: {
      fileSize: config.maxSize,
      files: 1,
    },
  });
};

// Upload file to Cloudinary
export const uploadToCloudinary = async (file, type, subfolder = "") => {
  try {
    const config = uploadConfigs[type];
    if (!config) {
      throw new Error(`Invalid upload type: ${type}`);
    }

    const folder = subfolder ? `${config.folder}/${subfolder}` : config.folder;

    console.log("Starting file upload to Cloudinary", {
      type,
      subfolder,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto",
          use_filename: true,
          unique_filename: true,
          // Keep your transformations if any
          ...config.transformations,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    const originalExt = path.extname(file.originalname) || "";
    const originalBase =
      path.basename(file.originalname, originalExt) || file.originalname;
    const extFromResult = result?.format ? `.${result.format}` : "";
    // Prefer Cloudinary-reported format if available, else original extension
    const normalizedExt = extFromResult || originalExt || "";
    const fileNameWithExt = normalizedExt
      ? `${originalBase}${normalizedExt}`
      : originalBase;


    // Build a download URL that includes a filename with extension
    let downloadUrl = result.secure_url;
    try {
      // Insert fl_attachment:<filename> after '/upload/'
      const marker = "/upload/";
      if (downloadUrl.includes(marker)) {
        downloadUrl = downloadUrl.replace(
          marker,
          `${marker}fl_attachment:${encodeURIComponent(fileNameWithExt)}/`
        );
      }
    } catch (e) {
      // Fallback to original URL if anything goes wrong
      downloadUrl = result.secure_url;
    }

    console.log("File uploaded successfully to Cloudinary", {
      type,
      publicId: result.public_id,
      url: result.secure_url,
      size: result.bytes,
    });

    return {
      success: true,
      url: result.secure_url,
      downloadUrl, // url that forces a filename with extension
      publicId: result.public_id,
      size: result.bytes,
      format: result.format,
      originalName: file.originalname,
      fileName: fileNameWithExt, // e.g., intro.docx or test.zip
      extension: normalizedExt === '.pdf' ? "" : normalizedExt.replace(".", "") || null, // e.g., 'docx', 'zip'
    };
  } catch (error) {
    console.log("File upload failed", {
      type,
      error: error.message,
      originalName: file.originalname,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);

    console.log("File deleted from Cloudinary", {
      publicId,
      result: result.result,
    });

    return {
      success: result.result === "ok",
      result: result.result,
    };
  } catch (error) {
    console.log("File deletion failed", {
      publicId,
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

// Validate file before upload
export const validateFile = (file, type) => {
  const config = uploadConfigs[type];
  if (!config) {
    return { valid: false, error: `Invalid upload type: ${type}` };
  }

  if (!config.allowedTypes.includes(file.mimetype)) {
    console.log(`Upload mimetype for ${type}: ${file.mimetype}`);
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${config.allowedTypes.join(
        ", "
      )}`,
    };
  }

  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${
        config.maxSize / (1024 * 1024)
      }MB`,
    };
  }

  return { valid: true };
};
