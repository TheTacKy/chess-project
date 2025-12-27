import api from './lib/axios';

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

// Auth API functions - re-exported from store for backward compatibility
export { authAPI } from './store/useAuthStore';

export default api;

