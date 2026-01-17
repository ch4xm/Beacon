import ReactDOM from "react-dom/client";
import './index.css'
import App from './App'

import { BrowserRouter } from "react-router";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root container missing in index.html");
}

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
