import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

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
    output: String
});

const Command = mongoose.model('Command', commandSchema);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'execution_complete') {
                const command = await Command.findById(data.id);
                if (command) {
                    command.executed = true;
                    command.output = data.result;
                    await command.save();
                }
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// HTTP endpoint to receive commands
app.post('/command', async (req, res) => {
    try {
        const command = new Command({
            command: req.body.command
        });
        await command.save();

        // Broadcast command to all connected clients
        const commandData = command.toObject();
        clients.forEach(client => {
            if (client.readyState === 1) { // 1 = OPEN
                client.send(JSON.stringify(commandData));
            }
        });

        res.status(201).json({ message: 'Command saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error saving command' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});