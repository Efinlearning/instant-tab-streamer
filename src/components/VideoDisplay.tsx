
import { useEffect, useRef } from "react";

interface VideoDisplayProps {
  socket: WebSocket | null;
  setIsStreaming: (streaming: boolean) => void;
}

const VideoDisplay = ({ socket, setIsStreaming }: VideoDisplayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages (binary video data)
    socket.onmessage = (event) => {
      if (event.data instanceof Blob) {
        // Convert blob to URL and set as video source
        const url = URL.createObjectURL(event.data);
        
        if (videoRef.current) {
          videoRef.current.srcObject = null; // Clear any existing source
          videoRef.current.src = url;
          videoRef.current.onloadeddata = () => {
            setIsStreaming(true);
            videoRef.current?.play();
          };
          
          // Clean up the object URL when the video source changes
          return () => {
            URL.revokeObjectURL(url);
          };
        }
      } else if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'stream-started') {
            console.log('Stream started from extension');
          } else if (data.type === 'stream-stopped') {
            setIsStreaming(false);
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      }
    };
  }, [socket, setIsStreaming]);

  return (
    <div className="relative aspect-video w-full bg-black rounded-md overflow-hidden">
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
