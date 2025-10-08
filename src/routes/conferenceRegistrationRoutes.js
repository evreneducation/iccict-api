import express from "express";
import { getUsers, registerUser } from "../controllers/conferenceRegistrationController.js";
import { receiptUpload } from "../config/cloudinary.js";
const router = express.Router();

router.post("/register", receiptUpload.single('uploadPaymentReceipt'), registerUser);
router.get("/users", getUsers);

export default router;
