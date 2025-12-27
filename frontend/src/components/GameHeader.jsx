import { useState, useEffect } from 'react';
import { authAPI } from '../api';
import Timer from './Timer';

const GameHeader = ({ gameStarted, playerColor, timeControl, opponentUsername = null }) => {
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

  if (!gameStarted || !playerColor) {
    return null;
  }

  // Determine which player is which
  const whitePlayer = playerColor === 'white' ? currentUser : { username: opponentUsername || 'Opponent', elo: 1000 };
  const blackPlayer = playerColor === 'black' ? currentUser : { username: opponentUsername || 'Opponent', elo: 1000 };

  // For guest users, use "Guest" as username
  const whiteUsername = whitePlayer?.username || 'Guest';
  const blackUsername = blackPlayer?.username || 'Guest';
  const whiteElo = whitePlayer?.elo || 1000;
  const blackElo = blackPlayer?.elo || 1000;

  const boardWidth = 'min(90vw, 95vh - 150px, 1000px)';
  const maxBoardWidth = '1000px';

  return (
    <div 
      className="w-full flex flex-col gap-1"
      style={{ 
        width: boardWidth,
        maxWidth: maxBoardWidth 
      }}
    >
      {/* White Player Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Profile Picture - Square */}
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
            {whitePlayer?.profilePicture ? (
              <img 
                src={whitePlayer.profilePicture} 
                alt={whiteUsername}
                className="w-full h-full rounded object-cover"
              />
            ) : (
              <span className="text-base font-bold text-gray-600 dark:text-gray-300">
                {whiteUsername.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          {/* Username and ELO */}
          <div className="flex flex-col">
            <span className="font-bold text-black dark:text-white text-sm">
              {whiteUsername}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              ELO: {whiteElo}
            </span>
          </div>
        </div>
        
        {/* Timer for White */}
        <div className="flex-shrink-0">
          <Timer 
            timeControl={timeControl}
            gameStarted={gameStarted}
            playerColor="white"
            showOnly={true}
          />
        </div>
      </div>

      {/* Black Player Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Profile Picture - Square */}
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
            {blackPlayer?.profilePicture ? (
              <img 
                src={blackPlayer.profilePicture} 
                alt={blackUsername}
                className="w-full h-full rounded object-cover"
              />
            ) : (
              <span className="text-base font-bold text-gray-600 dark:text-gray-300">
                {blackUsername.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          {/* Username and ELO */}
          <div className="flex flex-col">
            <span className="font-bold text-black dark:text-white text-sm">
              {blackUsername}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              ELO: {blackElo}
            </span>
          </div>
        </div>
        
        {/* Timer for Black */}
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

export default GameHeader;

