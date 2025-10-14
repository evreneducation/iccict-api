import { prisma } from "../config/db.js";
import { sendKeynoteSpeakerRegistrationEmail } from "../services/emailService.js";
import emailQueue from "../services/emailQueue.js";
import logger from "../config/logger.js";

// Validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const registerKeynoteSpeaker = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('Keynote speaker registration started', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const speakerData = req.body;
    const { referralCode } = speakerData;
    
    // Validate required fields
    const requiredFields = [
      'name', 'email', 'phone', 'country', 'designation', 'institutionName',
      'experienceYears', 'expertiseArea', 'specialization', 'highestDegree',
      'keynoteTitle', 'keynoteAbstract'
    ];
    
    const missingFields = requiredFields.filter(field => !speakerData[field]);
    
    if (missingFields.length > 0) {
      logger.warn('Keynote speaker registration failed - missing fields', {
        missingFields,
        email: speakerData.email
      });
      
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        success: false
      });
    }

    // Validate email format
    if (!validateEmail(speakerData.email)) {
      logger.warn('Keynote speaker registration failed - invalid email', {
        email: speakerData.email
      });
      
      return res.status(400).json({
        message: "Invalid email format",
        success: false
      });
    }

    // Validate phone format
    if (!validatePhone(speakerData.phone)) {
      logger.warn('Keynote speaker registration failed - invalid phone', {
        phone: speakerData.phone,
        email: speakerData.email
      });
      
      return res.status(400).json({
        message: "Invalid phone number format",
        success: false
      });
    }

    // Validate abstract length
    if (speakerData.keynoteAbstract.length < 100) {
      logger.warn('Keynote speaker registration failed - abstract too short', {
        abstractLength: speakerData.keynoteAbstract.length,
        email: speakerData.email
      });
      
      return res.status(400).json({
        message: "Keynote abstract must be at least 100 characters long",
        success: false
      });
    }

    // Validate experience years
    const experienceYears = parseInt(speakerData.experienceYears);
    if (isNaN(experienceYears) || experienceYears < 0) {
      logger.warn('Keynote speaker registration failed - invalid experience years', {
        experienceYears: speakerData.experienceYears,
        email: speakerData.email
      });
      
      return res.status(400).json({
        message: "Experience years must be a valid number",
        success: false
      });
    }

    // Check if email already exists
    const existingKeynoteSpeaker = await prisma.keynoteSpeaker.findUnique({
      where: { email: speakerData.email }
    });

    if (existingKeynoteSpeaker) {
      logger.warn('Keynote speaker registration failed - email already exists', {
        email: speakerData.email
      });
      
      return res.status(400).json({
        message: "A keynote speaker is already registered with this email address",
        success: false
      });
    }

    // Validate terms agreement
    if (!speakerData.agreeToTerms || speakerData.agreeToTerms !== 'on') {
      logger.warn('Keynote speaker registration failed - terms not agreed', {
        email: speakerData.email
      });
      
      return res.status(400).json({
        message: "You must agree to the terms and conditions",
        success: false
      });
    }

    // If referral code is provided, verify it exists
    let referredById = null;
    if (referralCode) {
      const admin = await prisma.Admin.findUnique({
        where: { referralCode }
      });

      if (!admin) {
        logger.warn('Keynote speaker registration failed - invalid referral code', {
          referralCode,
          email: speakerData.email
        });
        
        return res.status(400).json({ 
          message: 'Invalid referral code',
          success: false 
        });
      }
      referredById = admin.id;
    }

    // Prepare data for database - now expecting URLs instead of files
    const keynoteData = {
      // Personal Information
      name: speakerData.name,
      email: speakerData.email,
      phone: speakerData.phone,
      country: speakerData.country,
      
      // Professional Information
      designation: speakerData.designation,
      institutionName: speakerData.institutionName,
      department: speakerData.department || null,
      experienceYears: experienceYears,
      expertiseArea: speakerData.expertiseArea,
      specialization: speakerData.specialization,
      
      // Academic Credentials
      highestDegree: speakerData.highestDegree,
      university: speakerData.university || null,
      publicationsCount: speakerData.publicationsCount ? parseInt(speakerData.publicationsCount) : null,
      notableAchievements: speakerData.notableAchievements || null,
      
      // Speaking Experience
      keynoteExperience: speakerData.keynoteExperience ? parseInt(speakerData.keynoteExperience) : null,
      notableConferences: speakerData.notableConferences || null,
      
      // Proposed Keynote Topic
      keynoteTitle: speakerData.keynoteTitle,
      keynoteAbstract: speakerData.keynoteAbstract,
      targetAudience: speakerData.targetAudience || null,
      
      // Online Presence
      linkedinProfile: speakerData.linkedinProfile || null,
      website: speakerData.website || null,
      orcidId: speakerData.orcidId || null,
      googleScholar: speakerData.googleScholar || null,
      
      // File URLs (now passed from frontend)
      cvFileUrl: speakerData.cvFileUrl || null,
      photoFileUrl: speakerData.photoFileUrl || null,
      presentationFileUrl: speakerData.presentationFileUrl || null,
      
      // Additional Information
      preferredSessionTime: speakerData.preferredSessionTime || null,
      accommodationNeeded: speakerData.accommodationNeeded || null,
      dietaryRestrictions: speakerData.dietaryRestrictions || null,
      additionalComments: speakerData.additionalComments || null,
      
      // Agreements
      agreeToTerms: speakerData.agreeToTerms === 'on',
      agreeToDataProcessing: speakerData.agreeToDataProcessing === 'on',
      
      // Referral
      referredById: referredById
    };

    // Create keynote speaker record
    const newKeynoteSpeaker = await prisma.keynoteSpeaker.create({
      data: keynoteData
    });

    const processingTime = Date.now() - startTime;
    
    logger.info('Keynote speaker registration successful', {
      id: newKeynoteSpeaker.id,
      email: newKeynoteSpeaker.email,
      processingTime: `${processingTime}ms`
    });

    // Queue confirmation email (non-blocking)
    emailQueue.addEmail('sendKeynoteSpeakerConfirmation', {
      speaker: newKeynoteSpeaker
    });

    res.status(201).json({
      message: "Keynote speaker registered successfully",
      speaker: newKeynoteSpeaker,
      success: true
    });

  } catch (error) {
    logger.error('Keynote speaker registration error', {
      error: error.message,
      email: speakerData?.email,
      stack: error.stack
    });

    res.status(500).json({
      message: "Error registering keynote speaker",
      error: error.message,
      success: false
    });
  }
};

