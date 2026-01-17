import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./Home.css";

type AuthMode = "login" | "register";

const API_BASE_URL = "http://localhost:3000";

function HomePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem("accessToken");
  });
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

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
        center: [-122, 37],
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

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.error("Missing Mapbox token");
      return;
    }

    setIsSearching(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery
      )}.json?access_token=${token}&limit=2`;

      const resp = await fetch(url);
      const data = await resp.json();

      const feature = data?.features?.[0];
      if (!feature || !feature.center) {
        console.warn("No results found");
        setIsSearching(false);
        return;
      }

      const [lng, lat] = feature.center as [number, number];

      if (!searchMarkerRef.current) {
        searchMarkerRef.current = new mapboxgl.Marker({ color: "#1a1a1a" });
      }
      searchMarkerRef.current.setLngLat([lng, lat]).addTo(mapRef.current);

      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 12,
        essential: true,
      });
    } catch (err) {
      console.error("Geocoding error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!credentials.email.trim() || !credentials.password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = authMode === "register" ? "/api/register" : "/api/login";
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (authMode === "register" ? "Registration failed" : "Login failed"));
      }

      // Store the token
      localStorage.setItem("accessToken", data.accessToken);
      setIsLoggedIn(true);
      setCredentials({ email: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setIsLoggedIn(false);
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === "login" ? "register" : "login");
    setError("");
    setCredentials({ email: "", password: "" });
  };

  return (
    <div className="home-container">
      {/* Search Bar - top-left overlay */}
      <div className="search-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            className="search-input"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-button" aria-label="Search" disabled={isSearching}>
            {isSearching ? "…" : "🔍"}
          </button>
        </form>
      </div>

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
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  autoComplete="email"
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}
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
