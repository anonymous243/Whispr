import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useAuth } from "./use-auth";

interface WebSocketContextValue {
  socket: WebSocket | null;
  connected: boolean;
  error: string | null;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  socket: null,
  connected: false,
  error: null,
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) {
      // Cleanup on logout
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        const newSocket = new WebSocket(wsUrl);
        
        newSocket.onopen = () => {
          setConnected(true);
          setError(null);
          console.log("WebSocket connected");
          
          // Send auth message
          newSocket.send(JSON.stringify({
            type: "auth",
            data: { userId: user.id }
          }));
        };

        newSocket.onclose = () => {
          setConnected(false);
          console.log("WebSocket disconnected");
          
          // Try to reconnect after delay
          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (user) {
              connectWebSocket();
            }
          }, 3000);
        };

        newSocket.onerror = (event) => {
          setError("WebSocket connection error");
          console.error("WebSocket error:", event);
        };

        setSocket(newSocket);
      } catch (err) {
        setError("Failed to create WebSocket connection");
        console.error("WebSocket setup error:", err);
      }
    };

    connectWebSocket();

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socket) {
        socket.close();
      }
    };
  }, [user]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!socket || !connected) return;

    const interval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [socket, connected]);

  return (
    <WebSocketContext.Provider value={{ socket, connected, error }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
