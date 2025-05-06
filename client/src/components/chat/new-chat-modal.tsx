import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@/hooks/use-chat";
import { User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, User as UserIcon } from "lucide-react";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [groupName, setGroupName] = useState("");
  const [activeTab, setActiveTab] = useState<string>("direct");
  const { createChat, createGroupChat } = useChat();

  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  // Filter users based on search term
  const filteredUsers = searchTerm
    ? users.filter((user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedUsers([]);
      setGroupName("");
      setActiveTab("direct");
    }
  }, [isOpen]);

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleStartChat = () => {
    if (activeTab === "direct" && selectedUsers.length === 1) {
      createChat(selectedUsers);
      onClose();
    } else if (activeTab === "group" && selectedUsers.length > 0 && groupName.trim()) {
      createGroupChat(groupName.trim(), selectedUsers);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Select contacts to start a conversation
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="direct"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full mt-2"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Direct Message
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group Chat
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="flex items-center bg-lightGray rounded-md px-3 py-2 mb-4">
              <Search className="text-charcoal h-4 w-4 mr-2" />
              <Input
                type="text"
                placeholder="Search contacts"
                className="bg-transparent border-none focus:outline-none flex-1 text-sm h-7 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <TabsContent value="direct" className="mt-0">
              <ScrollArea className="h-[300px] pr-4">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center p-3 hover:bg-lightGray rounded-md cursor-pointer ${
                        selectedUsers.includes(user.id) ? "bg-lightGray" : ""
                      }`}
                      onClick={() => {
                        // For direct messages, we can only select one user
                        setSelectedUsers([user.id]);
                      }}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={user.avatarUrl} alt={user.username} />
                        <AvatarFallback>
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{user.username}</h4>
                        <p className="text-xs text-darkGray">
                          {user.status || "No status"}
                        </p>
                      </div>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        className="ml-2"
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No contacts found
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="group" className="mt-0">
              <div className="mb-4">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Label>Select Members</Label>
              <ScrollArea className="h-[240px] mt-2 pr-4">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center p-3 hover:bg-lightGray rounded-md cursor-pointer ${
                        selectedUsers.includes(user.id) ? "bg-lightGray" : ""
                      }`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={user.avatarUrl} alt={user.username} />
                        <AvatarFallback>
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{user.username}</h4>
                        <p className="text-xs text-darkGray">
                          {user.status || "No status"}
                        </p>
                      </div>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        className="ml-2"
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No contacts found
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="sm:justify-end mt-4">
          <Button variant="outline" onClick={onClose} className="mr-2">
            Cancel
          </Button>
          <Button
            onClick={handleStartChat}
            disabled={
              (activeTab === "direct" && selectedUsers.length !== 1) ||
              (activeTab === "group" && (selectedUsers.length === 0 || !groupName.trim()))
            }
          >
            {activeTab === "direct" ? "Start Chat" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
