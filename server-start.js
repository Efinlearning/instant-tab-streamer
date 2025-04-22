
import { spawn } from 'child_process';

console.log('Starting servers...');

// Start the WebSocket server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  shell: true
});

// Wait a moment for the WebSocket server to start before launching the client
setTimeout(() => {
  // Start the Vite dev server on a different port to avoid conflicts
  const client = spawn('npx', ['vite', '--host', '::', '--port', '3000'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle process termination for the client
  process.on('SIGINT', () => {
    console.log('Terminating servers...');
    server.kill('SIGINT');
    client.kill('SIGINT');
    process.exit();
  });

  console.log('Both WebSocket server and Vite dev server are now running');
}, 2000);

// Handle server process errors
server.on('error', (err) => {
  console.error('Server process error:', err);
});
