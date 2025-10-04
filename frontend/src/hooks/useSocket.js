import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useExpenseStore } from '../store/expenseStore';

export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const { user, token } = useAuthStore();
  const { addNotification, setNotifications } = useNotificationStore();
  const { updateExpense, addExpense } = useExpenseStore();

  useEffect(() => {
    if (!user || !token) {
      // Clean up socket if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    console.log('🔌 Connecting to Socket.IO...');
    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to server via Socket.IO');
      setIsConnected(true);
      setReconnectAttempts(0);
      
      // Join user-specific room
      socketRef.current.emit('join_user', user._id);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('🚨 Socket connection error:', error);
      setIsConnected(false);
      
      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
      }, delay);
    });

    socketRef.current.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}`);
    });

    socketRef.current.on('reconnect', (attempt) => {
      console.log('✅ Reconnected to server');
      setIsConnected(true);
      setReconnectAttempts(0);
    });

    // Real-time event handlers
    socketRef.current.on('new_notification', (notification) => {
      console.log('📢 New notification received:', notification);
      addNotification(notification);
      
      // Show browser notification if permitted
      if (Notification.permission === 'granted' && !document.hasFocus()) {
        new Notification(notification.title, {
          body: notification.body,
          icon: '/favicon.ico'
        });
      }
    });

    socketRef.current.on('expense_updated', (expense) => {
      console.log('💰 Expense updated:', expense);
      updateExpense(expense._id, expense);
    });

    socketRef.current.on('new_expense', (expense) => {
      console.log('💰 New expense created:', expense);
      addExpense(expense);
    });

    socketRef.current.on('notification_read', (notificationId) => {
      // Handle server-side notification read confirmation
      console.log('📢 Notification marked as read:', notificationId);
    });

    // Request missed notifications on reconnect
    socketRef.current.on('connect', async () => {
      try {
        const response = await fetch(`${socketUrl}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const notifications = await response.json();
        setNotifications(notifications);
      } catch (error) {
        console.error('Failed to fetch missed notifications:', error);
      }
    });

    return () => {
      if (socketRef.current) {
        console.log('🧹 Cleaning up Socket.IO connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user, token, reconnectAttempts]);

  // Socket utility functions
  const emitEvent = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const joinRoom = (roomId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_room', roomId);
    }
  };

  const leaveRoom = (roomId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_room', roomId);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    emitEvent,
    joinRoom,
    leaveRoom
  };
};