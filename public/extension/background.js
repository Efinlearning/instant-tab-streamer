let socket = null;
let streamActive = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  try {
    socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
      console.log('WebSocket connected');
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      reconnectAttempts = 0;

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          sendStartCaptureMessage(tabs[0].id);
        }
      });
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      streamActive = false;
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(connectWebSocket, RECONNECT_DELAY);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  } catch (err) {
    console.error('WebSocket connection error:', err);
    setTimeout(connectWebSocket, RECONNECT_DELAY);
  }
}

function sendStartCaptureMessage(tabId) {
  chrome.tabs.sendMessage(tabId, { type: "start-capture" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Message error:", chrome.runtime.lastError.message);
      return;
    }

    if (response && response.success) {
      streamActive = true;
      chrome.action.setBadgeText({ text: 'REC' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'stream-started', tabId }));
      }
    }
  });
}

function sendStopCaptureMessage(tabId) {
  chrome.tabs.sendMessage(tabId, { type: "stop-capture" });
  streamActive = false;
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'stream-stopped', tabId }));
  }
}

connectWebSocket();

chrome.action.onClicked.addListener((tab) => {
  if (streamActive) {
    sendStopCaptureMessage(tab.id);
  } else {
    sendStartCaptureMessage(tab.id);
  }
});

chrome.tabs.onActivated.addListener(() => {
  if (streamActive) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        sendStopCaptureMessage(tabs[0].id);
        sendStartCaptureMessage(tabs[0].id);
      }
    });
  }
});

setInterval(() => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connectWebSocket();
  } else if (!streamActive) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        sendStartCaptureMessage(tabs[0].id);
      }
    });
  }
}, 5000);
