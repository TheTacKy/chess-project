import { useState, useEffect } from 'react';
import { authAPI } from '../api';
import Timer from './Timer';

// Single player header component
const PlayerHeader = ({ player, playerColor, timeControl, gameStarted, boardWidth, maxBoardWidth }) => {
  const username = player?.username || 'Guest';
  const elo = player?.elo;

  return (
    <div 
      className="w-full flex items-center justify-between bg-white dark:bg-neutral-900 rounded-lg px-4 py-2 shadow-sm"
      style={{ 
        width: boardWidth,
        maxWidth: maxBoardWidth 
      }}
    >
      <div className="flex items-center gap-3">
        {/* Profile Picture - Square */}
        <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img 
            src={player?.profilePicture || '/img/blank-profile.webp'} 
            alt={username}
            className="w-full h-full rounded object-cover"
          />
        </div>
        
        {/* Username and ELO */}
        <div className="flex flex-col">
          <span className="font-bold text-black dark:text-white text-sm">
            {username}
          </span>
          {elo !== null && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              ELO: {elo}
            </span>
          )}
        </div>
      </div>
      
      {/* Timer */}
      <div className="flex-shrink-0">
        <Timer 
          timeControl={timeControl}
          gameStarted={gameStarted}
          playerColor={playerColor}
          showOnly={true}
        />
      </div>
    </div>
  );
};

const GameHeader = ({ gameStarted, playerColor, timeControl, opponentUsername = null, position = 'top' }) => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getCurrentUser();
        setCurrentUser(response.user);
      } catch (err) {
        // 401 is expected for guest users
        if (err.response?.status !== 401) {
          console.error('Error fetching user:', err);
        }
        setCurrentUser(null);
      }
    };
    fetchUser();
  }, []);

  const boardWidth = 'min(90vw, 95vh - 150px, 1000px)';
  const maxBoardWidth = '1000px';

  // Determine which player to show based on position
  let player, headerPlayerColor;

  if (position === 'top') {
    // Top header shows opponent
    if (!gameStarted || !playerColor) {
      player = { username: 'Opponent', elo: null };
      headerPlayerColor = 'white';
    } else {
      // Opponent is the opposite color
      headerPlayerColor = playerColor === 'white' ? 'black' : 'white';
      player = { username: opponentUsername || 'Opponent', elo: 1000 };
    }
  } else {
    // Bottom header shows current user
    if (!gameStarted || !playerColor) {
      player = currentUser || { username: 'Guest', elo: 1000 };
      headerPlayerColor = 'black';
    } else {
      headerPlayerColor = playerColor;
      player = currentUser || { username: 'Guest', elo: 1000 };
    }
  }

  return (
    <PlayerHeader 
      player={player}
      playerColor={headerPlayerColor}
      timeControl={timeControl}
      gameStarted={gameStarted}
      boardWidth={boardWidth}
      maxBoardWidth={maxBoardWidth}
    />
  );
};

export default GameHeader;

