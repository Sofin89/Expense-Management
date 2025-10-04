module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user-specific room for private notifications
    socket.on('join-user', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Join company room for broadcast notifications
    socket.on('join-company', (companyId) => {
      socket.join(`company-${companyId}`);
      console.log(`User joined company room: ${companyId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Export function to send notifications
  global.sendNotification = (userId, notification) => {
    io.to(`user-${userId}`).emit('notification', notification);
  };

  global.broadcastToCompany = (companyId, event, data) => {
    io.to(`company-${companyId}`).emit(event, data);
  };
};