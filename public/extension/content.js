let mediaRecorder = null;
let captureStream = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "start-capture") {
    chrome.tabCapture.capture(
      {
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
      },
      (stream) => {
        if (!stream) {
          console.error("Failed to capture tab");
          sendResponse({ success: false });
          return;
        }

        captureStream = stream;
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2500000
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            // Relay via service worker using chrome.runtime.sendMessage if needed
            navigator.sendBeacon("http://localhost:8080/stream", event.data);
          }
        };

        mediaRecorder.start(100);
        sendResponse({ success: true });
      }
    );
    return true;
  }

  if (request.type === "stop-capture") {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    if (captureStream) {
      captureStream.getTracks().forEach(track => track.stop());
      captureStream = null;
    }

    return true;
  }
});
