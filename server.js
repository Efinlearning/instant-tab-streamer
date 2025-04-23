
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

  // Send confirmation message on connection
  ws.send(JSON.stringify({ type: 'connection-success' }));

  // Forward messages to all other clients
  ws.on('message', (message) => {
    try {
      // Forward the message to all connected clients except the sender
      for (const client of clients) {
        if (client !== ws && client.readyState === 1) { // WebSocket.OPEN = 1
          client.send(message);
        }
      }
    } catch (error) {
      console.error('Error forwarding message:', error);
    }
  });

  // Handle disconnections
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Handle server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on http://localhost:${PORT}`);
});

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});
