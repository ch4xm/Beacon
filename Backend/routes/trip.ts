/**
 * Trip Planning Routes
 * Handles trip planning API endpoints.
 */

import { Request, Response } from "express";
import { searchFlights, getCityAirportCode, FlightResult } from "../services/amadeus";
import { searchTransit, searchDriving, TransitResult } from "../services/googleRoutes";
import { searchEcoHotels, EcoHotel } from "../services/hotelService";
import { generateItinerary, LocalPin, ItineraryResult } from "../services/ai";
import {
    calculateFlightCarbon,
    calculateTypicalTouristCarbon,
    getComparison,
    calculateOffsetCost,
    formatCarbon,
    getSustainabilityRating,
} from "../utils/carbon";
import * as db from "../database/db";

export interface TripPlanRequest {
    startLocation: string;
    endLocation: string;
    itineraryType: string;
    departureDate?: string;
    durationDays?: number;
}

export interface TransitOption {
    mode: "flight" | "train" | "bus" | "driving";
    provider?: string;
    price?: string;
    duration: string;
    carbonKg: number;
    carbonRating: { rating: string; color: string; score: number };
    segments?: any[];
    polyline?: string;
    flightNumber?: string; // For flights: e.g., "UA123"
    bookingUrl?: string; // Link to book/view the option
    stops?: number; // Number of stops (0 = nonstop, for flights)
}

export interface TripPlanResponse {
    origin: string;
    destination: string;
    itineraryType: string;
    transitOptions: TransitOption[];
    itinerary: ItineraryResult;
    localPins: LocalPin[];
    ecoHotels: EcoHotel[];
    carbonStats: {
        bestOption: { mode: string; carbonKg: number };
        worstOption: { mode: string; carbonKg: number };
        typicalTouristKg: number;
        savingsVsTypical: number;
        offsetCostUsd: number;
    };
    routePolylines: {
        mode: string;
        polyline: string;
    }[];
}

/**
 * Get pins near a destination
 */
function getNearbyPins(lat: number, lng: number, radiusKm: number = 50): LocalPin[] {
    // Haversine formula approximation: 1 degree ≈ 111km
    const radiusDeg = radiusKm / 111;

    const results = db.query(`
        SELECT id, title, description, latitude, longitude
        FROM pin
        WHERE latitude BETWEEN ? AND ?
          AND longitude BETWEEN ? AND ?
        LIMIT 20
    `, [
        lat - radiusDeg,
        lat + radiusDeg,
        lng - radiusDeg,
        lng + radiusDeg,
    ]);

    return results.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        latitude: row.latitude,
        longitude: row.longitude,
    }));
}

/**
 * Geocode a city name to coordinates using Google Geocoding
 */
async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${apiKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const location = data.results?.[0]?.geometry?.location;

    return location ? { lat: location.lat, lng: location.lng } : null;
}

/**
 * Calculate approximate distance between two points (Haversine)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Generate a Google Flights search URL for a flight
 */
function generateFlightBookingUrl(
    originCode: string,
    destCode: string,
    departureDate: string,
    returnDate?: string
): string {
    // Google Flights URL format
    let url = `https://www.google.com/travel/flights?q=flights%20from%20${originCode}%20to%20${destCode}%20on%20${departureDate}`;
    if (returnDate) {
        url += `%20returning%20on%20${returnDate}`;
    }
    return url;
}

function getErrorMessage(error: any): string {
    if (error instanceof Error) {
        try {
            // Attempt to parse if it's a JSON string (e.g. from Google GenAI SDK)
            const parsed = JSON.parse(error.message);
            if (parsed.error && parsed.error.message) {
                return parsed.error.message;
            }
        } catch {
            // Not JSON, just use the message
        }
        return error.message;
    }
    return String(error);
}

// Progress stages for SSE streaming
type ProgressStage =
    | 'geocoding'
    | 'flights'
    | 'transit'
    | 'driving'
    | 'transitOptions'  // New: sends available transit for user selection
    | 'hotels'
    | 'hotelOptions'    // New: sends available hotels for user selection
    | 'pins'
    | 'ready'           // New: all options ready, waiting for user selection
    | 'itinerary'
    | 'complete'
    | 'error';

