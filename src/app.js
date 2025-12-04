import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import sponsorRegistrationRoutes from './routes/sponsorRegistrationRoutes.js';
import conferenceRegistrationRoutes from './routes/conferenceRegistrationRoutes.js';
import speakerRoutes from './routes/speakerRoutes.js';
import keynoteSpeakerRoutes from './routes/keynoteSpeakerRoutes.js';
import reviewingCommitteeRoutes from './routes/reviewingCommitteeRoutes.js';
import { connectDB, disconnectDB } from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import contactRoutes from './routes/contact.js';
import reviewerExpressionRoutes from "./routes/reviewerExpressionRoutes.js";
import fileUploadRoutes from './routes/fileUploadRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { startReviewReminderJob } from './jobs/reviewReminderJob.js';
import logger from './config/logger.js';
import { startKeepWarmJob } from './jobs/keepWarmJob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same folder as logger.js resolves: <project-root>/logs
export const LOGS_DIR = path.resolve(__dirname, '../public/logs');

dotenv.config();

const app = express();

// Enhanced timeout configuration
app.use((req, res, next) => {
  // Set timeout to 60 seconds for all requests (increased from 30)
  req.setTimeout(60000);
  res.setTimeout(60000);
  next();
});

// Enhanced CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400
}));

// Explicit OPTIONS handler for faster preflight responses
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});

// Public Files
app.use('/public/logs', express.static(LOGS_DIR));

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.get('/public/logs/download/:name', (req, res) => {
  const filePath = path.join(LOGS_DIR, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.download(filePath);
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
});

// Routes
app.use('/api/conference', conferenceRegistrationRoutes);
app.use('/api/sponsor', sponsorRegistrationRoutes);
app.use('/api/speaker', speakerRoutes);
app.use('/api/keynote-speaker', keynoteSpeakerRoutes);
app.use('/api/reviewing-committee', reviewingCommitteeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use("/api/reviewer-expression", reviewerExpressionRoutes);
app.use('/api/upload', fileUploadRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    success: false
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectDB();
  process.exit(0);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  logger.info(`Server is running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
  });

  // Connect DB with retries, but do not crash app
  const dbOk = await connectDB();
  if (!dbOk) {
    logger.warn("Continuing to run without a DB connection; health endpoint will respond");
  }

  // Start background jobs only if DB is okay
  try {
    if (dbOk) {
      startReviewReminderJob();
    } else {
      logger.warn("ReviewReminderJob not started because DB is offline");
    }
  } catch (e) {
    logger.warn("Failed to start ReviewReminderJob", { error: e.message });
  }

  // start background jobs AFTER server is up
  // try {
  //   startKeepWarmJob();
  // } catch (e) {
  //   logger.warn("Failed to start keep-warm job", { error: e.message });
  // }
});