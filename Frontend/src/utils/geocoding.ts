/**
 * Reverse geocoding utility using LocationIQ API
 * API Docs: https://docs.locationiq.com/docs/reverse-geocoding
 * 
 * LocationIQ provides POI data and has a generous free tier (5,000 requests/day).
 */

interface LocationIQAddress {
  name?: string;
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
  // POI-specific fields
  amenity?: string;
  shop?: string;
  building?: string;
  tourism?: string;
  leisure?: string;
  office?: string;
}

interface LocationIQResponse {
  place_id: string;
  licence: string;
  osm_type: string;
  osm_id: string;
  lat: string;
  lon: string;
  display_name: string;
  address: LocationIQAddress;
  boundingbox: string[];
  // Match level indicates precision: venue, building, street, etc.
  matchlevel?: string;
}

export interface ReverseGeocodeResult {
  name: string;
  fullAddress: string;
  featureType: string;
  details: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Extracts the best available name from LocationIQ address data.
 * Prioritizes POI names (amenity, shop, tourism, etc.) over generic address.
 */
function extractName(address: LocationIQAddress, displayName: string): string {
  // Check for POI-specific names first
  const poiName = address.name || address.amenity || address.shop || 
                  address.tourism || address.leisure || address.office;
  
  if (poiName) {
    return poiName;
  }

  // Build a meaningful address string from house number + street
  if (address.house_number && address.road) {
    return `${address.house_number} ${address.road}`;
  }
  
  // If we only have a street name, use that
  if (address.road) {
    return address.road;
  }

  // Fall back to first two parts of display_name for more context
  const parts = displayName.split(',').map(p => p.trim());
  const firstPart = parts[0];
  
  // If the first part is just a number, include the second part (usually street)
  if (firstPart && /^\d+$/.test(firstPart) && parts[1]) {
    return `${firstPart} ${parts[1]}`;
  }
  
  if (firstPart) {
    return firstPart;
  }

  return 'Unknown Location';
}

/**
 * Extracts city from LocationIQ address, checking multiple fields.
 */
function extractCity(address: LocationIQAddress): string | undefined {
  return address.city || address.town || address.village || address.suburb;
}

/**
 * Performs reverse geocoding to get a location name from coordinates
 * Uses LocationIQ API (supports POI/business names)
 * 
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns Location information including name and address
 */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const accessToken = import.meta.env.VITE_LOCATIONIQ_TOKEN;
  
  if (!accessToken) {
    throw new Error('LocationIQ access token not configured. Set VITE_LOCATIONIQ_TOKEN in your environment.');
  }

  const url = new URL('https://us1.locationiq.com/v1/reverse');
  url.searchParams.set('key', accessToken);
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lon.toString());
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1'); // Include detailed address breakdown

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reverse geocoding failed: ${response.statusText} - ${errorText}`);
  }

  const data: LocationIQResponse = await response.json();

  if (!data || !data.address) {
    return {
      name: 'Unknown Location',
      fullAddress: '',
      featureType: 'unknown',
      details: {},
    };
  }

  const address = data.address;
  const name = extractName(address, data.display_name);
  
  // Determine feature type based on what data is available
  let featureType = 'address';
  if (address.amenity || address.shop || address.tourism || address.leisure) {
    featureType = 'poi';
  } else if (address.building) {
    featureType = 'building';
  }

  return {
    name,
    fullAddress: data.display_name,
    featureType,
    details: {
      street: address.road,
      city: extractCity(address),
      state: address.state,
      country: address.country,
    },
  };
}