interface ProgressUpdate {
    stage: ProgressStage;
    message: string;
    progress: number; // 0-100
    data?: any;
}

function sendSSE(res: Response, update: ProgressUpdate) {
    res.write(`data: ${JSON.stringify(update)}\n\n`);
}

/**
 * Wait for a minimum display time (2s ± 150ms) to create smooth UX
 */
function stageDelay(): Promise<void> {
    const baseMs = 2000;
    const variance = 150;
    const delay = baseMs + Math.floor(Math.random() * variance * 2) - variance;
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Plan a trip with streaming progress - SSE endpoint
 */
export async function planTripStream(req: Request, res: Response) {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    try {
        const {
            startLocation,
            endLocation,
            itineraryType,
            departureDate = new Date().toISOString().split("T")[0],
            durationDays = 3,
        }: TripPlanRequest = req.body;

        if (!startLocation || !endLocation || !itineraryType) {
            sendSSE(res, {
                stage: 'error',
                message: 'Missing required fields: startLocation, endLocation, itineraryType',
                progress: 0,
            });
            res.end();
            return;
        }

        // Stage 1: Geocoding (10%)
        sendSSE(res, {
            stage: 'geocoding',
            message: 'Finding locations on the map...',
            progress: 5,
        });

        const [originCoords, destCoords] = await Promise.all([
            geocodeCity(startLocation),
            geocodeCity(endLocation),
        ]);

        if (!destCoords) {
            sendSSE(res, {
                stage: 'error',
                message: 'Could not find destination on map',
                progress: 10,
            });
            res.end();
            return;
        }

        sendSSE(res, {
            stage: 'geocoding',
            message: 'Locations found!',
            progress: 10,
        });

        const distanceKm = originCoords
            ? calculateDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng)
            : 500;

        // Stage 2: Search for flights (25%)
        // Start flight search in background immediately
        const originAirport = getCityAirportCode(startLocation);
        const destAirport = getCityAirportCode(endLocation);

        const flightSearchPromise = (async () => {
            if (originAirport && destAirport) {
                try {
                    // Calculate return date
                    const start = new Date(departureDate);
                    start.setDate(start.getDate() + durationDays);
                    const returnDate = start.toISOString().split("T")[0];

                    return await searchFlights(originAirport, destAirport, departureDate, returnDate);
                } catch (err) {
                    console.error("Flight search error:", err);
                }
            }
            return [] as FlightResult[];
        })();

        // Show geocoding for minimum time, then transition to flights
        await stageDelay();
        sendSSE(res, {
            stage: 'flights',
            message: 'Searching for flights...',
            progress: 15,
        });

        // Wait for flight search to complete (may already be done)
        const flights = await flightSearchPromise;

        sendSSE(res, {
            stage: 'flights',
            message: flights.length > 0 ? `Found ${flights.length} flight options` : 'No direct flights found',
            progress: 25,
            data: { flightsFound: flights.length },
        });

        // Stage 3: Search for transit (40%)
        // Start transit search in background immediately
        const transitDepartureTime = `${departureDate}T08:00:00Z`;
        const transitSearchPromise = searchTransit(startLocation, endLocation, transitDepartureTime)
            .catch(err => {
                console.error("Transit search error:", err);
                return [] as TransitResult[];
            });

        await stageDelay();
        sendSSE(res, {
            stage: 'transit',
            message: 'Checking train and bus routes...',
            progress: 30,
        });

        const transitResults = await transitSearchPromise;

        sendSSE(res, {
            stage: 'transit',
            message: transitResults.length > 0 ? `Found ${transitResults.length} transit options` : 'No transit routes found',
            progress: 40,
            data: { transitFound: transitResults.length },
        });

        // Stage 4: Search for driving (50%)
        // Start driving search in background immediately
        const drivingSearchPromise = searchDriving(startLocation, endLocation)
            .catch(err => {
                console.error("Driving search error:", err);
                return null;
            });

        await stageDelay();
        sendSSE(res, {
            stage: 'driving',
            message: 'Calculating driving route...',
            progress: 45,
        });

        const drivingResult = await drivingSearchPromise;

        sendSSE(res, {
            stage: 'driving',
            message: drivingResult ? 'Driving route calculated' : 'Could not calculate driving route',
            progress: 50,
            data: { drivingAvailable: !!drivingResult },
        });

        // Stage 5: Search for eco hotels (60%)
        // Start hotel search in background immediately
        const hotelSearchPromise = searchEcoHotels(endLocation)
            .catch(err => {
                console.error("Eco hotel search error:", err);
                return [] as EcoHotel[];
            });

        await stageDelay();
        sendSSE(res, {
            stage: 'hotels',
            message: 'Finding eco-friendly accommodations...',
            progress: 55,
        });

        const ecoHotels = await hotelSearchPromise;

        sendSSE(res, {
            stage: 'hotels',
            message: ecoHotels.length > 0 ? `Found ${ecoHotels.length} eco-friendly stays` : 'No eco hotels found',
            progress: 60,
            data: { hotelsFound: ecoHotels.length },
        });

        // Stage 6: Get nearby pins (65%)
        await stageDelay();
        sendSSE(res, {
            stage: 'pins',
            message: 'Discovering local recommendations...',
            progress: 62,
        });

        const localPins = getNearbyPins(destCoords.lat, destCoords.lng);

        sendSSE(res, {
            stage: 'pins',
            message: localPins.length > 0 ? `Found ${localPins.length} local spots` : 'No community pins nearby',
            progress: 65,
            data: { pinsFound: localPins.length },
        });

        await stageDelay();

        // Build transit options (before itinerary generation)
        const transitOptions: TransitOption[] = [];
        const routePolylines: { mode: string; polyline: string }[] = [];

        // Check if we have ground transit options
        const hasGroundTransit = transitResults.length > 0 || drivingResult;

        // Add flight options - show multiple if flights are the main option
        if (flights.length > 0) {
            // If no ground transit, show all available flights (up to 5)
            // Otherwise, just show the best flight
            const flightsToShow = hasGroundTransit ? [flights[0]] : flights.slice(0, 3);

            for (const flight of flightsToShow) {
                const carbonPerKm = flight.carbonEstimateKg / distanceKm;
                // Build flight number string from segments, separating outbound and return
                const outboundSegments = flight.segments.filter(s => s.direction === 'outbound');
                const returnSegments = flight.segments.filter(s => s.direction === 'return');

                const outboundFlights = outboundSegments.map(s => s.flightNumber).join(' → ');
                const returnFlights = returnSegments.map(s => s.flightNumber).join(' → ');

                // Format: "outbound | return" or just outbound if no return
                const flightNumbers = returnFlights
                    ? `${outboundFlights} | ${returnFlights}`
                    : outboundFlights;

                transitOptions.push({
                    mode: "flight",
                    provider: flight.segments[0]?.carrier,
                    price: `$${flight.price}`,
                    duration: flight.duration,
                    carbonKg: flight.carbonEstimateKg,
                    carbonRating: getSustainabilityRating(carbonPerKm),
                    segments: flight.segments,
                    flightNumber: flightNumbers,
                    stops: flight.stops, // 0 = nonstop
                    bookingUrl: (() => {
                        if (!originAirport || !destAirport) return undefined;
                        const start = new Date(departureDate);
                        start.setDate(start.getDate() + durationDays);
                        const returnDate = start.toISOString().split("T")[0];
                        return generateFlightBookingUrl(originAirport, destAirport, departureDate, returnDate);
                    })(),
                });
            }
        }

        // Add transit options
        if (transitResults.length > 0) {
            const trainResult = transitResults.find(r =>
                r.segments.some(s => s.mode === "RAIL" || s.mode === "SUBWAY" || s.mode === "COMMUTER_TRAIN" || s.mode === "HIGH_SPEED_TRAIN")
            );
            const busResult = transitResults.find(r =>
                r.segments.every(s => s.mode === "BUS") ||
                (r.segments.some(s => s.mode === "BUS") && !r.segments.some(s => s.mode === "RAIL" || s.mode === "SUBWAY"))
            );

            if (trainResult) {
                const carbonPerKm = trainResult.carbonEstimateKg / trainResult.distanceKm;
                transitOptions.push({
                    mode: "train",
                    duration: trainResult.duration,
                    carbonKg: trainResult.carbonEstimateKg,
                    carbonRating: getSustainabilityRating(carbonPerKm),
                    segments: trainResult.segments,
                    polyline: trainResult.polyline,
                });
                if (trainResult.polyline) {
                    routePolylines.push({ mode: "train", polyline: trainResult.polyline });
                }
            }

            if (busResult) {
                const carbonPerKm = busResult.carbonEstimateKg / busResult.distanceKm;
                transitOptions.push({
                    mode: "bus",
                    duration: busResult.duration,
                    carbonKg: busResult.carbonEstimateKg,
                    carbonRating: getSustainabilityRating(carbonPerKm),
                    segments: busResult.segments,
                    polyline: busResult.polyline,
                });
                if (busResult.polyline) {
                    routePolylines.push({ mode: "bus", polyline: busResult.polyline });
                }
            }
        }

        // Add driving option
        if (drivingResult) {
            const carbonPerKm = drivingResult.carbonEstimateKg / drivingResult.distanceKm;
            transitOptions.push({
                mode: "driving",
                duration: drivingResult.duration,
                carbonKg: drivingResult.carbonEstimateKg,
                carbonRating: getSustainabilityRating(carbonPerKm),
                polyline: drivingResult.polyline,
            });
            if (drivingResult.polyline) {
                routePolylines.push({ mode: "driving", polyline: drivingResult.polyline });
            }
        }

        // Sort by carbon
        transitOptions.sort((a, b) => a.carbonKg - b.carbonKg);

        // Add fallback options if needed
        if (transitOptions.length === 0 && distanceKm > 0) {
            const flightCarbonKg = Math.round(distanceKm * 0.2);
            const flightDurationHours = Math.round(distanceKm / 800);
            transitOptions.push({
                mode: "flight",
                provider: "Estimated",
                duration: `PT${flightDurationHours}H`,
                carbonKg: flightCarbonKg,
                carbonRating: getSustainabilityRating(0.2),
            });

            if (distanceKm < 2000) {
                const drivingCarbonKg = Math.round(distanceKm * 0.21);
                const drivingDurationHours = Math.round(distanceKm / 80);
                transitOptions.push({
                    mode: "driving",
                    duration: `${drivingDurationHours}h`,
                    carbonKg: drivingCarbonKg,
                    carbonRating: getSustainabilityRating(0.21),
                });
            }
            transitOptions.sort((a, b) => a.carbonKg - b.carbonKg);
        }

        // Calculate carbon stats
        const bestOption = transitOptions[0] || { mode: "n/a", carbonKg: 0 };
        const worstOption = transitOptions[transitOptions.length - 1] || bestOption;
        const typicalTouristKg = calculateTypicalTouristCarbon(distanceKm, durationDays);
        const savingsVsTypical = typicalTouristKg > 0
            ? Math.round((1 - bestOption.carbonKg / typicalTouristKg) * 100)
            : 0;

        // Send all options to frontend for user selection (no itinerary yet)
        const optionsResponse = {
            origin: startLocation,
            destination: endLocation,
            itineraryType,
            durationDays,
            transitOptions,
            localPins,
            ecoHotels,
            carbonStats: {
                bestOption: { mode: bestOption.mode, carbonKg: bestOption.carbonKg },
                worstOption: { mode: worstOption.mode, carbonKg: worstOption.carbonKg },
                typicalTouristKg,
                savingsVsTypical,
                offsetCostUsd: calculateOffsetCost(bestOption.carbonKg),
            },
            routePolylines,
        };

        // Send ready stage with all options for user selection
        sendSSE(res, {
            stage: 'ready',
            message: 'Options ready! Please select your travel and hotel preferences.',
            progress: 70,
            data: optionsResponse,
        });

        res.end();
    } catch (error) {
        console.error("Trip planning error:", error);
        sendSSE(res, {
            stage: 'error',
            message: getErrorMessage(error),
            progress: 0,
        });
        res.end();
    }
}

