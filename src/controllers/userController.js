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
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};