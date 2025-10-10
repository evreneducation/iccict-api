import { prisma } from "../config/db.js";
import { sendKeynoteSpeakerRegistrationEmail } from "../services/emailService.js";

// Validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// const validateExpertiseArea = (area) => {
//   const validAreas = [
//     'Mathematics', 'Management', 'Computer Science', 'Data Science',
//     'Artificial Intelligence', 'Operations Research', 'Statistics',
//     'Information Systems', 'Business Analytics', 'Other'
//   ];
//   return validAreas.includes(area);
// };

export const registerKeynoteSpeaker = async (req, res) => {
  try {
    const speakerData = req.body;
    const { referralCode } = speakerData;
    
    // Handle file uploads if files were uploaded
    let fileUrls = {
      cvFileUrl: null,
      photoFileUrl: null,
      presentationFileUrl: null
    };
    
    if (req.files) {
      if (req.files.cvFile) {
        fileUrls.cvFileUrl = req.files.cvFile[0].path; // Cloudinary URL
      }
      if (req.files.photoFile) {
        fileUrls.photoFileUrl = req.files.photoFile[0].path;
      }
      if (req.files.presentationFile) {
        fileUrls.presentationFileUrl = req.files.presentationFile[0].path;
      }
    }

    // If referral code is provided, verify it exists
    if (referralCode) {
      const admin = await prisma.Admin.findUnique({
        where: { referralCode }
      });

      if (!admin) {
        return res.status(400).json({ 
          message: 'Invalid referral code',
          success: false 
        });
      }
    }

    // Validate required fields
    const requiredFields = [
      'name', 'email', 'phone', 'country', 'designation', 'institutionName',
      'experienceYears', 'expertiseArea', 'specialization', 'highestDegree',
      'keynoteTitle', 'keynoteAbstract'
    ];
    
    const missingFields = requiredFields.filter(field => !speakerData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        success: false
      });
    }

    // Validate email format
    if (!validateEmail(speakerData.email)) {
      return res.status(400).json({
        message: "Invalid email format",
        success: false
      });
    }

    // Validate phone format
    if (!validatePhone(speakerData.phone)) {
      return res.status(400).json({
        message: "Invalid phone number format",
        success: false
      });
    }

    // Validate expertise area
    // if (!validateExpertiseArea(speakerData.expertiseArea)) {
    //   return res.status(400).json({
    //     message: "Invalid expertise area selection",
    //     success: false
    //   });
    // }

    // Validate abstract length
    if (speakerData.keynoteAbstract.length < 100) {
      return res.status(400).json({
        message: "Keynote abstract must be at least 100 characters long",
        success: false
      });
    }

    // Validate experience years
    const experienceYears = parseInt(speakerData.experienceYears);
    if (isNaN(experienceYears) || experienceYears < 0) {
      return res.status(400).json({
        message: "Experience years must be a valid number",
        success: false
      });
    }

    // Validate publications count if provided
    if (speakerData.publicationsCount && parseInt(speakerData.publicationsCount) < 0) {
      return res.status(400).json({
        message: "Publications count must be a positive number",
        success: false
      });
    }

    // Validate keynote experience if provided
    if (speakerData.keynoteExperience && parseInt(speakerData.keynoteExperience) < 0) {
      return res.status(400).json({
        message: "Keynote experience must be a positive number",
        success: false
      });
    }

    // Check if email already exists
    const existingKeynoteSpeaker = await prisma.keynoteSpeaker.findUnique({
      where: { email: speakerData.email }
    });

    if (existingKeynoteSpeaker) {
      return res.status(400).json({
        message: "A keynote speaker is already registered with this email address",
        success: false
      });
    }

    // Validate terms agreement
    if (!speakerData.agreeToTerms || speakerData.agreeToTerms !== 'on') {
      return res.status(400).json({
        message: "You must agree to the terms and conditions",
        success: false
      });
    }

    // Prepare data for database
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
      
      // Files
      ...fileUrls,
      
      // Additional Information
      preferredSessionTime: speakerData.preferredSessionTime || null,
      accommodationNeeded: speakerData.accommodationNeeded || null,
      dietaryRestrictions: speakerData.dietaryRestrictions || null,
      additionalComments: speakerData.additionalComments || null,
      
      // Agreements
      agreeToTerms: true,
      agreeToMarketing: speakerData.agreeToMarketing === 'on' || false,
      
      // Referral
      referralCode: referralCode || null,
      referredById: null
    };

    // If referral code exists, set the referred by admin
    if (referralCode) {
      const admin = await prisma.Admin.findUnique({
        where: { referralCode: referralCode }
      });
      keynoteData.referredById = admin.id;
    }

    // Create new keynote speaker
    const newKeynoteSpeaker = await prisma.keynoteSpeaker.create({
      data: keynoteData,
    });

    res.status(201).json({
      message: "Keynote speaker registration successful! We will review your proposal and get back to you within 10 business days.",
      keynoteSpeaker: {
        id: newKeynoteSpeaker.id,
        name: newKeynoteSpeaker.name,
        email: newKeynoteSpeaker.email,
        keynoteTitle: newKeynoteSpeaker.keynoteTitle,
        status: newKeynoteSpeaker.status
      },
      success: true,
    });

    // Send registration confirmation emails
    try {
      await sendKeynoteSpeakerRegistrationEmail(newKeynoteSpeaker);
    } catch (emailError) {
      console.error('Email service error:', emailError);
      // Don't fail the registration if email fails
    }

  } catch (error) {
    console.error('Keynote speaker registration error:', error);
    res.status(500).json({
      message: "Error registering keynote speaker. Please try again.",
      error: error.message,
      success: false,
    });
  }
};

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
    console.error('Error retrieving keynote speakers:', error);
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
    console.error('Error retrieving keynote speaker:', error);
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

    res.status(200).json({
      message: 'Keynote speaker status updated successfully',
      keynoteSpeaker: updatedKeynoteSpeaker,
      success: true
    });
  } catch (error) {
    console.error('Error updating keynote speaker status:', error);
    res.status(500).json({
      message: 'Error updating keynote speaker status',
      error: error.message,
      success: false
    });
  }
};

// Admin-specific functions for managing keynote speakers

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
    console.error('Error retrieving keynote speakers for admin:', error);
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
    
    console.error('Error updating keynote speaker:', error);
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
    
    console.error('Error deleting keynote speaker:', error);
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
    console.error('Error retrieving keynote speaker stats:', error);
    res.status(500).json({
      message: 'Error retrieving keynote speaker statistics',
      error: error.message,
      success: false
    });
  }
}; 