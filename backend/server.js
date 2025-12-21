import 'dotenv/config';
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chess-app", {
  // Remove deprecated options for newer mongoose versions
})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

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
const games = new Map(); // roomCode -> { players: [], gameState: 'waiting' | 'playing', fen: 'start', createdAt: Date }

// Helper function to generate room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
  const game = {
    players: [],
    gameState: "waiting",
    fen: "start",
    createdAt: new Date()
  };
  
  games.set(roomCode, game);
  
  res.status(201).json({
    roomCode,
    message: "Room created successfully",
    gameState: game.gameState
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

  // Create a new game room
  socket.on("createRoom", () => {
    const roomCode = generateRoomCode();
    games.set(roomCode, {
      players: [{ id: socket.id, color: "white" }],
      gameState: "waiting",
      fen: "start",
      createdAt: new Date()
    });
    
    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, color: "white" });
    console.log(`Room ${roomCode} created by ${socket.id}`);
  });

  // Join an existing room
  socket.on("joinRoom", ({ roomCode }) => {
    const game = games.get(roomCode);
    
    if (!game) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    if (game.players.length >= 2) {
      socket.emit("error", { message: "Room is full" });
      return;
    }

    // Add second player as black
    game.players.push({ id: socket.id, color: "black" });
    game.gameState = "playing";
    
    socket.join(roomCode);
    socket.emit("roomJoined", { roomCode, color: "black" });
    
    // Notify both players that game is starting
    io.to(roomCode).emit("gameStart", { 
      whitePlayer: game.players[0].id,
      blackPlayer: game.players[1].id 
    });
    
    console.log(`Player ${socket.id} joined room ${roomCode} as black`);
  });

  // Handle move from a player
  socket.on("move", ({ roomCode, move }) => {
    const game = games.get(roomCode);
    
    if (!game) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    // Verify it's this player's turn (you can add more validation here)
    // Broadcast move to the other player in the room
    socket.to(roomCode).emit("newMove", { move });
    
    console.log(`Move in room ${roomCode}:`, move);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    // Find and clean up rooms where this player was
    for (const [roomCode, game] of games.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        // Notify the other player
        socket.to(roomCode).emit("opponentDisconnected");
        games.delete(roomCode);
        console.log(`Room ${roomCode} deleted due to disconnect`);
        break;
      }
    }
  });
});

server.listen(5000, () => {
  console.log("Server listening on port 5000");
});