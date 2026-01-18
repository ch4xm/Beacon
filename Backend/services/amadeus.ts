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
        direction: 'outbound' | 'return';
    }[];
    carbonEstimateKg: number;
    stops: number; // Number of stops (0 = nonstop)
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
 * Uses distance-based emission factors aligned with Google/ICAO methodology.
 * Factors are per passenger-km for economy class.
 */
function estimateFlightCarbon(durationMinutes: number): number {
    // Estimate distance: average cruise speed ~850 km/h
    const distanceKm = (durationMinutes / 60) * 850;

    // Use distance-based emission factors (kg CO2 per passenger-km)
    // Based on ICAO Carbon Emissions Calculator methodology
    let factor: number;
    if (distanceKm < 1500) {
        // Short-haul: higher emissions due to takeoff/landing proportion
        factor = 0.07;
    } else if (distanceKm < 4000) {
        // Medium-haul
        factor = 0.07;
    } else {
        // Long-haul: more efficient per km
        factor = 0.07;
    }

    return Math.round(distanceKm * factor);
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
    returnDate?: string,
    adults: number = 1
): Promise<FlightResult[]> {
    const token = await getAccessToken();

    // Search for both nonstop and connecting flights in parallel
    const baseParams = {
        originLocationCode: originCode,
        destinationLocationCode: destinationCode,
        departureDate,
        adults: adults.toString(),
        currencyCode: "USD",
        ...(returnDate && { returnDate }),
    };

    // Fetch nonstop flights (prioritized)
    const nonstopParams = new URLSearchParams({
        ...baseParams,
        nonStop: "true",
        max: "5",
    });

    // Fetch all flights (may include connections)
    const allFlightsParams = new URLSearchParams({
        ...baseParams,
        max: "10",
    });

    const [nonstopResponse, allResponse] = await Promise.all([
        fetch(`${AMADEUS_FLIGHTS_URL}?${nonstopParams}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${AMADEUS_FLIGHTS_URL}?${allFlightsParams}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
    ]);

    // Parse both responses
    let nonstopOffers: FlightOffer[] = [];
    let allOffers: FlightOffer[] = [];

    if (nonstopResponse.ok) {
        const nonstopData = await nonstopResponse.json();
        nonstopOffers = nonstopData.data || [];
    }

    if (allResponse.ok) {
        const allData = await allResponse.json();
        allOffers = allData.data || [];
    }

    // If both failed, throw an error
    if (!nonstopResponse.ok && !allResponse.ok) {
        const errorText = await allResponse.text();
        console.error("Amadeus API error:", errorText);
        throw new Error(`Amadeus flight search failed: ${allResponse.status}`);
    }

    // Combine and deduplicate: prioritize nonstop flights
    const seenIds = new Set<string>();
    const combinedOffers: FlightOffer[] = [];

    // Add nonstop flights first
    for (const offer of nonstopOffers) {
        if (!seenIds.has(offer.id)) {
            seenIds.add(offer.id);
            combinedOffers.push(offer);
        }
    }

    // Add remaining flights (connections) that weren't already included
    for (const offer of allOffers) {
        if (!seenIds.has(offer.id)) {
            seenIds.add(offer.id);
            combinedOffers.push(offer);
        }
    }

    // Limit to top 10 results
    const offers = combinedOffers.slice(0, 10);

    return offers.map((offer) => {
        // offer.itineraries[0] is outbound, [1] is return (if round trip)
        const outboundItinerary = offer.itineraries[0];
        const returnItinerary = offer.itineraries[1]; // undefined if one-way

        const outboundDuration = parseDurationToMinutes(outboundItinerary.duration);
        const returnDuration = returnItinerary ? parseDurationToMinutes(returnItinerary.duration) : 0;

        // Combine segments
        const allSegments = [
            ...outboundItinerary.segments.map((seg) => ({
                from: seg.departure.iataCode,
                to: seg.arrival.iataCode,
                departureTime: seg.departure.at,
                arrivalTime: seg.arrival.at,
                carrier: seg.carrierCode,
                flightNumber: `${seg.carrierCode}${seg.number}`,
                direction: 'outbound' as const
            })),
            ...(returnItinerary ? returnItinerary.segments.map((seg) => ({
                from: seg.departure.iataCode,
                to: seg.arrival.iataCode,
                departureTime: seg.departure.at,
                arrivalTime: seg.arrival.at,
                carrier: seg.carrierCode,
                flightNumber: `${seg.carrierCode}${seg.number}`,
                direction: 'return' as const
            })) : [])
        ];

        // Calculate number of stops (segments - 1 for outbound)
        const outboundStops = outboundItinerary.segments.length - 1;

        return {
            id: offer.id,
            price: offer.price.total,
            currency: offer.price.currency,
            duration: outboundItinerary.duration, // We store the outbound duration as primary, or could combine
            segments: allSegments,
            carbonEstimateKg: estimateFlightCarbon(outboundDuration + returnDuration),
            stops: outboundStops,
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

/**
 * Get coordinates for an airport by IATA code
 */
export function getAirportCoordinates(code: string): { lat: number; lng: number } | null {
    const coords: Record<string, { lat: number; lng: number }> = {
        // US West Coast
        "SFO": { lat: 37.6213, lng: -122.3790 },
        "LAX": { lat: 33.9425, lng: -118.4081 },
        "SEA": { lat: 47.4502, lng: -122.3088 },
        "PDX": { lat: 45.5898, lng: -122.5951 },
        "SAN": { lat: 32.7338, lng: -117.1933 },
        "SJC": { lat: 37.3639, lng: -121.9289 },
        "OAK": { lat: 37.7126, lng: -122.2197 },
        "SMF": { lat: 38.6954, lng: -121.5908 },
        "LAS": { lat: 36.0840, lng: -115.1537 },
        "PHX": { lat: 33.4373, lng: -112.0078 },
        "DEN": { lat: 39.8561, lng: -104.6737 },
        "SLC": { lat: 40.7899, lng: -111.9791 },
        // US East Coast
        "JFK": { lat: 40.6413, lng: -73.7781 },
        "BOS": { lat: 42.3656, lng: -71.0096 },
        "DCA": { lat: 38.8512, lng: -77.0402 },
        "PHL": { lat: 39.8744, lng: -75.2424 },
        "MIA": { lat: 25.7959, lng: -80.2870 },
        "ATL": { lat: 33.6407, lng: -84.4277 },
        "MCO": { lat: 28.4312, lng: -81.3081 },
        "TPA": { lat: 27.9756, lng: -82.5333 },
        "CLT": { lat: 35.2140, lng: -80.9431 },
        "BWI": { lat: 39.1774, lng: -76.6684 },
        // US Midwest
        "ORD": { lat: 41.9742, lng: -87.9073 },
        "DTW": { lat: 42.2162, lng: -83.3554 },
        "MSP": { lat: 44.8848, lng: -93.2223 },
        "STL": { lat: 38.7487, lng: -90.3700 },
        "MCI": { lat: 39.2976, lng: -94.7139 },
        "IND": { lat: 39.7173, lng: -86.2944 },
        "CLE": { lat: 41.4117, lng: -81.8498 },
        "PIT": { lat: 40.4915, lng: -80.2329 },
        // US South
        "DFW": { lat: 32.8998, lng: -97.0403 },
        "IAH": { lat: 29.9902, lng: -95.3368 },
        "AUS": { lat: 30.1975, lng: -97.6664 },
        "SAT": { lat: 29.5337, lng: -98.4698 },
        "MSY": { lat: 29.9934, lng: -90.2580 },
        "BNA": { lat: 36.1263, lng: -86.6774 },
        // Hawaii & Alaska
        "HNL": { lat: 21.3187, lng: -157.9225 },
        "ANC": { lat: 61.1743, lng: -149.9962 },
        // Canada
        "YYZ": { lat: 43.6777, lng: -79.6248 },
        "YVR": { lat: 49.1947, lng: -123.1792 },
        "YUL": { lat: 45.4657, lng: -73.7455 },
        "YYC": { lat: 51.1215, lng: -114.0076 },
        // Japan
        "NRT": { lat: 35.7720, lng: 140.3929 },
        "HND": { lat: 35.5494, lng: 139.7798 },
        "KIX": { lat: 34.4347, lng: 135.2441 },
        "NGO": { lat: 34.8584, lng: 136.8054 },
        "FUK": { lat: 33.5859, lng: 130.4510 },
        "CTS": { lat: 42.7752, lng: 141.6924 },
        "OKA": { lat: 26.1958, lng: 127.6459 },
        "HIJ": { lat: 34.4361, lng: 132.9194 },
        // Europe
        "LHR": { lat: 51.4700, lng: -0.4543 },
        "CDG": { lat: 49.0097, lng: 2.5479 },
        "AMS": { lat: 52.3105, lng: 4.7683 },
        "FRA": { lat: 50.0379, lng: 8.5622 },
        "BER": { lat: 52.3667, lng: 13.5033 },
        "MUC": { lat: 48.3537, lng: 11.7750 },
        "FCO": { lat: 41.8003, lng: 12.2389 },
        "MXP": { lat: 45.6306, lng: 8.7281 },
        "MAD": { lat: 40.4983, lng: -3.5676 },
        "BCN": { lat: 41.2971, lng: 2.0785 },
        "LIS": { lat: 38.7756, lng: -9.1354 },
        "DUB": { lat: 53.4264, lng: -6.2499 },
        "ZRH": { lat: 47.4582, lng: 8.5555 },
        "VIE": { lat: 48.1103, lng: 16.5697 },
        "PRG": { lat: 50.1008, lng: 14.2600 },
        "BRU": { lat: 50.9014, lng: 4.4844 },
        "CPH": { lat: 55.6180, lng: 12.6508 },
        "ARN": { lat: 59.6498, lng: 17.9238 },
        "OSL": { lat: 60.1939, lng: 11.1004 },
        "HEL": { lat: 60.3172, lng: 24.9633 },
        // Asia
        "SIN": { lat: 1.3644, lng: 103.9915 },
        "HKG": { lat: 22.3080, lng: 113.9185 },
        "ICN": { lat: 37.4602, lng: 126.4407 },
        "BKK": { lat: 13.6900, lng: 100.7501 },
        "PEK": { lat: 40.0799, lng: 116.6031 },
        "PVG": { lat: 31.1443, lng: 121.8083 },
        "TPE": { lat: 25.0797, lng: 121.2342 },
        "BOM": { lat: 19.0896, lng: 72.8656 },
        "DEL": { lat: 28.5562, lng: 77.1000 },
        "DXB": { lat: 25.2532, lng: 55.3657 },
        "SYD": { lat: -33.9399, lng: 151.1753 },
        "MEL": { lat: -37.6690, lng: 144.8410 },
        "AKL": { lat: -37.0082, lng: 174.7850 },
        // Mexico & Central America
        "MEX": { lat: 19.4363, lng: -99.0721 },
        "CUN": { lat: 21.0365, lng: -86.8771 },
        "SJD": { lat: 23.1518, lng: -109.7211 },
    };

    return coords[code.toUpperCase()] || null;
}
