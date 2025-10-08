import { prisma } from "../config/db.js";
import { sendSponsorRegistrationEmail } from "../services/emailService.js";

// Validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateSponsorshipLevel = (level) => {
  const validLevels = ['platinum', 'gold', 'silver', 'bronze'];
  return validLevels.includes(level.toLowerCase());
};

const getMinimumAmount = (level) => {
  const amounts = {
    platinum: 10000,
    gold: 5000,
    silver: 2500,
    bronze: 1000
  };
  return amounts[level.toLowerCase()] || 0;
};

export const registerSponsor = async (req, res) => {
  const sponsorData = req.body;

  try {
    // Validate required fields
    const requiredFields = ['name', 'email', 'level', 'amount'];
    const missingFields = requiredFields.filter(field => !sponsorData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        success: false
      });
    }

    // Validate email format
    if (!validateEmail(sponsorData.email)) {
      return res.status(400).json({
        message: "Invalid email format",
        success: false
      });
    }

    // Validate sponsorship level
    if (!validateSponsorshipLevel(sponsorData.level)) {
      return res.status(400).json({
        message: "Invalid sponsorship level. Must be one of: platinum, gold, silver, bronze",
        success: false
      });
    }

    // Validate minimum amount based on sponsorship level
    const minimumAmount = getMinimumAmount(sponsorData.level);
    if (sponsorData.amount < minimumAmount) {
      return res.status(400).json({
        message: `Minimum amount for ${sponsorData.level} sponsorship is $${minimumAmount}`,
        success: false
      });
    }

    // Check if email already exists
    const existingSponsor = await prisma.sponsor.findUnique({
      where: { email: sponsorData.email }
    });

    if (existingSponsor) {
      return res.status(400).json({
        message: "Sponsor already registered with this email",
        success: false
      });
    }

    // Create new sponsor
    const newSponsor = await prisma.sponsor.create({
      data: sponsorData,
    });

    // Send registration confirmation emails
    await sendSponsorRegistrationEmail(newSponsor);

    res.status(201).json({
      message: "Sponsor registered successfully",
      user: newSponsor,
      success: true,
    });
  } catch (error) {
    console.error('Sponsor registration error:', error);
    res.status(500).json({
      message: "Error registering Sponsor",
      error: error.message,
      success: false,
    });
  }
};

export const getSponsors = async (req, res) => {
  try {
    const sponsors = await prisma.sponsor.findMany();
    res.status(200).json({ sponsors, success: true });
  } catch (error) {
    console.error('Error retrieving sponsors:', error);
    res.status(500).json({
      message: "Error retrieving Sponsors",
      error: error.message,
      success: false,
    });
  }
};
