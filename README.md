
# Tab Stream Capture Project

This project consists of a Chrome extension that automatically captures tab content and streams it to a web application through WebSockets.

## Project Structure

- `/public/extension/` - Chrome extension files
- `/src/` - Web application source code
- `server.js` - WebSocket server for streaming

## Setup Instructions

### 1. Install Dependencies

```sh
npm install
```

### 2. Start the Servers

The project includes both a WebSocket server for streaming and a Vite development server for the web application. You can start both with a single command:

```sh
npm run start
```

This will start both servers:
- WebSocket server on port 8080
- Web application on port 3000

### 3. Install the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the `public/extension` folder
4. The extension icon should appear in your toolbar

## Usage

1. Navigate to the web application at http://localhost:3000
2. Click the extension icon in your browser toolbar to start/stop streaming
3. The current tab will be captured and streamed to the web application automatically

## How It Works

- The Chrome extension uses the `tabCapture` API to capture the current tab
- Captured media is sent via WebSocket to the server
- The server broadcasts the stream to all connected clients
- The web application receives and displays the stream

## Troubleshooting

- If the connection fails, check that both servers are running
- Make sure you're on a tab that can be captured (some tabs like chrome:// URLs cannot be captured)
- Check the browser console for error messages

## Development

- Web application is built with React, TypeScript, and Tailwind CSS
- Extension uses Chrome Extensions Manifest V3
- Communication happens via WebSockets (ws://localhost:8080)
