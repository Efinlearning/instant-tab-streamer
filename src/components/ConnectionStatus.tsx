
import { Badge } from "@/components/ui/badge";

interface ConnectionStatusProps {
  isConnected: boolean;
  isStreaming: boolean;
}

const ConnectionStatus = ({ isConnected, isStreaming }: ConnectionStatusProps) => {
  return (
    <div className="flex items-center justify-center space-x-4">
      <div className="flex items-center">
        <Badge
          variant={isConnected ? "default" : "destructive"}
          className={`${
            isConnected ? "bg-green-600" : "bg-red-600"
          } text-white mr-2`}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </Badge>
        <span className="text-sm text-gray-400">WebSocket Server</span>
      </div>
      
      <div className="flex items-center">
        <Badge
          variant={isStreaming ? "default" : "outline"}
          className={`${
            isStreaming ? "bg-blue-600" : "bg-gray-700"
          } text-white mr-2`}
        >
          {isStreaming ? "Active" : "Inactive"}
        </Badge>
        <span className="text-sm text-gray-400">Tab Stream</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;
