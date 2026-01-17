import { useEffect, useState } from "react";
import {LoginPage} from "./pages/Login";

type HelloResponse = {
  message: string;
};

function App() {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const heartbeat = async () => {
      try {
        const res = await fetch("/heartbeat");
        const data = await res.json();
        console.log("[Client-side] Server reachable:", data);
      } catch (err) {
        console.error("[Cleint-side] Server unreachable:", err);
      }
    };

    heartbeat();
  }, []);

  useEffect(() => {
    fetch("/api/hello")
      .then((res) => res.json())
      .then((data: HelloResponse) => {
        setMessage(data.message);
      })
      .catch(() => {
        setMessage("Failed to reach backend");
      });
  }, []);

  return (
    <LoginPage />
    // <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
    //   <h1>Vite + React + Express</h1>
    //   <p>{message || "Loading..."}</p>
    // </div>
  );
}

export default App;


