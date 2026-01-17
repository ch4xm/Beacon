import { useRef, useState, useEffect } from "react";
import "./Home.css";
import AuthModal from "@/components/AuthModal";
import SearchBar from "@/components/SearchBar";
import SavedPlacesPanel from "@/components/SavedPlacesPanel";
import Map, { GeolocateControl, NavigationControl } from "react-map-gl/mapbox";
import { Source, Layer, CircleLayerSpecification } from "react-map-gl/mapbox";
import Pin from "@/components/Pin";
import { reverseGeocode } from "@/utils/geocoding";

const layerStyle: CircleLayerSpecification = {
  id: 'point',
  type: 'circle',
  source: 'my-data',
  paint: {
    'circle-radius': 10,
    'circle-color': '#007cbf'
  },
  maxzoom: 9,
  minzoom: 5,
};

const heatmapLayerStyle = {
  id: 'pins-heat',
  type: 'heatmap',
  source: 'my-data',
  maxzoom: 9,
  minzoom: 5,
  paint: {
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      0,
      9,
      1
    ],
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      1,
      9,
      3
    ],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0,
      'rgba(33,102,172,0)',
      0.2,
      'rgb(103,169,207)',
      0.4,
      'rgb(209,229,240)',
      0.6,
      'rgb(253,219,199)',
      0.8,
      'rgb(239,138,98)',
      1,
      'rgb(178,24,43)'
    ],
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      2,
      9,
      20
    ],
    'heatmap-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      7,
      1,
      9,
      0
    ]
  }
};

const geojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-122.4, 37.8]
      },
      properties: { title: '915 Front Street, San Francisco, California' }
    }
  ]
};

interface PinData {
  lat: number;
  lng: number;
  name: string;
  isLoading: boolean;
}

function HomePage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [pinData, setPinData] = useState<PinData | null>(null);
  const [allPins, setAllPins] = useState({
    type: 'FeatureCollection',
    features: []
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem("accessToken");
  });

  useEffect(() => {
    fetch('http://localhost:3000/api/pins', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    })
      .then(res => res.json())
      .then(res => {
        const geojson = {
          type: 'FeatureCollection',
          features: res.map(p => {
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [p.longitude, p.latitude]
              },
              properties: {
                message: p.message,
                image: p.image,
                color: p.color
              }
            }
          })
        };
        setAllPins(geojson)
      })
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setIsLoggedIn(false);
  };

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
    const { lat, lng } = e.lngLat;
    setPinData({
      lat,
      lng,
      name: "Loading...",
      isLoading: true,
    });

    try {
      const result = await reverseGeocode(lat, lng);

      setPinData({
        lat,
        lng,
        name: result.name,
        isLoading: false,
      });
    } catch (error) {
      setPinData({
        lat,
        lng,
        name: "Unknown Location",
        isLoading: false,
      });
    }
  };

  return (
    <div className="home-container">
      <SearchBar
        mapRef={mapRef}
        searchMarkerRef={searchMarkerRef}
        onSelectPlace={(place) =>
          setPinData({
            lat: place.lat,
            lng: place.lng,
            name: place.name ?? "Unknown Location",
            isLoading: false,
          })
        }
      />

      <SavedPlacesPanel />

      <AuthModal isOpen={!isLoggedIn} onAuthSuccess={handleAuthSuccess} />

      {isLoggedIn && (
        <button onClick={handleLogout} className="logout-button">
          Log Out
        </button>
      )}

      <Map
        ref={(map) => {
          if (map) mapRef.current = map.getMap();
        }}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          longitude: -122.4,
          latitude: 37.8,
          zoom: 9,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={handleMapClick}
        interactive={true}
        doubleClickZoom={true}
        dragRotate={true}
        touchZoomRotate={true}
        attributionControl={false}
      >
        <GeolocateControl
          position="bottom-right"
          trackUserLocation
          showUserHeading
          showAccuracyCircle
          showButton
        />
        <NavigationControl
          position="bottom-right"
          showCompass={true}
          showZoom={true}
          visualizePitch={true}
        />

        {pinData && (
          <Pin
            name={pinData.name}
            latitude={pinData.lat}
            longitude={pinData.lng}
            isLoading={pinData.isLoading}
            onClose={() => setPinData(null)}
            onDetails={() => console.log("Details clicked")}
          />

        )}

        <Source id="my-data" type="geojson" data={allPins}>
          <Layer {...layerStyle} />
          <Layer {...heatmapLayerStyle} />

        </Source>
      </Map>
    </div>
  );
}

export default HomePage;

