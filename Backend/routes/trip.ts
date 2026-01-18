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
            transitPromises.push(
                searchFlights(originAirport, destAirport, departureDate)
                    .catch((err) => {
                        console.error("Flight search error:", err);
                        return [];
                    })
            );
        } else {
            transitPromises.push(Promise.resolve([]));
        }

        // Transit search (train/bus)
        transitPromises.push(
            searchTransit(startLocation, endLocation)
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

        // Add flight options
        if (flights.length > 0) {
            const bestFlight = flights[0];
            const carbonPerKm = bestFlight.carbonEstimateKg / distanceKm;
            transitOptions.push({
                mode: "flight",
                provider: bestFlight.segments[0]?.carrier,
                price: `$${bestFlight.price}`,
                duration: bestFlight.duration,
                carbonKg: bestFlight.carbonEstimateKg,
                carbonRating: getSustainabilityRating(carbonPerKm),
                segments: bestFlight.segments,
            });
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
