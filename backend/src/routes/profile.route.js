import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import {
  updateProfile,
  uploadProfilePicture,
  deleteProfilePicture
} from '../controllers/profile.controller.js';

const router = express.Router();

// Update profile (username, email) - protected route
router.put('/', protectRoute, updateProfile);

// Upload profile picture (protected route)
router.post('/upload', protectRoute, uploadProfilePicture);

// Delete profile picture (protected route)
router.delete('/delete', protectRoute, deleteProfilePicture);

export default router;

