import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { app, server } from "./lib/socket.js";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import roomRoutes from "./routes/rooms.route.js";
import { healthCheck } from "./controllers/room.controller.js";

// Database connection
connectDB();

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check (root endpoint)
app.get("/", healthCheck);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", roomRoutes);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});