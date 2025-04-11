
# Tab Stream Capture Chrome Extension

This Chrome Extension automatically captures the current tab and streams it to a web application using WebSockets.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the extension folder
4. The extension icon should appear in your toolbar

## Usage

1. Click the extension icon to open the popup
2. Click "Connect to Server" to establish a WebSocket connection
3. Click "Start Streaming" to begin capturing the current tab
4. View the stream in the web application
5. Click "Stop Streaming" when done

## Requirements

- Chrome browser (version 92 or later)
- Running WebSocket server (provided with the web application)

## Permissions

- `tabCapture`: To capture the current tab
- `tabs`: To access tab information
- `activeTab`: To interact with the active tab
