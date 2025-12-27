import { useEffect, useRef } from 'react';
import socket from '../socket.js';
import GameHeader from './GameHeader.jsx';

const ChessBoard = ({ roomCode, playerColor, gameStarted, timeControl = 3, opponentUsername = null }) => {
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

  return (
    <div className="chess-container flex flex-col items-center gap-2 p-4 w-full">
      {/* Opponent Header - Above board */}
      <GameHeader 
        gameStarted={gameStarted}
        playerColor={playerColor}
        timeControl={timeControl}
        opponentUsername={opponentUsername}
        position="top"
      />
      
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

      {/* Current User Header - Below board */}
      <GameHeader 
        gameStarted={gameStarted}
        playerColor={playerColor}
        timeControl={timeControl}
        opponentUsername={opponentUsername}
        position="bottom"
      />
    </div>
  );
};

export default ChessBoard;

