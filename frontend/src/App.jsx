import { useEffect, useState } from "react";
import socket from "./socket";
import ChessBoard from "./ChessBoard";
import RoomManager from "./RoomManager";

function App() {
  const [roomInfo, setRoomInfo] = useState({ roomCode: null, playerColor: null });
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to backend with id:", socket.id);
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  const handleRoomJoined = ({ roomCode, color }) => {
    setRoomInfo({ roomCode, playerColor: color });
  };

  const handleGameStart = () => {
    setGameStarted(true);
  };

  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  };

  useEffect(() => {
    // Check system preference or saved theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white">
            ♟️ Chess Game
          </h1>
          <button 
            onClick={toggleTheme}
            className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-gray-200 dark:border-gray-700"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
        
        {roomInfo.roomCode ? (
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            {/* Chess Board - Takes up most of the screen */}
            <div className="flex-1 w-full lg:w-auto">
              <ChessBoard 
                roomCode={roomInfo.roomCode}
                playerColor={roomInfo.playerColor}
                gameStarted={gameStarted}
              />
            </div>
            
            {/* Room Info Sidebar */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <RoomManager 
                onRoomJoined={handleRoomJoined} 
                onGameStart={handleGameStart}
                showRoomInfo={true}
              />
            </div>
          </div>
        ) : (
          <>
            <RoomManager 
              onRoomJoined={handleRoomJoined} 
              onGameStart={handleGameStart}
              showRoomInfo={false}
            />
            <ChessBoard 
              roomCode={roomInfo.roomCode}
              playerColor={roomInfo.playerColor}
              gameStarted={gameStarted}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
