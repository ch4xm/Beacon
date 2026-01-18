/**
 * Amadeus Flight Offers Search API Client
 * Provides flight search functionality for the trip planner.
 */

const AMADEUS_AUTH_URL = "https://test.api.amadeus.com/v1/security/oauth2/token";
const AMADEUS_FLIGHTS_URL = "https://test.api.amadeus.com/v2/shopping/flight-offers";

interface AmadeusToken {
    access_token: string;
    expires_in: number;
    token_type: string;
}

interface FlightSegment {
    departure: { iataCode: string; at: string };
    arrival: { iataCode: string; at: string };
    carrierCode: string;
    number: string;
    aircraft: { code: string };
    duration: string;
}

interface FlightItinerary {
    duration: string;
    segments: FlightSegment[];
}

interface FlightOffer {
    id: string;
    source: string;
    price: { total: string; currency: string };
    itineraries: FlightItinerary[];
    travelerPricings: any[];
}

export interface FlightResult {
    id: string;
    price: string;
    currency: string;
    duration: string;
    segments: {
        from: string;
        to: string;
        departureTime: string;
        arrivalTime: string;
        carrier: string;
        flightNumber: string;
    }[];
    carbonEstimateKg: number;
}

let cachedToken: AmadeusToken | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken.access_token;
    }

    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Amadeus API credentials not configured");
    }

    const response = await fetch(AMADEUS_AUTH_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    if (!response.ok) {
        throw new Error(`Amadeus auth failed: ${response.status}`);
    }

    cachedToken = await response.json();
    // Expire 1 minute early to be safe
    tokenExpiry = Date.now() + (cachedToken!.expires_in - 60) * 1000;
    return cachedToken!.access_token;
}

/**
 * Parse ISO 8601 duration (e.g., "PT2H30M") to minutes
 */
function parseDurationToMinutes(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    return hours * 60 + minutes;
}

/**
 * Estimate CO2 emissions for a flight.
 * Average: ~0.255 kg CO2 per passenger-km for short-haul, ~0.195 for long-haul.
 * Using a simplified estimate based on duration.
 */
function estimateFlightCarbon(durationMinutes: number): number {
    // Rough estimate: average speed 800 km/h, so distance ≈ (duration/60) * 800
    const distanceKm = (durationMinutes / 60) * 800;
    // Use 0.22 kg CO2/km as a middle estimate
    return Math.round(distanceKm * 0.22);
}

/**
 * Search for flight offers between two cities
 * @param originCode IATA airport code (e.g., "SFO")
 * @param destinationCode IATA airport code (e.g., "LAX")
 * @param departureDate Date in YYYY-MM-DD format
 * @param adults Number of adult travelers (default 1)
 * @returns Array of flight results
 */
export async function searchFlights(
    originCode: string,
    destinationCode: string,
    departureDate: string,
    adults: number = 1
): Promise<FlightResult[]> {
    const token = await getAccessToken();

    const params = new URLSearchParams({
        originLocationCode: originCode,
        destinationLocationCode: destinationCode,
        departureDate,
        adults: adults.toString(),
        max: "5",
        currencyCode: "USD",
    });

    const response = await fetch(`${AMADEUS_FLIGHTS_URL}?${params}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Amadeus API error:", errorText);
        throw new Error(`Amadeus flight search failed: ${response.status}`);
    }

    const data = await response.json();
    const offers: FlightOffer[] = data.data || [];

    return offers.map((offer) => {
        const itinerary = offer.itineraries[0];
        const durationMinutes = parseDurationToMinutes(itinerary.duration);

        return {
            id: offer.id,
            price: offer.price.total,
            currency: offer.price.currency,
            duration: itinerary.duration,
            segments: itinerary.segments.map((seg) => ({
                from: seg.departure.iataCode,
                to: seg.arrival.iataCode,
                departureTime: seg.departure.at,
                arrivalTime: seg.arrival.at,
                carrier: seg.carrierCode,
                flightNumber: `${seg.carrierCode}${seg.number}`,
            })),
            carbonEstimateKg: estimateFlightCarbon(durationMinutes),
        };
    });
}

/**
 * Get the IATA airport code for a city (comprehensive mapping)
 */
export function getCityAirportCode(city: string): string | null {
    const mapping: Record<string, string> = {
        // US West Coast
        "san francisco": "SFO",
        "sf": "SFO",
        "sfo": "SFO",
        "los angeles": "LAX",
        "la": "LAX",
        "seattle": "SEA",
        "portland": "PDX",
        "san diego": "SAN",
        "san jose": "SJC",
        "oakland": "OAK",
        "sacramento": "SMF",
        "las vegas": "LAS",
        "phoenix": "PHX",
        "denver": "DEN",
        "salt lake city": "SLC",
        // US East Coast
        "new york": "JFK",
        "nyc": "JFK",
        "new york city": "JFK",
        "boston": "BOS",
        "washington": "DCA",
        "washington dc": "DCA",
        "dc": "DCA",
        "philadelphia": "PHL",
        "miami": "MIA",
        "atlanta": "ATL",
        "orlando": "MCO",
        "tampa": "TPA",
        "charlotte": "CLT",
        "baltimore": "BWI",
        // US Midwest
        "chicago": "ORD",
        "detroit": "DTW",
        "minneapolis": "MSP",
        "st louis": "STL",
        "kansas city": "MCI",
        "indianapolis": "IND",
        "cleveland": "CLE",
        "pittsburgh": "PIT",
        // US South
        "dallas": "DFW",
        "houston": "IAH",
        "austin": "AUS",
        "san antonio": "SAT",
        "new orleans": "MSY",
        "nashville": "BNA",
        // Hawaii & Alaska
        "honolulu": "HNL",
        "anchorage": "ANC",
        // Canada
        "toronto": "YYZ",
        "vancouver": "YVR",
        "montreal": "YUL",
        "calgary": "YYC",
        // Japan
        "tokyo": "NRT",
        "osaka": "KIX",
        "kyoto": "KIX",
        "nagoya": "NGO",
        "fukuoka": "FUK",
        "sapporo": "CTS",
        "naha": "OKA",
        "hiroshima": "HIJ",
        // Europe
        "london": "LHR",
        "paris": "CDG",
        "amsterdam": "AMS",
        "frankfurt": "FRA",
        "berlin": "BER",
        "munich": "MUC",
        "rome": "FCO",
        "milan": "MXP",
        "madrid": "MAD",
        "barcelona": "BCN",
        "lisbon": "LIS",
        "dublin": "DUB",
        "zurich": "ZRH",
        "vienna": "VIE",
        "prague": "PRG",
        "brussels": "BRU",
        "copenhagen": "CPH",
        "stockholm": "ARN",
        "oslo": "OSL",
        "helsinki": "HEL",
        // Asia
        "singapore": "SIN",
        "hong kong": "HKG",
        "seoul": "ICN",
        "bangkok": "BKK",
        "beijing": "PEK",
        "shanghai": "PVG",
        "taipei": "TPE",
        "mumbai": "BOM",
        "delhi": "DEL",
        "new delhi": "DEL",
        "dubai": "DXB",
        "sydney": "SYD",
        "melbourne": "MEL",
        "auckland": "AKL",
        // Mexico & Central America
        "mexico city": "MEX",
        "cancun": "CUN",
        "cabo": "SJD",
        "los cabos": "SJD",
    };

    return mapping[city.toLowerCase()] || null;
}
