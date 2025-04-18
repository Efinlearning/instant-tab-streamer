
// WebSocket connection
let socket = null;
let streamActive = false;
let mediaRecorder = null;
let captureStream = null;
let reconnectInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds
let autoConnectTimer = null;

// Connect to WebSocket server
function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return;
  }

  try {
    socket = new WebSocket('ws://localhost:8080');
    
    socket.onopen = () => {
      console.log('WebSocket connected');
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      reconnectAttempts = 0;
      
      // Auto-start capturing the current tab when connected
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          startCapture(tabs[0].id);
        }
      });
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
      stopCapture();
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      
      // Try to reconnect if not at max attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(connectWebSocket, RECONNECT_DELAY);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  } catch (error) {
    console.error('Error connecting to WebSocket:', error);
    // Schedule a reconnect
    setTimeout(connectWebSocket, RECONNECT_DELAY);
  }
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
      return; // Will be called again by onopen handler
    }

    console.log('Attempting to capture tab...');
    
    // Use the correct tabCapture API
    chrome.tabCapture.captureTab(
      {
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
      },
      function(stream) {
        if (!stream) {
          console.error('Failed to get media stream');
          return;
        }
        
        captureStream = stream;
        
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
      }
    );
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

// Function to auto-connect and start capturing
function setupAutoConnect() {
  // Clear any existing timer
  if (autoConnectTimer) {
    clearInterval(autoConnectTimer);
  }
  
  // Try to connect immediately
  connectWebSocket();
  
  // And then check every 10 seconds if we need to reconnect
  autoConnectTimer = setInterval(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    } else if (!streamActive) {
      // If connected but not streaming, try to start streaming
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          startCapture(tabs[0].id);
        }
      });
    }
  }, 10000); // Check every 10 seconds
}

// Initialize auto-connection and capture when extension loads
setupAutoConnect();

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  if (streamActive) {
    stopCapture();
  } else if (tab.id) {
    startCapture(tab.id);
  }
});

// Listen for tab changes to stop capture if necessary
chrome.tabs.onActivated.addListener(() => {
  if (streamActive) {
    stopCapture();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        startCapture(tabs[0].id);
      }
    });
  }
});

// Listen for messages from other extension components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_STATUS') {
    sendResponse({
      isConnected: socket && socket.readyState === WebSocket.OPEN,
      isStreaming: streamActive
    });
  } else if (message.action === 'CONNECT_WEBSOCKET') {
    connectWebSocket();
    sendResponse({ success: true });
  } else if (message.action === 'START_CAPTURE') {
    if (message.tabId) {
      startCapture(message.tabId);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No tab ID provided' });
    }
  } else if (message.action === 'STOP_CAPTURE') {
    stopCapture();
    sendResponse({ success: true });
  }
  return true; // Required for async sendResponse
});
