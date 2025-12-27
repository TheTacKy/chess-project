import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import { app, server, io } from "./lib/socket.js";
import { connectDB } from "./lib/db.js";

// Database connection
connectDB();

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);

// Store active games/rooms
const games = new Map(); // roomCode -> { players: [], gameState: 'waiting' | 'playing', fen: 'start', createdAt: Date, timeControl: number, currentTurn: 'white' | 'black', whiteTime: number, blackTime: number }

// Helper function to generate room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Start game timer
function startGameTimer(roomCode, game) {
  if (game.timerInterval) {
    clearInterval(game.timerInterval);
  }

  game.timerInterval = setInterval(() => {
    if (game.gameState !== 'playing') {
      clearInterval(game.timerInterval);
      return;
    }

    if (game.currentTurn === 'white') {
      game.whiteTime -= 1000;
      if (game.whiteTime <= 0) {
        game.whiteTime = 0;
        game.gameState = 'finished';
        clearInterval(game.timerInterval);
        io.to(roomCode).emit('timeExpired', { winner: 'black', reason: 'White ran out of time' });
      }
    } else {
      game.blackTime -= 1000;
      if (game.blackTime <= 0) {
        game.blackTime = 0;
        game.gameState = 'finished';
        clearInterval(game.timerInterval);
        io.to(roomCode).emit('timeExpired', { winner: 'white', reason: 'Black ran out of time' });
      }
    }

    // Broadcast timer update
    io.to(roomCode).emit('timerUpdate', {
      whiteTime: game.whiteTime,
      blackTime: game.blackTime,
      currentTurn: game.currentTurn
    });
  }, 1000);
}

// ==================== REST API ENDPOINTS ====================

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Chess backend is running!", status: "ok" });
});

// Get room information
app.get("/api/rooms/:roomCode", (req, res) => {
  const { roomCode } = req.params;
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
});

// Create a new room (REST API version)
app.post("/api/rooms", (req, res) => {
  const roomCode = generateRoomCode();
  const timeControl = (req.body && req.body.timeControl) ? req.body.timeControl : 3; // Default to 3 minutes (blitz)
  const game = {
    players: [],
    gameState: "waiting",
    fen: "start",
    createdAt: new Date(),
    timeControl: timeControl,
    currentTurn: 'white',
    whiteTime: timeControl * 60 * 1000, // Convert minutes to milliseconds
    blackTime: timeControl * 60 * 1000,
    timerInterval: null
  };
  
  games.set(roomCode, game);
  
  res.status(201).json({
    roomCode,
    message: "Room created successfully",
    gameState: game.gameState,
    timeControl: game.timeControl
  });
});

// Check if room exists and has space
app.get("/api/rooms/:roomCode/status", (req, res) => {
  const { roomCode } = req.params;
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
});

// Get all active rooms (for debugging/admin)
app.get("/api/rooms", (req, res) => {
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
});

// Delete a room (cleanup)
app.delete("/api/rooms/:roomCode", (req, res) => {
  const { roomCode } = req.params;
  const game = games.get(roomCode.toUpperCase());
  
  if (!game) {
    return res.status(404).json({ error: "Room not found" });
  }
  
  games.delete(roomCode.toUpperCase());
  res.json({ message: "Room deleted successfully" });
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  // Guest players are allowed - no authentication required
  // Players are identified by socket.id only
  // No user data is stored for guest players

  // Create a new game room
  socket.on("createRoom", (data = {}) => {
    const { timeControl = 3 } = data;
    const roomCode = generateRoomCode();
    const game = {
      players: [{ id: socket.id, color: "white", isGuest: true }], // Guest players don't store user data
      gameState: "waiting",
      fen: "start",
      createdAt: new Date(),
      timeControl: timeControl,
      currentTurn: 'white',
      whiteTime: timeControl * 60 * 1000,
      blackTime: timeControl * 60 * 1000,
      timerInterval: null
    };
    games.set(roomCode, game);
    
    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, color: "white", timeControl });
    console.log(`Room ${roomCode} created by guest player ${socket.id} with ${timeControl} minute time control`);
  });

  // Join an existing room
  socket.on("joinRoom", (data = {}) => {
    const { roomCode, timeControl } = data;
    const game = games.get(roomCode);
    
    if (!game) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    if (game.players.length >= 2) {
      socket.emit("error", { message: "Room is full" });
      return;
    }

    // Add second player as black (guest player - no user data stored)
    game.players.push({ id: socket.id, color: "black", isGuest: true });
    game.gameState = "playing";
    
    // Start the timer
    startGameTimer(roomCode, game);
    
    socket.join(roomCode);
    socket.emit("roomJoined", { roomCode, color: "black", timeControl: game.timeControl });
    
    // Notify both players that game is starting
    io.to(roomCode).emit("gameStart", { 
      whitePlayer: game.players[0].id,
      blackPlayer: game.players[1].id,
      timeControl: game.timeControl
    });
    
    console.log(`Player ${socket.id} joined room ${roomCode} as black`);
  });

  // Handle move from a player (works for both authenticated and guest players)
  socket.on("move", (data = {}) => {
    const { roomCode, move } = data;
    const game = games.get(roomCode);
    
    if (!game) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    // Switch turns
    game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';
    
    // Broadcast move to the other player in the room
    socket.to(roomCode).emit("newMove", { move, currentTurn: game.currentTurn });
    
    // Broadcast turn change
    io.to(roomCode).emit("turnChange", { turn: game.currentTurn });
    
    console.log(`Move in room ${roomCode}:`, move);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    // Find and clean up rooms where this player was
    for (const [roomCode, game] of games.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        // Clear timer if exists
        if (game.timerInterval) {
          clearInterval(game.timerInterval);
        }
        // Notify the other player
        socket.to(roomCode).emit("opponentDisconnected");
        games.delete(roomCode);
        console.log(`Room ${roomCode} deleted due to disconnect`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});