import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await prisma.Admin.findUnique({ where: { email } });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    // const isPasswordValid = password === admin.password;
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, role: admin.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the requesting user is a super admin
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = Math.random().toString(36).substring(7);

    const newAdmin = await prisma.Admin.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
        referralCode,
      },
    });

    res.status(201).json({ message: 'Admin created successfully', referralCode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    // Check if the requesting user is a super admin
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '25', 10), 1), 100);
    const skip = (page - 1) * pageSize;

    const [admins, total] = await Promise.all([
      prisma.Admin.findMany({
        where: { role: 'ADMIN' },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          referralCode: true,
          createdAt: true,
          referredUsers: {
            select: { name: true, email: true, createdAt: true },
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
      }),
      prisma.Admin.count({ where: { role: 'ADMIN' } }),
    ]);

    res.json({ items: admins, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    // Check if the requesting user is a super admin
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;

    // Check if admin exists and is not a super admin
    const admin = await prisma.Admin.findUnique({
      where: { id }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (admin.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Cannot delete super admin' });
    }

    // Delete the admin
    await prisma.Admin.delete({
      where: { id }
    });

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAdminInfo = async (req, res) => {
  try {
    const admin = await prisma.Admin.findUnique({
      where: { id: req.user.id },
      select: {
        email: true,
        referralCode: true,
        role: true
      }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReferredUsers = async (req, res) => {
  try {
    const admin = await prisma.Admin.findUnique({
      where: { id: req.user.id },
      include: {
        referredUsers: {
          select: {
            name: true,
            email: true,
            createdAt: true,
          }
        }
      }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin.referredUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUsers = async (req, res) => {
  const { role, referralCode } = req.user;

  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '25', 10), 1), 100);
    const skip = (page - 1) * pageSize;

    const where = role === 'SUPER_ADMIN' ? {} : { referredBy: referralCode };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          referredBy: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ items: users, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const [registrationCount, speakerCount, keynoteSpeakerCount, sponsorCount, adminCount] = await Promise.all([
      prisma.registerUser.count(),
      prisma.speaker.count(),
      prisma.keynoteSpeaker.count(),
      prisma.sponsor.count(),
      prisma.Admin.count({ where: { role: 'ADMIN' } })
    ]);

    // Get recent registrations with safe referral handling
    let recentRegistrations = [];
    try {
      recentRegistrations = await prisma.registerUser.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          referredBy: {
            select: {
              email: true,
              referralCode: true
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          regFee: true,
          referredBy: true
        }
      });
    } catch (referralError) {
      console.log('Referral data not available yet, fetching basic registrations');
      recentRegistrations = await prisma.registerUser.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          regFee: true
        }
      });
    }

    res.json({
      registrations: registrationCount,
      speakers: speakerCount,
      keynoteSpeakers: keynoteSpeakerCount,
      sponsors: sponsorCount,
      admins: adminCount,
      recentRegistrations
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Registration Management
export const getAllRegistrations = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '25', 10), 1), 100);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.registerUser.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          regFee: true,
          isPaid: true,
          createdAt: true,
          referredBy: { select: { email: true, referralCode: true } },
        },
      }),
      prisma.registerUser.count(),
    ]);

    res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;
    const registration = await prisma.registerUser.findUnique({
      where: { id }
    });
    
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    res.json(registration);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Get the current registration to check if payment status is changing
    const currentRegistration = await prisma.registerUser.findUnique({
      where: { id }
    });
    
    if (!currentRegistration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    // Update the registration
    const registration = await prisma.registerUser.update({
      where: { id },
      data: updateData
    });
    
    // Check if payment status changed from pending to paid
    const paymentStatusChanged = 
      currentRegistration.isPaid === false && 
      updateData.isPaid === true;
    
    let emailSendResult = null;
    
    // Send payment confirmation email if status changed to paid
    if (paymentStatusChanged) {
      const mailHtml = paymentReceivedTemplate(registration);
      
      const mailOptions = {
        from: `"ICCICT 2026" <${process.env.EMAIL_USER}>`,
        to: registration.email,
        subject: 'Payment Received — ICCICT 2026',
        html: mailHtml,
      };
      
      try {
        const info = await sendWithRetry(mailOptions, 3);
        console.log('Payment email sent:', info);
        emailSendResult = { ok: true, info };
      } catch (mailErr) {
        console.error('Payment email send failed:', mailErr);
        emailSendResult = { ok: false, error: mailErr.message || String(mailErr) };
      }
    }
    
    res.json({ 
      message: 'Registration updated successfully', 
      registration,
      email: emailSendResult
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};



export const deleteRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.registerUser.delete({
      where: { id }
    });
    
    res.json({ message: 'Registration deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Speaker Management
export const getAllSpeakers = async (req, res) => {
  try {
    let speakers;
    try {
      speakers = await prisma.speaker.findMany({
        include: {
          referredBy: {
            select: {
              id: true,
              email: true,
              referralCode: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (referralError) {
      console.log('Referral data not available yet, fetching basic speakers');
      speakers = await prisma.speaker.findMany({
        orderBy: { createdAt: 'desc' }
      });
    }
    res.json(speakers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSpeakerById = async (req, res) => {
  try {
    const { id } = req.params;
    const speaker = await prisma.speaker.findUnique({
      where: { id }
    });
    
    if (!speaker) {
      return res.status(404).json({ message: 'Speaker not found' });
    }
    
    res.json(speaker);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSpeaker = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Handle file upload if new file was uploaded
    if (req.file) {
      updateData.fileUrl = req.file.path; // Cloudinary URL
    }
    
    const speaker = await prisma.speaker.update({
      where: { id },
      data: updateData
    });
    
    res.json({ message: 'Speaker updated successfully', speaker });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSpeaker = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.speaker.delete({
      where: { id }
    });
    
    res.json({ message: 'Speaker deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSpeakerStats = async (req, res) => {
  try {
    const [
      total,
      pending,
      underReview,
      approved,
      rejected,
      needsRevision,
      sentToCommittee
    ] = await Promise.all([
      prisma.speaker.count(),
      prisma.speaker.count({ where: { reviewStatus: 'PENDING' } }),
      prisma.speaker.count({ where: { reviewStatus: 'UNDER_REVIEW' } }),
      prisma.speaker.count({ where: { reviewStatus: 'APPROVED' } }),
      prisma.speaker.count({ where: { reviewStatus: 'REJECTED' } }),
      prisma.speaker.count({ where: { reviewStatus: 'NEEDS_REVISION' } }),
      prisma.speaker.count({ where: { sentToCommittee: true } })
    ]);

    res.json({
      stats: {
        total,
        pending,
        underReview,
        approved,
        rejected,
        needsRevision,
        sentToCommittee
      },
      success: true
    });
  } catch (error) {
    console.error('Error retrieving speaker stats:', error);
    res.status(500).json({
      message: "Error retrieving speaker statistics",
      error: error.message,
      success: false,
    });
  }
};

// Sponsor Management
export const getAllSponsors = async (req, res) => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(sponsors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSponsorById = async (req, res) => {
  try {
    const { id } = req.params;
    const sponsor = await prisma.sponsor.findUnique({
      where: { id }
    });
    
    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }
    
    res.json(sponsor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const sponsor = await prisma.sponsor.update({
      where: { id },
      data: updateData
    });
    
    res.json({ message: 'Sponsor updated successfully', sponsor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.sponsor.delete({
      where: { id }
    });
    
    res.json({ message: 'Sponsor deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