// ... rest of the existing functions remain the same
export const getKeynoteSpeakers = async (req, res) => {
  try {
    const keynoteSpeakers = await prisma.keynoteSpeaker.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        designation: true,
        institutionName: true,
        expertiseArea: true,
        keynoteTitle: true,
        status: true,
        createdAt: true
      }
    });

    res.status(200).json({
      keynoteSpeakers,
      success: true
    });
  } catch (error) {
    logger.error('Error retrieving keynote speakers', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: 'Error retrieving keynote speakers', 
      error: error.message,
      success: false
    });
  }
};

export const getKeynoteSpeakerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const keynoteSpeaker = await prisma.keynoteSpeaker.findUnique({
      where: { id },
      include: {
        referredBy: {
          select: {
            email: true,
            referralCode: true
          }
        }
      }
    });

    if (!keynoteSpeaker) {
      return res.status(404).json({
        message: 'Keynote speaker not found',
        success: false
      });
    }

    res.status(200).json({
      keynoteSpeaker,
      success: true
    });
  } catch (error) {
    logger.error('Error retrieving keynote speaker', {
      error: error.message,
      id: req.params.id
    });
    
    res.status(500).json({
      message: 'Error retrieving keynote speaker',
      error: error.message,
      success: false
    });
  }
};

export const updateKeynoteSpeakerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONFIRMED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status provided',
        success: false
      });
    }

    const updatedKeynoteSpeaker = await prisma.keynoteSpeaker.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        keynoteTitle: true
      }
    });

    logger.info('Keynote speaker status updated', {
      id,
      status,
      email: updatedKeynoteSpeaker.email
    });

    res.status(200).json({
      message: 'Keynote speaker status updated successfully',
      keynoteSpeaker: updatedKeynoteSpeaker,
      success: true
    });
  } catch (error) {
    logger.error('Error updating keynote speaker status', {
      error: error.message,
      id: req.params.id,
      status: req.body.status
    });
    
    res.status(500).json({
      message: 'Error updating keynote speaker status',
      error: error.message,
      success: false
    });
  }
};

