import { useState, useEffect } from 'react';
import socket from '../socket';
import { roomAPI } from '../api';

const RoomManager = ({ onRoomJoined, onGameStart, onTimeControlChange, showRoomInfo = false, gameStarted = false, roomCode: propRoomCode = null, playerColor: propPlayerColor = null, timeControl: propTimeControl = 3 }) => {
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(propRoomCode || null);
  const [playerColor, setPlayerColor] = useState(propPlayerColor || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeControl, setTimeControl] = useState(propTimeControl || 3); // Default to blitz (3 minutes)
  const [moves, setMoves] = useState([]);

  useEffect(() => {
    // Listen for room creation
    socket.on('roomCreated', ({ roomCode, color, timeControl: tc }) => {
      setCurrentRoom(roomCode);
      setPlayerColor(color);
      setError('');
      onRoomJoined({ roomCode, color, timeControl: tc || timeControl });
    });

    // Listen for room join success
    socket.on('roomJoined', ({ roomCode, color, timeControl: tc }) => {
      setCurrentRoom(roomCode);
      setPlayerColor(color);
      setError('');
      onRoomJoined({ roomCode, color, timeControl: tc || timeControl });
    });

    // Listen for game start
    socket.on('gameStart', () => {
      setMoves([]); // Reset moves when game starts
      onGameStart();
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
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('gameStart');
      socket.off('newMove');
      socket.off('error');
    };
  }, [onRoomJoined, onGameStart, timeControl]);

  // Create room using REST API
  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await roomAPI.createRoom();
      const newRoomCode = data.roomCode;
      
      // Now join via socket for real-time communication
      socket.emit('createRoom', { timeControl });
      
      // The socket event will handle setting the room and color
      // But we can also set it here as backup
      setCurrentRoom(newRoomCode);
      setPlayerColor('white');
      onRoomJoined({ roomCode: newRoomCode, color: 'white', timeControl });
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
      socket.emit('joinRoom', { roomCode: code, timeControl });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join room');
      console.error('Error joining room:', err);
      setLoading(false);
    }
  };

  if (currentRoom) {
    // Sidebar version when showRoomInfo is true
    if (showRoomInfo) {
      // Show moves when game has started
      if (gameStarted) {
        const formatMove = (move, index) => {
          if (!move) return '';
          const moveNum = Math.floor(index / 2) + 1;
          const isWhite = index % 2 === 0;
          const moveNotation = move.san || `${move.from}-${move.to}`;
          return isWhite ? `${moveNum}. ${moveNotation}` : moveNotation;
        };

        return (
          <div className="w-full lg:w-[500px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border-2 border-gray-300 dark:border-gray-700 p-6 sticky top-4 max-h-[600px] flex flex-col">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4 text-center">
              Moves
            </h2>
            <div className="flex-1 overflow-y-auto">
              {moves.length === 0 ? (
                <p className="text-center text-gray-600 dark:text-gray-400 text-sm">No moves yet</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {moves.map((move, index) => {
                    const formatted = formatMove(move, index);
                    const isWhite = index % 2 === 0;
                    return (
                      <div
                        key={index}
                        className={`px-3 py-2 rounded text-sm font-mono ${
                          isWhite
                            ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white'
                            : 'bg-white dark:bg-neutral-900 text-black dark:text-white'
                        }`}
                      >
                        {formatted}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }

      // Show room info when game hasn't started
      return (
        <div className="w-full lg:w-[500px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border-2 border-gray-300 dark:border-gray-700 p-6 sticky top-4">
          <div className="text-center">
            <div className="inline-block px-3 py-1 mb-3 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded-full text-xs font-semibold">
              Room Active
            </div>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">
              Room: <span className="text-black dark:text-white font-mono text-lg">{currentRoom}</span>
            </h2>
            <p className="text-sm text-black dark:text-white mb-2">
              Time Control: {timeControl === 1 ? 'Bullet (1 min)' : timeControl === 3 ? 'Blitz (3 min)' : 'Rapid (10 min)'}
            </p>
            <p className="text-black dark:text-white mb-3 text-sm">
              You are playing as: 
            </p>
            <span className={`inline-block px-4 py-2 rounded-full font-bold mb-4 ${
              playerColor === 'white' 
                ? 'bg-white text-black border-2 border-gray-300' 
                : 'bg-black text-white border-2 border-gray-300'
            }`}>
              {playerColor}
            </span>
            {playerColor === 'white' && (
              <div className="mt-4">
                <div className="flex justify-center space-x-1 mb-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Full version when not in sidebar
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border-2 border-gray-700 p-6">
        <div className="text-center">
          <div className="inline-block px-4 py-1 mb-4 bg-gray-700 text-white rounded-full text-sm font-semibold">
            Room Active
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Room: <span className="text-white font-mono">{currentRoom}</span>
          </h2>
          <p className="text-sm text-white mb-4">
            Time Control: {timeControl === 1 ? 'Bullet (1 min)' : timeControl === 3 ? 'Blitz (3 min)' : 'Rapid (10 min)'}
          </p>
          <p className="text-white mb-4">
            You are playing as: 
            <span className={`ml-2 px-4 py-2 rounded-full font-bold ${
              playerColor === 'white' 
                ? 'bg-white text-black border-2 border-gray-300' 
                : 'bg-black text-white border-2 border-gray-300'
            }`}>
              {playerColor}
            </span>
          </p>
          {playerColor === 'white' && (
            <div className="mt-6">
              <div className="flex justify-center space-x-1 mb-2">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-neutral-900 rounded-2xl p-8">
      <h2 className="text-3xl font-bold text-center mb-8 text-black dark:text-white">
        Join a Game
      </h2>
      <div className="flex flex-col gap-6">
        {/* Time Control Selection */}
        <div className="mb-4">
          <label className="block text-lg font-semibold text-black dark:text-white mb-4">
            Time Control
          </label>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setTimeControl(1);
                onTimeControlChange?.(1);
              }}
              className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all border-2 ${
                timeControl === 1
                  ? 'bg-white dark:bg-neutral-900 text-black dark:text-white border-green-500 shadow-lg'
                  : 'bg-white dark:bg-neutral-900 text-black dark:text-white border-gray-300 dark:border-gray-600 hover:border-green-600'
              }`}
            >
              <div className="text-2xl font-bold">Bullet</div>
              <div className="text-sm font-normal">1 minute</div>
            </button>
            <button
              onClick={() => {
                setTimeControl(3);
                onTimeControlChange?.(3);
              }}
              className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all border-2 ${
                timeControl === 3
                  ? 'bg-white dark:bg-neutral-900 text-black dark:text-white border-green-500 shadow-lg'
                  : 'bg-white dark:bg-neutral-900 text-black dark:text-white border-gray-300 dark:border-gray-600 hover:border-green-600'
              }`}
            >
              <div className="text-2xl font-bold">Blitz</div>
              <div className="text-sm font-normal">3 minutes</div>
            </button>
            <button
              onClick={() => {
                setTimeControl(10);
                onTimeControlChange?.(10);
              }}
              className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all border-2 ${
                timeControl === 10
                  ? 'bg-white dark:bg-neutral-900 text-black dark:text-white border-green-500 shadow-lg'
                  : 'bg-white dark:bg-neutral-900 text-black dark:text-white border-gray-300 dark:border-gray-600 hover:border-green-600'
              }`}
            >
              <div className="text-2xl font-bold">Rapid</div>
              <div className="text-sm font-normal">10 minutes</div>
            </button>
          </div>
        </div>
        
        <button 
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full px-6 py-4 bg-green-600 text-white font-bold text-lg rounded-xl border-2 border-green-600 shadow-lg hover:shadow-xl hover:bg-green-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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
              Play
            </>
          )}
        </button>
        
        <div className="relative flex items-center my-2">
          <div className="flex-grow border-t border-gray-600"></div>
          <span className="flex-shrink mx-4 text-white text-sm font-medium">OR</span>
          <div className="flex-grow border-t border-gray-600"></div>
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            className="flex-1 px-4 py-3 bg-zinc-800 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white transition-all"
          />
          <button 
            onClick={handleJoinRoom}
            disabled={loading}
            className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl border-2 border-zinc-800 shadow-lg hover:shadow-xl hover:bg-zinc-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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
          <div className="mt-4 p-4 bg-gray-800 border-2 border-gray-600 rounded-xl flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-white font-semibold">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomManager;

