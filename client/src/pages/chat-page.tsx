import { useEffect } from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatArea } from "@/components/chat/chat-area";
import { MessageInput } from "@/components/chat/message-input";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";

export default function ChatPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Velvet Chat - Messages</title>
        <meta 
          name="description" 
          content="Securely message your contacts with Velvet Chat. Send texts, images, and create group chats all in one place."
        />
        <meta property="og:title" content="Velvet Chat - Modern Messaging" />
        <meta 
          property="og:description" 
          content="Connect with friends and colleagues with our secure messaging platform"
        />
      </Helmet>
      <div className="flex h-screen overflow-hidden bg-lightGray">
        {/* Chat Sidebar */}
        <ChatSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen">
          {/* Chat Header */}
          <ChatHeader />

          {/* Chat Area */}
          <ChatArea />

          {/* Message Input */}
          <MessageInput />
        </div>
      </div>
    </>
  );
}
