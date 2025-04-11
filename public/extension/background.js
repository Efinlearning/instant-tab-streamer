
// WebSocket connection
let socket = null;
let streamActive = false;
let mediaRecorder = null;
let captureStream = null;

// Connect to WebSocket server
function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return;
  }

  socket = new WebSocket('ws://localhost:8080');
  
  socket.onopen = () => {
    console.log('WebSocket connected');
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  };
  
  socket.onclose = () => {
    console.log('WebSocket disconnected');
    stopCapture();
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// Start tab capture
async function startCapture(tabId) {
  if (streamActive) {
    console.log('Stream already active');
    return;
  }

  try {
    // Connect to WebSocket if not already connected
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    }

    // Capture the tab
    captureStream = await chrome.tabCapture.capture({
      video: true,
      audio: true,
      videoConstraints: {
        mandatory: {
          minWidth: 1280,
          maxWidth: 1920,
          minHeight: 720,
          maxHeight: 1080,
          maxFrameRate: 30
        }
      }
    });

    if (!captureStream) {
      console.error('Failed to capture tab');
      return;
    }

    // Create media recorder
    mediaRecorder = new MediaRecorder(captureStream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      streamActive = false;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'stream-stopped' }));
      }
      chrome.action.setBadgeText({ text: 'ON' });
    };
    
    // Start recording
    mediaRecorder.start(100); // Send data every 100ms
    streamActive = true;
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'stream-started', tabId }));
    }
    
    console.log('Tab capture started');
  } catch (error) {
    console.error('Error starting capture:', error);
  }
}

// Stop tab capture
function stopCapture() {
  if (mediaRecorder && streamActive) {
    mediaRecorder.stop();
    streamActive = false;
  }
  
  if (captureStream) {
    captureStream.getTracks().forEach(track => track.stop());
    captureStream = null;
  }
  
  console.log('Tab capture stopped');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_CAPTURE') {
    startCapture(message.tabId);
    sendResponse({ success: true });
  } else if (message.action === 'STOP_CAPTURE') {
    stopCapture();
    sendResponse({ success: true });
  } else if (message.action === 'GET_STATUS') {
    sendResponse({
      isConnected: socket && socket.readyState === WebSocket.OPEN,
      isStreaming: streamActive
    });
  } else if (message.action === 'CONNECT_WEBSOCKET') {
    connectWebSocket();
    sendResponse({ success: true });
  }
  return true; // Required for async sendResponse
});

// Initialize connection when extension loads
connectWebSocket();
