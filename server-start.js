
import { spawn } from 'child_process';

// Start the WebSocket server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  shell: true
});

// Start the Vite dev server on a different port to avoid conflicts
const client = spawn('npx', ['vite', '--host', '::', '--port', '3000'], {
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
