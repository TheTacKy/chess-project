import { Chess } from "chess.js";
import { getGames } from "../lib/socket.js";

// Health check
export const healthCheck = (req, res) => {
  res.json({ message: "Chess backend is running!", status: "ok" });
};

// Get room information
export const getRoom = (req, res) => {
  const { roomCode } = req.params;
  const games = getGames();
  const game = games.get(roomCode.toUpperCase());
  
  if (!game) {
    return res.status(404).json({ error: "Room not found" });
  }
  
  res.json({
    roomCode: roomCode.toUpperCase(),
    gameState: game.gameState,
    playerCount: game.players.length,
    maxPlayers: 2,
    fen: game.fen,
    createdAt: game.createdAt
  });
};

// Create a new room
export const createRoom = (req, res) => {
  const games = getGames();
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timeControl = (req.body && req.body.timeControl) ? req.body.timeControl : 3; // Default to 3 minutes (blitz)
  const chess = new Chess(); // Initialize chess game instance
  
  const game = {
    players: [],
    gameState: "waiting",
    fen: chess.fen(),
    createdAt: new Date(),
    timeControl: timeControl,
    currentTurn: 'white',
    whiteTime: timeControl * 60 * 1000, // Convert minutes to milliseconds
    blackTime: timeControl * 60 * 1000,
    timerInterval: null,
    chess: chess // Store chess.js instance for move validation
  };
  
  games.set(roomCode, game);
  
  res.status(201).json({
    roomCode,
    message: "Room created successfully",
    gameState: game.gameState,
    timeControl: game.timeControl
  });
};

// Check if room exists and has space
export const checkRoomStatus = (req, res) => {
  const { roomCode } = req.params;
  const games = getGames();
  const game = games.get(roomCode.toUpperCase());
  
  if (!game) {
    return res.status(404).json({ 
      exists: false, 
      message: "Room not found" 
    });
  }
  
  const isFull = game.players.length >= 2;
  
  res.json({
    exists: true,
    roomCode: roomCode.toUpperCase(),
    isFull,
    playerCount: game.players.length,
    gameState: game.gameState,
    canJoin: !isFull && game.gameState === "waiting"
  });
};

// Get all active rooms (for debugging/admin)
export const getAllRooms = (req, res) => {
  const games = getGames();
  const rooms = Array.from(games.entries()).map(([code, game]) => ({
    roomCode: code,
    gameState: game.gameState,
    playerCount: game.players.length,
    createdAt: game.createdAt
  }));
  
  res.json({
    totalRooms: rooms.length,
    rooms
  });
};

// Delete a room (cleanup)
export const deleteRoom = (req, res) => {
  const { roomCode } = req.params;
  const games = getGames();
  const game = games.get(roomCode.toUpperCase());
  
  if (!game) {
    return res.status(404).json({ error: "Room not found" });
  }
  
  // Clear timer if exists
  if (game.timerInterval) {
    clearInterval(game.timerInterval);
  }
  
  games.delete(roomCode.toUpperCase());
  res.json({ message: "Room deleted successfully" });
};