export const getAllKeynoteSpeakersForAdmin = async (req, res) => {
  try {
    const keynoteSpeakers = await prisma.keynoteSpeaker.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        designation: true,
        institutionName: true,
        department: true,
        experienceYears: true,
        expertiseArea: true,
        specialization: true,
        highestDegree: true,
        university: true,
        publicationsCount: true,
        notableAchievements: true,
        keynoteExperience: true,
        notableConferences: true,
        keynoteTitle: true,
        keynoteAbstract: true,
        targetAudience: true,
        linkedinProfile: true,
        website: true,
        orcidId: true,
        googleScholar: true,
        cvFileUrl: true,
        photoFileUrl: true,
        presentationFileUrl: true,
        preferredSessionTime: true,
        accommodationNeeded: true,
        dietaryRestrictions: true,
        additionalComments: true,
        agreeToTerms: true,
        agreeToMarketing: true,
        status: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
        referredBy: {
          select: {
            email: true,
            referralCode: true
          }
        }
      }
    });

    res.status(200).json({
      keynoteSpeakers,
      success: true
    });
  } catch (error) {
    logger.error('Error retrieving keynote speakers for admin', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: 'Error retrieving keynote speakers', 
      error: error.message,
      success: false
    });
  }
};

export const updateKeynoteSpeakerByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.referredBy;

    // Validate email format if email is being updated
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({
          message: "Invalid email format",
          success: false
        });
      }

      // Check if email already exists for another keynote speaker
      const existingKeynoteSpeaker = await prisma.keynoteSpeaker.findFirst({
        where: { 
          email: updateData.email,
          NOT: { id: id }
        }
      });

      if (existingKeynoteSpeaker) {
        return res.status(400).json({
          message: "A keynote speaker with this email already exists",
          success: false
        });
      }
    }

    // Validate status if being updated
    if (updateData.status) {
      const validStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONFIRMED'];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          message: "Invalid status provided",
          success: false
        });
      }
    }

    // Convert string numbers to integers for numeric fields
    if (updateData.experienceYears) {
      updateData.experienceYears = parseInt(updateData.experienceYears);
    }
    if (updateData.publicationsCount) {
      updateData.publicationsCount = parseInt(updateData.publicationsCount);
    }
    if (updateData.keynoteExperience) {
      updateData.keynoteExperience = parseInt(updateData.keynoteExperience);
    }

    const updatedKeynoteSpeaker = await prisma.keynoteSpeaker.update({
      where: { id },
      data: updateData,
      include: {
        referredBy: {
          select: {
            email: true,
            referralCode: true
          }
        }
      }
    });

    logger.info('Keynote speaker updated by admin', {
      id,
      email: updatedKeynoteSpeaker.email
    });

    res.status(200).json({
      message: 'Keynote speaker updated successfully',
      keynoteSpeaker: updatedKeynoteSpeaker,
      success: true
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'Keynote speaker not found',
        success: false
      });
    }
    
    logger.error('Error updating keynote speaker', {
      error: error.message,
      id: req.params.id
    });
    
    res.status(500).json({
      message: 'Error updating keynote speaker',
      error: error.message,
      success: false
    });
  }
};

export const deleteKeynoteSpeaker = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedKeynoteSpeaker = await prisma.keynoteSpeaker.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        keynoteTitle: true
      }
    });

    logger.info('Keynote speaker deleted', {
      id,
      email: deletedKeynoteSpeaker.email
    });

    res.status(200).json({
      message: 'Keynote speaker deleted successfully',
      keynoteSpeaker: deletedKeynoteSpeaker,
      success: true
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'Keynote speaker not found',
        success: false
      });
    }
    
    logger.error('Error deleting keynote speaker', {
      error: error.message,
      id: req.params.id
    });
    
    res.status(500).json({
      message: 'Error deleting keynote speaker',
      error: error.message,
      success: false
    });
  }
};

export const getKeynoteSpeakerStatsForAdmin = async (req, res) => {
  try {
    const stats = await prisma.keynoteSpeaker.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    const totalCount = await prisma.keynoteSpeaker.count();

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count.status;
      return acc;
    }, {});

    res.status(200).json({
      total: totalCount,
      statusBreakdown: statusStats,
      success: true
    });
  } catch (error) {
    logger.error('Error retrieving keynote speaker stats', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      message: 'Error retrieving keynote speaker statistics',
      error: error.message,
      success: false
    });
  }
};