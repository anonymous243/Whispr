import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Starting database seeding...");

    // Check if users already exist to avoid duplicates
    const existingUsers = await db.select().from(schema.users);
    if (existingUsers.length > 0) {
      console.log("Database already has users, skipping seed.");
      return;
    }

    // Create test users
    console.log("Creating users...");
    const hashedPassword = await hashPassword("password123");
    
    const users = await db.insert(schema.users).values([
      {
        username: "sarah_johnson",
        email: "sarah@example.com",
        password: hashedPassword,
        status: "Working on designs",
      },
      {
        username: "michael_chen",
        email: "michael@example.com",
        password: hashedPassword,
        status: "Available",
      },
      {
        username: "jessica_miller",
        email: "jessica@example.com",
        password: hashedPassword,
        status: "In a meeting",
      },
      {
        username: "david_williams",
        email: "david@example.com",
        password: hashedPassword,
        status: "Out of office",
      }
    ]).returning();

    console.log(`Created ${users.length} users`);

    // Create direct chats
    console.log("Creating chats...");
    const directChats = await db.insert(schema.chats).values([
      {
        name: "Sarah Johnson",
        type: "direct",
        createdBy: users[1].id, // Michael
      },
      {
        name: "Michael Chen",
        type: "direct",
        createdBy: users[0].id, // Sarah
      },
      {
        name: "Jessica Miller",
        type: "direct",
        createdBy: users[0].id, // Sarah
      },
      {
        name: "David Williams",
        type: "direct",
        createdBy: users[0].id, // Sarah
      }
    ]).returning();

    // Create a group chat
    const groupChat = await db.insert(schema.chats).values({
      name: "Design Team",
      type: "group",
      description: "For design discussions",
      createdBy: users[0].id, // Sarah
    }).returning();

    console.log(`Created ${directChats.length} direct chats and ${groupChat.length} group chats`);

    // Add members to chats
    console.log("Adding chat members...");
    
    // For direct chats, add both participants
    await db.insert(schema.chatMembers).values([
      // Sarah & Michael
      { chatId: directChats[0].id, userId: users[0].id },
      { chatId: directChats[0].id, userId: users[1].id },
      
      // Michael & Sarah
      { chatId: directChats[1].id, userId: users[1].id },
      { chatId: directChats[1].id, userId: users[0].id },
      
      // Sarah & Jessica
      { chatId: directChats[2].id, userId: users[0].id },
      { chatId: directChats[2].id, userId: users[2].id },
      
      // Sarah & David
      { chatId: directChats[3].id, userId: users[0].id },
      { chatId: directChats[3].id, userId: users[3].id },
    ]);

    // For group chat, add all users
    await db.insert(schema.chatMembers).values([
      { chatId: groupChat[0].id, userId: users[0].id, isAdmin: true },
      { chatId: groupChat[0].id, userId: users[1].id },
      { chatId: groupChat[0].id, userId: users[2].id },
      { chatId: groupChat[0].id, userId: users[3].id },
    ]);

    // Add messages to chats
    console.log("Adding messages...");

    // Messages between Sarah and Michael
    await db.insert(schema.messages).values([
      {
        chatId: directChats[0].id,
        senderId: users[1].id, // Michael
        content: "Hi Sarah, how are you? Just wondering if you've had a chance to look at the project brief I sent yesterday.",
        status: "read",
      },
      {
        chatId: directChats[0].id,
        senderId: users[0].id, // Sarah
        content: "Hi! I'm good, thanks for asking. Yes, I did review the brief and I have some thoughts about the direction we should take.",
        status: "read",
      },
      {
        chatId: directChats[0].id,
        senderId: users[0].id, // Sarah
        content: "I think we should focus more on the user experience aspects rather than just the visual design. The client mentioned several pain points in their current workflow.",
        status: "read",
      },
      {
        chatId: directChats[0].id,
        senderId: users[1].id, // Michael
        content: "That makes a lot of sense. Could you share some specific pain points that we should address first?",
        status: "read",
      },
      {
        chatId: directChats[0].id,
        senderId: users[0].id, // Sarah
        content: "Sure! The main issues are:",
        status: "read",
      },
      {
        chatId: directChats[0].id,
        senderId: users[0].id, // Sarah
        content: "1. Complicated navigation - users get lost in the app\n2. Too many clicks to complete common tasks\n3. Confusing feedback after actions\n4. Performance issues on mobile devices",
        status: "read",
      },
      {
        chatId: directChats[0].id,
        senderId: users[0].id, // Sarah
        content: "Here's a rough sketch I made of potential improvements to the navigation.",
        fileUrl: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300",
        status: "read",
      },
      {
        chatId: directChats[0].id,
        senderId: users[1].id, // Michael
        content: "This looks great! I like the simplified menu structure. Can you send me the project files when you get a chance?",
        status: "delivered",
      },
    ]);

    // Group chat messages
    await db.insert(schema.messages).values([
      {
        chatId: groupChat[0].id,
        senderId: users[0].id, // Sarah
        content: "Hey team, I've created this group for our design discussions.",
        status: "read",
      },
      {
        chatId: groupChat[0].id,
        senderId: users[2].id, // Jessica
        content: "Great idea! This will make collaboration much easier.",
        status: "read",
      },
      {
        chatId: groupChat[0].id,
        senderId: users[1].id, // Michael
        content: "Perfect timing. I was just about to share the latest mockups for the dashboard.",
        status: "read",
      },
      {
        chatId: groupChat[0].id,
        senderId: users[3].id, // David
        content: "Looking forward to seeing them!",
        status: "read",
      },
    ]);

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}

seed();
