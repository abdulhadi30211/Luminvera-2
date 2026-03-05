'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  createdAt: string
}

interface UseSocketReturn {
  isConnected: boolean
  notifications: Notification[]
  unreadCount: number
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  sendNotification: (userId: string, notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
}

export function useSocket(userId?: string, role?: string): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!userId) return

    // Initialize socket connection
    const socketUrl = `/?XTransformPort=3010`
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected')
      setIsConnected(true)
      
      // Authenticate
      socketInstance.emit('authenticate', { userId, role: role || 'USER' })
    })

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error)
    })

    socketInstance.on('authenticated', (data) => {
      console.log('[Socket] Authenticated:', data)
    })

    socketInstance.on('notification', (notification: Notification) => {
      console.log('[Socket] Notification received:', notification)
      setNotifications(prev => [notification, ...prev])
      
      // Show browser notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new window.Notification(notification.title, {
          body: notification.message,
        })
      }
    })

    // Fetch initial notifications
    fetch(`/api/notifications?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications || [])
      })
      .catch(console.error)

    return () => {
      socketInstance.disconnect()
    }
  }, [userId, role])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return
    try {
      await fetch(`/api/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, userId, markAsRead: true })
      })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [userId])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    try {
      await fetch(`/api/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAllRead: true })
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [userId])

  const sendNotification = useCallback((targetUserId: string, notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    if (isConnected) {
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          ...notification
        })
      }).catch(console.error)
    }
  }, [isConnected])

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    sendNotification
  }
}

// Request notification permission
export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.requestPermission()
  }
  return Promise.resolve('denied')
}

