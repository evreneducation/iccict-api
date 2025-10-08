import express from "express";
const router = express.Router();
import {
  login,
  createAdmin,
  getAllAdmins,
  deleteAdmin,
  getAdminInfo,
  getReferredUsers,
  // Registration management
  getAllRegistrations,
  getRegistrationById,
  updateRegistration,
  deleteRegistration,
  // Speaker management
  getAllSpeakers,
  getSpeakerById,
  updateSpeaker,
  deleteSpeaker,
  getSpeakerStats,
  // Sponsor management
  getAllSponsors,
  getSponsorById,
  updateSponsor,
  deleteSponsor,
  // Dashboard stats
  getDashboardStats
} from "../controllers/adminController.js";
import { 
  getAllKeynoteSpeakersForAdmin,
  getKeynoteSpeakerById,
  updateKeynoteSpeakerByAdmin,
  updateKeynoteSpeakerStatus,
  deleteKeynoteSpeaker,
  getKeynoteSpeakerStatsForAdmin
} from "../controllers/keynoteSpeakerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../config/cloudinary.js";

// Admin authentication routes
router.post("/login", login);
router.post("/create", authMiddleware, createAdmin);
router.get("/all", authMiddleware, getAllAdmins);
router.delete("/admins/:id", authMiddleware, deleteAdmin);
router.get("/info", authMiddleware, getAdminInfo);
router.get("/referred-users", authMiddleware, getReferredUsers);

// Dashboard
router.get("/dashboard-stats", authMiddleware, getDashboardStats);

// Registration management routes
router.get("/registrations", authMiddleware, getAllRegistrations);
router.get("/registrations/:id", authMiddleware, getRegistrationById);
router.put("/registrations/:id", authMiddleware, updateRegistration);
router.delete("/registrations/:id", authMiddleware, deleteRegistration);

// Speaker management routes
router.get("/speakers", authMiddleware, getAllSpeakers);
router.get("/speakers/:id", authMiddleware, getSpeakerById);
router.put("/speakers/:id", authMiddleware, upload.single('fileInput'), updateSpeaker);
router.delete("/speakers/:id", authMiddleware, deleteSpeaker);
router.get("/speakers/stats", authMiddleware, getSpeakerStats);

// Keynote Speaker management routes
router.get("/keynote-speakers", authMiddleware, getAllKeynoteSpeakersForAdmin);
router.get("/keynote-speakers/:id", authMiddleware, getKeynoteSpeakerById);
router.put("/keynote-speakers/:id", authMiddleware, updateKeynoteSpeakerByAdmin);
router.patch("/keynote-speakers/:id/status", authMiddleware, updateKeynoteSpeakerStatus);
router.delete("/keynote-speakers/:id", authMiddleware, deleteKeynoteSpeaker);
router.get("/keynote-speakers/admin/stats", authMiddleware, getKeynoteSpeakerStatsForAdmin);

// Sponsor management routes
router.get("/sponsors", authMiddleware, getAllSponsors);
router.get("/sponsors/:id", authMiddleware, getSponsorById);
router.put("/sponsors/:id", authMiddleware, updateSponsor);
router.delete("/sponsors/:id", authMiddleware, deleteSponsor);

export default router;
