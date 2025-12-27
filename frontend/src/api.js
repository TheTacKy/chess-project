import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
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

// Auth API functions
export const authAPI = {
  // Sign up a new user
  signup: async (username, email, password) => {
    const response = await api.post('/auth/signup', {
      username,
      email,
      password,
    });
    return response.data;
  },

  // Log in a user
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Log out a user
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default api;

