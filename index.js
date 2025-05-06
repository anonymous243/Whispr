var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// db/index.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  chatMembers: () => chatMembers,
  chatMembersRelations: () => chatMembersRelations,
  chats: () => chats,
  chatsRelations: () => chatsRelations,
  insertChatMemberSchema: () => insertChatMemberSchema,
  insertChatSchema: () => insertChatSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertUserSchema: () => insertUserSchema,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  status: text("status"),
  lastSeen: timestamp("last_seen", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});
var chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("direct"),
  // direct or group
  avatarUrl: text("avatar_url"),
  description: text("description"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
});
var chatMembers = pgTable("chat_members", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id),
  userId: integer("user_id").notNull().references(() => users.id),
  isAdmin: boolean("is_admin").default(false),
  joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
  leftAt: timestamp("left_at", { mode: "date" })
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  status: text("status").notNull().default("sent"),
  // sent, delivered, read
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
});
var usersRelations = relations(users, ({ many }) => ({
  messages: many(messages),
  chatMembers: many(chatMembers)
}));
var chatsRelations = relations(chats, ({ one, many }) => ({
  creator: one(users, {
    fields: [chats.createdBy],
    references: [users.id]
  }),
  members: many(chatMembers),
  messages: many(messages)
}));
var chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id]
  }),
  user: one(users, {
    fields: [chatMembers.userId],
    references: [users.id]
  })
}));
var messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id]
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  email: (schema) => schema.email("Must be a valid email address"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters")
}).omit({ id: true, createdAt: true });
var insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertChatMemberSchema = createInsertSchema(chatMembers).omit({
  id: true,
  joinedAt: true,
  leftAt: true
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});

