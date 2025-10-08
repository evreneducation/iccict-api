import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ message: 'Token error' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ message: 'Token malformatted' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = decoded;
    return next();
  });
};

// Admin token verification middleware
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authorization token provided' 
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find admin in database to get role
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id }
    });

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Require admin role (both ADMIN and SUPER_ADMIN)
export const requireAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  if (req.admin.role !== 'ADMIN' && req.admin.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }

  next();
};

// Require super admin role
export const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  if (req.admin.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Super admin access required' 
    });
  }

  next();
};
