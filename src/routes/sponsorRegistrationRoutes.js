import express from "express";
import { getSponsors, registerSponsor } from "../controllers/sponsorRegistrationController.js";

const router = express.Router();

router.post("/register", registerSponsor);
router.get("/sponsors", getSponsors);

export default router;