import { useEffect, useState } from 'react';

const Timer = ({ timeControl, gameStarted, playerColor, showOnly = false }) => {
  const [whiteTime, setWhiteTime] = useState(timeControl * 60 * 1000); // Convert minutes to milliseconds
  const [blackTime, setBlackTime] = useState(timeControl * 60 * 1000);
  const [currentTurn, setCurrentTurn] = useState('white');

  // Update timer when timeControl changes
  useEffect(() => {
    if (!gameStarted) {
      const newTime = timeControl * 60 * 1000;
      setWhiteTime(newTime);
      setBlackTime(newTime);
    }
  }, [timeControl, gameStarted]);

  // Listen for timer updates from server
  useEffect(() => {
    const handleTimerUpdate = (e) => {
      if (e.detail.whiteTime !== undefined) setWhiteTime(e.detail.whiteTime);
      if (e.detail.blackTime !== undefined) setBlackTime(e.detail.blackTime);
      if (e.detail.currentTurn) setCurrentTurn(e.detail.currentTurn);
    };

    window.addEventListener('timerUpdate', handleTimerUpdate);
    return () => window.removeEventListener('timerUpdate', handleTimerUpdate);
  }, []);

  // Listen for turn changes
  useEffect(() => {
    const handleTurnChange = (e) => {
      setCurrentTurn(e.detail.turn);
    };

    window.addEventListener('turnChange', handleTurnChange);
    return () => window.removeEventListener('turnChange', handleTurnChange);
  }, []);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes === 0 && seconds < 10) {
      return `${seconds}.${Math.floor((milliseconds % 1000) / 100)}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isWhiteTurn = currentTurn === 'white';
  const isBlackTurn = currentTurn === 'black';
  const isLowWhiteTime = whiteTime < 10000;
  const isLowBlackTime = blackTime < 10000;

  // If showOnly is true, show only the timer for the specified playerColor
  if (showOnly && playerColor) {
    const isActive = gameStarted && (playerColor === 'white' ? isWhiteTurn : isBlackTurn);
    const time = gameStarted ? (playerColor === 'white' ? whiteTime : blackTime) : (timeControl * 60 * 1000);
    const isLowTime = gameStarted && (playerColor === 'white' ? isLowWhiteTime : isLowBlackTime);

    return (
      <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg border-2 ${
        isActive
          ? 'bg-white dark:bg-gray-200 border-gray-300 dark:border-gray-400'
          : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600'
      }`}>
        <span className={`font-mono text-sm font-bold ${
          isLowTime ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-800 dark:text-white'
        }`}>
          {formatTime(time)}
        </span>
      </div>
    );
  }

  // Original behavior: show both timers in a column
  if (!playerColor) {
    return null;
  }

  // If playing white, white timer at bottom; if playing black, black timer at bottom
  const whiteTimer = (
    <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg border-2 ${
      isWhiteTurn && gameStarted
        ? 'bg-white dark:bg-gray-200 border-gray-300 dark:border-gray-400'
        : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600'
    }`}>
      <span className={`font-mono text-sm font-bold ${
        isLowWhiteTime ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-800 dark:text-white'
      }`}>
        {formatTime(whiteTime)}
      </span>
    </div>
  );

  const blackTimer = (
    <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg border-2 ${
      isBlackTurn && gameStarted
        ? 'bg-white dark:bg-gray-200 border-gray-300 dark:border-gray-400'
        : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600'
    }`}>
      <span className={`font-mono text-sm font-bold ${
        isLowBlackTime ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-800 dark:text-white'
      }`}>
        {formatTime(blackTime)}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {playerColor === 'white' ? (
        <>
          {blackTimer}
          {whiteTimer}
        </>
      ) : (
        <>
          {whiteTimer}
          {blackTimer}
        </>
      )}
    </div>
  );
};

export default Timer;

