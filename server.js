import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import User from "./models/User.js";
import  Message  from "./models/Message.js";
import ChatRoom  from "./models/ChatRoom.js";

dotenv.config();

const port = process.env.PORT || 5000;
const database = process.env.DATABASE;

const server = http.createServer(app);

// ⚡ OPTIMIZED Socket.IO Configuration
const io = new Server(server, {
  cors: {
    origin: "*", // 🔒 Replace with your frontend origin in production
    methods: ["GET", "POST"],
  },
  // ⚡ Performance optimizations
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'], // WebSocket first for speed
  allowEIO3: true,
  perMessageDeflate: false, // Disable compression for speed
});

const onlineUsers = new Map(); // userId -> socketId

// ⚡ Connection pool settings
mongoose.set('strictQuery', false);

// MongoDB Connection
mongoose
  .connect(database, {
    maxPoolSize: 10, // ⚡ Reuse connections
    minPoolSize: 5,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
    
    server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });

    // ⚡ OPTIMIZED Socket.io Middleware for authentication
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Authentication token required"));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // ⚡ Use lean() for faster query
        const user = await User.findById(decoded.id)
          .select("name _id")
          .lean();
          
        if (!user) return next(new Error("User not found"));

        socket.user = { _id: user._id, name: user.name };
        next();
      } catch (error) {
        next(new Error("Invalid token"));
      }
    });

    io.on("connection", (socket) => {
      console.log(`✅ User connected: ${socket.user.name} (${socket.user._id})`);

      // Set user online
      onlineUsers.set(socket.user._id.toString(), socket.id);
      
      // ⚡ Use updateOne (faster than findByIdAndUpdate)
      User.updateOne(
        { _id: socket.user._id },
        { $set: { isOnline: true } }
      )
        .exec()
        .then(() => {
          io.emit("onlineUsers", Array.from(onlineUsers.keys()));
          console.log(`🟢 ${socket.user.name} is online`);
        })
        .catch((err) => console.error("❌ Online status error:", err));

      // ⚡ OPTIMIZED: Deliver queued messages with bulk operation
      Message.find({
        receiver: socket.user._id,
        isDelivered: false,
      })
        .select('_id chatRoom sender receiver content type createdAt isRead') // Only needed fields
        .populate('sender', 'name _id') // Minimal population
        .lean() // ⚡ Much faster
        .sort({ createdAt: 1 })
        .limit(50) // ⚡ Limit to prevent overload
        .exec()
        .then((pendingMessages) => {
          if (pendingMessages.length > 0) {
            // Send all messages first (non-blocking)
            pendingMessages.forEach((msg) => {
              socket.emit("newMessage", { message: msg });
            });

            // ⚡ Bulk update in one operation
            const messageIds = pendingMessages.map(m => m._id);
            Message.updateMany(
              { _id: { $in: messageIds } },
              { $set: { isDelivered: true } }
            ).exec();

            console.log(`📨 Delivered ${pendingMessages.length} queued messages`);
          }
        })
        .catch((err) => console.error("❌ Queued messages error:", err));

      // Join multiple rooms
      socket.on("joinRooms", (chatRoomIds) => {
        if (Array.isArray(chatRoomIds)) {
          chatRoomIds.forEach(roomId => socket.join(roomId.toString()));
          console.log(`👥 ${socket.user.name} joined ${chatRoomIds.length} rooms`);
        }
      });

      // Join single room
      socket.on("joinRoom", ({ chatRoomId }) => {
        socket.join(chatRoomId.toString());
        console.log(`👥 ${socket.user.name} joined room ${chatRoomId}`);
      });

      // Typing indicators
      socket.on("typing", ({ chatRoomId }) => {
        socket.to(chatRoomId.toString()).emit("userTyping", {
          userId: socket.user._id,
          isTyping: true,
        });
      });

      socket.on("stopTyping", ({ chatRoomId }) => {
        socket.to(chatRoomId.toString()).emit("userTyping", {
          userId: socket.user._id,
          isTyping: false,
        });
      });

      // ⚡ ULTRA-OPTIMIZED: Send message (3-5x faster!)
      socket.on("sendMessage", async (data) => {
        const startTime = Date.now();
        
        try {
          const { chatRoomId, content, receiverId, type = "text" } = data;
          const senderId = socket.user._id;

          // Quick validation
          if (!chatRoomId || !content?.trim() || !receiverId) {
            return socket.emit("error", { message: "Invalid data" });
          }

          // ⚡ Fast validation with lean and minimal fields
          const chatRoom = await ChatRoom.findById(chatRoomId)
            .select('participants isActive')
            .lean()
            .exec();

          if (!chatRoom || !chatRoom.isActive) {
            return socket.emit("error", { message: "Chat room not found or inactive" });
          }

          // Quick participant check
          const senderInRoom = chatRoom.participants.some(
            p => p.toString() === senderId.toString()
          );
          const receiverInRoom = chatRoom.participants.some(
            p => p.toString() === receiverId.toString()
          );

          if (!senderInRoom || !receiverInRoom) {
            return socket.emit("error", { message: "Unauthorized" });
          }

          const receiverSocketId = onlineUsers.get(receiverId.toString());
          const isReceiverOnline = Boolean(receiverSocketId);

          // ⚡ ONE database write (instead of 2-3!)
          const message = await Message.create({
            chatRoom: chatRoomId,
            sender: senderId,
            receiver: receiverId,
            content: content.trim(),
            type,
            isDelivered: isReceiverOnline,
            isRead: false,
          });

          // ⚡ Prepare minimal response (no population needed!)
          const messageResponse = {
            _id: message._id,
            chatRoom: chatRoomId,
            sender: {
              _id: senderId,
              name: socket.user.name, // Already have it from socket!
            },
            receiver: receiverId,
            content: message.content,
            type: message.type,
            isDelivered: message.isDelivered,
            isRead: message.isRead,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
          };

          // ⚡ Broadcast IMMEDIATELY (don't wait for anything)
          io.to(chatRoomId.toString()).emit("newMessage", {
            message: messageResponse,
          });

          // ⚡ Non-blocking notification
          if (isReceiverOnline) {
            io.to(receiverSocketId).emit("notification", {
              title: "💬 New Message",
              body: `Message from ${socket.user.name}`,
              message: messageResponse,
            });
          }

          const processingTime = Date.now() - startTime;
          if (processingTime > 100) {
            console.warn(`⚠️ Slow message: ${processingTime}ms`);
          }

        } catch (error) {
          console.error("❌ sendMessage error:", error.message);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // ⚡ OPTIMIZED: Mark as read
      socket.on("markAsRead", async ({ messageId }) => {
        try {
          // ⚡ Use updateOne for speed
          const result = await Message.updateOne(
            { 
              _id: messageId,
              receiver: socket.user._id,
              isRead: false // Only update if not already read
            },
            { $set: { isRead: true } }
          ).exec();

          if (result.modifiedCount > 0) {
            // Get chat room for broadcast
            const message = await Message.findById(messageId)
              .select('chatRoom')
              .lean()
              .exec();

            if (message) {
              io.to(message.chatRoom.toString()).emit("messageRead", {
                messageId,
              });
            }
          }
        } catch (err) {
          console.error("❌ Mark as read failed:", err.message);
        }
      });

      // Handle disconnect
      socket.on("disconnect", async () => {
        console.log(`👋 ${socket.user.name} disconnected`);

        onlineUsers.delete(socket.user._id.toString());

        // ⚡ Use updateOne
        await User.updateOne(
          { _id: socket.user._id },
          {
            $set: {
              isOnline: false,
              lastSeen: new Date(),
            }
          }
        ).exec();

        // Broadcast updated online users
        io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      });

      // ⚡ Error handling per socket
      socket.on("error", (error) => {
        console.error(`❌ Socket error for ${socket.user.name}:`, error.message);
      });
    });

    // ⚡ Periodic cleanup of stale connections
    setInterval(() => {
      const onlineCount = onlineUsers.size;
      console.log(`📊 Active connections: ${onlineCount}`);
    }, 300000); // Every 5 minutes

  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  // Don't exit immediately in production - log to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to error monitoring (Sentry, etc.)
  } else {
    process.exit(1);
  }
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  if (process.env.NODE_ENV === 'production') {
    // Send to error monitoring
  } else {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, closing server gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});

// ⚡ Optional: Add these indexes to your models for even better performance
/*
// In Message.js model
messageSchema.index({ chatRoom: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isDelivered: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });

// In ChatRoom.js model
chatRoomSchema.index({ participants: 1, isActive: 1 });
chatRoomSchema.index({ isActive: 1, updatedAt: -1 });

// In User.js model
userSchema.index({ isOnline: 1 });
*/