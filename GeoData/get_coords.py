#!/usr/bin/env python3
"""
Script to get accurate lat/long coordinates for landmarks in California.
Uses Nominatim (OpenStreetMap) geocoding service.
"""

import re
import time
import json
from urllib.parse import quote
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError


def extract_landmarks_from_file(filename):
    """
    Extract landmark names and existing coordinates from the input file.
    Returns a list of tuples: (landmark_name, location_info, existing_lat, existing_lon)
    """
    landmarks = []
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match lines like:
    # Lost Coast Trail (King Range, Humboldt/Mendocino) – (40.28918, -124.35588)
    pattern = r'^(.+?)\s+\((.+?)\)\s+[–-]\s+\(([+-]?\d+\.?\d*),\s*([+-]?\d+\.?\d*)\)'
    
    for line in content.split('\n'):
        line = line.strip()
        match = re.match(pattern, line)
        if match:
            name = match.group(1).strip()
            location = match.group(2).strip()
            existing_lat = float(match.group(3))
            existing_lon = float(match.group(4))
            landmarks.append((name, location, existing_lat, existing_lon))
    
    return landmarks


def geocode_landmark(name, location, retries=3):
    """
    Geocode a landmark using Nominatim API.
    Returns (latitude, longitude, display_name) or None if failed.
    """
    # Construct search query - combine name and location with California
    query = f"{name}, {location}, California, USA"
    
    # URL encode the query
    encoded_query = quote(query)
    url = f"https://nominatim.openstreetmap.org/search?q={encoded_query}&format=json&limit=1"
    
    # Add user agent as required by Nominatim usage policy
    headers = {
        'User-Agent': 'BeaconLandmarkGeocoder/1.0'
    }
    
    for attempt in range(retries):
        try:
            request = Request(url, headers=headers)
            with urlopen(request, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                if data and len(data) > 0:
                    result = data[0]
                    lat = float(result['lat'])
                    lon = float(result['lon'])
                    display_name = result.get('display_name', '')
                    return (lat, lon, display_name)
                else:
                    # Try a simpler query with just the name and state
                    simple_query = f"{name}, California, USA"
                    encoded_simple = quote(simple_query)
                    simple_url = f"https://nominatim.openstreetmap.org/search?q={encoded_simple}&format=json&limit=1"
                    
                    simple_request = Request(simple_url, headers=headers)
                    with urlopen(simple_request, timeout=10) as simple_response:
                        simple_data = json.loads(simple_response.read().decode('utf-8'))
                        
                        if simple_data and len(simple_data) > 0:
                            result = simple_data[0]
                            lat = float(result['lat'])
                            lon = float(result['lon'])
                            display_name = result.get('display_name', '')
                            return (lat, lon, display_name)
            
            return None
            
        except (URLError, HTTPError, TimeoutError) as e:
            print(f"  Attempt {attempt + 1}/{retries} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2)  # Wait before retry
            else:
                return None
        except Exception as e:
            print(f"  Unexpected error: {e}")
            return None


def main():
    input_file = 'in.txt'
    output_file = 'landmarks_with_coords.json'
    
    print(f"Reading landmarks from {input_file}...")
    landmarks = extract_landmarks_from_file(input_file)
    print(f"Found {len(landmarks)} landmarks.\n")
    
    results = []
    
    for idx, (name, location, existing_lat, existing_lon) in enumerate(landmarks, 1):
        print(f"[{idx}/{len(landmarks)}] Processing: {name} ({location})")
        
        # Geocode the landmark
        geocode_result = geocode_landmark(name, location)
        
        if geocode_result:
            new_lat, new_lon, display_name = geocode_result
            
            # Calculate distance between existing and new coordinates
            lat_diff = abs(new_lat - existing_lat)
            lon_diff = abs(new_lon - existing_lon)
            
            result = {
                'name': name,
                'location': location,
                'existing_coords': {
                    'lat': existing_lat,
                    'lon': existing_lon
                },
                'new_coords': {
                    'lat': new_lat,
                    'lon': new_lon
                },
                'display_name': display_name,
                'coord_difference': {
                    'lat_diff': lat_diff,
                    'lon_diff': lon_diff
                }
            }
            
            print(f"  ✓ Found: ({new_lat}, {new_lon})")
            print(f"  Difference: Δlat={lat_diff:.6f}, Δlon={lon_diff:.6f}")
        else:
            result = {
                'name': name,
                'location': location,
                'existing_coords': {
                    'lat': existing_lat,
                    'lon': existing_lon
                },
                'new_coords': None,
                'display_name': None,
                'error': 'Geocoding failed'
            }
            print(f"  ✗ Geocoding failed - keeping existing coordinates")
        
        results.append(result)
        print()
        
        # Respect Nominatim usage policy: max 1 request per second
        time.sleep(1.1)
    
    # Print summary
    successful = sum(1 for r in results if r.get('new_coords'))
    failed = len(results) - successful
    
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total landmarks: {len(results)}")
    print(f"Successfully geocoded: {successful}")
    print(f"Failed: {failed}")
    
    # Create simple CSV output with just name, lat, lon
    csv_file = 'landmarks_coords.csv'
    print(f"\nCreating CSV file: {csv_file}")
    with open(csv_file, 'w', encoding='utf-8') as f:
        f.write("name,lat,lon\n")
        for r in results:
            name = r['name'].replace(',', ';')
            
            # Use new coordinates if available, otherwise use existing
            if r.get('new_coords'):
                lat = r['new_coords']['lat']
                lon = r['new_coords']['lon']
            else:
                lat = r['existing_coords']['lat']
                lon = r['existing_coords']['lon']
            
            f.write(f"{name},{lat},{lon}\n")
    
    print(f"CSV file created: {csv_file}")


if __name__ == '__main__':
    main()
