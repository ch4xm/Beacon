import { useEffect, useState } from "react";
import {LoginPage} from "./pages/Login";

type HelloResponse = {
  message: string;
};

function App() {
  const [message, setMessage] = useState<string>("");

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


