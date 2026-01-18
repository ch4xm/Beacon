/**
 * Google Routes API Client
 * Provides transit (train/bus/metro) routing functionality.
 */

const ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

interface RouteStep {
    transitDetails?: {
        stopDetails: {
            departureStop: { name: string };
            arrivalStop: { name: string };
        };
        localizedValues: {
            departureTime: { time: { text: string } };
            arrivalTime: { time: { text: string } };
        };
        headsign: string;
        transitLine: {
            name: string;
            vehicle: { type: string };
            agencies: { name: string }[];
        };
    };
    staticDuration?: string;
    distanceMeters?: number;
}

interface RouteLeg {
    duration: string;
    distanceMeters: number;
    steps: RouteStep[];
}

interface Route {
    legs: RouteLeg[];
    duration: string;
    distanceMeters: number;
    polyline?: { encodedPolyline: string };
}

export interface TransitSegment {
    mode: string;
    lineName: string;
    departureStop: string;
    arrivalStop: string;
    departureTime: string;
    arrivalTime: string;
    headsign: string;
    agency: string;
}

export interface TransitResult {
    duration: string;
    distanceKm: number;
    segments: TransitSegment[];
    polyline?: string;
    carbonEstimateKg: number;
}

/**
 * Carbon estimates per passenger-km by mode (kg CO2)
 */
const CARBON_PER_KM: Record<string, number> = {
    RAIL: 0.041,
    SUBWAY: 0.029,
    TRAM: 0.029,
    BUS: 0.089,
    FERRY: 0.019,
    CABLE_CAR: 0.020,
    GONDOLA: 0.020,
    FUNICULAR: 0.020,
    OTHER: 0.060,
};

function estimateTransitCarbon(distanceKm: number, mode: string): number {
    const factor = CARBON_PER_KM[mode] || CARBON_PER_KM.OTHER;
    return Math.round(distanceKm * factor * 100) / 100;
}

function parseDuration(duration: string): number {
    // Format: "3600s" (seconds)
    const match = duration.match(/(\d+)s/);
    return match ? parseInt(match[1], 10) : 0;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

/**
 * Search for transit routes between two locations
 * @param origin Origin address or coordinates (e.g., "San Francisco, CA" or { lat, lng })
 * @param destination Destination address or coordinates
 * @param departureTime ISO 8601 timestamp (optional, defaults to now)
 * @returns Array of transit route results
 */
export async function searchTransit(
    origin: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number },
    departureTime?: string
): Promise<TransitResult[]> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        throw new Error("Google Maps API key not configured");
    }

    const originWaypoint = typeof origin === "string"
        ? { address: origin }
        : { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } };

    const destinationWaypoint = typeof destination === "string"
        ? { address: destination }
        : { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } };

    const requestBody = {
        origin: originWaypoint,
        destination: destinationWaypoint,
        travelMode: "TRANSIT",
        computeAlternativeRoutes: true,
        transitPreferences: {
            routingPreference: "LESS_WALKING",
        },
        ...(departureTime && { departureTime }),
    };

    const response = await fetch(ROUTES_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.transitDetails,routes.legs.steps.distanceMeters",
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Routes API error:", errorText);
        throw new Error(`Google Routes API failed: ${response.status}`);
    }

    const data = await response.json();
    const routes: Route[] = data.routes || [];

    return routes.map((route) => {
        const durationSeconds = parseDuration(route.duration);
        const distanceKm = route.distanceMeters / 1000;

        const segments: TransitSegment[] = [];
        let totalCarbon = 0;

        for (const leg of route.legs) {
            for (const step of leg.steps) {
                if (step.transitDetails) {
                    const td = step.transitDetails;
                    const mode = td.transitLine.vehicle.type;
                    const stepDistanceKm = (step.distanceMeters || 0) / 1000;

                    totalCarbon += estimateTransitCarbon(stepDistanceKm, mode);

                    segments.push({
                        mode,
                        lineName: td.transitLine.name,
                        departureStop: td.stopDetails.departureStop.name,
                        arrivalStop: td.stopDetails.arrivalStop.name,
                        departureTime: td.localizedValues?.departureTime?.time?.text || "",
                        arrivalTime: td.localizedValues?.arrivalTime?.time?.text || "",
                        headsign: td.headsign,
                        agency: td.transitLine.agencies?.[0]?.name || "",
                    });
                }
            }
        }

        return {
            duration: formatDuration(durationSeconds),
            distanceKm: Math.round(distanceKm * 10) / 10,
            segments,
            polyline: route.polyline?.encodedPolyline,
            carbonEstimateKg: Math.round(totalCarbon * 100) / 100,
        };
    });
}

/**
 * Search for driving routes (used for carpool carbon comparison)
 */
export async function searchDriving(
    origin: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number }
): Promise<{ distanceKm: number; duration: string; carbonEstimateKg: number; polyline?: string }> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        throw new Error("Google Maps API key not configured");
    }

    const originWaypoint = typeof origin === "string"
        ? { address: origin }
        : { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } };

    const destinationWaypoint = typeof destination === "string"
        ? { address: destination }
        : { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } };

    const requestBody = {
        origin: originWaypoint,
        destination: destinationWaypoint,
        travelMode: "DRIVE",
    };

    const response = await fetch(ROUTES_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`Google Routes API (drive) failed: ${response.status}`);
    }

    const data = await response.json();
    const route = data.routes?.[0];

    if (!route) {
        throw new Error("No driving route found");
    }

    const distanceKm = route.distanceMeters / 1000;
    const durationSeconds = parseDuration(route.duration);

    // Average car: ~0.21 kg CO2/km
    const carbonEstimateKg = Math.round(distanceKm * 0.21 * 100) / 100;

    return {
        distanceKm: Math.round(distanceKm * 10) / 10,
        duration: formatDuration(durationSeconds),
        carbonEstimateKg,
        polyline: route.polyline?.encodedPolyline,
    };
}
