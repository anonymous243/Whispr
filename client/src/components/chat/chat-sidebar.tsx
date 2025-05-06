import { useState, useEffect, useRef } from "react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NewChatModal } from "./new-chat-modal";
import { MoreVertical, Search, UserPlus, LogOut, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMobile } from "@/hooks/use-mobile";

export function ChatSidebar() {
  const { chats, selectChat, activeChat } = useChat();
  const { user, logoutMutation } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isMobile = useMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Filter chats based on search term
  const filteredChats = searchTerm
    ? chats.filter(chat => 
        chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : chats;

  // Close sidebar on mobile when chat is selected
  useEffect(() => {
    if (isMobile && activeChat) {
      setIsSidebarOpen(false);
    }
  }, [activeChat, isMobile]);

  return (
    <>
      <div 
        ref={sidebarRef}
        className={`bg-white w-full md:w-80 flex-shrink-0 border-r border-mediumGray shadow-sm 
          md:relative fixed inset-0 z-40 transition-transform duration-300 transform 
          ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'} 
          md:translate-x-0 flex flex-col h-full`}
      >
        {/* App Header */}
        <div className="bg-primary text-white p-4 flex justify-between items-center shadow-md">
          <h1 className="text-xl font-semibold">Velvet Chat</h1>
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setShowNewChatModal(true)}
            >
              <UserPlus className="h-5 w-5" />
              <span className="sr-only">New Chat</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <MoreVertical className="h-5 w-5" />
                  <span className="sr-only">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-white border-b border-mediumGray">
          <div className="flex items-center bg-lightGray rounded-full px-3 py-1.5">
            <Search className="text-charcoal h-5 w-5 mr-2" />
            <Input
              type="text"
              placeholder="Search or start new chat"
              className="bg-transparent border-none focus:outline-none flex-1 text-sm h-7 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1 overflow-y-auto">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`hover:bg-lightGray border-b border-mediumGray cursor-pointer transition ${
                  activeChat?.id === chat.id ? "bg-lightGray" : ""
                }`}
                onClick={() => selectChat(chat.id)}
              >
                <div className="flex items-center p-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={chat.avatarUrl} alt={chat.name} />
                      <AvatarFallback>
                        {chat.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-base">{chat.name}</h3>
                      <span className="text-xs text-darkGray">
                        {chat.lastMessage?.createdAt && 
                          formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: false })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm text-charcoal truncate w-48">
                        {chat.lastMessage?.content || "No messages yet"}
                      </p>
                      {chat.unreadCount > 0 && (
                        <div className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              {searchTerm ? "No chats found" : "No chats yet"}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
      />

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Mobile menu toggle button - visible only on chat view */}
      {isMobile && activeChat && !isSidebarOpen && (
        <Button
          size="icon"
          variant="ghost"
          className="fixed top-3 left-3 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <span className="sr-only">Open menu</span>
        </Button>
      )}
    </>
  );
}
