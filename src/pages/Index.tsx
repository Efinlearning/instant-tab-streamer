
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import VideoDisplay from "@/components/VideoDisplay";
import ConnectionStatus from "@/components/ConnectionStatus";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Create WebSocket connection
    const socket = new WebSocket("ws://localhost:8080");
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      toast({
        title: "Connected to server",
        description: "Ready to receive tab stream",
      });
    };

    socket.onclose = () => {
      setIsConnected(false);
      setIsStreaming(false);
      toast({
        title: "Disconnected from server",
        description: "WebSocket connection closed",
        variant: "destructive",
      });
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection error",
        description: "Failed to connect to the streaming server",
        variant: "destructive",
      });
    };

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [toast]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Tab Stream Viewer
          </h1>
          <p className="text-gray-400">
            View your currently captured Chrome tab stream
          </p>
        </header>

        <ConnectionStatus isConnected={isConnected} isStreaming={isStreaming} />

        <Card className="bg-gray-800 border-gray-700 p-4 rounded-lg overflow-hidden mt-6">
          <VideoDisplay 
            socket={socketRef.current} 
            setIsStreaming={setIsStreaming}
          />
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-400 mb-4">
            Make sure you have the Chrome Extension installed and activated on a tab.
          </p>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!isConnected}
            onClick={() => {
              toast({
                title: "Extension Information",
                description: "Check the extension popup for status and controls",
              });
            }}
          >
            Extension Info
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
