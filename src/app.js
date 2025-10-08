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
import { connectDB } from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import contactRoutes from './routes/contact.js';
import reviewerExpressionRoutes from "./routes/reviewerExpressionRoutes.js";
import { startReviewReminderJob } from './jobs/reviewReminderJob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  // origin: [
  //   "https://adityakkpk.github.io",
  //   "http://localhost:3000",
  //   "http://127.0.0.1:5500",
  //   "http://localhost:5500",
  //   "https://www.icmmcs.org",
  //   "https://icmmcs.org",
  //   "http://127.0.0.1:3000",
  //   "http://icmmcs.org",
  //   "http://www.icmmcs.org",
  //   "https://private.compareunlistedshares.com/icmmcs-backend",
  //   "https://icmmcs-backend.onrender.com/"
  // ],
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectDB();
startReviewReminderJob();

app.get('/', (req, res) => {
    res.send('Hello, World!');
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    success: false
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
