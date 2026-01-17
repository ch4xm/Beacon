import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import "./Home.css";
import Pin from "@/components/Pin";
import { createRoot } from "react-dom/client";
import * as React from 'react';
import Map from 'react-map-gl/mapbox';


function HomePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem("accessToken");
  });

  // Auth state
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Debounced search-as-you-type
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token || !mapRef.current) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchQuery
        )}.json?access_token=${token}&limit=7&autocomplete=true&types=place,address,poi`;
        const resp = await fetch(url, { signal: controller.signal });
        const data = await resp.json();
        setSearchResults(data?.features ?? []);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.error("Geocoding search error:", err);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const handleSelectResult = (feature: any) => {
    if (!feature?.center || !mapRef.current) return;
    const [lng, lat] = feature.center as [number, number];

    if (!searchMarkerRef.current) {
      searchMarkerRef.current = new mapboxgl.Marker({ color: "#1a1a1a" });
    }
    searchMarkerRef.current.setLngLat([lng, lat]).addTo(mapRef.current);

    mapRef.current.flyTo({ center: [lng, lat], zoom: 12, essential: true });
    setSearchQuery(feature.place_name || "");
    setSearchResults([]);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;
    // If we already have results, pick the first; otherwise trigger fetch
    if (searchResults[0]) {
      handleSelectResult(searchResults[0]);
      return;
    }
    // Fallback: single fetch then select
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token) return;
    setIsSearching(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery
      )}.json?access_token=${token}&limit=1`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data?.features?.[0]) handleSelectResult(data.features[0]);
    } catch (err) {
      console.error("Geocoding error:", err);
    } finally {
      setIsSearching(false);
    }
  };





  return (
    <div className="home-container">
      {/* Search Bar - top-left overlay */}
      <div className="search-bar">
        <form onSubmit={handleSearchSubmit} className="search-form" autoComplete="off">
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

        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map((feature) => (
              <li
                key={feature.id}
                className="search-result-item"
                onMouseDown={() => handleSelectResult(feature)}
              >
                <div className="result-primary">{feature.text}</div>
                {feature.place_name && (
                  <div className="result-secondary">{feature.place_name}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Auth Modal - shown when not logged in */}
      {!isLoggedIn && (
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <div className="auth-modal-header">
              <div className="auth-brand">
                <svg className="auth-logo" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="40" r="36" stroke="#2d6a4f" strokeWidth="2" fill="#e9f5e9" />
                  <path d="M40 20C32 20 26 28 26 36C26 48 40 60 40 60C40 60 54 48 54 36C54 28 48 20 40 20Z" fill="#2d6a4f" />
                  <circle cx="40" cy="35" r="6" fill="#faf9f7" />
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

      <Map
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          longitude: -122.4,
          latitude: 37.8,
          zoom: 9,
          // minZoom: 3
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      />
    </div>
  );
}

export default HomePage;
