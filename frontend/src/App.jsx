import { useEffect } from "react";
import socket from "./sockets/socket";

function App() {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to backend with id:", socket.id);
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  return <h1>Chess Site</h1>;
}

export default App;
