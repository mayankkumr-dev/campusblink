const { Server } = require('socket.io');

let ioInstance = null;

function initSocket(httpServer) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://campusblink.me', 'http://localhost:5173', 'http://localhost:3000'];

  ioInstance = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.on('connection', (socket) => {
    // Clients can join rooms by section + subject or by studentId
    socket.on('joinRoom', (roomName) => {
      if (roomName && typeof roomName === 'string') {
        socket.join(roomName);
      }
    });

    socket.on('leaveRoom', (roomName) => {
      if (roomName && typeof roomName === 'string') {
        socket.leave(roomName);
      }
    });

    socket.on('disconnect', () => {
      // Automatic cleanup
    });
  });

  console.log('[Socket.io] Real-time attendance socket server initialized');
  return ioInstance;
}

function getIO() {
  return ioInstance;
}

/**
 * Broadcast attendance submission update to students in section & subject room
 */
function emitAttendanceUpdate({ sectionId, subjectId, sessionId, data }) {
  if (!ioInstance) return;

  const roomKey = `${sectionId}_${subjectId}`;
  ioInstance.to(roomKey).emit('attendance:updated', {
    sectionId,
    subjectId,
    sessionId,
    timestamp: new Date().toISOString(),
    ...data,
  });

  // Also emit globally on room attendance_all for admin monitoring
  ioInstance.to('attendance_admin').emit('attendance:updated', {
    sectionId,
    subjectId,
    sessionId,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

module.exports = {
  initSocket,
  getIO,
  emitAttendanceUpdate,
};
