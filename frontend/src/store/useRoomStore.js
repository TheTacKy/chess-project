import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';
import { roomAPI } from '../api';

// Custom hook to use room store
export const useRoomStore = () => {
  const [roomCode, setRoomCode] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [timeControl, setTimeControl] = useState(3); // Default to blitz (3 minutes)
  const [gameStarted, setGameStarted] = useState(false);
  const [moves, setMoves] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState(null);

  // Set up socket event listeners
  useEffect(() => {
    // Listen for room creation
    socket.on('roomCreated', ({ roomCode: code, color, timeControl: tc }) => {
      setRoomCode(code);
      setPlayerColor(color);
      setTimeControl(tc || timeControl);
      setError('');
      setGameStarted(false);
      setMoves([]);
    });

    // Listen for room join success
    socket.on('roomJoined', ({ roomCode: code, color, timeControl: tc }) => {
      setRoomCode(code);
      setPlayerColor(color);
      setTimeControl(tc || timeControl);
      setError('');
      setGameStarted(false);
      setMoves([]);
    });

    // Listen for game start
    socket.on('gameStart', ({ timeControl: tc }) => {
      setGameStarted(true);
      setMoves([]); // Reset moves when game starts
      setTimeControl(tc || timeControl);
    });

    // Listen for moves
    socket.on('newMove', ({ move }) => {
      if (move) {
        setMoves(prev => [...prev, move]);
      }
    });

    // Listen for errors
    socket.on('error', ({ message }) => {
      setError(message);
      setLoading(false);
    });

    // Listen for opponent disconnect
    socket.on('opponentDisconnected', () => {
      setGameStarted(false);
      // Optionally clear room state or show message
    });

    // Listen for time expired
    socket.on('timeExpired', () => {
      setGameStarted(false);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('gameStart');
      socket.off('newMove');
      socket.off('error');
      socket.off('opponentDisconnected');
      socket.off('timeExpired');
    };
  }, [timeControl]);

  // Create a new room
  const createRoom = useCallback(async (selectedTimeControl = 3) => {
    setLoading(true);
    setError('');
    try {
      const data = await roomAPI.createRoom();
      const newRoomCode = data.roomCode;
      
      // Join via socket for real-time communication
      socket.emit('createRoom', { timeControl: selectedTimeControl });
      
      // Set state (socket event will also update it, but this is immediate)
      setRoomCode(newRoomCode);
      setPlayerColor('white');
      setTimeControl(selectedTimeControl);
      setGameStarted(false);
      setMoves([]);
      
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to create room';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Join an existing room
  const joinRoom = useCallback(async (code, selectedTimeControl = 3) => {
    if (!code || !code.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    const trimmedCode = code.trim().toUpperCase();
    
    try {
      // Check room status via REST API
      const status = await roomAPI.checkRoomStatus(trimmedCode);
      
      if (!status.exists) {
        setError('Room not found');
        setLoading(false);
        return;
      }
      
      if (status.isFull) {
        setError('Room is full');
        setLoading(false);
        return;
      }
      
      // Room exists and has space, join via socket
      socket.emit('joinRoom', { roomCode: trimmedCode, timeControl: selectedTimeControl });
      setTimeControl(selectedTimeControl);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to join room';
      setError(errorMessage);
      setLoading(false);
    }
  }, []);

  // Leave the current room
  const leaveRoom = useCallback(() => {
    if (roomCode) {
      socket.emit('leaveRoom', { roomCode });
    }
    setRoomCode(null);
    setPlayerColor(null);
    setGameStarted(false);
    setMoves([]);
    setError('');
    setOpponentUsername(null);
  }, [roomCode]);

  // Clear error
  const clearError = useCallback(() => {
    setError('');
  }, []);

  // Update time control
  const updateTimeControl = useCallback((newTimeControl) => {
    setTimeControl(newTimeControl);
  }, []);

  return {
    // State
    roomCode,
    playerColor,
    timeControl,
    gameStarted,
    moves,
    error,
    loading,
    opponentUsername,
    
    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    clearError,
    updateTimeControl,
    setOpponentUsername,
  };
};

// Export roomAPI for backward compatibility
export { roomAPI } from '../api';