/**
 * Plan a trip - main endpoint handler
 */
export async function planTrip(req: Request, res: Response) {
    try {
        const {
            startLocation,
            endLocation,
            itineraryType,
            departureDate = new Date().toISOString().split("T")[0],
            durationDays = 3,
        }: TripPlanRequest = req.body;

        if (!startLocation || !endLocation || !itineraryType) {
            return res.status(400).json({
                error: "Missing required fields: startLocation, endLocation, itineraryType",
            });
        }

        // Geocode locations
        const [originCoords, destCoords] = await Promise.all([
            geocodeCity(startLocation),
            geocodeCity(endLocation),
        ]);

        if (!destCoords) {
            return res.status(400).json({ error: "Could not geocode destination" });
        }

        const distanceKm = originCoords
            ? calculateDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng)
            : 500; // Default estimate

        // Fetch all transit options in parallel
        const transitPromises: Promise<any>[] = [];

        // Flight search
        const originAirport = getCityAirportCode(startLocation);
        const destAirport = getCityAirportCode(endLocation);

        if (originAirport && destAirport) {
            // Calculate return date
            const start = new Date(departureDate);
            start.setDate(start.getDate() + durationDays);
            const returnDate = start.toISOString().split("T")[0];

            transitPromises.push(
                searchFlights(originAirport, destAirport, departureDate, returnDate)
                    .catch((err) => {
                        console.error("Flight search error:", err);
                        return [];
                    })
            );
        } else {
            transitPromises.push(Promise.resolve([]));
        }

        // Transit search (train/bus)
        const transitDepartureTime = `${departureDate}T08:00:00Z`;
        transitPromises.push(
            searchTransit(startLocation, endLocation, transitDepartureTime)
                .catch((err) => {
                    console.error("Transit search error:", err);
                    return [];
                })
        );

        // Driving search (for carpool comparison)
        transitPromises.push(
            searchDriving(startLocation, endLocation)
                .catch((err) => {
                    console.error("Driving search error:", err);
                    return null;
                })
        );

        // Get nearby pins (synchronous, wrap in Promise for Promise.all)
        transitPromises.push(Promise.resolve(getNearbyPins(destCoords.lat, destCoords.lng)));

        // Eco-friendly hotel search
        transitPromises.push(
            searchEcoHotels(endLocation)
                .catch((err) => {
                    console.error("Eco hotel search error:", err);
                    return [];
                })
        );

        const [flights, transitResults, drivingResult, localPins, ecoHotels] = await Promise.all(transitPromises) as [
            FlightResult[],
            TransitResult[],
            { distanceKm: number; duration: string; carbonEstimateKg: number; polyline?: string } | null,
            LocalPin[],
            EcoHotel[]
        ];

        // Build transit options
        const transitOptions: TransitOption[] = [];
        const routePolylines: { mode: string; polyline: string }[] = [];

        // Check if we have ground transit options
        const hasGroundTransit = transitResults.length > 0 || drivingResult;

        // Add flight options - show multiple if flights are the main option
        if (flights.length > 0) {
            // If no ground transit, show all available flights (up to 5)
            // Otherwise, just show the best flight
            const flightsToShow = hasGroundTransit ? [flights[0]] : flights.slice(0, 5);

            for (const flight of flightsToShow) {
                const carbonPerKm = flight.carbonEstimateKg / distanceKm;
                // Build flight number string from segments
                const flightNumbers = flight.segments
                    .map(seg => seg.flightNumber)
                    .join(' → ');

                transitOptions.push({
                    mode: "flight",
                    provider: flight.segments[0]?.carrier,
                    price: `$${flight.price}`,
                    duration: flight.duration,
                    carbonKg: flight.carbonEstimateKg,
                    carbonRating: getSustainabilityRating(carbonPerKm),
                    segments: flight.segments,
                    flightNumber: flightNumbers,
                    stops: flight.stops, // 0 = nonstop
                    bookingUrl: (() => {
                        if (!originAirport || !destAirport) return undefined;
                        const start = new Date(departureDate);
                        start.setDate(start.getDate() + durationDays);
                        const returnDate = start.toISOString().split("T")[0];
                        return generateFlightBookingUrl(originAirport, destAirport, departureDate, returnDate);
                    })(),
                });
            }
        }

        // Add transit options (separate train and bus options)
        if (transitResults.length > 0) {
            // Find train option (RAIL/SUBWAY)
            const trainResult = transitResults.find(r =>
                r.segments.some(s => s.mode === "RAIL" || s.mode === "SUBWAY" || s.mode === "COMMUTER_TRAIN" || s.mode === "HIGH_SPEED_TRAIN")
            );
            // Find bus option
            const busResult = transitResults.find(r =>
                r.segments.every(s => s.mode === "BUS") ||
                (r.segments.some(s => s.mode === "BUS") && !r.segments.some(s => s.mode === "RAIL" || s.mode === "SUBWAY"))
            );

            // Add train option if available
            if (trainResult) {
                const carbonPerKm = trainResult.carbonEstimateKg / trainResult.distanceKm;
                transitOptions.push({
                    mode: "train",
                    duration: trainResult.duration,
                    carbonKg: trainResult.carbonEstimateKg,
                    carbonRating: getSustainabilityRating(carbonPerKm),
                    segments: trainResult.segments,
                    polyline: trainResult.polyline,
                });
                if (trainResult.polyline) {
                    routePolylines.push({ mode: "train", polyline: trainResult.polyline });
                }
            }

            // Add bus option if available
            if (busResult) {
                const carbonPerKm = busResult.carbonEstimateKg / busResult.distanceKm;
                transitOptions.push({
                    mode: "bus",
                    duration: busResult.duration,
                    carbonKg: busResult.carbonEstimateKg,
                    carbonRating: getSustainabilityRating(carbonPerKm),
                    segments: busResult.segments,
                    polyline: busResult.polyline,
                });
                if (busResult.polyline) {
                    routePolylines.push({ mode: "bus", polyline: busResult.polyline });
                }
            }
        }

        // Add driving option
        if (drivingResult) {
            const carbonPerKm = drivingResult.carbonEstimateKg / drivingResult.distanceKm;
            transitOptions.push({
                mode: "driving",
                duration: drivingResult.duration,
                carbonKg: drivingResult.carbonEstimateKg,
                carbonRating: getSustainabilityRating(carbonPerKm),
                polyline: drivingResult.polyline,
            });

            if (drivingResult.polyline) {
                routePolylines.push({ mode: "driving", polyline: drivingResult.polyline });
            }
        }

        // Sort by carbon (lowest first)
        transitOptions.sort((a, b) => a.carbonKg - b.carbonKg);

        // Add fallback options if no transit options were found (e.g., for long-distance international routes)
        if (transitOptions.length === 0 && distanceKm > 0) {
            // Estimate flight carbon for this distance
            const flightCarbonKg = Math.round(distanceKm * 0.2);
            const flightDurationHours = Math.round(distanceKm / 800);

            transitOptions.push({
                mode: "flight",
                provider: "Estimated",
                duration: `PT${flightDurationHours}H`,
                carbonKg: flightCarbonKg,
                carbonRating: getSustainabilityRating(0.2),
            });

            // Add driving option (if distance is reasonable for driving)
            if (distanceKm < 2000) {
                const drivingCarbonKg = Math.round(distanceKm * 0.21); // Single driver
                const drivingDurationHours = Math.round(distanceKm / 80);

                transitOptions.push({
                    mode: "driving",
                    duration: `${drivingDurationHours}h`,
                    carbonKg: drivingCarbonKg,
                    carbonRating: getSustainabilityRating(0.21),
                });
            }

            // Sort again after adding fallback options
            transitOptions.sort((a, b) => a.carbonKg - b.carbonKg);
        }

        // Generate itinerary with AI
        const transitSummary = transitOptions.length > 0
            ? `Traveling by ${transitOptions[0].mode} (${transitOptions[0].duration})`
            : "Transportation details pending";

        const itinerary = await generateItinerary(
            endLocation,
            itineraryType,
            durationDays,
            localPins,
            transitSummary
        );

        // Calculate carbon stats
        const bestOption = transitOptions[0] || { mode: "n/a", carbonKg: 0 };
        const worstOption = transitOptions[transitOptions.length - 1] || bestOption;
        const typicalTouristKg = calculateTypicalTouristCarbon(distanceKm, durationDays);
        const savingsVsTypical = typicalTouristKg > 0
            ? Math.round((1 - bestOption.carbonKg / typicalTouristKg) * 100)
            : 0;

        const response: TripPlanResponse = {
            origin: startLocation,
            destination: endLocation,
            itineraryType,
            transitOptions,
            itinerary,
            localPins,
            ecoHotels,
            carbonStats: {
                bestOption: { mode: bestOption.mode, carbonKg: bestOption.carbonKg },
                worstOption: { mode: worstOption.mode, carbonKg: worstOption.carbonKg },
                typicalTouristKg,
                savingsVsTypical,
                offsetCostUsd: calculateOffsetCost(bestOption.carbonKg),
            },
            routePolylines,
        };

        res.json(response);
    } catch (error) {
        console.error("Trip planning error:", error);
        res.status(500).json({ error: getErrorMessage(error) });
    }
}

