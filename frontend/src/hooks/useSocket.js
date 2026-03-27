// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BASE } from '../services/api.js';

export const useSocket = (userId, userType) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Get clean socket URL (remove /api if present)
  const getSocketUrl = useCallback(() => {
    return API_BASE.replace(/\/api\/?$/, '');
  }, []);

  useEffect(() => {
    if (!userId || !userType) {
      console.log('Socket: No user credentials, skipping connection');
      return;
    }

    const socketUrl = getSocketUrl();
    console.log(`🔌 [${userType}] Connecting to Socket.IO:`, socketUrl);

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: true,
      autoConnect: true
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log(`✅ [${userType}] Socket connected:`, socket.id);
      setConnected(true);
      setError(null);
      
      // Authenticate
      socket.emit('authenticate', { userId, userType });
    });

    socket.on('authenticated', (data) => {
      if (data.success) {
        console.log(`✅ [${userType}] Authenticated successfully`);
        
        // Join role-specific room
        if (userType === 'provider') {
          socket.emit('join-provider', userId);
        }
      } else {
        console.error(`❌ [${userType}] Authentication failed:`, data.error);
      }
    });

    socket.on('connect_error', (err) => {
      console.error(`❌ [${userType}] Connection error:`, err.message);
      setError(err.message);
      setConnected(false);
      
      // Force polling if websocket fails
      if (socket.io.opts.transports[0] === 'websocket') {
        console.log(`⚠️ [${userType}] Switching to polling...`);
        socket.io.opts.transports = ['polling'];
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ [${userType}] Disconnected:`, reason);
      setConnected(false);
    });

    socket.on('reconnect', (attempt) => {
      console.log(`🔄 [${userType}] Reconnected after ${attempt} attempts`);
      setConnected(true);
    });

    // Notification handlers
    socket.on('new-booking', (data) => {
      console.log(`🎉 [${userType}] New booking notification:`, data);
      setNotifications(prev => [data, ...prev]);
    });

    socket.on('booking-response', (data) => {
      console.log(`📢 [${userType}] Booking response:`, data);
      setNotifications(prev => [data, ...prev]);
    });

    socket.on('urgent-availability', (data) => {
      console.log(`🔥 [${userType}] Urgent availability:`, data);
      setNotifications(prev => [data, ...prev]);
    });

    socket.on('notification', (data) => {
      console.log(`🔔 [${userType}] General notification:`, data);
      setNotifications(prev => [data, ...prev]);
    });

    // Cleanup
    return () => {
      console.log(`🔌 [${userType}] Cleaning up socket...`);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId, userType, getSocketUrl]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markNotificationRead = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    socket: socketRef.current,
    connected,
    error,
    notifications,
    clearNotifications,
    markNotificationRead
  };
};