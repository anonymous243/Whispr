import { useChat } from "@/hooks/use-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Video, Phone, MoreVertical, Info, Users, Trash } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";

export function ChatHeader() {
  const { activeChat } = useChat();
  const isMobile = useMobile();

  if (!activeChat) {
    return (
      <div className="bg-white p-3 flex items-center justify-between border-b border-mediumGray shadow-sm h-16">
        <div className="text-center w-full text-muted-foreground">
          Select a chat to start messaging
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-3 flex items-center justify-between border-b border-mediumGray shadow-sm">
      <div className="flex items-center">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={activeChat.avatarUrl} alt={activeChat.name} />
            <AvatarFallback>{activeChat.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {activeChat.isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-white"></span>
          )}
        </div>
        <div className="ml-3">
          <h2 className="font-medium">{activeChat.name}</h2>
          <p className="text-xs text-success">{activeChat.isOnline ? "Online" : "Offline"}</p>
        </div>
      </div>
      <div className="flex space-x-1">
        {!isMobile && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-lightGray text-charcoal"
              title="Video call"
            >
              <Video className="h-5 w-5" />
              <span className="sr-only">Video Call</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-lightGray text-charcoal"
              title="Voice call"
            >
              <Phone className="h-5 w-5" />
              <span className="sr-only">Voice Call</span>
            </Button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-lightGray text-charcoal"
            >
              <MoreVertical className="h-5 w-5" />
              <span className="sr-only">More Options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isMobile && (
              <>
                <DropdownMenuItem>
                  <Video className="mr-2 h-4 w-4" />
                  <span>Video Call</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Phone className="mr-2 h-4 w-4" />
                  <span>Voice Call</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem>
              <Info className="mr-2 h-4 w-4" />
              <span>Contact Info</span>
            </DropdownMenuItem>
            {activeChat.isGroup && (
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                <span>Group Members</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              <span>Clear Chat</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
