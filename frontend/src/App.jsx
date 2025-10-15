import { useEffect } from "react";
import socket from "./socket";
import ChessBoard from "./ChessBoard";

function App() {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to backend with id:", socket.id);
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  return (
    <div className="App">
      <h1 style={{ textAlign: 'center', margin: '20px 0' }}>Chess Game</h1>
      <ChessBoard />
    </div>
  );
}

export default App;
