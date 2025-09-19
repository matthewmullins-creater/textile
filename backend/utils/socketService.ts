import { Server, Socket } from 'socket.io';
import { isAuthenticatedSocket } from '../middleware/isAuthenticated';
import { prisma } from '../server';

interface AuthenticatedSocket {
  userId: number;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

interface SocketWithAuth extends Socket {
  userId?: number;
  user?: AuthenticatedSocket['user'];
}

class SocketService {
  private io: Server;
  private userSockets: Map<number, string[]> = new Map(); // userId -> socketIds[]

  constructor(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: SocketWithAuth, next) => {
      try {
        let token = '';
        
        // Try auth.token (manual) first
        token = socket.handshake.auth.token;
        
        // Try Authorization header
        if (!token && socket.handshake.headers.authorization) {
          token = socket.handshake.headers.authorization.replace("Bearer ", "");
        }

        // If not found, fallback to cookies (HTTP-only cookies)
        if (!token && socket.handshake.headers.cookie) {
          // Manual cookie parsing to avoid dependency issues
          const cookies: { [key: string]: string } = {};
          socket.handshake.headers.cookie.split(';').forEach(cookie => {
            const parts = cookie.trim().split('=');
            if (parts.length === 2) {
              cookies[parts[0]] = decodeURIComponent(parts[1]);
            }
          });
          
          // Try accessToken first (primary authentication)
          token = cookies.accessToken;

        }

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Use the socket-specific authentication function
        const authResult = await isAuthenticatedSocket(token);
        
        if (!authResult) {
          return next(new Error("Invalid authentication token"));
        }

        socket.userId = authResult.userId;
        socket.user = authResult.user;

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error("Invalid authentication token"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: SocketWithAuth) => {
      console.log(`User ${socket.user?.username} connected with socket ${socket.id}`);
      
      // Track user socket connection
      this.addUserSocket(socket.userId!, socket.id);
      
      // Join user to their personal room for notifications
      socket.join(`user:${socket.userId}`);
      
      // Handle joining conversation rooms
      socket.on('join_conversations', async (conversationIds: number[]) => {
        try {
          // Verify user is participant in these conversations
          const userConversations = await prisma.conversationParticipant.findMany({
            where: {
              userId: socket.userId,
              conversationId: { in: conversationIds },
              isActive: true,
            },
            select: { conversationId: true },
          });

          const validConversationIds = userConversations.map(c => c.conversationId);
          
          // Join conversation rooms
          validConversationIds.forEach(id => {
            socket.join(`conversation:${id}`);
          });
          
          socket.emit('conversations_joined', validConversationIds);
        } catch (error) {
          console.error('Error joining conversations:', error);
        }
      });

      // Handle sending messages
      socket.on('send_message', async (data) => {
        try {
          await this.handleSendMessage(socket, data);
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          userId: socket.userId,
          username: socket.user?.username,
          conversationId: data.conversationId,
        });
      });

      socket.on('typing_stop', (data) => {
        socket.to(`conversation:${data.conversationId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          conversationId: data.conversationId,
        });
      });

      // Handle marking messages as read
      socket.on('mark_messages_read', async (data) => {
        try {
          await this.handleMarkMessagesRead(socket, data);
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      // Handle token refresh notification (client-side initiated)
      socket.on('token_refreshed', () => {
        // Client notifies server that tokens were refreshed
        // Socket connection remains valid until access token expires
        console.log(`User ${socket.user?.username} refreshed their tokens`);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`User ${socket.user?.username} disconnected: ${reason}`);
        this.removeUserSocket(socket.userId!, socket.id);
      });
    });
  }

  private addUserSocket(userId: number, socketId: string) {
    const userSockets = this.userSockets.get(userId) || [];
    userSockets.push(socketId);
    this.userSockets.set(userId, userSockets);
  }

  private removeUserSocket(userId: number, socketId: string) {
    const userSockets = this.userSockets.get(userId) || [];
    const updatedSockets = userSockets.filter(id => id !== socketId);
    
    if (updatedSockets.length === 0) {
      this.userSockets.delete(userId);
    } else {
      this.userSockets.set(userId, updatedSockets);
    }
  }

  private async handleSendMessage(socket: SocketWithAuth, data: {
    conversationId: number;
    content: string;
    messageType?: 'TEXT' | 'IMAGE' | 'FILE';
  }) {
    const { conversationId, content, messageType = 'TEXT' } = data;

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: socket.userId,
        isActive: true,
      },
    });

    if (!participant) {
      socket.emit('message_error', { error: 'Not authorized to send message to this conversation' });
      return;
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: socket.userId!,
        content,
        messageType,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update conversation's updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Emit message to conversation room
    this.io.to(`conversation:${conversationId}`).emit('new_message', {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
      sender: message.sender,
    });

    // Create notifications for other participants
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: socket.userId },
        isActive: true,
      },
      include: { user: true },
    });

    // Send notifications to offline users or create notification records
    for (const participant of otherParticipants) {
      await this.createNotification(participant.userId, {
        type: 'NEW_MESSAGE',
        title: `New message from ${socket.user?.username}`,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        data: {
          conversationId,
          messageId: message.id,
          senderId: socket.userId,
        },
      });
    }
  }

  private async handleMarkMessagesRead(socket: SocketWithAuth, data: {
    conversationId: number;
    messageIds: number[];
  }) {
    const { conversationId, messageIds } = data;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: socket.userId,
        isActive: true,
      },
    });

    if (!participant) return;

    // Create read receipts
    const readReceipts = messageIds.map(messageId => ({
      messageId,
      userId: socket.userId!,
    }));

    await prisma.messageReadReceipt.createMany({
      data: readReceipts,
      skipDuplicates: true,
    });

    // Update participant's last read timestamp
    await prisma.conversationParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    // Notify conversation about read receipts
    socket.to(`conversation:${conversationId}`).emit('messages_read', {
      userId: socket.userId,
      messageIds,
      conversationId,
    });
  }

  // Public methods for external use
  public async createNotification(userId: number, notificationData: {
    type: 'NEW_MESSAGE' | 'MENTION' | 'SYSTEM' | 'PERFORMANCE_ALERT';
    title: string;
    content: string;
    data?: any;
  }) {
    // Check for recent duplicate notifications (within last 5 minutes)
    const recentDuplicate = await prisma.notification.findFirst({
      where: {
        userId,
        type: notificationData.type,
        title: notificationData.title,
        content: notificationData.content,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }
      }
    });

    if (recentDuplicate) {
      return recentDuplicate;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        ...notificationData,
      },
    });

    // Send real-time notification if user is online
    this.io.to(`user:${userId}`).emit('new_notification', notification);

    return notification;
  }

  public sendToUser(userId: number, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public sendToConversation(conversationId: number, event: string, data: any) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  public isUserOnline(userId: number): boolean {
    return this.userSockets.has(userId);
  }

  public getOnlineUsers(): number[] {
    return Array.from(this.userSockets.keys());
  }
}

export default SocketService;