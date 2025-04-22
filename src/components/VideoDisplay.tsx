
import { useEffect, useRef, useState } from "react";

interface VideoDisplayProps {
  socket: WebSocket | null;
  setIsStreaming: (streaming: boolean) => void;
}

const VideoDisplay = ({ socket, setIsStreaming }: VideoDisplayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lastBlobUrl, setLastBlobUrl] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!socket) {
      setConnectionError("Attempting to connect to server...");
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data instanceof Blob) {
          // Clean up previous blob URL if it exists
          if (lastBlobUrl) {
            URL.revokeObjectURL(lastBlobUrl);
          }

          // Convert blob to URL and set as video source
          const url = URL.createObjectURL(event.data);
          setLastBlobUrl(url);
          setConnectionError(null);
          
          if (videoRef.current) {
            videoRef.current.srcObject = null; // Clear any existing source
            videoRef.current.src = url;
            videoRef.current.onloadeddata = () => {
              setIsStreaming(true);
              videoRef.current?.play().catch(err => {
                console.error("Error playing video:", err);
                setConnectionError("Error playing video stream");
              });
            };
          }
        } else if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);
            
            if (data.type === 'connection-success') {
              console.log('Successfully connected to server');
              setConnectionError(null);
              setRetryCount(0);
            } else if (data.type === 'stream-started') {
              console.log('Stream started from extension');
              setIsStreaming(true);
              setConnectionError(null);
            } else if (data.type === 'stream-stopped') {
              console.log('Stream stopped from extension');
              setIsStreaming(false);
            }
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
        setConnectionError("Error processing stream data");
      }
    };

    const handleClose = () => {
      console.log("WebSocket connection closed");
      setIsStreaming(false);
      setConnectionError("Connection to server lost. Attempting to reconnect...");
      
      // Automatic retry logic
      if (retryCount < 5) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          // The actual reconnect will be handled by the parent component
        }, 2000);
      } else {
        setConnectionError("Could not connect to server after multiple attempts. Please check if the server is running.");
      }
    };

    const handleError = (error: Event) => {
      console.error("WebSocket error:", error);
      setConnectionError("Error connecting to streaming server. Make sure the server is running on port 8080.");
      setIsStreaming(false);
    };

    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);
    
    return () => {
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
      
      // Clean up blob URL on component unmount
      if (lastBlobUrl) {
        URL.revokeObjectURL(lastBlobUrl);
      }
    };
  }, [socket, setIsStreaming, lastBlobUrl, retryCount]);

  return (
    <div className="relative aspect-video w-full bg-black rounded-md overflow-hidden">
      {connectionError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70">
          <p className="text-yellow-400 text-xl mb-4">{connectionError}</p>
          {retryCount > 0 && (
            <p className="text-gray-400">Retry attempt {retryCount}/5</p>
          )}
        </div>
      )}
      
      {!socket && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400">Connecting to server...</p>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        controls
      />
    </div>
  );
};

export default VideoDisplay;
