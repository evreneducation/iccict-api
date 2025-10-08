import express from 'express';
import {
  getAllCommitteeMembers,
  getActiveCommitteeMembers,
  createCommitteeMember,
  updateCommitteeMember,
  deleteCommitteeMember,
  sendSpeakerToCommittee,
  updateSpeakerReviewStatus,
  getCommitteeStats
} from '../controllers/reviewingCommitteeController.js';
import { verifyToken, requireSuperAdmin, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Committee Management Routes (Super Admin Only)
router.get('/members', verifyToken, requireSuperAdmin, getAllCommitteeMembers);
router.post('/members', verifyToken, requireSuperAdmin, createCommitteeMember);
router.put('/members/:id', verifyToken, requireSuperAdmin, updateCommitteeMember);
router.delete('/members/:id', verifyToken, requireSuperAdmin, deleteCommitteeMember);
router.get('/stats', verifyToken, requireSuperAdmin, getCommitteeStats);

// Committee Member Access Routes (All Admins)
router.get('/active-members', verifyToken, requireAdmin, getActiveCommitteeMembers);

// Speaker Review Routes (All Admins)
router.post('/send-speaker/:speakerId', verifyToken, requireAdmin, sendSpeakerToCommittee);
router.put('/speaker-status/:speakerId', verifyToken, requireAdmin, updateSpeakerReviewStatus);

export default router; 