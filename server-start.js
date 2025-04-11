
const { spawn } = require('child_process');
const path = require('path');

// Start the WebSocket server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  shell: true
});

// Start the Vite dev server
const client = spawn('vite', ['--host', '::', '--port', '3000'], {
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  server.kill('SIGINT');
  client.kill('SIGINT');
  process.exit();
});

console.log('WebSocket server and Vite dev server started');
