import express from 'express';
import { checkDatabaseHealth } from '../config/db.js';
import emailQueue from '../services/emailQueue.js';
import logger from '../config/logger.js';

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database
    const dbHealth = await checkDatabaseHealth();
    
    // Check email queue
    const emailQueueStatus = emailQueue.getStatus();
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    
    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'BREVO_API_KEY',
      'BREVO_FROM_EMAIL',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET'
    ];
    
    const envStatus = requiredEnvVars.reduce((acc, envVar) => {
      acc[envVar] = !!process.env[envVar];
      return acc;
    }, {});
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      database: dbHealth,
      emailQueue: emailQueueStatus,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      environment: envStatus,
      nodeVersion: process.version,
      platform: process.platform
    };
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    logger.info('Health check performed', {
      status: healthStatus.status,
      responseTime,
      dbStatus: dbHealth.status
    });
    
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Email queue status
router.get('/email-queue', (req, res) => {
  const status = emailQueue.getStatus();
  res.json({
    ...status,
    timestamp: new Date().toISOString()
  });
});

export default router;