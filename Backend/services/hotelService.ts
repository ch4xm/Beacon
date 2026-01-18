/**
 * Hotel Service - Eco-Friendly Hotel Search
 * Uses Google Places API Text Search to find eco-friendly hotels.
 */

const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";

export interface EcoHotel {
    id: string;
    name: string;
    address: string;
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    editorialSummary?: string;
}

interface PlacesTextSearchResponse {
    places?: {
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
        priceLevel?: string;
        websiteUri?: string;
        googleMapsUri?: string;
        editorialSummary?: { text: string };
    }[];
}

/**
 * Map price level enum to readable string
 */
function mapPriceLevel(priceLevel?: string): string | undefined {
    const mapping: Record<string, string> = {
        PRICE_LEVEL_FREE: "Free",
        PRICE_LEVEL_INEXPENSIVE: "$",
        PRICE_LEVEL_MODERATE: "$$",
        PRICE_LEVEL_EXPENSIVE: "$$$",
        PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
    };
    return priceLevel ? mapping[priceLevel] || priceLevel : undefined;
}

/**
 * Search for eco-friendly hotels near a destination
 * @param location City or location name (e.g., "Paris, France")
 * @param maxResults Maximum number of results to return (default 5)
 * @returns Array of eco-friendly hotel results
 */
export async function searchEcoHotels(
    location: string,
    maxResults: number = 5
): Promise<EcoHotel[]> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        throw new Error("Google Maps API key not configured");
    }

    const requestBody = {
        textQuery: `eco-friendly sustainable hotels in ${location}`,
        maxResultCount: maxResults,
        languageCode: "en",
    };

    const response = await fetch(PLACES_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.googleMapsUri,places.editorialSummary",
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Places API error:", errorText);
        throw new Error(`Google Places API failed: ${response.status}`);
    }

    const data: PlacesTextSearchResponse = await response.json();
    const places = data.places || [];

    return places.map((place) => ({
        id: place.id,
        name: place.displayName?.text || "Unknown Hotel",
        address: place.formattedAddress || "",
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        priceLevel: mapPriceLevel(place.priceLevel),
        websiteUri: place.websiteUri,
        googleMapsUri: place.googleMapsUri,
        editorialSummary: place.editorialSummary?.text,
    }));
}
