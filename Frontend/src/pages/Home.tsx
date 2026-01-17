import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./Home.css";

type AuthMode = "login" | "register";

function HomePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Check if token exists
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.error("Mapbox access token is missing. Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file.");
      return;
    }

    mapboxgl.accessToken = token;

    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-74.5, 40],
        zoom: 9,
        minZoom: 3
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (authMode === "register") {
      // Handle registration logic
      console.log("Registering as:", credentials);
      // On successful registration, log them in
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("username", credentials.username);
      setIsLoggedIn(true);
    } else {
      // Handle login logic
      console.log("Logging in with:", credentials);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("username", credentials.username);
      setIsLoggedIn(true);
    }

    // Reset form
    setCredentials({ username: "", password: "" });
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === "login" ? "register" : "login");
    setError("");
    setCredentials({ username: "", password: "" });
  };

  return (
    <div className="home-container">
      {/* Auth Modal - shown when not logged in */}
      {!isLoggedIn && (
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <div className="auth-modal-header">
              <div className="auth-brand">
                <svg className="auth-logo" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="40" r="36" stroke="#2d6a4f" strokeWidth="2" fill="#e9f5e9"/>
                  <path d="M40 20C32 20 26 28 26 36C26 48 40 60 40 60C40 60 54 48 54 36C54 28 48 20 40 20Z" fill="#2d6a4f"/>
                  <circle cx="40" cy="35" r="6" fill="#faf9f7"/>
                </svg>
              </div>
              <h2>{authMode === "login" ? "Welcome back" : "Create account"}</h2>
            </div>

            <div className="auth-tabs">
              <button
                className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                onClick={() => setAuthMode("register")}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={credentials.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                />
              </div>

              <button type="submit" className="auth-submit-btn">
                {authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                {authMode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
                <button onClick={switchAuthMode} className="auth-switch-btn">
                  {authMode === "login" ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Logout button - only shown when logged in */}
      {isLoggedIn && (
        <button onClick={handleLogout} className="logout-button">
          Log Out
        </button>
      )}

      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
}

export default HomePage;
