import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Room API functions
export const roomAPI = {
  // Create a new room
  createRoom: async () => {
    const response = await api.post('/rooms');
    return response.data;
  },

  // Get room information
  getRoom: async (roomCode) => {
    const response = await api.get(`/rooms/${roomCode}`);
    return response.data;
  },

  // Check room status (if it exists and has space)
  checkRoomStatus: async (roomCode) => {
    const response = await api.get(`/rooms/${roomCode}/status`);
    return response.data;
  },

  // Get all active rooms (for debugging)
  getAllRooms: async () => {
    const response = await api.get('/rooms');
    return response.data;
  },

  // Delete a room
  deleteRoom: async (roomCode) => {
    const response = await api.delete(`/rooms/${roomCode}`);
    return response.data;
  },
};

export default api;

