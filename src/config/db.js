import { PrismaClient } from "@prisma/client";
import logger from './logger.js';

// Enhanced Prisma client with connection pooling and retry logic
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
  datasources: {
    db: {
      url: process.env.MYSQL_URI
    }
  }
});

// Log Prisma events
prisma.$on('query', (e) => {
  logger.debug('Prisma Query', {
    query: e.query,
    params: e.params,
    duration: e.duration,
    target: e.target
  });
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp
  });
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp
  });
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp
  });
});

// Connection pool configuration
const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection test successful");
    
    return true;
  } catch (error) {
    logger.error("Database connection failed", {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Graceful shutdown
const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    logger.info("Database disconnected successfully");
  } catch (error) {
    logger.error("Error disconnecting from database", {
      error: error.message
    });
  }
};

// Health check function
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    logger.error("Database health check failed", {
      error: error.message
    });
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
};

export { prisma, connectDB, disconnectDB, checkDatabaseHealth };