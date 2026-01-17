import ReactDOM from "react-dom/client";
import './index.css'

import Landing from "./pages/Landing";

import { createBrowserRouter, RouterProvider } from "react-router";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/home",
    // Lazy load Home page so prefetch can preload it
    lazy: () => import("./pages/Home").then((m) => ({ Component: m.default })),
  },
]);

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root container missing in index.html");
}

ReactDOM.createRoot(root).render(
  <RouterProvider router={router} />
);
