import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./Home.css";
import AuthModal from "@/components/AuthModal";
import Map from 'react-map-gl/mapbox';


function HomePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem("accessToken");
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

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setIsLoggedIn(false);
  };

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
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
      <AuthModal
        isOpen={!isLoggedIn}
        onAuthSuccess={handleAuthSuccess}
      />

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
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      />
    </div>
  );
}

export default HomePage;
