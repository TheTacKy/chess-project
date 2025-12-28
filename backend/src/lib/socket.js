import { Server } from "socket.io";
import http from "http";
import express from "express";
import { Chess } from "chess.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Store active games/rooms
// roomCode -> { players: [], gameState: 'waiting' | 'playing' | 'finished', fen: 'start', createdAt: Date, timeControl: number, currentTurn: 'white' | 'black', whiteTime: number, blackTime: number, timerInterval: NodeJS.Timeout, chess: Chess instance }
const games = new Map();

// Used to store online users (for authenticated users)
const userSocketMap = {}; // {userId: socketId}

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Helper function to generate room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Start game timer (server-side for accuracy and fairness)
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

// Single socket connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle authenticated users (optional)
  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }

  // Guest players are allowed - no authentication required
  // Players are identified by socket.id only
  // No user data is stored for guest players

  // Create a new game room
  socket.on("createRoom", (data = {}) => {
    const { timeControl = 3 } = data;
    const roomCode = generateRoomCode();
    const chess = new Chess(); // Initialize chess game instance
    
    const game = {
      players: [{ id: socket.id, color: "white", isGuest: true }],
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

    // Initialize chess game if not already initialized
    if (!game.chess) {
      game.chess = new Chess();
      game.fen = game.chess.fen();
    }
    
    // Add second player as black (guest player - no user data stored)
    game.players.push({ id: socket.id, color: "black", isGuest: true });
    game.gameState = "playing";
    
    // Start the timer (server-side)
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

    // Check if game is in playing state
    if (game.gameState !== 'playing') {
      socket.emit("error", { message: "Game is not in progress" });
      return;
    }

    // Verify chess instance exists
    if (!game.chess) {
      socket.emit("error", { message: "Game not initialized" });
      return;
    }

    // Find the player making the move
    const player = game.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit("error", { message: "You are not a player in this room" });
      return;
    }

    // Verify it's the player's turn
    const expectedColor = game.currentTurn === 'white' ? 'w' : 'b';
    const playerColor = player.color === 'white' ? 'w' : 'b';
    
    if (playerColor !== expectedColor) {
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    // Validate the move using chess.js
    let moveResult;
    try {
      // Try to make the move - chess.js will validate it
      moveResult = game.chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q' // Default to queen promotion
      });

      // If move is invalid, chess.js returns null
      if (moveResult === null) {
        socket.emit("error", { message: "Invalid move" });
        return;
      }
    } catch (error) {
      socket.emit("error", { message: "Invalid move: " + error.message });
      return;
    }

    // Move is valid - update game state
    game.fen = game.chess.fen();
    game.currentTurn = game.chess.turn() === 'w' ? 'white' : 'black';

    // Check for game over conditions
    if (game.chess.isCheckmate()) {
      game.gameState = 'finished';
      if (game.timerInterval) {
        clearInterval(game.timerInterval);
      }
      const winner = game.chess.turn() === 'w' ? 'black' : 'white';
      io.to(roomCode).emit("gameOver", { 
        reason: "checkmate", 
        winner: winner,
        fen: game.fen
      });
    } else if (game.chess.isStalemate()) {
      game.gameState = 'finished';
      if (game.timerInterval) {
        clearInterval(game.timerInterval);
      }
      io.to(roomCode).emit("gameOver", { 
        reason: "stalemate", 
        winner: null,
        fen: game.fen
      });
    } else if (game.chess.isDraw()) {
      game.gameState = 'finished';
      if (game.timerInterval) {
        clearInterval(game.timerInterval);
      }
      io.to(roomCode).emit("gameOver", { 
        reason: "draw", 
        winner: null,
        fen: game.fen
      });
    }

    // Broadcast the validated move to all players in the room
    io.to(roomCode).emit("newMove", { 
      move: moveResult, 
      currentTurn: game.currentTurn,
      fen: game.fen
    });
    
    // Broadcast turn change
    io.to(roomCode).emit("turnChange", { turn: game.currentTurn });
    
    console.log(`Valid move in room ${roomCode}: ${moveResult.san} (${move.from} -> ${move.to})`);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    // Remove from authenticated users map
    if (userId) {
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
    
    // Find and clean up rooms where this player was
    for (const [roomCode, game] of games.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        // Clear timer if exists
        if (game.timerInterval) {
          clearInterval(game.timerInterval);
        }
        // Notify the other player (use io.to since socket is already disconnected)
        io.to(roomCode).emit("opponentDisconnected");
        games.delete(roomCode);
        console.log(`Room ${roomCode} deleted due to disconnect`);
        break;
      }
    }
  });
});

// Export games Map for REST API endpoints
export function getGames() {
  return games;
}

export { io, app, server };

