import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './styles/TripPlanner.css';
import { DatePicker } from './DatePicker';
import { BASE_API_URL } from '../../constants';
import mapboxgl from 'mapbox-gl';

interface TransitOption {
    mode: 'flight' | 'train' | 'bus' | 'driving';
    provider?: string;
    price?: string;
    duration: string;
    carbonKg: number;
    carbonRating: { rating: string; color: string; score: number };
    segments?: any[];
    polyline?: string;
    flightNumber?: string;
    bookingUrl?: string;
    stops?: number; // Number of stops (0 = nonstop, for flights)
}

interface ItineraryDay {
    day: number;
    title: string;
    activities: {
        time: string;
        name: string;
        description: string;
        location?: string;
        transportNote?: string;
    }[];
}

interface EcoHotel {
    id: string;
    name: string;
    address: string;
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    editorialSummary?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    location?: {
        lat: number;
        lng: number;
    };
}

interface LocalPin {
    id: number;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    tags?: string;
    image?: string;
    isUserPin?: boolean;
}

interface ItineraryResult {
    summary: string;
    days: ItineraryDay[];
    sustainabilityTips: string[];
    carbonOffsetSuggestions: string[];
}

// Options received from streaming (before user selection)
interface TripOptionsData {
    origin: string;
    destination: string;
    originCoords?: { lat: number; lng: number };
    destCoords?: { lat: number; lng: number };
    originAirportCoords?: { lat: number; lng: number };
    destAirportCoords?: { lat: number; lng: number };
    destAirportCode?: string;
    itineraryType: string;
    durationDays: number;
    transitOptions: TransitOption[];
    localPins: LocalPin[];
    ecoHotels: EcoHotel[];
    carbonStats: {
        bestOption: { mode: string; carbonKg: number };
        worstOption: { mode: string; carbonKg: number };
        typicalTouristKg: number;
        savingsVsTypical: number;
        offsetCostUsd: number;
    };
    routePolylines: { mode: string; polyline: string }[];
}

// Full result including itinerary
interface TripPlanResult extends TripOptionsData {
    itinerary: ItineraryResult;
}

interface RouteSegment {
    lineName: string;
    polyline?: string;
    departureStop: string;
    arrivalStop: string;
    departureLocation?: { lat: number; lng: number };
    arrivalLocation?: { lat: number; lng: number };
}

interface RouteData {
    mode: 'transit' | 'driving';
    polyline?: string;
    segments?: RouteSegment[];
}

interface TripPlannerProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanComplete: (result: TripPlanResult) => void;
    onWideModeChange?: (isWide: boolean) => void;
    mapRef?: React.MutableRefObject<mapboxgl.Map | null>;
    onFlightSelected?: (originCoords: { lat: number; lng: number }, destCoords: { lat: number; lng: number }) => void;
    onHotelSelected?: (destAirportCoords: { lat: number; lng: number } | undefined, hotelCoords: { lat: number; lng: number }, routeData?: RouteData) => void;
}

type ProgressStage = 'geocoding' | 'flights' | 'transit' | 'driving' | 'hotels' | 'pins' | 'ready' | 'itinerary' | 'complete' | 'error';

interface ProgressUpdate {
    stage: ProgressStage;
    message: string;
    progress: number;
    data?: any;
}

interface StageInfo {
    icon: string;
    label: string;
    status: 'pending' | 'loading' | 'done' | 'error';
    message?: string;
}

const STAGE_CONFIG: Record<ProgressStage, { icon: string; label: string }> = {
    geocoding: { icon: '📍', label: 'Finding locations' },
    flights: { icon: '✈️', label: 'Searching flights' },
    transit: { icon: '🚆', label: 'Checking transit' },
    driving: { icon: '🚗', label: 'Calculating routes' },
    hotels: { icon: '🏨', label: 'Finding eco stays' },
    pins: { icon: '📌', label: 'Local recommendations' },
    ready: { icon: '✨', label: 'Options ready' },
    itinerary: { icon: '📅', label: 'Creating itinerary' },
    complete: { icon: '✅', label: 'Complete' },
    error: { icon: '❌', label: 'Error' },
};

/**
 * Format ISO 8601 duration (e.g., "PT34H30M") to human-readable format
 */
function formatDuration(duration: string): string {
    // Handle already formatted durations (e.g., "5h")
    if (!duration.startsWith('PT')) {
        return duration;
    }

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        if (remainingHours === 0 && minutes === 0) {
            return `${days}d`;
        } else if (minutes === 0) {
            return `${days}d ${remainingHours}h`;
        } else {
            return `${days}d ${remainingHours}h ${minutes}m`;
        }
    } else if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Render flight numbers with outbound/return labels
 * Format from backend: "OZ211 → OZ102 | OZ101 → OZ212" (outbound | return)
 */
