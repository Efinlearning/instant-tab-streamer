const { spawn } = require('child_process');

// Start the WebSocket server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  shell: true
});

// Start the Vite dev server
const client = spawn('npx', ['vite', '--host', '::', '--port', '8080'], {
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
