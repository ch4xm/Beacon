import { useEffect, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";

interface SearchBarProps {
	mapRef: React.MutableRefObject<mapboxgl.Map | null>;
	searchMarkerRef: React.MutableRefObject<mapboxgl.Marker | null>;
}

export default function SearchBar({ mapRef, searchMarkerRef }: SearchBarProps) {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [isSearching, setIsSearching] = useState<boolean>(false);
	const [searchResults, setSearchResults] = useState<any[]>([]);
	
	// Generate a session token for the Search Box API
	const sessionToken = useMemo(() => {
		return crypto.randomUUID();
	}, []);

	// Debounced search-as-you-type using Search Box API
	useEffect(() => {
		const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
		if (!token || !mapRef.current) return;
		if (!searchQuery.trim()) {
			setSearchResults([]);
			return;
		}

		const controller = new AbortController();
		const timeout = setTimeout(async () => {
			setIsSearching(true);
			try {
				const center = mapRef.current.getCenter();
				const proximity = `${center.lng},${center.lat}`;
				const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
					searchQuery
				)}&access_token=${token}&session_token=${sessionToken}&proximity=${proximity}&language=en&limit=7`;
				const resp = await fetch(url, { signal: controller.signal });
				const data = await resp.json();
				setSearchResults(data?.suggestions ?? []);
			} catch (err) {
				if ((err as any)?.name !== "AbortError") {
					console.error("Search Box API error:", err);
				}
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => {
			controller.abort();
			clearTimeout(timeout);
		};
	}, [searchQuery, mapRef, sessionToken]);

	const handleSelectResult = async (suggestion: any) => {
		if (!suggestion?.mapbox_id || !mapRef.current) return;
		
		const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
		if (!token) return;
		
		try {
			// Retrieve full details for the selected suggestion
			const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?access_token=${token}&session_token=${sessionToken}`;
			const resp = await fetch(url);
			const data = await resp.json();
			
			const feature = data?.features?.[0];
			if (!feature?.geometry?.coordinates) return;
			
			const [lng, lat] = feature.geometry.coordinates as [number, number];

			if (!searchMarkerRef.current) {
				searchMarkerRef.current = new mapboxgl.Marker({ color: "#1a1a1a" });
			}
			searchMarkerRef.current.setLngLat([lng, lat]).addTo(mapRef.current);

			mapRef.current.flyTo({ center: [lng, lat], zoom: 12, essential: true });
			setSearchQuery(suggestion.name || suggestion.full_address || "");
			setSearchResults([]);
		} catch (err) {
			console.error("Retrieve API error:", err);
		}
	};

	const handleSearchSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim() || !mapRef.current) return;
		// If we already have results, pick the first
		if (searchResults[0]) {
			await handleSelectResult(searchResults[0]);
		}
	};

	return (
		<div className="search-bar">
			<form onSubmit={handleSearchSubmit} className="search-form" autoComplete="off">
				<input
					type="text"
					className="search-input"
					placeholder="Search places..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
				<button type="submit" className="search-button" aria-label="Search" disabled={isSearching}>
					{isSearching ? "…" : "🔍"}
				</button>
			</form>

			{searchResults.length > 0 && (
				<ul className="search-results">
					{searchResults.map((suggestion) => (
						<li
							key={suggestion.mapbox_id}
							className="search-result-item"
							onMouseDown={() => handleSelectResult(suggestion)}
						>
							<div className="result-primary">{suggestion.name}</div>
							{suggestion.full_address && (
								<div className="result-secondary">{suggestion.full_address}</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}