function renderFlightNumbers(flightNumber: string): React.ReactNode {
    if (!flightNumber.includes('|')) {
        // One-way flight
        return <span className="flight-leg">{flightNumber}</span>;
    }

    const [outbound, returnFlight] = flightNumber.split('|').map(s => s.trim());
    return (
        <div className="flight-legs">
            <div className="flight-leg">
                <span className="leg-label">Outbound</span>
                <span className="leg-flights">{outbound}</span>
            </div>
            <div className="flight-leg">
                <span className="leg-label">Return</span>
                <span className="leg-flights">{returnFlight}</span>
            </div>
        </div>
    );
}



export default function TripPlanner({ isOpen, onClose, onPlanComplete, onWideModeChange, mapRef, onFlightSelected, onHotelSelected }: TripPlannerProps) {
    const [startCity, setStartCity] = useState('');
    const [endCity, setEndCity] = useState('');
    const [itineraryType, setItineraryType] = useState('');
    const [durationDays, setDurationDays] = useState(7);
    const [departureDate, setDepartureDate] = useState<Date | undefined>(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<TripPlanResult | null>(null);
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiAnswer, setAiAnswer] = useState('');
    const [isAskingAI, setIsAskingAI] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Progress tracking state
    const [progress, setProgress] = useState(0);
    const [currentStage, setCurrentStage] = useState<ProgressStage | null>(null);
    const [stageStatuses, setStageStatuses] = useState<Map<ProgressStage, StageInfo>>(new Map());
    const abortControllerRef = useRef<AbortController | null>(null);

    // Selection phase state
    const [optionsData, setOptionsData] = useState<TripOptionsData | null>(null);
    const [selectionStep, setSelectionStep] = useState<'transit' | 'hotel' | 'pins'>('transit');
    const [selectedTransitIndex, setSelectedTransitIndex] = useState<number | null>(null);
    const [selectedHotelIndex, setSelectedHotelIndex] = useState<number | null>(null);
    const [selectedPinIds, setSelectedPinIds] = useState<Set<number>>(new Set());
    const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    useEffect(() => {
        if (onWideModeChange) {
            onWideModeChange(!!optionsData || !!result);
        }
    }, [optionsData, result, onWideModeChange]);

    const handleClose = () => {
        // Abort any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
            setResult(null);
            setOptionsData(null);
            setSelectionStep('transit');
            setSelectedTransitIndex(null);
            setSelectedHotelIndex(null);
            setProgress(0);
            setCurrentStage(null);
            setStageStatuses(new Map());
        }, 200);
    };

    const initializeStages = () => {
        const stages: ProgressStage[] = ['geocoding', 'flights', 'transit', 'driving', 'hotels', 'pins'];
        const initialStatuses = new Map<ProgressStage, StageInfo>();
        stages.forEach(stage => {
            initialStatuses.set(stage, {
                ...STAGE_CONFIG[stage],
                status: 'pending',
            });
        });
        setStageStatuses(initialStatuses);
    };

    const updateStageStatus = (stage: ProgressStage, status: 'loading' | 'done' | 'error', message?: string) => {
        setStageStatuses(prev => {
            const updated = new Map(prev);
            const current = updated.get(stage);
            if (current) {
                updated.set(stage, { ...current, status, message });
            }
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!departureDate) {
            setError("Please select a departure date");
            return;
        }

        setIsLoading(true);
        setError(null);
        setProgress(0);
        initializeStages();

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(`${BASE_API_URL}/api/trip/plan/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({
                    startLocation: startCity,
                    endLocation: endCity,
                    itineraryType,
                    durationDays,
                    departureDate: departureDate ? departureDate.toISOString().split('T')[0] : '',
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error('Failed to plan trip');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response stream available');
            }

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const update: ProgressUpdate = JSON.parse(line.slice(6));

                            setProgress(update.progress);
                            setCurrentStage(update.stage);

                            if (update.stage === 'error') {
                                setError(update.message);
                                updateStageStatus(update.stage, 'error', update.message);
                            } else if (update.stage === 'ready') {
                                // Options are ready - show selection UI
                                const options = update.data as TripOptionsData;
                                setOptionsData(options);

                                setSelectionStep('transit');
                                setSelectedTransitIndex(null);
                                setSelectedHotelIndex(null);

                                // Mark all stages as done
                                setStageStatuses(prev => {
                                    const updated = new Map(prev);
                                    updated.forEach((value, key) => {
                                        updated.set(key, { ...value, status: 'done' });
                                    });
                                    return updated;
                                });
                                setIsLoading(false);
                            } else {
                                // Update the current stage status
                                if (update.progress > 0) {
                                    // Mark previous stages as done
                                    const stages: ProgressStage[] = ['geocoding', 'flights', 'transit', 'driving', 'hotels', 'pins'];
                                    const currentIndex = stages.indexOf(update.stage);
                                    stages.forEach((stage, idx) => {
                                        if (idx < currentIndex) {
                                            updateStageStatus(stage, 'done');
                                        } else if (idx === currentIndex) {
                                            updateStageStatus(stage, 'loading', update.message);
                                        }
                                    });
                                }
                            }
                        } catch (parseError) {
                            console.error('Failed to parse SSE data:', parseError);
                        }
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setError(err instanceof Error ? err.message : 'Something went wrong');
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    // Generate itinerary with user-selected options
    const handleConfirmSelections = async () => {
        if (!optionsData) return;

        setIsGeneratingItinerary(true);
        setIsGeneratingItinerary(true);
        setError(null);

        try {
            if (selectedTransitIndex === null) {
                throw new Error("Please select a transit option");
            }
            const selectedTransitOption = optionsData.transitOptions[selectedTransitIndex];
            const selectedHotelOption = selectedHotelIndex !== null
                ? optionsData.ecoHotels?.[selectedHotelIndex]
                : undefined;

            const response = await fetch(`${BASE_API_URL}/api/trip/generate-itinerary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({
                    destination: optionsData.destination,
                    itineraryType: optionsData.itineraryType,
                    durationDays: optionsData.durationDays,
                    selectedTransit: selectedTransitOption,
                    selectedHotel: selectedHotelOption,
                    // Filter pins to only include user-selected ones
                    localPins: optionsData.localPins.filter(pin => selectedPinIds.has(pin.id)),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate itinerary');
            }

            const data = await response.json();

            // Combine options data with the generated itinerary
            const tripResult: TripPlanResult = {
                ...optionsData,
                itinerary: data.itinerary,
            };

            setResult(tripResult);
            setOptionsData(null);
            onPlanComplete(tripResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate itinerary');
        } finally {
            setIsGeneratingItinerary(false);
        }
    };

    const handleAskAI = async () => {
        if (!aiQuestion.trim()) return;
        setIsAskingAI(true);

        try {
            const response = await fetch(`${BASE_API_URL}/api/trip/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({
                    question: aiQuestion,
                    origin: startCity,
                    destination: endCity,
                    itineraryType,
                }),
            });

            if (!response.ok) throw new Error('Failed to get answer');

            const data = await response.json();
            setAiAnswer(data.answer);
        } catch (err) {
            setAiAnswer('Sorry, I could not get an answer at this time.');
        } finally {
            setIsAskingAI(false);
        }
    };

    // Handle transit selection - draw flight line on map
    const handleTransitSelect = (idx: number) => {
        setSelectedTransitIndex(idx);

        if (!optionsData) return;

        const option = optionsData.transitOptions[idx];

        // For flights, draw a line between origin and destination airports
        if (option.mode === 'flight' && optionsData.originAirportCoords && optionsData.destAirportCoords) {
            onFlightSelected?.(optionsData.originAirportCoords, optionsData.destAirportCoords);

            // Fit map to show both airports, handling antimeridian crossing
            if (mapRef?.current) {
                const originLng = optionsData.originAirportCoords.lng;
                const destLng = optionsData.destAirportCoords.lng;
                const lngDiff = destLng - originLng;

                // Check if we need to cross the antimeridian (shortest path > 180°)
                if (Math.abs(lngDiff) > 180) {
                    // Calculate center point for antimeridian-crossing routes
                    const centerLat = (optionsData.originAirportCoords.lat + optionsData.destAirportCoords.lat) / 2;

                    // Adjust destination longitude to find the midpoint across the antimeridian
                    const adjustedDestLng = lngDiff > 0 ? destLng - 360 : destLng + 360;
                    let centerLng = (originLng + adjustedDestLng) / 2;

                    // Normalize center longitude to -180 to 180 range
                    if (centerLng > 180) centerLng -= 360;
                    if (centerLng < -180) centerLng += 360;

                    // Use flyTo with appropriate zoom for long-haul flights
                    mapRef.current.flyTo({
                        center: [centerLng, centerLat],
                        zoom: 2,
                        duration: 1500,
                    });
                } else {
                    // Normal case: use fitBounds
                    const bounds = new mapboxgl.LngLatBounds();
                    bounds.extend([originLng, optionsData.originAirportCoords.lat]);
                    bounds.extend([destLng, optionsData.destAirportCoords.lat]);
                    mapRef.current.fitBounds(bounds, {
                        padding: { top: 100, bottom: 100, left: 400, right: 100 },
                        duration: 1500,
                    });
                }
            }
        } else if (optionsData.originCoords && optionsData.destCoords) {
            // For other transit modes, use city coordinates
            onFlightSelected?.(optionsData.originCoords, optionsData.destCoords);

            if (mapRef?.current) {
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend([optionsData.originCoords.lng, optionsData.originCoords.lat]);
                bounds.extend([optionsData.destCoords.lng, optionsData.destCoords.lat]);
                mapRef.current.fitBounds(bounds, {
                    padding: { top: 100, bottom: 100, left: 400, right: 100 },
                    duration: 1500,
                });
            }
        }
    };

    // Handle hotel selection - fetch transit/driving route and draw on map
    const handleHotelSelect = async (idx: number) => {
        setSelectedHotelIndex(idx);

        if (!optionsData) return;

        const hotel = optionsData.ecoHotels[idx];

        if (hotel.location && optionsData.destAirportCoords) {
            // Calculate estimated arrival time (use departure date at 14:00 for daytime transit check)
            let departureTimeStr = undefined;
            if (departureDate) {
                // Create a date object for 2 PM on the departure date
                const arrivalDate = new Date(departureDate);
                arrivalDate.setHours(14, 0, 0, 0);
                departureTimeStr = arrivalDate.toISOString();
            }

            // Fetch transit/driving route between airport and hotel
            try {
                // Use airport code + "Airport" and hotel address for more reliable transit routing
                const airportAddress = optionsData.destAirportCode
                    ? `${optionsData.destAirportCode} Airport`
                    : undefined;

                const response = await fetch(`${BASE_API_URL}/api/trip/local-route`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                    },
                    body: JSON.stringify({
                        // Pass addresses for transit search (more reliable)
                        originAddress: airportAddress,
                        destAddress: hotel.address,
                        // Also include coordinates as fallback for driving route
                        originLat: optionsData.destAirportCoords?.lat,
                        originLng: optionsData.destAirportCoords?.lng,
                        destLat: hotel.location?.lat,
                        destLng: hotel.location?.lng,
                        departureTime: departureTimeStr
                    }),
                });

                if (response.ok) {
                    const routeData = await response.json();
                    // Notify parent with full route data including segments
                    onHotelSelected?.(optionsData.destAirportCoords, hotel.location, {
                        mode: routeData.mode,
                        polyline: routeData.polyline,
                        segments: routeData.segments,
                    });
                } else {
                    // Fallback to straight line if no route found
                    onHotelSelected?.(optionsData.destAirportCoords, hotel.location);
                }
            } catch (error) {
                console.error('Failed to fetch local route:', error);
                // Fallback to straight line
                onHotelSelected?.(optionsData.destAirportCoords, hotel.location);
            }

            // Fit map to show both airport and hotel with the route
            if (mapRef?.current) {
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend([optionsData.destAirportCoords.lng, optionsData.destAirportCoords.lat]);
                bounds.extend([hotel.location.lng, hotel.location.lat]);
                mapRef.current.fitBounds(bounds, {
                    padding: { top: 100, bottom: 100, left: 400, right: 100 },
                    duration: 1500,
                });
            }
        } else if (hotel.location) {
            // No airport coords, just draw to hotel
            onHotelSelected?.(undefined, hotel.location);

            if (mapRef?.current) {
                mapRef.current.flyTo({
                    center: [hotel.location.lng, hotel.location.lat],
                    zoom: 14,
                    duration: 1500,
                });
            }
        }
    };

    const getModeIcon = (mode: string) => {
        switch (mode) {
            case 'flight': return '✈️';
            case 'train': return '🚆';
            case 'bus': return '🚌';
            case 'driving': return '🚗';
            default: return '🚀';
        }
    };

    // Toggle pin selection
    const handlePinToggle = (pinId: number) => {
        setSelectedPinIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pinId)) {
                newSet.delete(pinId);
            } else {
                newSet.add(pinId);
            }
            return newSet;
        });
    };

    if (!isOpen) return null;

    return (
        <div className={`trip-planner-panel ${isClosing ? 'is-closing' : ''}`}>
            <div className="trip-planner-panel-header">
                <button
                    className="trip-planner-back"
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    <span>Back</span>
                </button>
            </div>

            <div className="trip-planner-content">
                {isLoading ? (
                    // Progress UI
                    <div className="trip-progress-container">
                        <div className="trip-progress-header">
                            <h2>🌍 Planning Your Trip</h2>
                            <p>{startCity} → {endCity}</p>
                        </div>

                        <div className="trip-progress-bar-container">
                            <div
                                className="trip-progress-bar"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="trip-progress-percentage">{progress}%</div>

                        <div className="trip-stages-list">
                            {Array.from(stageStatuses.entries()).map(([stage, info]) => (
                                <div
                                    key={stage}
                                    className={`trip-stage-item ${info.status}`}
                                >
                                    <span className="stage-icon">
                                        {info.status === 'loading' ? (
                                            <span className="stage-spinner" />
                                        ) : info.status === 'done' ? (
                                            '✓'
                                        ) : info.status === 'error' ? (
                                            '✗'
                                        ) : (
                                            info.icon
                                        )}
                                    </span>
                                    <div className="stage-content">
                                        <span className="stage-label">{info.label}</span>
                                        {info.message && info.status === 'loading' && (
                                            <span className="stage-message">{info.message}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {error && <div className="trip-error">{error}</div>}

                        <button
                            className="trip-cancel-btn"
                            onClick={handleClose}
                        >
                            Cancel
                        </button>
                    </div>
                ) : optionsData && !result ? (
                    // Selection Phase UI
                    <div className="trip-selection-container">
                        <div className="trip-selection-header">
                            <h2>
                                {selectionStep === 'transit' ? '✨ Select Your Travel' :
                                    selectionStep === 'hotel' ? '🏨 Select Your Stay' :
                                        '📍 Places to Visit'}
                            </h2>
                            <p>{optionsData.origin} → {optionsData.destination}</p>
                        </div>

                        {selectionStep === 'transit' ? (
                            <>
                                <div className="selection-section">
                                    <p className="selection-hint">Choose how you'd like to get there</p>
                                    <div className="transit-selection-grid">
                                        {optionsData.transitOptions.map((option, idx) => (
                                            <div
                                                key={idx}
                                                className={`transit-selection-card ${selectedTransitIndex === idx ? 'selected' : ''}`}
                                                onClick={() => handleTransitSelect(idx)}
                                            >
                                                <div className="transit-selection-check">
                                                    {selectedTransitIndex === idx && <span>✓</span>}
                                                </div>
                                                <div className="transit-icon">{getModeIcon(option.mode)}</div>
                                                <div className="transit-info">
                                                    <div className="transit-mode">
                                                        {option.mode === 'flight' && option.flightNumber
                                                            ? renderFlightNumbers(option.flightNumber)
                                                            : option.mode.charAt(0).toUpperCase() + option.mode.slice(1)}
                                                    </div>
                                                    {option.mode === 'flight' && option.stops !== undefined && (
                                                        <span className={`transit-stops ${option.stops === 0 ? 'nonstop' : ''}`}>
                                                            {option.stops === 0 ? 'Nonstop' : `${option.stops} stop${option.stops > 1 ? 's' : ''}`}
                                                        </span>
                                                    )}
                                                    <span className="transit-duration">{formatDuration(option.duration)}</span>
                                                    <div className="transit-price-row">
                                                        {option.price && <span className="transit-price">{option.price}</span>}
                                                    </div>
                                                    {option.bookingUrl && (
                                                        <a
                                                            href={option.bookingUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="transit-booking-link"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            Book Flight →
                                                        </a>
                                                    )}
                                                </div>
                                                <div
                                                    className="transit-carbon"
                                                    style={{
                                                        backgroundColor: option.carbonRating.color + '20',
                                                        color: option.carbonRating.color
                                                    }}
                                                >
                                                    {option.carbonKg} kg CO₂
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="selection-actions">
                                    <button
                                        className="trip-submit-btn"
                                        onClick={() => {
                                            if (optionsData.ecoHotels && optionsData.ecoHotels.length > 0) {
                                                setSelectionStep('hotel');
                                            } else {
                                                handleConfirmSelections();
                                            }
                                        }}
                                        disabled={selectedTransitIndex === null}
                                    >
                                        Next: Select Hotel →
                                    </button>
                                    <button
                                        className="trip-back-btn"
                                        onClick={() => {
                                            setOptionsData(null);
                                            setSelectedTransitIndex(null);
                                            setSelectedHotelIndex(null);
                                        }}
                                    >
                                        ← Start Over
                                    </button>
                                </div>
                            </>
                        ) : selectionStep === 'hotel' ? (
                            <>
                                <div className="selection-section">
                                    <p className="selection-hint">Choose an eco-friendly accommodation</p>
                                    <div className="hotel-selection-grid">
                                        {optionsData.ecoHotels.slice(0, 4).map((hotel, idx) => (
                                            <div
                                                key={hotel.id}
                                                className={`hotel-selection-card ${selectedHotelIndex === idx ? 'selected' : ''}`}
                                                onClick={() => handleHotelSelect(idx)}
                                            >
                                                <div className="hotel-selection-check">
                                                    {selectedHotelIndex === idx && <span>✓</span>}
                                                </div>
                                                <div className="hotel-selection-info">
                                                    <span className="hotel-name">{hotel.name}</span>
                                                    {hotel.rating && (
                                                        <span className="hotel-rating">⭐ {hotel.rating}</span>
                                                    )}
                                                    {hotel.editorialSummary && (
                                                        <p className="hotel-blurb">{hotel.editorialSummary}</p>
                                                    )}
                                                    {hotel.websiteUri && (
                                                        <a
                                                            href={hotel.websiteUri}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hotel-link"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            Visit Website →
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {error && <div className="trip-error">{error}</div>}
                                <div className="selection-actions">
                                    <button
                                        className="trip-submit-btn"
                                        onClick={() => {
                                            // Go to pins step if there are nearby pins
                                            if (optionsData.localPins && optionsData.localPins.length > 0) {
                                                setSelectionStep('pins');
                                            } else {
                                                handleConfirmSelections();
                                            }
                                        }}
                                        disabled={selectedHotelIndex === null}
                                    >
                                        {optionsData.localPins && optionsData.localPins.length > 0
                                            ? 'Next: Select Places →'
                                            : '📅 Generate My Itinerary'}
                                    </button>
                                    <button
                                        className="trip-back-btn"
                                        onClick={() => setSelectionStep('transit')}
                                    >
                                        ← Back to Transit
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Pins selection step
                            <>
                                <div className="selection-section">
                                    <p className="selection-hint">
                                        Select nearby places to include in your itinerary (optional)
                                    </p>
                                    <div className="pin-selection-grid">
                                        {optionsData.localPins.slice(0, 12).map((pin) => (
                                            <div
                                                key={pin.id}
                                                className={`pin-selection-card ${selectedPinIds.has(pin.id) ? 'selected' : ''} ${pin.isUserPin ? 'user-pin' : ''}`}
                                                onClick={() => handlePinToggle(pin.id)}
                                            >
                                                <div className="pin-selection-check">
                                                    {selectedPinIds.has(pin.id) && <span>✓</span>}
                                                </div>
                                                {pin.isUserPin && (
                                                    <span className="pin-user-badge">Your Pin</span>
                                                )}
                                                <div className="pin-selection-info">
                                                    <span className="pin-title">{pin.title}</span>
                                                    {pin.description && (
                                                        <p className="pin-desc">
                                                            {pin.description.substring(0, 80)}
                                                            {pin.description.length > 80 ? '...' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {optionsData.localPins.length === 0 && (
                                        <p className="no-pins-message">No nearby places found in this area.</p>
                                    )}
                                </div>
                                {error && <div className="trip-error">{error}</div>}
                                <div className="selection-actions">
                                    <button
                                        className="trip-submit-btn"
                                        onClick={handleConfirmSelections}
                                        disabled={isGeneratingItinerary}
                                    >
                                        {isGeneratingItinerary ? (
                                            <>
                                                <span className="stage-spinner" />
                                                Generating Itinerary...
                                            </>
                                        ) : (
                                            '📅 Generate Itinerary'
                                        )}
                                    </button>
                                    <button
                                        className="trip-skip-btn"
                                        onClick={() => {
                                            setSelectedPinIds(new Set());
                                            handleConfirmSelections();
                                        }}
                                        disabled={isGeneratingItinerary}
                                    >
                                        Skip Places →
                                    </button>
                                    <button
                                        className="trip-back-btn"
                                        onClick={() => setSelectionStep('hotel')}
                                        disabled={isGeneratingItinerary}
                                    >
                                        ← Back to Hotel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ) : !result ? (
                    <>
                        <div className="trip-planner-header">
                            <h2>🌍 Plan Your Sustainable Trip</h2>
                            <p>Discover eco-friendly routes and local hidden gems</p>
                        </div>

                        <form onSubmit={handleSubmit} className="trip-planner-form">
                            <div className="trip-double-input-group">
                                <div className="trip-input-group">
                                    <label>From</label>
                                    <input
                                        type="text"
                                        value={startCity}
                                        onChange={(e) => setStartCity(e.target.value)}
                                        placeholder="San Francisco"
                                        required
                                    />
                                </div>

                                <div className="trip-input-group">
                                    <label>To</label>
                                    <input
                                        type="text"
                                        value={endCity}
                                        onChange={(e) => setEndCity(e.target.value)}
                                        placeholder="Los Angeles"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="trip-input-group">
                                <label>Leave Date</label>
                                <DatePicker
                                    date={departureDate}
                                    setDate={setDepartureDate}
                                    minDate={new Date()}
                                />
                            </div>

                            <div className="trip-input-group">
                                <label>What kind of trip are you looking for?</label>
                                <textarea
                                    value={itineraryType}
                                    onChange={(e) => setItineraryType(e.target.value)}
                                    placeholder="e.g., A relaxing beach getaway with great seafood, or an adventurous hiking trip with scenic views..."
                                    className="trip-style-textarea"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="trip-input-group">
                                <label>Duration: {durationDays} days</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="14"
                                    value={durationDays}
                                    onChange={(e) => setDurationDays(parseInt(e.target.value))}
                                    className="trip-duration-slider"
                                    style={{
                                        background: `linear-gradient(to right, #4db688 0%, #4db688 ${(durationDays - 1) * 100 / 13}%, #e5e3df ${(durationDays - 1) * 100 / 13}%, #e5e3df 100%)`
                                    }}
                                />
                            </div>

                            {error && <div className="trip-error">{error}</div>}

                            <button type="submit" className="trip-submit-btn" disabled={isLoading}>
                                {isLoading ? (
                                    <span className="loading-spinner">Planning...</span>
                                ) : (
                                    '🚀 Plan My Trip'
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="trip-results">
                        <div className="trip-results-header">
                            <h2>{result.origin} → {result.destination}</h2>
                            <span className="trip-type-badge">✨ {result.itineraryType}</span>
                        </div>

                        {/* Carbon Stats */}
                        <div className="carbon-stats-card">
                            <div className="carbon-stat-main">
                                <span className="carbon-value">{result.carbonStats.savingsVsTypical}%</span>
                                <span className="carbon-label">less CO₂ than typical tourist</span>
                            </div>
                            <div className="carbon-stat-details">
                                <div className="carbon-stat">
                                    <span className="label">Best Option</span>
                                    <span className="value">{getModeIcon(result.carbonStats.bestOption.mode)} {result.carbonStats.bestOption.carbonKg} kg</span>
                                </div>
                                <div className="carbon-stat">
                                    <span className="label">Typical Tourist</span>
                                    <span className="value">🧳 {result.carbonStats.typicalTouristKg} kg</span>
                                </div>
                                <div className="carbon-stat">
                                    <span className="label">Offset Cost</span>
                                    <span className="value">🌱 ${result.carbonStats.offsetCostUsd}</span>
                                </div>
                            </div>
                        </div>

                        {/* Selected Flight - Display Only */}
                        {selectedTransitIndex !== null && result.transitOptions[selectedTransitIndex] && (
                            <div className="selected-flight-section">
                                <h3>✈️ Your Flight</h3>
                                <div className="selected-flight-card">
                                    <div className="selected-flight-icon">{getModeIcon(result.transitOptions[selectedTransitIndex].mode)}</div>
                                    <div className="selected-flight-info">
                                        <div className="selected-flight-number">
                                            {result.transitOptions[selectedTransitIndex].mode === 'flight' && result.transitOptions[selectedTransitIndex].flightNumber
                                                ? renderFlightNumbers(result.transitOptions[selectedTransitIndex].flightNumber!)
                                                : result.transitOptions[selectedTransitIndex].mode.charAt(0).toUpperCase() + result.transitOptions[selectedTransitIndex].mode.slice(1)}
                                        </div>
                                        {result.transitOptions[selectedTransitIndex].mode === 'flight' && result.transitOptions[selectedTransitIndex].stops !== undefined && (
                                            <span className={`transit-stops ${result.transitOptions[selectedTransitIndex].stops === 0 ? 'nonstop' : ''}`}>
                                                {result.transitOptions[selectedTransitIndex].stops === 0 ? 'Nonstop' : `${result.transitOptions[selectedTransitIndex].stops} stop${result.transitOptions[selectedTransitIndex].stops! > 1 ? 's' : ''}`}
                                            </span>
                                        )}
                                        <span className="selected-flight-duration">{formatDuration(result.transitOptions[selectedTransitIndex].duration)}</span>
                                        <div className="selected-flight-details">
                                            {result.transitOptions[selectedTransitIndex].price && (
                                                <span className="selected-flight-price">{result.transitOptions[selectedTransitIndex].price}</span>
                                            )}
                                            <span
                                                className="selected-flight-carbon"
                                                style={{
                                                    backgroundColor: result.transitOptions[selectedTransitIndex].carbonRating.color + '20',
                                                    color: result.transitOptions[selectedTransitIndex].carbonRating.color
                                                }}
                                            >
                                                {result.transitOptions[selectedTransitIndex].carbonKg} kg CO₂
                                            </span>
                                        </div>
                                        {result.transitOptions[selectedTransitIndex].bookingUrl && (
                                            <a
                                                href={result.transitOptions[selectedTransitIndex].bookingUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="selected-flight-book-btn"
                                            >
                                                Book Flight →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Selected Hotel - Display Only */}
                        {selectedHotelIndex !== null && result.ecoHotels && result.ecoHotels[selectedHotelIndex] && (
                            <div className="selected-hotel-section">
                                <h3>🏨 Your Accommodation</h3>
                                <div className="selected-hotel-card">
                                    <div className="selected-hotel-info">
                                        <span className="selected-hotel-name">{result.ecoHotels[selectedHotelIndex].name}</span>
                                        {result.ecoHotels[selectedHotelIndex].rating && (
                                            <span className="selected-hotel-rating">⭐ {result.ecoHotels[selectedHotelIndex].rating} ({result.ecoHotels[selectedHotelIndex].userRatingCount})</span>
                                        )}
                                        {result.ecoHotels[selectedHotelIndex].editorialSummary && (
                                            <p className="selected-hotel-summary">{result.ecoHotels[selectedHotelIndex].editorialSummary}</p>
                                        )}
                                        <p className="selected-hotel-address">{result.ecoHotels[selectedHotelIndex].address}</p>
                                        <div className="selected-hotel-links">
                                            {result.ecoHotels[selectedHotelIndex].websiteUri && (
                                                <a href={result.ecoHotels[selectedHotelIndex].websiteUri} target="_blank" rel="noopener noreferrer" className="selected-hotel-link">
                                                    Website ↗
                                                </a>
                                            )}
                                            {result.ecoHotels[selectedHotelIndex].googleMapsUri && (
                                                <a href={result.ecoHotels[selectedHotelIndex].googleMapsUri} target="_blank" rel="noopener noreferrer" className="selected-hotel-link">
                                                    Maps 📍
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Itinerary */}
                        <div className="itinerary-section">
                            <h3>📅 Your Itinerary</h3>

                            {/* Trip Overview with Flight & Hotel Reference */}
                            <div className="itinerary-overview">
                                {selectedTransitIndex !== null && result.transitOptions[selectedTransitIndex] && (
                                    <p className="itinerary-travel-ref">
                                        <strong>Travel:</strong> {result.transitOptions[selectedTransitIndex].mode === 'flight' && result.transitOptions[selectedTransitIndex].flightNumber
                                            ? `Flight ${result.transitOptions[selectedTransitIndex].flightNumber!.split('|')[0].trim()}`
                                            : result.transitOptions[selectedTransitIndex].mode.charAt(0).toUpperCase() + result.transitOptions[selectedTransitIndex].mode.slice(1)}
                                        {' • '}{formatDuration(result.transitOptions[selectedTransitIndex].duration)}
                                    </p>
                                )}
                                {selectedHotelIndex !== null && result.ecoHotels && result.ecoHotels[selectedHotelIndex] && (
                                    <p className="itinerary-hotel-ref">
                                        <strong>Stay:</strong> {result.ecoHotels[selectedHotelIndex].name}
                                    </p>
                                )}
                            </div>

                            <p className="itinerary-summary">{result.itinerary.summary}</p>

                            {result.itinerary.days.map((day) => (
                                <div key={day.day} className="itinerary-day">
                                    <div className="day-header">
                                        <span className="day-number">Day {day.day}</span>
                                        <span className="day-title">{day.title}</span>
                                    </div>
                                    <div className="day-activities">
                                        {day.activities.map((activity, idx) => (
                                            <div key={idx} className="activity-item">
                                                <span className="activity-time">{activity.time}</span>
                                                <div className="activity-content">
                                                    <span className="activity-name">{activity.name}</span>
                                                    <span className="activity-desc">{activity.description}</span>
                                                    {activity.transportNote && (
                                                        <span className="activity-transport">🚶 {activity.transportNote}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Local Pins */}
                        {result.localPins.length > 0 && (
                            <div className="local-pins-section">
                                <h3>📍 Community Recommendations</h3>
                                <div className="local-pins-grid">
                                    {result.localPins.slice(0, 6).map((pin) => (
                                        <div key={pin.id} className="local-pin-card">
                                            <span className="pin-title">{pin.title}</span>
                                            <span className="pin-desc">{pin.description?.substring(0, 80)}...</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sustainability Tips */}
                        <div className="sustainability-section">
                            <h3>🌱 Sustainability Tips</h3>
                            <ul>
                                {result.itinerary.sustainabilityTips.map((tip, idx) => (
                                    <li key={idx}>{tip}</li>
                                ))}
                            </ul>
                        </div>

                        {/* AI Assistant */}
                        <div className="ai-assistant-section">
                            <h3>🤖 Ask Our AI</h3>
                            <div className="ai-input-row">
                                <input
                                    type="text"
                                    value={aiQuestion}
                                    onChange={(e) => setAiQuestion(e.target.value)}
                                    placeholder="What are the best vegetarian restaurants?"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                                />
                                <button onClick={handleAskAI} disabled={isAskingAI}>
                                    {isAskingAI ? '...' : 'Ask'}
                                </button>
                            </div>
                            {aiAnswer && (
                                <div className="ai-answer">
                                    <ReactMarkdown>{aiAnswer}</ReactMarkdown>
                                </div>
                            )}
                        </div>

                        <button className="trip-back-btn" onClick={() => setResult(null)}>
                            ← Plan Another Trip
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
