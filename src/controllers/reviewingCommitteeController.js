import { prisma } from '../config/db.js';
import { sendSpeakerToCommitteeEmail } from '../services/emailService.js';

// Get all committee members (Super Admin only)
export const getAllCommitteeMembers = async (req, res) => {
  try {
    const committeeMembers = await prisma.reviewingCommittee.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: committeeMembers
    });
  } catch (error) {
    console.error('Error fetching committee members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch committee members',
      error: error.message
    });
  }
};

// Get active committee members (for admin dropdown)
export const getActiveCommitteeMembers = async (req, res) => {
  try {
    const activeMembers = await prisma.reviewingCommittee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        designation: true,
        institution: true,
        expertise: true
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: activeMembers
    });
  } catch (error) {
    console.error('Error fetching active committee members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active committee members',
      error: error.message
    });
  }
};

// Create new committee member (Super Admin only)
export const createCommitteeMember = async (req, res) => {
  try {
    const { name, email, designation, institution, expertise, phone } = req.body;
    const createdBy = req.admin.id;

    // Check if email already exists
    const existingMember = await prisma.reviewingCommittee.findUnique({
      where: { email }
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Committee member with this email already exists'
      });
    }

    const newMember = await prisma.reviewingCommittee.create({
      data: {
        name,
        email,
        designation,
        institution,
        expertise,
        phone,
        createdBy
      }
    });

    res.status(201).json({
      success: true,
      message: 'Committee member created successfully',
      data: newMember
    });
  } catch (error) {
    console.error('Error creating committee member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create committee member',
      error: error.message
    });
  }
};

// Update committee member (Super Admin only)
export const updateCommitteeMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, designation, institution, expertise, phone, isActive } = req.body;

    // Check if member exists
    const existingMember = await prisma.reviewingCommittee.findUnique({
      where: { id }
    });

    if (!existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Committee member not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email !== existingMember.email) {
      const emailExists = await prisma.reviewingCommittee.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Committee member with this email already exists'
        });
      }
    }

    const updatedMember = await prisma.reviewingCommittee.update({
      where: { id },
      data: {
        name,
        email,
        designation,
        institution,
        expertise,
        phone,
        isActive
      }
    });

    res.status(200).json({
      success: true,
      message: 'Committee member updated successfully',
      data: updatedMember
    });
  } catch (error) {
    console.error('Error updating committee member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update committee member',
      error: error.message
    });
  }
};

// Delete committee member (Super Admin only)
// export const deleteCommitteeMember = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Check if member exists
//     const existingMember = await prisma.reviewingCommittee.findUnique({
//       where: { id }
//     });

//     if (!existingMember) {
//       return res.status(404).json({
//         success: false,
//         message: 'Committee member not found'
//       });
//     }

//     await prisma.reviewingCommittee.delete({
//       where: { id }
//     });

//     res.status(200).json({
//       success: true,
//       message: 'Committee member deleted successfully'
//     });
//   } catch (error) {
//     console.error('Error deleting committee member:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete committee member',
//       error: error.message
//     });
//   }
// };

// Delete committee member (Super Admin only)
export const deleteCommitteeMember = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Ensure the member exists (we need its email to find the source expression)
    const existingMember = await prisma.reviewingCommittee.findUnique({
      where: { id }
    });

    if (!existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Committee member not found'
      });
    }

    const email = (existingMember.email || '').trim();

    // 2) Atomically delete the committee member and reset any matching reviewer expressions
    const [deleted, resetResult] = await prisma.$transaction([
      prisma.reviewingCommittee.delete({ where: { id } }),
      // Only flip expressions that were ACCEPTED (i.e., “came from” an accepted application)
      prisma.ReviewerExpression.updateMany({
        where: {
          email: email,
          status: 'ACCEPTED'
        },
        data: { status: 'REJECTED' }
      })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Committee member deleted successfully',
      reviewerExpressionsReset: resetResult.count // how many expressions were set back to PENDING
    });
  } catch (error) {
    console.error('Error deleting committee member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete committee member',
      error: error.message
    });
  }
};


// Send speaker to committee for review
export const sendSpeakerToCommittee = async (req, res) => {
  try {
    const { speakerId } = req.params;
    const { committeeIds, sendToAll } = req.body;
    const adminId = req.admin.id;

    // Get speaker details
    const speaker = await prisma.speaker.findUnique({
      where: { id: speakerId },
      include: {
        referredBy: {
          select: { email: true }
        }
      }
    });

    if (!speaker) {
      return res.status(404).json({
        success: false,
        message: 'Speaker not found'
      });
    }

    // Get committee members to send to
    let selectedMembers;
    if (sendToAll) {
      selectedMembers = await prisma.reviewingCommittee.findMany({
        where: { isActive: true }
      });
    } else {
      selectedMembers = await prisma.reviewingCommittee.findMany({
        where: {
          id: { in: committeeIds },
          isActive: true
        }
      });
    }

    if (selectedMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active committee members found'
      });
    }

    // Send emails to selected committee members
    const emailPromises = selectedMembers.map(member => 
      sendSpeakerToCommitteeEmail(speaker, member)
    );

    try {
      await Promise.all(emailPromises);
    } catch (emailError) {
      console.error('Error sending emails to committee:', emailError);
      // Continue with database update even if emails fail
    }

    // Update speaker status
    const updatedSpeaker = await prisma.speaker.update({
      where: { id: speakerId },
      data: {
        reviewStatus: 'SENT_TO_COMMITTEE',
        sentToCommittee: true,
        committeeMembers: JSON.stringify(selectedMembers.map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          sentAt: new Date().toISOString()
        })))
      }
    });

    res.status(200).json({
      success: true,
      message: `Speaker details sent to ${selectedMembers.length} committee member(s) successfully`,
      data: {
        speaker: updatedSpeaker,
        sentToMembers: selectedMembers.length
      }
    });
  } catch (error) {
    console.error('Error sending speaker to committee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send speaker to committee',
      error: error.message
    });
  }
};

// Update speaker review status
export const updateSpeakerReviewStatus = async (req, res) => {
  try {
    const { speakerId } = req.params;
    const { reviewStatus, notes } = req.body;

    const validStatuses = ['PENDING', 'SENT_TO_COMMITTEE', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION'];
    
    if (!validStatuses.includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review status'
      });
    }

    const updatedSpeaker = await prisma.speaker.update({
      where: { id: speakerId },
      data: {
        reviewStatus,
        ...(reviewStatus === 'PENDING' && { 
          sentToCommittee: false,
          committeeMembers: null 
        })
      }
    });

    res.status(200).json({
      success: true,
      message: 'Speaker review status updated successfully',
      data: updatedSpeaker
    });
  } catch (error) {
    console.error('Error updating speaker review status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update speaker review status',
      error: error.message
    });
  }
};

// Get committee statistics
export const getCommitteeStats = async (req, res) => {
  try {
    const totalMembers = await prisma.reviewingCommittee.count();
    const activeMembers = await prisma.reviewingCommittee.count({
      where: { isActive: true }
    });
    const inactiveMembers = totalMembers - activeMembers;

    const speakerStats = await prisma.speaker.groupBy({
      by: ['reviewStatus'],
      _count: true
    });

    const reviewStatusCounts = speakerStats.reduce((acc, stat) => {
      acc[stat.reviewStatus] = stat._count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        committee: {
          total: totalMembers,
          active: activeMembers,
          inactive: inactiveMembers
        },
        speakers: reviewStatusCounts
      }
    });
  } catch (error) {
    console.error('Error fetching committee stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch committee statistics',
      error: error.message
    });
  }
}; 