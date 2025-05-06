import { createContext, ReactNode, useContext, useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "./use-websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Chat, Message, InsertMessage, User } from "@shared/schema";
import { useAuth } from "./use-auth";

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  sendMessage: (content: string, fileUrl?: string) => void;
  selectChat: (chatId: number) => void;
  createChat: (userIds: number[]) => void;
  createGroupChat: (name: string, userIds: number[]) => void;
  isSendingMessage: boolean;
  typingUsers: Record<number, string[]>;
  setTyping: (isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<number, string[]>>({});

  const { socket, connected } = useWebSocket();

  // Get all user chats
  const { data: chats = [], isLoading: isLoadingChats } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
    enabled: !!user,
  });

  // Get messages for the active chat
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/chats", activeChat?.id, "messages"],
    enabled: !!activeChat,
  });

  // Send a message
  const sendMessageMutation = useMutation({
    mutationFn: async (message: InsertMessage) => {
      if (!connected || !socket) {
        const res = await apiRequest("POST", `/api/chats/${message.chatId}/messages`, message);
        return await res.json();
      } else {
        socket.send(JSON.stringify({
          type: "message",
          data: message
        }));
        return message;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat?.id, "messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create a new chat
  const createChatMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const res = await apiRequest("POST", "/api/chats", { userIds });
      return await res.json();
    },
    onSuccess: (newChat: Chat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setActiveChat(newChat);
      toast({
        title: "Chat created",
        description: "You can now start messaging",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create a new group chat
  const createGroupChatMutation = useMutation({
    mutationFn: async ({ name, userIds }: { name: string; userIds: number[] }) => {
      const res = await apiRequest("POST", "/api/chats/group", { name, userIds });
      return await res.json();
    },
    onSuccess: (newChat: Chat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setActiveChat(newChat);
      toast({
        title: "Group created",
        description: `Group "${newChat.name}" has been created`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Select a chat
  const selectChat = useCallback((chatId: number) => {
    const chat = chats.find(c => c.id === chatId) || null;
    setActiveChat(chat);
  }, [chats]);

  // Send a message
  const sendMessage = useCallback((content: string, fileUrl?: string) => {
    if (!activeChat || !user || !content.trim()) return;
    
    const message: InsertMessage = {
      chatId: activeChat.id,
      senderId: user.id,
      content,
      fileUrl,
      status: "sent",
    };
    
    sendMessageMutation.mutate(message);
  }, [activeChat, user, sendMessageMutation]);

  // Create a chat
  const createChat = useCallback((userIds: number[]) => {
    if (!user) return;
    createChatMutation.mutate(userIds);
  }, [user, createChatMutation]);

  // Create a group chat
  const createGroupChat = useCallback((name: string, userIds: number[]) => {
    if (!user) return;
    createGroupChatMutation.mutate({ name, userIds });
  }, [user, createGroupChatMutation]);

  // Set typing status
  const setTyping = useCallback((isTyping: boolean) => {
    if (!socket || !connected || !activeChat || !user) return;
    
    socket.send(JSON.stringify({
      type: "typing",
      data: {
        chatId: activeChat.id,
        userId: user.id,
        username: user.username,
        isTyping
      }
    }));
  }, [socket, connected, activeChat, user]);

  // Handle incoming WebSocket messages
  useCallback(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "message") {
          queryClient.invalidateQueries({ queryKey: ["/api/chats", data.data.chatId, "messages"] });
          queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
        } 
        else if (data.type === "typing") {
          const { chatId, userId, username, isTyping } = data.data;
          
          setTypingUsers(prev => {
            const chatTypers = prev[chatId] || [];
            
            if (isTyping && !chatTypers.includes(username)) {
              return {
                ...prev,
                [chatId]: [...chatTypers, username]
              };
            } 
            else if (!isTyping) {
              return {
                ...prev,
                [chatId]: chatTypers.filter(name => name !== username)
              };
            }
            
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };
  }, [socket]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        isLoadingChats,
        isLoadingMessages,
        sendMessage,
        selectChat,
        createChat,
        createGroupChat,
        isSendingMessage: sendMessageMutation.isPending,
        typingUsers,
        setTyping
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
