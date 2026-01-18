import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './styles/TripPlanner.css';
import { DatePicker } from './DatePicker';
import { BASE_API_URL } from '../../constants';

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
}

interface LocalPin {
    id: number;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
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

interface TripPlannerProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanComplete: (result: TripPlanResult) => void;
    onWideModeChange?: (isWide: boolean) => void;
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



export default function TripPlanner({ isOpen, onClose, onPlanComplete, onWideModeChange }: TripPlannerProps) {
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
    const [selectedTransit, setSelectedTransit] = useState<number>(0);
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
    const [selectedTransitIndex, setSelectedTransitIndex] = useState<number>(0);
    const [selectedHotelIndex, setSelectedHotelIndex] = useState<number>(0);
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
            setSelectedTransitIndex(0);
            setSelectedHotelIndex(0);
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
                                setSelectedTransitIndex(0);
                                setSelectedHotelIndex(0);
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
        setError(null);

        try {
            const selectedTransitOption = optionsData.transitOptions[selectedTransitIndex];
            const selectedHotelOption = optionsData.ecoHotels?.[selectedHotelIndex];

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
                    localPins: optionsData.localPins,
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

    const getModeIcon = (mode: string) => {
        switch (mode) {
            case 'flight': return '✈️';
            case 'train': return '🚆';
            case 'bus': return '🚌';
            case 'driving': return '🚗';
            default: return '🚀';
        }
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
                            <h2>✨ Choose Your Options</h2>
                            <p>{optionsData.origin} → {optionsData.destination}</p>
                        </div>

                        {/* Transit Selection */}
                        <div className="selection-section">
                            <h3>🚀 Select Your Travel</h3>
                            <p className="selection-hint">Choose how you'd like to get there</p>
                            <div className="transit-selection-grid">
                                {optionsData.transitOptions.map((option, idx) => (
                                    <div
                                        key={idx}
                                        className={`transit-selection-card ${selectedTransitIndex === idx ? 'selected' : ''}`}
                                        onClick={() => setSelectedTransitIndex(idx)}
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

                        {/* Hotel Selection */}
                        {optionsData.ecoHotels && optionsData.ecoHotels.length > 0 && (
                            <div className="selection-section">
                                <h3>🏨 Select Your Stay</h3>
                                <p className="selection-hint">Choose an eco-friendly accommodation</p>
                                <div className="hotel-selection-grid">
                                    {optionsData.ecoHotels.slice(0, 4).map((hotel, idx) => (
                                        <div
                                            key={hotel.id}
                                            className={`hotel-selection-card ${selectedHotelIndex === idx ? 'selected' : ''}`}
                                            onClick={() => setSelectedHotelIndex(idx)}
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
                        )}

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
                                    '📅 Generate My Itinerary'
                                )}
                            </button>
                            <button
                                className="trip-back-btn"
                                onClick={() => {
                                    setOptionsData(null);
                                    setSelectedTransitIndex(0);
                                    setSelectedHotelIndex(0);
                                }}
                                disabled={isGeneratingItinerary}
                            >
                                ← Start Over
                            </button>
                        </div>
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

                        {/* Transit Options */}
                        <div className="transit-options">
                            <h3>🚀 Travel Options</h3>
                            <div className="transit-grid">
                                {result.transitOptions.map((option, idx) => (
                                    <div
                                        key={idx}
                                        className={`transit-card ${selectedTransit === idx ? 'selected' : ''}`}
                                        onClick={() => setSelectedTransit(idx)}
                                    >
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
                                                {option.bookingUrl && (
                                                    <a
                                                        href={option.bookingUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="transit-book-link"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Book ↗
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="transit-carbon" style={{ backgroundColor: option.carbonRating.color + '20', color: option.carbonRating.color }}>
                                            {option.carbonKg} kg CO₂
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Eco Hotels */}
                        {result.ecoHotels && result.ecoHotels.length > 0 && (
                            <div className="eco-hotels-section">
                                <h3>🏨 Eco-Friendly Stays</h3>
                                <div className="eco-hotels-grid">
                                    {result.ecoHotels.slice(0, 4).map((hotel) => (
                                        <div key={hotel.id} className="eco-hotel-card">
                                            <div className="eco-hotel-header">
                                                <span className="hotel-name">{hotel.name}</span>
                                                {hotel.priceLevel && <span className="hotel-price">{hotel.priceLevel}</span>}
                                            </div>
                                            <div className="eco-hotel-rating">
                                                {hotel.rating && <span>⭐ {hotel.rating} ({hotel.userRatingCount})</span>}
                                            </div>
                                            <p className="hotel-summary">{hotel.editorialSummary || hotel.address}</p>
                                            <div className="hotel-links">
                                                {hotel.websiteUri && (
                                                    <a href={hotel.websiteUri} target="_blank" rel="noopener noreferrer" className="hotel-link">
                                                        Website ↗
                                                    </a>
                                                )}
                                                {hotel.googleMapsUri && (
                                                    <a href={hotel.googleMapsUri} target="_blank" rel="noopener noreferrer" className="hotel-link">
                                                        Maps 📍
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Itinerary */}
                        <div className="itinerary-section">
                            <h3>📅 Your Itinerary</h3>
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
