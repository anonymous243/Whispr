import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { User } from "@shared/schema";

// Map to store client connections
interface Client {
  userId: number;
  socket: WebSocket;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  const httpServer = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  // Store connected clients
  const clients: Client[] = [];

  wss.on('connection', (socket: WebSocket) => {
    console.log('WebSocket client connected');
    let userId: number | null = null;

    socket.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle authentication
        if (message.type === 'auth' && message.data.userId) {
          userId = message.data.userId;
          clients.push({ userId, socket });
          console.log(`User ${userId} authenticated via WebSocket`);
        }
        
        // Handle pings
        else if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
        
        // Handle new messages
        else if (message.type === 'message' && userId) {
          // Save the message to the database
          if (message.data.chatId && message.data.content) {
            storage.createMessage({
              chatId: message.data.chatId,
              senderId: userId,
              content: message.data.content,
              fileUrl: message.data.fileUrl,
              status: 'sent'
            }).then(createdMessage => {
              // Broadcast to all members of the chat
              broadcastToChat(message.data.chatId, {
                type: 'message',
                data: createdMessage
              });
            });
          }
        }
        
        // Handle typing indicators
        else if (message.type === 'typing' && userId) {
          broadcastToChat(message.data.chatId, message, userId);
        }
      } 
      catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    socket.on('close', () => {
      console.log('WebSocket client disconnected');
      // Remove the client from our list
      const index = clients.findIndex(client => client.socket === socket);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Broadcast a message to all members of a chat except the sender
  function broadcastToChat(chatId: number, message: any, excludeUserId?: number) {
    // Get the chat to find members
    storage.getChat(chatId).then(chat => {
      if (!chat) {
        console.error(`Chat with ID ${chatId} not found`);
        return;
      }
      
      // Send message to all connected clients who are members of this chat
      clients.forEach(client => {
        if (
          client.socket.readyState === WebSocket.OPEN && 
          client.userId !== excludeUserId
        ) {
          client.socket.send(JSON.stringify(message));
        }
      });
    }).catch(err => {
      console.error('Error in broadcastToChat:', err);
    });
  }

  // API routes

  // Get all users (except the current user)
  app.get('/api/users', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const allUsers = await storage.getAllUsers();
      // Filter out the current user and remove password
      const users = allUsers
        .filter(user => user.id !== req.user!.id)
        .map(({ password, ...user }) => ({
          ...user,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`
        }));
      
      res.json(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Get all chats for the current user
  app.get('/api/chats', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const chats = await storage.getChatsByUserId(req.user!.id);
      
      // Add avatar URLs and online status
      const enhancedChats = chats.map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`,
        isOnline: Math.random() > 0.5 // For demo purposes
      }));
      
      res.json(enhancedChats);
    } catch (err) {
      console.error('Error fetching chats:', err);
      res.status(500).json({ message: 'Failed to fetch chats' });
    }
  });

  // Create a new direct chat
  app.post('/api/chats', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length !== 1) {
      return res.status(400).json({ message: 'Invalid request. Expected userIds array with one user.' });
    }

    try {
      const otherUserId = userIds[0];
      const otherUser = await storage.getUser(otherUserId);
      
      if (!otherUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create the chat
      const newChat = await storage.createChat({
        name: otherUser.username,
        type: 'direct',
        createdBy: req.user!.id
      });

      // Add both users to the chat
      await storage.addUserToChat(newChat.id, req.user!.id);
      await storage.addUserToChat(newChat.id, otherUserId);

      // Return the enhanced chat
      res.status(201).json({
        ...newChat,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newChat.name)}&background=random`,
        isOnline: Math.random() > 0.5 // For demo purposes
      });
    } catch (err) {
      console.error('Error creating chat:', err);
      res.status(500).json({ message: 'Failed to create chat' });
    }
  });

  // Create a new group chat
  app.post('/api/chats/group', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { name, userIds } = req.body;
    
    if (!name || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Invalid request. Name and userIds array required.' });
    }

    try {
      // Create the group chat
      const newChat = await storage.createChat({
        name,
        type: 'group',
        createdBy: req.user!.id
      });

      // Add the current user as a member
      await storage.addUserToChat(newChat.id, req.user!.id);
      
      // Add all the other users
      for (const userId of userIds) {
        await storage.addUserToChat(newChat.id, userId);
      }

      // Return the enhanced chat
      res.status(201).json({
        ...newChat,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newChat.name)}&background=random`,
        isGroup: true
      });
    } catch (err) {
      console.error('Error creating group chat:', err);
      res.status(500).json({ message: 'Failed to create group chat' });
    }
  });

  // Get messages for a chat
  app.get('/api/chats/:chatId/messages', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const chatId = parseInt(req.params.chatId);
    
    if (isNaN(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    try {
      const messages = await storage.getMessagesByChatId(chatId);
      
      // Update status of messages sent by others to 'read'
      for (const message of messages) {
        if (message.senderId !== req.user!.id && message.status !== 'read') {
          await storage.updateMessageStatus(message.id, 'read');
          message.status = 'read';
        }
      }
      
      res.json(messages);
    } catch (err) {
      console.error('Error fetching messages:', err);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Send a message
  app.post('/api/chats/:chatId/messages', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const chatId = parseInt(req.params.chatId);
    const { content, fileUrl } = req.body;
    
    if (isNaN(chatId) || !content) {
      return res.status(400).json({ message: 'Invalid request. Chat ID and content required.' });
    }

    try {
      const message = await storage.createMessage({
        chatId,
        senderId: req.user!.id,
        content,
        fileUrl,
        status: 'sent'
      });
      
      res.status(201).json(message);
    } catch (err) {
      console.error('Error sending message:', err);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  return httpServer;
}
