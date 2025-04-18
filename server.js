
import { WebSocketServer } from 'ws';
import http from 'http';

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server Running');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connections
const clients = new Set();

// Handle connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);

  // Forward messages to all other clients
  ws.on('message', (message) => {
    // Forward the message to all connected clients except the sender
    for (const client of clients) {
      if (client !== ws && client.readyState === 1) { // WebSocket.OPEN = 1
        client.send(message);
      }
    }
  });

  // Handle disconnections
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  // Send initial connection success message
  ws.send(JSON.stringify({ type: 'connection-success' }));
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on http://localhost:${PORT}`);
});
