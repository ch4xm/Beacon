const API_URL_DEV = "http://localhost:3000";
const API_URL_PROD = "https://api.truthnuke.tech";

export const BASE_API_URL = import.meta.env.VITE_API_URL == "local" ? API_URL_DEV : API_URL_PROD;
export const PIN_COLOR = "#007CBF";
export const USER_PIN_COLOR = "#FFD700";