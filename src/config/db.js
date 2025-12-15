import { PrismaClient } from "@prisma/client";
import logger from "./logger.js";

// Simple Prisma client using DATABASE_URL from .env
const prisma = new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "event" },
    { level: "info", emit: "event" },
    { level: "warn", emit: "event" },
  ],
});

// Log Prisma events
prisma.$on("query", (e) => {
  console.log("Prisma Query", {
    query: e.query,
    params: e.params,
    duration: e.duration,
    target: e.target,
  });
});

prisma.$on("error", (e) => {
  console.log("Prisma Error", {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp,
  });
});

prisma.$on("info", (e) => {
  console.log("Prisma Info", {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp,
  });
});

prisma.$on("warn", (e) => {
  console.log("Prisma Warning", {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp,
  });
});

// Connection with retry logic
const connectDB = async (retries = 5, delayMs = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log("Database connected successfully");

      // Test the connection (works with MySQL too)
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database connection test successful");

      return true;
    } catch (error) {
      console.log("Database connection failed", {
        attempt,
        retries,
        error: error.message,
        stack: error.stack,
      });
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        return false;
      }
    }
  }
  return false;
};

// Graceful shutdown
const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    console.log("Database disconnected successfully");
  } catch (error) {
    console.log("Error disconnecting from database", {
      error: error.message,
    });
  }
};

// Health check
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "healthy", timestamp: new Date().toISOString() };
  } catch (error) {
    console.log("Database health check failed", {
      error: error.message,
    });
    return {
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

export { prisma, connectDB, disconnectDB, checkDatabaseHealth };
