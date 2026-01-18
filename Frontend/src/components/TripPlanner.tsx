import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './styles/TripPlanner.css';
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

interface TripPlanResult {
    origin: string;
    destination: string;
    itineraryType: string;
    transitOptions: TransitOption[];
    itinerary: {
        summary: string;
        days: ItineraryDay[];
        sustainabilityTips: string[];
        carbonOffsetSuggestions: string[];
    };
    localPins: LocalPin[];
    ecoHotels?: EcoHotel[];
    carbonStats: {
        bestOption: { mode: string; carbonKg: number };
        worstOption: { mode: string; carbonKg: number };
        typicalTouristKg: number;
        savingsVsTypical: number;
        offsetCostUsd: number;
    };
    routePolylines: { mode: string; polyline: string }[];
}

interface TripPlannerProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanComplete: (result: TripPlanResult) => void;
}



export default function TripPlanner({ isOpen, onClose, onPlanComplete }: TripPlannerProps) {
    const [startCity, setStartCity] = useState('');
    const [endCity, setEndCity] = useState('');
    const [itineraryType, setItineraryType] = useState('');
    const [durationDays, setDurationDays] = useState(7);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<TripPlanResult | null>(null);
    const [selectedTransit, setSelectedTransit] = useState<number>(0);
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiAnswer, setAiAnswer] = useState('');
    const [isAskingAI, setIsAskingAI] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
            setResult(null);
        }, 200);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${BASE_API_URL}/api/trip/plan`, {
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
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to plan trip');
            }

            const data: TripPlanResult = await response.json();
            setResult(data);
            onPlanComplete(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
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
        <div className={`trip-planner-overlay ${isClosing ? 'is-closing' : ''}`} onClick={handleClose}>
            <div className={`trip-planner-modal ${isClosing ? 'is-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                <button
                    className="trip-planner-close"
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {!result ? (
                    <>
                        <div className="trip-planner-header">
                            <h2>🌍 Plan Your Sustainable Trip</h2>
                            <p>Discover eco-friendly routes and local hidden gems</p>
                        </div>

                        <form onSubmit={handleSubmit} className="trip-planner-form">
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
                                            <span className="transit-mode">{option.mode}</span>
                                            <span className="transit-duration">{option.duration}</span>
                                            {option.price && <span className="transit-price">{option.price}</span>}
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
