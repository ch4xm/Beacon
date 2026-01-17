import { useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import "./Home.css";
import AuthModal from "@/components/AuthModal";
import SearchBar from "@/components/SearchBar";
import Map from 'react-map-gl/mapbox';
import Pin from "@/components/Pin";


function HomePage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [clickedCoords, setClickedCoords] = useState({ lat: 0, lng: 0 });


  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem("accessToken");
  });

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setIsLoggedIn(false);
  };

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <div className="home-container">
      <SearchBar mapRef={mapRef} searchMarkerRef={searchMarkerRef} />

      <AuthModal
        isOpen={!isLoggedIn}
        onAuthSuccess={handleAuthSuccess}
      />

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
        onClick={(e) => setClickedCoords(e.lngLat)}
      >
        <Pin
          content={"GEM ALARM"}
          latitude={clickedCoords.lat}
          longitude={clickedCoords.lng}
        />
      </Map>
    </div>
  );
}

export default HomePage;
