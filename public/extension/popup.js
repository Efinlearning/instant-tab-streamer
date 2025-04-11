
document.addEventListener('DOMContentLoaded', function() {
  const connectBtn = document.getElementById('connect-btn');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const connectionStatus = document.getElementById('connection-status');
  const streamStatus = document.getElementById('stream-status');
  
  // Update UI based on current status
  function updateUI(status) {
    if (status.isConnected) {
      connectionStatus.textContent = 'Connected';
      connectionStatus.className = 'status-indicator connected';
      connectBtn.classList.add('disabled');
      startBtn.classList.remove('disabled');
    } else {
      connectionStatus.textContent = 'Disconnected';
      connectionStatus.className = 'status-indicator disconnected';
      connectBtn.classList.remove('disabled');
      startBtn.classList.add('disabled');
      stopBtn.classList.add('disabled');
    }
    
    if (status.isStreaming) {
      streamStatus.textContent = 'Active';
      streamStatus.className = 'status-indicator active';
      startBtn.classList.add('disabled');
      stopBtn.classList.remove('disabled');
    } else {
      streamStatus.textContent = 'Inactive';
      streamStatus.className = 'status-indicator inactive';
      if (status.isConnected) {
        startBtn.classList.remove('disabled');
      }
      stopBtn.classList.add('disabled');
    }
  }
  
  // Get current status when popup opens
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, function(response) {
    updateUI(response);
  });
  
  // Connect to WebSocket server
  connectBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'CONNECT_WEBSOCKET' }, function(response) {
      if (response.success) {
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'GET_STATUS' }, function(response) {
            updateUI(response);
          });
        }, 500);
      }
    });
  });
  
  // Start tab capture
  startBtn.addEventListener('click', function() {
    if (startBtn.classList.contains('disabled')) return;
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const tabId = tabs[0].id;
      chrome.runtime.sendMessage({ action: 'START_CAPTURE', tabId }, function(response) {
        if (response.success) {
          chrome.runtime.sendMessage({ action: 'GET_STATUS' }, function(response) {
            updateUI(response);
          });
        }
      });
    });
  });
  
  // Stop tab capture
  stopBtn.addEventListener('click', function() {
    if (stopBtn.classList.contains('disabled')) return;
    
    chrome.runtime.sendMessage({ action: 'STOP_CAPTURE' }, function(response) {
      if (response.success) {
        chrome.runtime.sendMessage({ action: 'GET_STATUS' }, function(response) {
          updateUI(response);
        });
      }
    });
  });
});
