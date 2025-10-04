import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Bell, Info } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDate } from '../../utils';

export const NotificationList = ({ onClose }) => {
  const { notifications, markAsRead } = useNotificationStore();

  const getNotificationIcon = (type) => {
    const icons = {
      expense_submitted: Bell,
      expense_approved: CheckCircle,
      expense_rejected: XCircle,
      reminder: Bell,
      info: Info,
    };
    const Icon = icons[type] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  const getNotificationColor = (type) => {
    const colors = {
      expense_submitted: 'text-blue-500',
      expense_approved: 'text-green-500',
      expense_rejected: 'text-red-500',
      reminder: 'text-orange-500',
      info: 'text-gray-500',
    };
    return colors[type] || 'text-gray-500';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    onClose?.();
  };

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {notifications.map((notification, index) => (
        <motion.div
          key={notification._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${
            !notification.read ? 'bg-blue-50' : ''
          }`}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex items-start space-x-3">
            <div className={`mt-0.5 ${getNotificationColor(notification.type)}`}>
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{notification.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {notification.body}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(notification.createdAt)}
              </p>
            </div>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};