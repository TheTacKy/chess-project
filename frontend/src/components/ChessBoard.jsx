import { useEffect, useRef, useState } from 'react';
import socket from '../socket.js';
import Timer from './Timer.jsx';
import { authAPI } from '../api';

const ChessBoard = ({ roomCode, playerColor, gameStarted, timeControl = 3, opponentUsername = null }) => {
  const boardRef = useRef(null);
  const gameRef = useRef(null);
  const boardInstanceRef = useRef(null);
  const gameHasStartedRef = useRef(false);
  const gameOverRef = useRef(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getCurrentUser();
        setCurrentUser(response.user);
      } catch (err) {
        if (err.response?.status !== 401) {
          console.error('Error fetching user:', err);
        }
        setCurrentUser(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Wait for the chess libraries to be loaded with a timeout
    const checkLibraries = () => {
      if (typeof window.Chess === 'undefined' || typeof window.Chessboard === 'undefined') {
        console.log('Chess libraries not loaded yet, retrying...');
        setTimeout(checkLibraries, 100);
        return;
      }
      
      initializeBoard();
    };

    const initializeBoard = () => {
      try {
        // Initialize the chess game
        gameRef.current = new window.Chess();
        
        // Initialize board even without room info (for display purposes)
        // Game functionality will only work when roomCode and playerColor are provided

        const onDragStart = (source, piece) => {
          // Don't allow moves if no room/color assigned
          if (!roomCode || !playerColor) return false;
          // Do not pick up pieces if the game is over
          if (gameRef.current.game_over()) return false;
          if (!gameHasStartedRef.current) return false;
          if (gameOverRef.current) return false;

          // Don't allow picking up opponent's pieces
          if ((playerColor === 'black' && piece.search(/^w/) !== -1) || 
              (playerColor === 'white' && piece.search(/^b/) !== -1)) {
            return false;
          }

          // Only pick up pieces for the side to move
          if ((gameRef.current.turn() === 'w' && piece.search(/^b/) !== -1) || 
              (gameRef.current.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
          }
        };

        const onDrop = (source, target) => {
          // Verify it's the player's turn
          const currentTurn = gameRef.current.turn();
          if ((playerColor === 'white' && currentTurn !== 'w') || 
              (playerColor === 'black' && currentTurn !== 'b')) {
            return 'snapback';
          }

          const move = {
            from: source,
            to: target,
            promotion: 'q' // Always promote to queen for simplicity
          };

          // See if the move is legal
          const gameMove = gameRef.current.move(move);

          // Illegal move
          if (gameMove === null) return 'snapback';

          // Emit move to server
          if (roomCode) {
            socket.emit('move', { roomCode, move: gameMove });
            // Update turn locally
            const newTurn = gameRef.current.turn() === 'w' ? 'white' : 'black';
            window.dispatchEvent(new CustomEvent('turnChange', { detail: { turn: newTurn } }));
          }
          updateStatus();
        };

        const onSnapEnd = () => {
          boardInstanceRef.current.position(gameRef.current.fen());
        };

        const updateStatus = () => {
          // Status updates are no longer displayed, but we keep this function
          // in case we need to track game state internally
        };

        // Initialize the board
        const config = {
          draggable: true,
          position: 'start',
          onDragStart: onDragStart,
          onDrop: onDrop,
          onSnapEnd: onSnapEnd,
          pieceTheme: '/img/chesspieces/wikipedia/{piece}.png'
        };

        boardInstanceRef.current = window.Chessboard('myBoard', config);
        
        // Only flip board if player color is assigned
        if (playerColor === 'black') {
          boardInstanceRef.current.flip();
        }

        updateStatus();

        // Socket event listeners
        socket.on('newMove', ({ move, currentTurn: turn }) => {
          if (gameRef.current && boardInstanceRef.current) {
            gameRef.current.move(move);
            boardInstanceRef.current.position(gameRef.current.fen());
            if (turn) {
              window.dispatchEvent(new CustomEvent('turnChange', { detail: { turn } }));
            }
            updateStatus();
          }
        });

        socket.on('gameStart', () => {
          gameHasStartedRef.current = true;
          updateStatus();
        });

        socket.on('opponentDisconnected', () => {
          gameOverRef.current = true;
          updateStatus();
        });

        socket.on('timerUpdate', ({ whiteTime: wt, blackTime: bt, currentTurn: turn }) => {
          // Dispatch custom events for Timer component
          window.dispatchEvent(new CustomEvent('timerUpdate', { detail: { whiteTime: wt, blackTime: bt, currentTurn: turn } }));
          window.dispatchEvent(new CustomEvent('turnChange', { detail: { turn } }));
        });

        socket.on('turnChange', ({ turn }) => {
          window.dispatchEvent(new CustomEvent('turnChange', { detail: { turn } }));
        });

        socket.on('timeExpired', () => {
          gameOverRef.current = true;
        });

      } catch (error) {
        console.error('Error initializing chess board:', error);
      }
    };

    // Start checking for libraries
    checkLibraries();

    // Cleanup function for the entire useEffect
    return () => {
      socket.off('newMove');
      socket.off('gameStart');
      socket.off('opponentDisconnected');
      socket.off('timerUpdate');
      socket.off('turnChange');
      socket.off('timeExpired');
      if (boardInstanceRef.current) {
        boardInstanceRef.current.destroy();
      }
    };
  }, [roomCode, playerColor, gameStarted, timeControl]);

  // Update game started state when prop changes
  useEffect(() => {
    if (gameStarted) {
      gameHasStartedRef.current = true;
    }
  }, [gameStarted]);


  // Always render the board, even if no room/color assigned (for main menu display)
  const boardWidth = 'min(90vw, 95vh - 150px, 1000px)';
  const maxBoardWidth = '1000px';

  // Determine player info
  const userUsername = currentUser?.username || 'Guest';
  const userElo = currentUser?.elo || 1000;
  const userInitial = userUsername.charAt(0).toUpperCase();

  // When game is active
  const whitePlayerName = gameStarted && playerColor ? (playerColor === 'white' ? userUsername : (opponentUsername || 'Opponent')) : 'Opponent';
  const blackPlayerName = gameStarted && playerColor ? (playerColor === 'black' ? userUsername : (opponentUsername || 'Opponent')) : userUsername;
  const whitePlayerInitial = gameStarted && playerColor ? (playerColor === 'white' ? userInitial : '?') : '?';
  const blackPlayerInitial = gameStarted && playerColor ? (playerColor === 'black' ? userInitial : '?') : userInitial;
  const whitePlayerElo = gameStarted && playerColor ? (playerColor === 'white' ? userElo : 1000) : null;
  const blackPlayerElo = gameStarted && playerColor ? (playerColor === 'black' ? userElo : 1000) : userElo;

  return (
    <div className="chess-container flex flex-col items-center gap-2 p-4 w-full">
      {/* Top Header - White Player / Opponent */}
      <div 
        className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm"
        style={{ 
          width: boardWidth,
          maxWidth: maxBoardWidth 
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-gray-600 dark:text-gray-300">
              {whitePlayerInitial}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-black dark:text-white text-sm">
              {whitePlayerName}
            </span>
            {whitePlayerElo !== null && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                ELO: {whitePlayerElo}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <Timer 
            timeControl={timeControl}
            gameStarted={gameStarted}
            playerColor="white"
            showOnly={true}
          />
        </div>
      </div>
      
      <div className="flex flex-row items-start gap-4 justify-center w-full">
        <div 
          id="myBoard" 
          ref={boardRef} 
          className="rounded-xl shadow-2xl transition-all duration-300"
          style={{ 
            width: boardWidth, 
            height: boardWidth,
            maxWidth: maxBoardWidth,
            maxHeight: maxBoardWidth,
            border: 'none'
          }}
        ></div>
      </div>

      {/* Bottom Header - Black Player / User */}
      <div 
        className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm"
        style={{ 
          width: boardWidth,
          maxWidth: maxBoardWidth 
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-gray-600 dark:text-gray-300">
              {blackPlayerInitial}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-black dark:text-white text-sm">
              {blackPlayerName}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              ELO: {blackPlayerElo}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Timer 
            timeControl={timeControl}
            gameStarted={gameStarted}
            playerColor="black"
            showOnly={true}
          />
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;

