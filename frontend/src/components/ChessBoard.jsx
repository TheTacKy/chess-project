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

        // Function to show legal move dots
        const showLegalMoves = (source) => {
          if (!gameRef.current) {
            console.error('showLegalMoves: gameRef.current is null - chess.js not initialized');
            return;
          }
          
          if (!boardInstanceRef.current) {
            console.error('showLegalMoves: boardInstanceRef.current is null - chessboard.js not initialized');
            return;
          }
          
          // Verify chess.js is available
          if (typeof gameRef.current.moves !== 'function') {
            console.error('showLegalMoves: gameRef.current.moves is not a function');
            return;
          }
          
          // Get all legal moves from this square using chess.js
          // Note: gameRef should already be in sync since we update it on every move
          console.log('Getting moves for square:', source);
          console.log('Current game FEN:', gameRef.current.fen());
          console.log('Current turn:', gameRef.current.turn());
          
          let moves;
          try {
            moves = gameRef.current.moves({ square: source, verbose: true });
            console.log('Legal moves found:', moves);
          } catch (e) {
            console.error('Error getting moves from chess.js:', e);
            return;
          }
          
          if (!moves || moves.length === 0) {
            console.log('No legal moves found for square:', source);
            return;
          }
          
          // Remove any existing dots first
          removeLegalMoves();
          
          // Get the board element
          const board = document.getElementById('myBoard');
          if (!board) {
            console.error('Board element not found');
            return;
          }
          
          // Chessboard.js uses divs with class 'square-55d63', not a table
          // All squares are direct children or nested in the board container
          const allSquares = board.querySelectorAll('.square-55d63');
          console.log(`Found ${allSquares.length} squares in board`);
          
          if (allSquares.length !== 64) {
            console.error(`Expected 64 squares, found ${allSquares.length}`);
            return;
          }
          
          // Helper to get square element from square notation
          const getSquareElement = (squareNotation) => {
            const file = squareNotation.charAt(0);
            const rank = squareNotation.charAt(1);
            
            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
            
            const fileIndex = files.indexOf(file);
            const rankIndex = ranks.indexOf(rank);
            
            if (fileIndex === -1 || rankIndex === -1) {
              console.log(`Invalid square notation: ${squareNotation}`);
              return null;
            }
            
            // Check if board is flipped
            const isFlipped = playerColor === 'black';
            
            // Calculate index in the squares array
            // Chessboard.js renders squares in order: a8, b8, ..., h8, a7, b7, ..., h7, ..., a1, b1, ..., h1 (when not flipped)
            // When flipped, the order is reversed: h1, g1, ..., a1, h2, g2, ..., a2, ..., h8, g8, ..., a8
            let squareIndex;
            if (isFlipped) {
              // When flipped: rank 1 is first (index 0-7), rank 8 is last (index 56-63)
              // Files are reversed: h=0, g=1, ..., a=7
              const reversedFileIndex = 7 - fileIndex;
              squareIndex = rankIndex * 8 + reversedFileIndex;
            } else {
              // When not flipped: rank 8 is first (index 0-7), rank 1 is last (index 56-63)
              // Files are normal: a=0, b=1, ..., h=7
              squareIndex = (7 - rankIndex) * 8 + fileIndex;
            }
            
            console.log(`Square ${squareNotation}: fileIndex=${fileIndex}, rankIndex=${rankIndex}, isFlipped=${isFlipped}, squareIndex=${squareIndex}`);
            
            if (allSquares[squareIndex]) {
              console.log(`Found square element for ${squareNotation} at index ${squareIndex}`);
              return allSquares[squareIndex];
            } else {
              console.log(`Square at index ${squareIndex} not found`);
            }
            return null;
          };
          
          // Add dots to each legal move square
          let dotsAdded = 0;
          console.log(`Processing ${moves.length} legal moves`);
          moves.forEach((move, index) => {
            console.log(`Processing move ${index + 1}/${moves.length}: ${move.from} -> ${move.to}`);
            const squareElement = getSquareElement(move.to);
            if (squareElement) {
              console.log(`Found square element for ${move.to}, adding dot`);
              // Check if square has a piece (capture move)
              const hasPiece = squareElement.querySelector('img') !== null;
              console.log(`Square ${move.to} has piece:`, hasPiece);
              
              const dot = document.createElement('div');
              dot.className = 'legal-move-dot';
              if (hasPiece) {
                dot.classList.add('legal-move-capture');
                console.log(`Added capture circle for ${move.to}`);
              } else {
                console.log(`Added dot for ${move.to}`);
              }
              squareElement.style.position = 'relative';
              squareElement.appendChild(dot);
              dotsAdded++;
              console.log(`Dot added successfully to ${move.to}`);
            } else {
              console.log('Could not find square element for:', move.to);
            }
          });
          console.log(`Added ${dotsAdded} legal move dots out of ${moves.length} moves`);
        };

        // Function to remove all legal move dots
        const removeLegalMoves = () => {
          const board = document.getElementById('myBoard');
          if (!board) return;
          
          const dots = board.querySelectorAll('.legal-move-dot');
          dots.forEach(dot => dot.remove());
        };

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

          // Show legal moves for this piece (with small delay to ensure DOM is ready)
          setTimeout(() => {
            showLegalMoves(source);
          }, 10);
        };

        const onDrop = (source, target) => {
          // Remove legal move dots
          removeLegalMoves();

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
          // Remove legal move dots
          removeLegalMoves();
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
          pieceTheme: '/img/customchesspieces/alpha/{piece}.svg'
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
            removeLegalMoves(); // Remove dots when opponent moves
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

