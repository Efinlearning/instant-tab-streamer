// background.js
let socket = null;
let streamActive = false;
let mediaRecorder = null;
let captureStream = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// WebSocket Connection Management
function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  try {
    socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
      console.log('WebSocket connected');
      updateBadgeStatus('connected');
      reconnectAttempts = 0;
      
      // Start capture if we're reconnecting
      if (streamActive) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            startTabCapture(tabs[0].id);
          }
        });
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      updateBadgeStatus('disconnected');
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(connectWebSocket, RECONNECT_DELAY);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      updateBadgeStatus('error');
    };
  } catch (err) {
    console.error('WebSocket connection error:', err);
    setTimeout(connectWebSocket, RECONNECT_DELAY);
  }
}

// Tab Capture Functions
function startTabCapture(tabId) {
  chrome.tabCapture.capture({
    audio: true,
    video: true,
    videoConstraints: {
      mandatory: {
        minWidth: 1280,
        minHeight: 720,
        maxWidth: 1920,
        maxHeight: 1080
      }
    }
  }, (stream) => {
    if (!stream) {
      console.error("Failed to capture tab");
      return;
    }

    captureStream = stream;
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000
    });

    mediaRecorder.ondataavailable = (event) => {
      if (socket?.readyState === WebSocket.OPEN && event.data.size > 0) {
        socket.send(event.data);
      }
    };

    mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
      stopTabCapture();
    };

    mediaRecorder.start(100); // Send data every 100ms
    streamActive = true;
    updateBadgeStatus('recording');
    
    // Notify the server
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ 
        type: 'stream-status', 
        status: 'started',
        tabId
      }));
    }
  });
}

function stopTabCapture() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  if (captureStream) {
    captureStream.getTracks().forEach(track => track.stop());
    captureStream = null;
  }

  streamActive = false;
  updateBadgeStatus('connected');
  
  // Notify the server
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: 'stream-status', 
      status: 'stopped'
    }));
  }
}

// UI Helpers
function updateBadgeStatus(status) {
  switch (status) {
    case 'connected':
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      break;
    case 'disconnected':
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      break;
    case 'recording':
      chrome.action.setBadgeText({ text: 'REC' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF9800' });
      break;
    case 'error':
      chrome.action.setBadgeText({ text: 'ERR' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      break;
  }
}

// Event Listeners
chrome.action.onClicked.addListener((tab) => {
  if (streamActive) {
    stopTabCapture();
  } else {
    startTabCapture(tab.id);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (streamActive) {
    stopTabCapture();
    startTabCapture(activeInfo.tabId);
  }
});

// Health Check
setInterval(() => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connectWebSocket();
  }
}, 5000);

// Initial connection
connectWebSocket();
