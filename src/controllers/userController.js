import { prisma } from '../config/db.js';

export const registerUser = async (req, res) => {
  const { name, email, referralCode } = req.body;

  try {
    const admin = await prisma.Admin.findUnique({ where: { referralCode } });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid referral code' });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        referredBy: referralCode,
      },
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '25', 10), 1), 100);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, referredBy: true, createdAt: true },
      }),
      prisma.user.count(),
    ]);

    res.status(200).json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};