import ReactDOM from "react-dom/client";
import './index.css'

import App from './App'
import HomePage from "./pages/Home";
import Landing from "./pages/Landing";
import { LoginPage } from "./pages/Login";

import { BrowserRouter } from "react-router";
import { Routes } from "react-router";
import { Route } from "react-router";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root container missing in index.html");
}

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
    </Routes>
  </BrowserRouter>,
);
