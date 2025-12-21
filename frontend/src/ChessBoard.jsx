import { useEffect, useRef } from 'react';
import socket from './socket.js';

const ChessBoard = ({ roomCode, playerColor, gameStarted }) => {
  const boardRef = useRef(null);
  const gameRef = useRef(null);
  const boardInstanceRef = useRef(null);
  const gameHasStartedRef = useRef(false);
  const gameOverRef = useRef(false);

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
        
        // Only initialize if we have room info
        if (!roomCode || !playerColor) {
          return;
        }

        const onDragStart = (source, piece) => {
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
          }
          updateStatus();
        };

        const onSnapEnd = () => {
          boardInstanceRef.current.position(gameRef.current.fen());
        };

        const updateStatus = () => {
          let status = '';
          let moveColor = 'White';
          
          if (gameRef.current.turn() === 'b') {
            moveColor = 'Black';
          }

          // Checkmate?
          if (gameRef.current.in_checkmate()) {
            status = `Game over, ${moveColor} is in checkmate.`;
          }
          // Draw?
          else if (gameRef.current.in_draw()) {
            status = 'Game over, drawn position';
          }
          else if (gameOverRef.current) {
            status = 'Opponent disconnected, you win!';
          }
          else if (!gameHasStartedRef.current) {
            status = 'Waiting for opponent to join';
          }
          // Game still on
          else {
            status = `${moveColor} to move`;
            // Check?
            if (gameRef.current.in_check()) {
              status += `, ${moveColor} is in check`;
            }
          }

          // Update status display if element exists
          const statusElement = document.getElementById('status');
          if (statusElement) {
            statusElement.innerHTML = status;
          }

          // Update PGN display if element exists
          const pgnElement = document.getElementById('pgn');
          if (pgnElement) {
            pgnElement.innerHTML = gameRef.current.pgn();
          }
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
        
        if (playerColor === 'black') {
          boardInstanceRef.current.flip();
        }

        updateStatus();

        // Socket event listeners
        socket.on('newMove', ({ move }) => {
          if (gameRef.current && boardInstanceRef.current) {
            gameRef.current.move(move);
            boardInstanceRef.current.position(gameRef.current.fen());
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
      if (boardInstanceRef.current) {
        boardInstanceRef.current.destroy();
      }
    };
  }, [roomCode, playerColor, gameStarted]);

  // Update game started state when prop changes
  useEffect(() => {
    if (gameStarted) {
      gameHasStartedRef.current = true;
    }
  }, [gameStarted]);

  // Don't render board if no room/color assigned
  if (!roomCode || !playerColor) {
    return null;
  }

  return (
    <div className="chess-container flex flex-col items-center gap-4 p-4 w-full">
      <div 
        id="myBoard" 
        ref={boardRef} 
        className="rounded-xl shadow-2xl transition-all duration-300"
        style={{ 
          width: 'min(90vw, 95vh - 150px, 1000px)', 
          height: 'min(90vw, 95vh - 150px, 1000px)',
          maxWidth: '1000px',
          maxHeight: '1000px',
          border: 'none'
        }}
      ></div>
      <div 
        id="status" 
        className="text-center text-lg md:text-xl font-bold text-black dark:text-white px-4 py-2 rounded-xl bg-white dark:bg-gray-800 shadow-lg border-2 border-gray-200 dark:border-gray-700 min-h-[50px] flex items-center justify-center w-full max-w-2xl empty:hidden"
      ></div>
      <div 
        id="pgn" 
        className="text-center text-xs md:text-sm text-gray-700 dark:text-gray-300 max-w-2xl break-words bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 w-full empty:hidden"
      ></div>
    </div>
  );
};

export default ChessBoard;