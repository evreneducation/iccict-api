import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Helper to build a clean public_id from original filename
 * Keeps your existing naming style.
 */
function makePublicId(file, prefix) {
  const base = (file.originalname || 'file');
  const nameNoExt = base.includes('.') ? base.substring(0, base.lastIndexOf('.')) : base;
  const ext = base.includes('.') ? base.substring(base.lastIndexOf('.') + 1) : '';
  return `${prefix}_${Date.now()}_${nameNoExt}${ext ? '.' + ext : ''}`;
}

// ===============================
// Storage for paper submissions
// (speaker paper, supplementary, source code, Turnitin report)
// ===============================
const paperStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = 'conference-papers';
    let resourceType = 'raw';

    if (file.fieldname === 'paperFile') {
      folder = 'conference-papers/pdf';
    } else if (file.fieldname === 'paperDocxFile') {
      folder = 'conference-papers/docx';
    } else if (file.fieldname === 'zipFolderFile') {
      folder = 'conference-papers/zip';
    } else if (file.fieldname === 'turnitinReport') {
      folder = 'conference-papers/turnitin-reports';
    }

    return {
      folder,
      resource_type: resourceType,
      public_id: makePublicId(file, file.fieldname),
    };
  }
});

// Multer middleware for paper + related uploads (including Turnitin report)
export const upload = multer({
  storage: paperStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const lower = (file.originalname || '').toLowerCase();
    const ext = lower.slice(lower.lastIndexOf('.'));

    if (file.fieldname === 'paperFile') {
      if (ext === '.pdf') return cb(null, true);
      return cb(new Error('Paper file must be PDF only!'), false);
    } else if (file.fieldname === 'paperDocxFile') {
      if (ext === '.docx') return cb(null, true);
      return cb(new Error('Paper in DOCX format only!'), false);
    } else if (file.fieldname === 'zipFolderFile') {
      if (ext === '.zip') return cb(null, true);
      return cb(new Error('Zip folder must be .zip only!'), false);
    } else if (file.fieldname === 'turnitinReport') {
      // Allow PDF files for Turnitin reports
      if (ext === '.pdf') return cb(null, true);
      return cb(new Error('Turnitin report must be PDF only!'), false);
    }
    cb(new Error('Unknown file field!'), false);
  }
});

// ===============================
// Legacy single file upload (backward-compatible)
// ===============================
const legacyStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'conference-papers',
    resource_type: 'raw',
    public_id: (req, file) => makePublicId(file, 'paper'),
  },
});

export const legacyUpload = multer({
  storage: legacyStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
      'text/x-tex',
      'application/x-tex',
      'text/plain',
      'application/x-latex',
      'text/x-latex'
    ];
    const allowedExtensions = ['.pdf', '.docx', '.tex', '.latex'];
    const lower = (file.originalname || '').toLowerCase();
    const fileExtension = lower.slice(lower.lastIndexOf('.'));

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      return cb(null, true);
    }
    return cb(new Error('Only PDF, DOCX, and LaTeX (.tex, .latex) files are allowed!'), false);
  }
});

// ===============================
// Keynote speakers multi-type upload
// ===============================
const keynoteStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = 'keynote-speakers';
    let resourceType = 'raw';

    if (file.fieldname === 'cvFile') {
      folder = 'keynote-speakers/cv';
      resourceType = 'raw';
    } else if (file.fieldname === 'photoFile') {
      folder = 'keynote-speakers/photos';
      resourceType = 'image';
    } else if (file.fieldname === 'presentationFile') {
      folder = 'keynote-speakers/presentations';
      resourceType = 'raw';
    }

    return {
      folder,
      resource_type: resourceType,
      public_id: makePublicId(file, file.fieldname),
    };
  }
});

export const keynoteUpload = multer({
  storage: keynoteStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    console.log('Keynote file upload attempt:', {
      fieldname: file.fieldname,
      filename: file.originalname,
      mimetype: file.mimetype
    });
    const lower = (file.originalname || '').toLowerCase();
    const fileExtension = lower.slice(lower.lastIndexOf('.'));

    if (file.fieldname === 'cvFile') {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream',
        'text/x-tex',
        'application/x-tex',
        'text/plain',
        'application/x-latex',
        'text/x-latex'
      ];
      const allowedExts = ['.pdf', '.docx', '.tex', '.latex'];
      if (allowedTypes.includes(file.mimetype) || allowedExts.includes(fileExtension)) {
        return cb(null, true);
      }
      return cb(new Error('CV must be PDF, DOCX, or LaTeX!'), false);

    } else if (file.fieldname === 'photoFile') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const allowedExts = ['.jpg', '.jpeg', '.png'];
      if (allowedTypes.includes(file.mimetype) || allowedExts.includes(fileExtension)) {
        return cb(null, true);
      }
      return cb(new Error('Photo must be JPG, JPEG, or PNG!'), false);

    } else if (file.fieldname === 'presentationFile') {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      const allowedExts = ['.pdf', '.ppt', '.pptx'];
      if (allowedTypes.includes(file.mimetype) || allowedExts.includes(fileExtension)) {
        return cb(null, true);
      }
      return cb(new Error('Presentation must be PDF, PPT, or PPTX!'), false);

    } else {
      return cb(new Error('Unknown file field!'), false);
    }
  }
});

const reviewerExpressionStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const original = file.originalname || 'file';
    const nameNoExt = original.includes('.') ? original.substring(0, original.lastIndexOf('.')) : original;
    const ext = original.includes('.') ? original.substring(original.lastIndexOf('.') + 1) : undefined;
    return {
      folder: 'cv_reviewer_expression',
      resource_type: 'raw',
      public_id: `cv_${Date.now()}_${nameNoExt}`,
      format: ext,
    };
  }
});

export const reviewerExpressionUpload = multer({
  storage: reviewerExpressionStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    console.log('Reviewer Expression file upload attempt:', {
      fieldname: file.fieldname,
      filename: file.originalname,
      mimetype: file.mimetype
    });
    const original = (file.originalname || '').toLowerCase();
    const ext = original.slice(original.lastIndexOf('.'));
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExts = ['.pdf', '.docx'];

    if (file.fieldname !== 'cvFile') {
      return cb(new Error("Unknown file field for reviewer expression (expected 'cvFile')"), false);
    }
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error('CV must be PDF or DOCX!'), false);
  }
});


const RECEIPT_FOLDER = 'conference-registration-recipts';
const MAX_RECEIPT_FILESIZE = 5 * 1024 * 1024; // 5MB

const receiptStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: RECEIPT_FOLDER,
    resource_type: (file.mimetype && file.mimetype.startsWith('image/')) ? 'image' : 'raw',
    public_id: makePublicId(file, 'receipt'),
  })
});

export const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: MAX_RECEIPT_FILESIZE },
  fileFilter: (req, file, cb) => {
    console.log('Receipt upload attempt:', {
      fieldname: file.fieldname,
      filename: file.originalname,
      mimetype: file.mimetype
    });

    const lower = (file.originalname || '').toLowerCase();
    const fileExtension = lower.slice(lower.lastIndexOf('.'));

    // allowed: PDF and image (jpg/jpeg/png)
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const allowedMime = ['application/pdf', ...allowedImageTypes];

    if (allowedMime.includes(file.mimetype) || allowedExts.includes(fileExtension)) {
      return cb(null, true);
    }
    return cb(new Error('Receipt must be a PDF or JPG/PNG image (max 5MB).'), false);
  }
});

export default cloudinary;
