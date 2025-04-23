
import { useEffect, useRef, useState } from "react";

interface VideoDisplayProps {
  socket: WebSocket | null;
  setIsStreaming: (streaming: boolean) => void;
}

const VideoDisplay = ({ socket, setIsStreaming }: VideoDisplayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lastBlobUrl, setLastBlobUrl] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

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
            if (data.type === 'stream-started') {
              console.log('Stream started from extension');
              setIsStreaming(true);
              setConnectionError(null);
            } else if (data.type === 'stream-stopped') {
              console.log('Stream stopped from extension');
              setIsStreaming(false);
            } else if (data.type === 'connection-success') {
              console.log('Successfully connected to server');
              setConnectionError(null);
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
      setConnectionError("Connection to server lost");
    };

    const handleError = (error: Event) => {
      console.error("WebSocket error:", error);
      setConnectionError("Error connecting to streaming server");
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
  }, [socket, setIsStreaming, lastBlobUrl]);

  return (
    <div className="relative aspect-video w-full bg-black rounded-md overflow-hidden">
      {connectionError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <p className="text-red-400 px-4 py-2 rounded-md">{connectionError}</p>
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