/**
 * Answer a question about the trip
 */
export async function askQuestion(req: Request, res: Response) {
    try {
        const { question, origin, destination, itineraryType } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Missing question" });
        }

        const { answerTripQuestion } = await import("../services/ai");

        const destCoords = await geocodeCity(destination || "");
        const localPins = destCoords
            ? getNearbyPins(destCoords.lat, destCoords.lng)
            : [];

        const answer = await answerTripQuestion(question, {
            origin: origin || "Unknown",
            destination: destination || "Unknown",
            itineraryType: itineraryType || "General",
            localPins,
        });

        res.json({ answer });
    } catch (error) {
        console.error("Question answering error:", error);
        res.status(500).json({ error: getErrorMessage(error) });
    }
}

/**
 * Generate itinerary with user-selected transit and hotel
 */
export interface GenerateItineraryRequest {
    destination: string;
    itineraryType: string;
    durationDays: number;
    selectedTransit: TransitOption;
    selectedHotel?: EcoHotel;
    localPins: LocalPin[];
}

export async function generateItineraryWithSelections(req: Request, res: Response) {
    try {
        const {
            destination,
            itineraryType,
            durationDays,
            selectedTransit,
            selectedHotel,
            localPins,
        }: GenerateItineraryRequest = req.body;

        if (!destination || !itineraryType || !selectedTransit) {
            return res.status(400).json({
                error: "Missing required fields: destination, itineraryType, selectedTransit",
            });
        }

        // Build transit summary for AI context
        const transitSummary = `Traveling by ${selectedTransit.mode} (${selectedTransit.duration})${selectedTransit.price ? `, ${selectedTransit.price}` : ''
            }`;

        // Build hotel context for AI
        const hotelContext = selectedHotel
            ? `Staying at ${selectedHotel.name}${selectedHotel.address ? ` (${selectedHotel.address})` : ''}`
            : '';

        // Generate itinerary with user selections
        const itinerary = await generateItinerary(
            destination,
            itineraryType,
            durationDays,
            localPins || [],
            `${transitSummary}. ${hotelContext}`.trim()
        );

        res.json({
            itinerary,
            selectedTransit,
            selectedHotel,
        });
    } catch (error) {
        console.error("Itinerary generation error:", error);
        res.status(500).json({ error: getErrorMessage(error) });
    }
}
