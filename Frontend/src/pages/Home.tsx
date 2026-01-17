import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { NavLink } from "react-router";
import "./Home.css";

function HomePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

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
        style: "mapbox://styles/mapbox/streets-v12", // standard style
        center: [-74.5, 40], // starting position [lng, lat]
        zoom: 9, // starting zoom
        minZoom: 3
      });

      // Add navigation controls
      mapRef.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="home-container">
      <NavLink to="/" end className="logout-button">
        Logout
      </NavLink>
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
}

export default HomePage;
