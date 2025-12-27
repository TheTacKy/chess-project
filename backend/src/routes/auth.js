import express from 'express';
import { signup, login, logout, getCurrentUser } from '../controllers/auth.controller.js';
import { verifyToken } from '../lib/utils.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyToken, getCurrentUser);

export default router;

