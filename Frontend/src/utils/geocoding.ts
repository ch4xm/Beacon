/**
 * Reverse geocoding utility using Mapbox Search Box API
 * API Docs: https://docs.mapbox.com/api/search/search-box/
 * 
 * Note: The Geocoding API (v5/v6) no longer returns POI data.
 * Search Box API is required for POI/business names.
 */

interface SearchBoxFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    mapbox_id: string;
    feature_type: string;
    name: string;
    name_preferred?: string;
    address?: string;
    full_address?: string;
    place_formatted?: string;
    poi_category?: string[];
    brand?: string[];
    context?: {
      street?: { name: string };
      neighborhood?: { name: string };
      postcode?: { name: string };
      place?: { name: string };
      region?: { name: string; region_code?: string };
      country?: { name: string; country_code?: string };
    };
  };
}

interface SearchBoxResponse {
  type: string;
  features: SearchBoxFeature[];
  attribution: string;
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
 * Performs reverse geocoding to get a location name from coordinates
 * Uses Mapbox Search Box API (supports POI/business names)
 * 
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns Location information including name and address
 */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Mapbox access token not configured');
  }

  const url = new URL('https://api.mapbox.com/search/searchbox/v1/reverse');
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('limit', '5'); // Get multiple results to find POIs
  url.searchParams.set('types', 'poi,address'); // Include POIs and addresses

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.statusText}`);
  }

  const data: SearchBoxResponse = await response.json();

  if (!data.features || data.features.length === 0) {
    return {
      name: 'Gem Alarm',
      fullAddress: '',
      featureType: 'unknown',
      details: {},
    };
  }

  // Prioritize POI results over addresses
  const poiFeature = data.features.find(f => f.properties.feature_type === 'poi');
  const feature = poiFeature || data.features[0];
  const props = feature.properties;
  const context = props.context || {};

  // Use the most specific name available
  const displayName = props.name_preferred || props.name || 'Unknown Location';

  return {
    name: displayName,
    fullAddress: props.full_address || props.place_formatted || props.address || '',
    featureType: props.feature_type,
    details: {
      street: context.street?.name,
      city: context.place?.name,
      state: context.region?.name,
      country: context.country?.name,
    },
  };
}
