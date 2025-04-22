
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
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const { toast } = useToast();

  const connectWebSocket = () => {
    // Close existing connection if any
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      socketRef.current.close();
    }

    try {
      console.log('Attempting to connect WebSocket...');
      const socket = new WebSocket("ws://localhost:8080");
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setReconnectAttempt(0);
        toast({
          title: "Connected to server",
          description: "Ready to receive tab stream",
        });
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setIsStreaming(false);
        
        // Only show toast on first disconnect, not during retry attempts
        if (reconnectAttempt === 0) {
          toast({
            title: "Disconnected from server",
            description: "WebSocket connection closed, attempting to reconnect...",
            variant: "destructive",
          });
        }
        
        // Retry connection with increasing delay
        if (reconnectAttempt < 5) {
          const delay = Math.min(1000 * (reconnectAttempt + 1), 5000);
          setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connectWebSocket();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (reconnectAttempt === 0) {
          toast({
            title: "Connection error",
            description: "Failed to connect to the streaming server. Make sure the server is running on port 8080.",
            variant: "destructive",
          });
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  };

  // Initial connection
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        socketRef.current.close();
      }
    };
  }, [toast]);

  // Handle reconnect attempts
  useEffect(() => {
    if (reconnectAttempt > 0) {
      console.log(`Reconnect attempt ${reconnectAttempt}/5`);
    }
  }, [reconnectAttempt]);

  const handleManualReconnect = () => {
    setReconnectAttempt(0);
    connectWebSocket();
    toast({
      title: "Reconnecting",
      description: "Attempting to reconnect to the streaming server...",
    });
  };

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
          <div className="flex justify-center gap-4">
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleManualReconnect}
            >
              Reconnect to Server
            </Button>
            
            {!isConnected && reconnectAttempt > 0 && (
              <div className="mt-2 text-yellow-400">
                Reconnect attempt {reconnectAttempt}/5
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
