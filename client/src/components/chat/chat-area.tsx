import { useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCheck, Image } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

export function ChatArea() {
  const { messages, activeChat, isLoadingMessages, typingUsers } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-lightGray">
        <div className="text-center p-6">
          <h3 className="text-xl font-medium text-charcoal mb-2">
            Welcome to Velvet Chat
          </h3>
          <p className="text-muted-foreground">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    );
  }

  // Display loading skeleton
  if (isLoadingMessages) {
    return (
      <div className="flex-1 p-4 bg-lightGray overflow-y-auto">
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className={`flex ${index % 2 === 0 ? "justify-end" : ""}`}
            >
              {index % 2 !== 0 && (
                <Skeleton className="h-8 w-8 rounded-full mr-2" />
              )}
              <Skeleton
                className={`h-20 w-64 rounded-lg ${
                  index % 2 === 0 ? "bg-blue-100" : "bg-white"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const chatAreaStyle = {
    backgroundImage: `url('https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80&blend=DDDDDD&blend-alpha=10&blend-mode=normal')`,
    backgroundSize: "200px",
    backgroundRepeat: "repeat",
  };

  // Get chat typing users for this chat
  const chatTypers = typingUsers[activeChat.id] || [];

  return (
    <ScrollArea
      className="flex-1 p-4 overflow-y-auto"
      style={chatAreaStyle}
    >
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to send a message!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isSentByMe = message.senderId === user?.id;
            
            return (
              <div
                key={message.id}
                className={`flex flex-col space-y-1 mb-4 ${
                  isSentByMe ? "items-end" : "items-start"
                }`}
              >
                <div className={`flex ${isSentByMe ? "justify-end" : ""}`}>
                  {!isSentByMe && (
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={message.sender?.avatarUrl} alt={message.sender?.username} />
                      <AvatarFallback>
                        {message.sender?.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`py-2 px-3 max-w-xs md:max-w-md shadow-sm ${
                      isSentByMe
                        ? "bg-blue-50 rounded-lg rounded-br-none"
                        : "bg-white rounded-lg rounded-bl-none"
                    }`}
                  >
                    {message.fileUrl && (
                      <div className="mb-2">
                        <img
                          src={message.fileUrl}
                          alt="Shared image"
                          className="rounded-md w-full object-cover max-h-48"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/300x200?text=Failed+to+load";
                          }}
                        />
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <div
                      className={`flex ${
                        isSentByMe ? "justify-end" : ""
                      } items-center mt-1 space-x-1`}
                    >
                      <span className="text-xs text-darkGray">
                        {formatDistanceToNow(new Date(message.createdAt), {
                          addSuffix: false,
                        })}
                      </span>
                      {isSentByMe && (
                        <CheckCheck
                          className={`h-3 w-3 ${
                            message.status === "read"
                              ? "text-success"
                              : "text-gray-400"
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {chatTypers.length > 0 && (
          <div className="flex mb-4">
            <div className="bg-white py-2 px-4 inline-flex items-center rounded-lg rounded-bl-none shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-darkGray rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-darkGray rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-darkGray rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
              <span className="ml-2 text-xs text-darkGray">
                {chatTypers.length === 1
                  ? `${chatTypers[0]} is typing...`
                  : `${chatTypers.length} people are typing...`}
              </span>
            </div>
          </div>
        )}

        {/* This empty div is for scrolling to bottom */}
        <div ref={messagesEndRef}></div>
      </div>
    </ScrollArea>
  );
}
