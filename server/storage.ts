import { db } from "@db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  users,
  InsertUser,
  User,
  chats,
  chatMembers,
  messages,
  InsertMessage,
  Message,
  Chat,
  InsertChat,
  InsertChatMember
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "@db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Chat methods
  getChat(id: number): Promise<Chat | undefined>;
  getChatsByUserId(userId: number): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  addUserToChat(chatId: number, userId: number): Promise<void>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByChatId(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageStatus(messageId: number, status: string): Promise<void>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Chat methods
  async getChat(id: number): Promise<Chat | undefined> {
    const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    return result[0];
  }

  async getChatsByUserId(userId: number): Promise<Chat[]> {
    // Get all chats that the user is a member of
    const result = await db
      .select({
        chat: chats,
        lastMessage: {
          id: messages.id,
          content: messages.content,
          fileUrl: messages.fileUrl,
          createdAt: messages.createdAt,
          senderId: messages.senderId,
          status: messages.status
        }
      })
      .from(chatMembers)
      .innerJoin(chats, eq(chatMembers.chatId, chats.id))
      .leftJoin(
        messages,
        sql`${messages.id} = (
          SELECT id FROM ${messages._.name}
          WHERE ${messages.chatId} = ${chats.id}
          ORDER BY ${messages.createdAt} DESC
          LIMIT 1
        )`
      )
      .where(eq(chatMembers.userId, userId));

    // Format the results
    return result.map(({ chat, lastMessage }) => ({
      ...chat,
      lastMessage: lastMessage.id ? lastMessage : null,
      unreadCount: 0 // Placeholder, will be calculated below
    }));
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const result = await db.insert(chats).values(chat).returning();
    return result[0];
  }

  async addUserToChat(chatId: number, userId: number): Promise<void> {
    await db.insert(chatMembers).values({
      chatId,
      userId
    });
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async updateMessageStatus(messageId: number, status: string): Promise<void> {
    await db
      .update(messages)
      .set({ status })
      .where(eq(messages.id, messageId));
  }
}

// Create a singleton instance
export const storage = new DatabaseStorage();
