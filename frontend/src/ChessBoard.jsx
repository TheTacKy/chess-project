import { useEffect, useRef } from 'react';
// import socket from './socket.js';

const ChessBoard = () => {
  const boardRef = useRef(null);
  const gameRef = useRef(null);
  const boardInstanceRef = useRef(null);

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
        
        // Game state
        let gameHasStarted = true; // Set to true for single player testing
        let gameOver = false;
        let playerColor = 'white'; // Default to white, can be changed based on game logic

        const onDragStart = (source, piece, position, orientation) => {
          // Do not pick up pieces if the game is over
          if (gameRef.current.game_over()) return false;
          if (!gameHasStarted) return false;
          if (gameOver) return false;

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
          // socket.emit('move', move);
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
          else if (gameOver) {
            status = 'Opponent disconnected, you win!';
          }
          else if (!gameHasStarted) {
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
        // socket.on('newMove', (move) => {
        //   gameRef.current.move(move);
        //   boardInstanceRef.current.position(gameRef.current.fen());
        //   updateStatus();
        // });

        // socket.on('startGame', () => {
        //   gameHasStarted = true;
        //   updateStatus();
        // });

        // socket.on('gameOverDisconnect', () => {
        //   gameOver = true;
        //   updateStatus();
        // });

        // Check for game code in URL
        // const urlParams = new URLSearchParams(window.location.search);
        // if (urlParams.get('code')) {
        //   socket.emit('joinGame', {
        //     code: urlParams.get('code')
        //   });
        // }

      } catch (error) {
        console.error('Error initializing chess board:', error);
      }
    };

    // Start checking for libraries
    checkLibraries();

    // Cleanup function for the entire useEffect
    return () => {
      // socket.off('newMove');
      // socket.off('startGame');
      // socket.off('gameOverDisconnect');
      if (boardInstanceRef.current) {
        boardInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="chess-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '20px',
      padding: '20px'
    }}>
      <div id="myBoard" ref={boardRef} style={{ 
        width: '500px', 
        height: '500px',
        border: '2px solid #333',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}></div>
      <div id="status" style={{ 
        textAlign: 'center', 
        fontSize: '20px', 
        fontWeight: 'bold',
        color: '#333'
      }}></div>
      <div id="pgn" style={{ 
        textAlign: 'center', 
        fontSize: '14px',
        color: '#666',
        maxWidth: '500px',
        wordWrap: 'break-word'
      }}></div>
    </div>
  );
};

export default ChessBoard;