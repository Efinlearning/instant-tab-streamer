
import { WebSocketServer } from 'ws';
import http from 'http';

// Create HTTP server
const server = http.createServer((req, res) => {
  // Simple routing
  if (req.url === '/health') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else if (req.method === 'POST' && req.url === '/stream') {
    // Handle stream data from fetch/XHR
    console.log('Received stream data via HTTP POST');
    let data = [];
    
    req.on('data', (chunk) => {
      data.push(chunk);
    });
    
    req.on('end', () => {
      const buffer = Buffer.concat(data);
      // Forward the media data to all connected WebSocket clients
      for (const client of clients) {
        if (client.readyState === 1) { // WebSocket.OPEN = 1
          client.send(buffer);
        }
      }
      res.writeHead(200);
      res.end('Data received');
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Server Running');
  }
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
      // Check if the message is a string
      if (typeof message === 'string' || message instanceof Buffer) {
        // Forward the message to all connected clients except the sender
        for (const client of clients) {
          if (client !== ws && client.readyState === 1) { // WebSocket.OPEN = 1
            client.send(message);
          }
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
