import { useEffect, useState } from "react";
import socket from "../socket";
import ChessBoard from "../components/ChessBoard";
import RoomManager from "../components/RoomManager";

function Home() {
  const [roomInfo, setRoomInfo] = useState({ roomCode: null, playerColor: null, timeControl: 3 });
  const [selectedTimeControl, setSelectedTimeControl] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to backend with id:", socket.id);
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  const handleRoomJoined = ({ roomCode, color, timeControl }) => {
    setRoomInfo({ roomCode, playerColor: color, timeControl: timeControl || 3 });
    setSelectedTimeControl(timeControl || 3);
  };

  const handleGameStart = () => {
    setGameStarted(true);
  };

  const handleTimeControlChange = (timeControl) => {
    setSelectedTimeControl(timeControl);
  };

  return (
    <div className="bg-gray-200 dark:bg-zinc-800">
      {roomInfo.roomCode ? (
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
              {/* Chess Board - Takes up most of the screen */}
              <div className="flex-1 w-full lg:w-auto">
                <ChessBoard 
                  roomCode={roomInfo.roomCode}
                  playerColor={roomInfo.playerColor}
                  gameStarted={gameStarted}
                  timeControl={roomInfo.timeControl}
                />
              </div>
              
              {/* Room Info Sidebar */}
              <div className="w-full lg:w-[500px] flex-shrink-0">
                <RoomManager 
                  onRoomJoined={handleRoomJoined} 
                  onGameStart={handleGameStart}
                  showRoomInfo={true}
                  gameStarted={gameStarted}
                  roomCode={roomInfo.roomCode}
                  playerColor={roomInfo.playerColor}
                  timeControl={roomInfo.timeControl}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
              {/* Chess Board - Always visible */}
              <div className="flex-1 w-full lg:w-auto">
                <ChessBoard 
                  roomCode={roomInfo.roomCode}
                  playerColor={roomInfo.playerColor}
                  gameStarted={gameStarted}
                  timeControl={selectedTimeControl}
                />
              </div>
              
              {/* Join Game Menu */}
              <div className="w-full lg:w-[500px] flex-shrink-0">
                <RoomManager 
                  onRoomJoined={handleRoomJoined} 
                  onGameStart={handleGameStart}
                  onTimeControlChange={handleTimeControlChange}
                  showRoomInfo={false}
                  gameStarted={gameStarted}
                  roomCode={roomInfo.roomCode}
                  playerColor={roomInfo.playerColor}
                  timeControl={selectedTimeControl}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default Home;

