import { CircleLayerSpecification } from "react-map-gl/mapbox";

const API_URL_DEV = "http://localhost:3000";
const API_URL_PROD = "https://api.truthnuke.tech";

export const BASE_API_URL = import.meta.env.VITE_API_URL == "local" ? API_URL_DEV : API_URL_PROD;
export const PIN_COLOR = "#007CBF";
export const USER_PIN_COLOR = "#FFC700";

export const PIN_LAYER_STYLE: CircleLayerSpecification = {
	id: "point",
	type: "circle",
	source: "my-data",
	paint: {
		"circle-radius": 7,
		"circle-color": ["get", "color"],
		"circle-stroke-width": 3.5,
		"circle-stroke-color": ["get", "color"],
		"circle-opacity": 0.5,
	},
	maxzoom: 22,
	minzoom: 5,
};

export const HEATMAP_LAYER_STYLE = {
	id: "pins-heat",
	type: "heatmap",
	source: "my-data",
	maxzoom: 9,
	minzoom: 0,
	paint: {
		"heatmap-weight": ["interpolate", ["linear"], ["zoom"], 0, 0, 9, 1],
		"heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
		"heatmap-color": [
			"interpolate",
			["linear"],
			["heatmap-density"],
			0,
			"rgba(33,102,172,0)",
			0.2,
			"rgb(103,169,207)",
			0.4,
			"rgb(209,229,240)",
			0.6,
			"rgb(253,219,199)",
			0.8,
			"rgb(239,138,98)",
			1,
			"rgb(178,24,43)",
		],
		"heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
		"heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0],
	},
};