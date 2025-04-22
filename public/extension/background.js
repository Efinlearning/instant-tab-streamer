
// Global variables to track state
let streamActive = false;
let mediaRecorder = null;
let captureStream = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
let activeTabId = null;
let serverConnected = false;

// Initialize connection to server
function connectToServer() {
  console.log('Attempting to connect to server...');
  
  try {
    // Use fetch to check if server is available
    fetch('http://localhost:8080/health')
      .then(response => {
        if (response.ok) {
          console.log('Server is available');
          serverConnected = true;
          chrome.action.setBadgeText({ text: 'ON' });
          chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
          
          // After confirming server is available, attempt to start capture
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
              activeTabId = tabs[0].id;
              startCapture(tabs[0].id);
            }
          });
        }
      })
      .catch(error => {
        console.error('Server connection error:', error);
        serverConnected = false;
        chrome.action.setBadgeText({ text: 'ERR' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
        
        // Retry connection
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          setTimeout(connectToServer, RECONNECT_DELAY);
        }
      });
  } catch (err) {
    console.error('Connection attempt error:', err);
    setTimeout(connectToServer, RECONNECT_DELAY);
  }
}

// Function to start capturing the tab
function startCapture(tabId) {
  console.log('Starting capture for tab:', tabId);
  
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  
  if (captureStream) {
    captureStream.getTracks().forEach(track => track.stop());
    captureStream = null;
  }
  
  try {
    // Notify content script first (even though capture happens in background)
    notifyContentScript(tabId, "start-capture");
    
    // Use the tabCapture API to capture the tab
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
        console.error('Failed to capture tab - stream is null');
        chrome.action.setBadgeText({ text: 'ERR' });
        return;
      }
      
      // Store the stream
      captureStream = stream;
      
      // Create a media recorder
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Send the data to the content script
          chrome.tabs.sendMessage(tabId, {
            type: "capture-stream-data",
            data: event.data
          });
        }
      };
      
      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        streamActive = false;
        chrome.action.setBadgeText({ text: 'ERR' });
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect 100ms chunks
      
      // Update status
      streamActive = true;
      chrome.action.setBadgeText({ text: 'REC' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      console.log('Tab capture started successfully');
    });
  } catch (error) {
    console.error('Error starting capture:', error);
    chrome.action.setBadgeText({ text: 'ERR' });
  }
}

// Function to stop capturing
function stopCapture() {
  console.log('Stopping capture');
  
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  
  if (captureStream) {
    captureStream.getTracks().forEach(track => track.stop());
    captureStream = null;
  }
  
  streamActive = false;
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  
  if (activeTabId) {
    notifyContentScript(activeTabId, "stop-capture");
  }
}

// Helper function to send messages to content script
function notifyContentScript(tabId, messageType) {
  chrome.tabs.sendMessage(tabId, { type: messageType }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Message error:", chrome.runtime.lastError.message);
      // If content script isn't ready, we might need to inject it
      injectContentScriptIfNeeded(tabId);
      return;
    }
    
    console.log(`Content script notified: ${messageType}, response:`, response);
  });
}

// Helper to inject content script if needed
function injectContentScriptIfNeeded(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }).then(() => {
    console.log('Content script injected');
    // Try sending message again after injection
    setTimeout(() => {
      if (streamActive) {
        notifyContentScript(tabId, "start-capture");
      }
    }, 200);
  }).catch(err => {
    console.error('Failed to inject content script:', err);
  });
}

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  activeTabId = tab.id;
  if (streamActive) {
    stopCapture();
  } else {
    startCapture(tab.id);
  }
});

// Listen for tab activation changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
  if (streamActive) {
    stopCapture();
    setTimeout(() => {
      startCapture(activeInfo.tabId);
    }, 500);
  }
});

// Listen for content script messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "content-script-ready") {
    console.log('Content script is ready in tab:', sender.tab.id);
    if (streamActive && sender.tab.id === activeTabId) {
      // Restart capture in this tab if needed
      startCapture(sender.tab.id);
    }
    sendResponse({ received: true });
  }
  return true;
});

// Initial connection
connectToServer();

// Periodic connection check and capture state
setInterval(() => {
  if (!serverConnected) {
    connectToServer();
  } else if (!streamActive && activeTabId) {
    startCapture(activeTabId);
  }
}, 5000);