// db/index.ts
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, asc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  // User methods
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  async createUser(user) {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }
  async getAllUsers() {
    return await db.select().from(users);
  }
  // Chat methods
  async getChat(id) {
    const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    return result[0];
  }
  async getChatsByUserId(userId) {
    const result = await db.select({
      chat: chats,
      lastMessage: {
        id: messages.id,
        content: messages.content,
        fileUrl: messages.fileUrl,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        status: messages.status
      }
    }).from(chatMembers).innerJoin(chats, eq(chatMembers.chatId, chats.id)).leftJoin(
      messages,
      sql`${messages.id} = (
          SELECT id FROM ${messages._.name}
          WHERE ${messages.chatId} = ${chats.id}
          ORDER BY ${messages.createdAt} DESC
          LIMIT 1
        )`
    ).where(eq(chatMembers.userId, userId));
    return result.map(({ chat, lastMessage }) => ({
      ...chat,
      lastMessage: lastMessage.id ? lastMessage : null,
      unreadCount: 0
      // Placeholder, will be calculated below
    }));
  }
  async createChat(chat) {
    const result = await db.insert(chats).values(chat).returning();
    return result[0];
  }
  async addUserToChat(chatId, userId) {
    await db.insert(chatMembers).values({
      chatId,
      userId
    });
  }
  // Message methods
  async getMessage(id) {
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  }
  async getMessagesByChatId(chatId) {
    return await db.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(asc(messages.createdAt));
  }
  async createMessage(message) {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }
  async updateMessageStatus(messageId, status) {
    await db.update(messages).set({ status }).where(eq(messages.id, messageId));
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "velvet-chat-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1e3
      // 30 days
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false, { message: "Incorrect username or password" });
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      if (!req.body.email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password)
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (err2) => {
        if (err2) {
          return next(err2);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/routes.ts
async function registerRoutes(app2) {
  setupAuth(app2);
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws"
  });
  const clients = [];
  wss.on("connection", (socket) => {
    console.log("WebSocket client connected");
    let userId = null;
    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "auth" && message.data.userId) {
          userId = message.data.userId;
          clients.push({ userId, socket });
          console.log(`User ${userId} authenticated via WebSocket`);
        } else if (message.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        } else if (message.type === "message" && userId) {
          if (message.data.chatId && message.data.content) {
            storage.createMessage({
              chatId: message.data.chatId,
              senderId: userId,
              content: message.data.content,
              fileUrl: message.data.fileUrl,
              status: "sent"
            }).then((createdMessage) => {
              broadcastToChat(message.data.chatId, {
                type: "message",
                data: createdMessage
              });
            });
          }
        } else if (message.type === "typing" && userId) {
          broadcastToChat(message.data.chatId, message, userId);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });
    socket.on("close", () => {
      console.log("WebSocket client disconnected");
      const index = clients.findIndex((client) => client.socket === socket);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    });
    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
  function broadcastToChat(chatId, message, excludeUserId) {
    storage.getChat(chatId).then((chat) => {
      if (!chat) {
        console.error(`Chat with ID ${chatId} not found`);
        return;
      }
      clients.forEach((client) => {
        if (client.socket.readyState === WebSocket.OPEN && client.userId !== excludeUserId) {
          client.socket.send(JSON.stringify(message));
        }
      });
    }).catch((err) => {
      console.error("Error in broadcastToChat:", err);
    });
  }
  app2.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const allUsers = await storage.getAllUsers();
      const users2 = allUsers.filter((user) => user.id !== req.user.id).map(({ password, ...user }) => ({
        ...user,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`
      }));
      res.json(users2);
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.get("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const chats2 = await storage.getChatsByUserId(req.user.id);
      const enhancedChats = chats2.map((chat) => ({
        ...chat,
        avatarUrl: chat.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`,
        isOnline: Math.random() > 0.5
        // For demo purposes
      }));
      res.json(enhancedChats);
    } catch (err) {
      console.error("Error fetching chats:", err);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });
  app2.post("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length !== 1) {
      return res.status(400).json({ message: "Invalid request. Expected userIds array with one user." });
    }
    try {
      const otherUserId = userIds[0];
      const otherUser = await storage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const newChat = await storage.createChat({
        name: otherUser.username,
        type: "direct",
        createdBy: req.user.id
      });
      await storage.addUserToChat(newChat.id, req.user.id);
      await storage.addUserToChat(newChat.id, otherUserId);
      res.status(201).json({
        ...newChat,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newChat.name)}&background=random`,
        isOnline: Math.random() > 0.5
        // For demo purposes
      });
    } catch (err) {
      console.error("Error creating chat:", err);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });
  app2.post("/api/chats/group", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { name, userIds } = req.body;
    if (!name || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Invalid request. Name and userIds array required." });
    }
    try {
      const newChat = await storage.createChat({
        name,
        type: "group",
        createdBy: req.user.id
      });
      await storage.addUserToChat(newChat.id, req.user.id);
      for (const userId of userIds) {
        await storage.addUserToChat(newChat.id, userId);
      }
      res.status(201).json({
        ...newChat,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newChat.name)}&background=random`,
        isGroup: true
      });
    } catch (err) {
      console.error("Error creating group chat:", err);
      res.status(500).json({ message: "Failed to create group chat" });
    }
  });
  app2.get("/api/chats/:chatId/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const chatId = parseInt(req.params.chatId);
    if (isNaN(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }
    try {
      const messages2 = await storage.getMessagesByChatId(chatId);
      for (const message of messages2) {
        if (message.senderId !== req.user.id && message.status !== "read") {
          await storage.updateMessageStatus(message.id, "read");
          message.status = "read";
        }
      }
      res.json(messages2);
    } catch (err) {
      console.error("Error fetching messages:", err);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/chats/:chatId/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const chatId = parseInt(req.params.chatId);
    const { content, fileUrl } = req.body;
    if (isNaN(chatId) || !content) {
      return res.status(400).json({ message: "Invalid request. Chat ID and content required." });
    }
    try {
      const message = await storage.createMessage({
        chatId,
        senderId: req.user.id,
        content,
        fileUrl,
        status: "sent"
      });
      res.status(201).json(message);
    } catch (err) {
      console.error("Error sending message:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@db": path.resolve(import.meta.dirname, "db"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
