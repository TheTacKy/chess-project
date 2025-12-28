import express from 'express';
import {
  getRoom,
  createRoom,
  checkRoomStatus,
  getAllRooms,
  deleteRoom
} from '../controllers/room.controller.js';

const router = express.Router();

// Room routes
router.get('/rooms', getAllRooms);
router.post('/rooms', createRoom);
router.get('/rooms/:roomCode', getRoom);
router.get('/rooms/:roomCode/status', checkRoomStatus);
router.delete('/rooms/:roomCode', deleteRoom);

export default router;

