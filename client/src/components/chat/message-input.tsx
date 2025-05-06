import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EmojiPicker from "@/components/ui/emoji-picker";
import { Paperclip, Send, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MessageInput() {
  const { activeChat, sendMessage, setTyping, isSendingMessage } = useChat();
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when chat changes
  useEffect(() => {
    if (activeChat && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [activeChat]);

  // Update the file preview when a file is selected
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  }, [selectedFile]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    // Reset the input to allow selecting the same file again
    e.target.value = "";
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    messageInputRef.current?.focus();
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Handle typing indicator
    if (activeChat) {
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set typing to true
      setTyping(true);
      
      // Set a timeout to set typing to false after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 2000);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSendMessage = () => {
    if (!activeChat || (!newMessage.trim() && !selectedFile)) return;
    
    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      setTyping(false);
    }

    // If we have a file, simulate file upload
    if (selectedFile) {
      // In a real app, you would upload the file to a server
      // and get a URL back. For now, we'll use the preview as the URL.
      const fakeFileUrl = filePreview;
      sendMessage(newMessage.trim(), fakeFileUrl || undefined);
    } else {
      sendMessage(newMessage.trim());
    }

    // Reset state
    setNewMessage("");
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!activeChat) {
    return null;
  }

  return (
    <div className="bg-white p-3 border-t border-mediumGray">
      {/* File preview */}
      {filePreview && (
        <div className="mb-3 relative inline-block">
          <img 
            src={filePreview} 
            alt="Selected file" 
            className="h-20 rounded-md object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemoveFile}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex items-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-charcoal hover:bg-lightGray rounded-full"
                onClick={handleAttachmentClick}
              >
                <Paperclip className="h-5 w-5" />
                <span className="sr-only">Attach File</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach File</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex-1 mx-2 bg-lightGray rounded-full px-4 py-2">
          <Input
            ref={messageInputRef}
            type="text"
            placeholder="Type a message"
            className="w-full bg-transparent border-none focus:outline-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-7 p-0"
            value={newMessage}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="rounded-full bg-primary text-white hover:bg-primary/90"
                onClick={handleSendMessage}
                disabled={isSendingMessage || (!newMessage.trim() && !selectedFile)}
              >
                <Send className="h-5 w-5" />
                <span className="sr-only">Send Message</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send Message</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
