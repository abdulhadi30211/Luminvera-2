// LUMINVERA Notification Service
// Real-time notifications using Socket.io (In-memory mode)
import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import express from 'express'

const PORT = 3010

interface UserSocket extends Socket {
  userId?: string
  role?: string
}

const httpServer = new HttpServer()
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Store connected users
const connectedUsers = new Map<string, Set<string>>()
const notificationStore = new Map<string, any[]>() // In-memory notification store

io.on('connection', (socket: UserSocket) => {
  console.log(`[Notification Service] Client connected: ${socket.id}`)

  // User authentication
  socket.on('authenticate', (data: { userId: string; role: string }) => {
    socket.userId = data.userId
    socket.role = data.role

    // Add socket to user's connections
    if (!connectedUsers.has(data.userId)) {
      connectedUsers.set(data.userId, new Set())
    }
    connectedUsers.get(data.userId)!.add(socket.id)

    // Join user-specific room
    socket.join(`user:${data.userId}`)
    
    // Join role-specific room
    socket.join(`role:${data.role}`)

    console.log(`[Notification Service] User authenticated: ${data.userId} (${data.role})`)
    socket.emit('authenticated', { success: true })
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      const userSockets = connectedUsers.get(socket.userId)
      if (userSockets) {
        userSockets.delete(socket.id)
        if (userSockets.size === 0) {
          connectedUsers.delete(socket.userId)
        }
      }
    }
    console.log(`[Notification Service] Client disconnected: ${socket.id}`)
  })

  // Subscribe to specific events
  socket.on('subscribe', (channel: string) => {
    socket.join(channel)
    console.log(`[Notification Service] Socket ${socket.id} subscribed to ${channel}`)
  })

  // Unsubscribe from events
  socket.on('unsubscribe', (channel: string) => {
    socket.leave(channel)
    console.log(`[Notification Service] Socket ${socket.id} unsubscribed from ${channel}`)
  })
})

// Express app for HTTP API
const app = express()
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size
  })
})

// GET /connected - Get connected users count
app.get('/connected', (req, res) => {
  res.json({
    connectedUsers: connectedUsers.size,
    totalConnections: Array.from(connectedUsers.values()).reduce((sum, set) => sum + set.size, 0)
  })
})

// POST /notify - Send notification to specific user
app.post('/notify', (req, res) => {
  const { userId, type, title, message, data } = req.body
  
  if (!userId || !type || !title || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const notification = {
    id: `notif-${Date.now()}`,
    type,
    title,
    message,
    data,
    read: false,
    createdAt: new Date().toISOString()
  }

  // Store notification
  if (!notificationStore.has(userId)) {
    notificationStore.set(userId, [])
  }
  notificationStore.get(userId)!.unshift(notification)

  // Emit to user's room
  io.to(`user:${userId}`).emit('notification', notification)
  
  console.log(`[Notification Service] Notification sent to user ${userId}`)
  res.json({ success: true, notification })
})

// POST /broadcast/role - Broadcast to role
app.post('/broadcast/role', (req, res) => {
  const { role, event, data } = req.body
  
  if (!role || !event) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  io.to(`role:${role}`).emit(event, data)
  console.log(`[Notification Service] Broadcast to role ${role}: ${event}`)
  res.json({ success: true })
})

// POST /broadcast/all - Broadcast to all
app.post('/broadcast/all', (req, res) => {
  const { event, data } = req.body
  
  if (!event) {
    return res.status(400).json({ error: 'Missing event' })
  }

  io.emit(event, data)
  console.log(`[Notification Service] Broadcast to all: ${event}`)
  res.json({ success: true })
})

// GET /notifications/:userId - Get stored notifications for user
app.get('/notifications/:userId', (req, res) => {
  const { userId } = req.params
  const notifications = notificationStore.get(userId) || []
  res.json({ notifications, unreadCount: notifications.filter(n => !n.read).length })
})

// DELETE /notifications/:userId - Clear notifications
app.delete('/notifications/:userId', (req, res) => {
  const { userId } = req.params
  notificationStore.delete(userId)
  res.json({ success: true })
})

// PUT /notifications/:userId/:notifId/read - Mark as read
app.put('/notifications/:userId/:notifId/read', (req, res) => {
  const { userId, notifId } = req.params
  const notifications = notificationStore.get(userId) || []
  const notif = notifications.find(n => n.id === notifId)
  if (notif) {
    notif.read = true
  }
  res.json({ success: true })
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`[Notification Service] Running on port ${PORT}`)
  console.log(`[Notification Service] In-memory mode (no database persistence)`)
})

export { io }
