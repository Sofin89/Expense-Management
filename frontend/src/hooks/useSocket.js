import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useExpenseStore } from '../store/expenseStore';

export const useSocket = () => {
  const socketRef = useRef(null);
  const { user, token } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { updateExpense } = useExpenseStore();

  useEffect(() => {
    if (!user || !token) return;

    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
    });

    socketRef.current.on('new_notification', (notification) => {
      addNotification(notification);
    });

    socketRef.current.on('expense_updated', (expense) => {
      updateExpense(expense._id, expense);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, token]);

  return socketRef.current;
};