import { useState, useEffect } from 'react';
import socket from './socket';
import { roomAPI } from './api';

const RoomManager = ({ onRoomJoined, onGameStart, showRoomInfo = false }) => {
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for room creation
    socket.on('roomCreated', ({ roomCode, color }) => {
      setCurrentRoom(roomCode);
      setPlayerColor(color);
      setError('');
      onRoomJoined({ roomCode, color });
    });

    // Listen for room join success
    socket.on('roomJoined', ({ roomCode, color }) => {
      setCurrentRoom(roomCode);
      setPlayerColor(color);
      setError('');
      onRoomJoined({ roomCode, color });
    });

    // Listen for game start
    socket.on('gameStart', () => {
      onGameStart();
    });

    // Listen for errors
    socket.on('error', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('gameStart');
      socket.off('error');
    };
  }, [onRoomJoined, onGameStart]);

  // Create room using REST API
  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await roomAPI.createRoom();
      const newRoomCode = data.roomCode;
      
      // Now join via socket for real-time communication
      socket.emit('createRoom');
      
      // The socket event will handle setting the room and color
      // But we can also set it here as backup
      setCurrentRoom(newRoomCode);
      setPlayerColor('white');
      onRoomJoined({ roomCode: newRoomCode, color: 'white' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
      console.error('Error creating room:', err);
    } finally {
      setLoading(false);
    }
  };

  // Join room - check status via REST API first, then join via socket
  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    const code = roomCode.trim().toUpperCase();
    
    try {
      // Check room status via REST API
      const status = await roomAPI.checkRoomStatus(code);
      
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
      socket.emit('joinRoom', { roomCode: code });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join room');
      console.error('Error joining room:', err);
      setLoading(false);
    }
  };

  if (currentRoom) {
    // Sidebar version when showRoomInfo is true
    if (showRoomInfo) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 sticky top-4">
          <div className="text-center">
            <div className="inline-block px-3 py-1 mb-3 bg-blue-100 dark:bg-gray-700 text-blue-800 dark:text-gray-200 rounded-full text-xs font-semibold">
              Room Active
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
              Room: <span className="text-blue-600 dark:text-blue-400 font-mono text-lg">{currentRoom}</span>
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
              You are playing as: 
            </p>
            <span className={`inline-block px-4 py-2 rounded-full font-bold mb-4 ${
              playerColor === 'white' 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border-2 border-blue-500 dark:border-blue-400' 
                : 'bg-gray-800 dark:bg-gray-900 text-white border-2 border-gray-500 dark:border-gray-400'
            }`}>
              {playerColor}
            </span>
            {playerColor === 'white' && (
              <div className="mt-4">
                <div className="flex justify-center space-x-1 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Waiting for opponent...</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Full version when not in sidebar
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 p-6 transition-all duration-300">
        <div className="text-center">
          <div className="inline-block px-4 py-1 mb-4 bg-blue-100 dark:bg-gray-700 text-blue-800 dark:text-gray-200 rounded-full text-sm font-semibold">
            Room Active
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Room: <span className="text-blue-600 dark:text-blue-400 font-mono">{currentRoom}</span>
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You are playing as: 
            <span className={`ml-2 px-4 py-2 rounded-full font-bold ${
              playerColor === 'white' 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border-2 border-blue-500 dark:border-blue-400' 
                : 'bg-gray-800 dark:bg-gray-900 text-white border-2 border-gray-500 dark:border-gray-400'
            }`}>
              {playerColor}
            </span>
          </p>
          {playerColor === 'white' && (
            <div className="mt-6">
              <div className="flex justify-center space-x-1 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Waiting for opponent to join...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 p-6 transition-all duration-300">
      <h2 className="text-2xl font-bold text-center mb-6 text-black dark:text-white">
        Join a Game
      </h2>
      <div className="flex flex-col gap-4">
        <button 
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Room
            </>
          )}
        </button>
        
        <div className="relative flex items-center my-2">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 text-sm font-medium">OR</span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button 
            onClick={handleJoinRoom}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Joining...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Join
              </>
            )}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800 dark:text-red-300 font-semibold">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomManager;

