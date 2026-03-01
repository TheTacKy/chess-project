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

// Profile API functions
export const profileAPI = {
  // Update profile (username, email)
  updateProfile: async (username, email) => {
    const response = await api.put('/profile', { username, email });
    return response.data;
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    // Convert file to base64
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = () => {
        const base64String = reader.result.split(',')[1]; // Remove data:image/...;base64, prefix
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await api.post('/profile/upload', {
      image: base64,
      mimetype: file.type
    });
    return response.data;
  },

  // Delete profile picture
  deleteProfilePicture: async () => {
    const response = await api.delete('/profile/delete');
    return response.data;
  },
};

export default api;

