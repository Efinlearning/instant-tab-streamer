console.log('Tab Stream Capture content script loaded');

let mediaRecorder = null;
let captureStream = null;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.type);
  
  if (request.type === "start-capture") {
    // We need to respond immediately to keep the message port open
    sendResponse({ received: true });
    
    // Stop any existing capture
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    
    if (captureStream) {
      captureStream.getTracks().forEach(track => track.stop());
      captureStream = null;
    }
    
    // We can't directly use tabCapture API from content script,
    // so we'll just acknowledge the message
    console.log('Content script acknowledged start-capture request');
    return true;
  }

  if (request.type === "capture-stream-data") {
    // This message contains the captured stream data
    if (request.data) {
      try {
        console.log('Received stream data, forwarding to server');
        fetch('http://localhost:8080/stream', {
          method: 'POST',
          body: request.data,
          keepalive: true,
          headers: {
            'Content-Type': 'video/webm'
          }
        }).catch(err => {
          console.error('Error sending stream data:', err);
        });
      } catch (error) {
        console.error('Error processing stream data:', error);
      }
    }
    sendResponse({ received: true });
    return true;
  }

  if (request.type === "stop-capture") {
    console.log('Content script received stop-capture request');
    sendResponse({ stopped: true });
    return true;
  }
});

// Let the background script know that the content script is ready
chrome.runtime.sendMessage({ type: "content-script-ready" });
