/**
 * Carbon Footprint Calculation Utilities
 * Provides standardized carbon estimates for different transport modes.
 */

/**
 * Carbon emission factors (kg CO2 per passenger-km)
 * Based on UK Government GHG Conversion Factors and EPA estimates
 */
export const CARBON_FACTORS = {
    // Air travel
    FLIGHT_SHORT: 0.115,      // < 500km
    FLIGHT_MEDIUM: 0.1,     // 500-3700km
    FLIGHT_LONG: 0.09,       // > 3700km

    // Ground transport
    TRAIN_ELECTRIC: 0.041,
    TRAIN_DIESEL: 0.089,
    SUBWAY: 0.029,
    TRAM: 0.029,
    BUS_URBAN: 0.089,
    BUS_COACH: 0.027,
    FERRY: 0.019,

    // Road
    CAR_AVERAGE: 0.21,
    CAR_ELECTRIC: 0.053,
    CARPOOL_2: 0.105,         // 2 passengers
    CARPOOL_4: 0.0525,        // 4 passengers

    // Active
    BICYCLE: 0,
    WALKING: 0,
    E_SCOOTER: 0.015,
};

export interface CarbonEstimate {
    mode: string;
    distanceKm: number;
    carbonKg: number;
    comparison?: {
        vsFlying: number;      // Percentage saved vs flying
        vsDriving: number;     // Percentage saved vs driving alone
    };
}

/**
 * Calculate carbon footprint for a flight
 */
export function calculateFlightCarbon(distanceKm: number): number {
    let factor: number;
    if (distanceKm < 500) {
        factor = CARBON_FACTORS.FLIGHT_SHORT;
    } else if (distanceKm < 3700) {
        factor = CARBON_FACTORS.FLIGHT_MEDIUM;
    } else {
        factor = CARBON_FACTORS.FLIGHT_LONG;
    }
    return Math.round(distanceKm * factor * 100) / 100;
}

/**
 * Calculate carbon footprint for train travel
 */
export function calculateTrainCarbon(distanceKm: number, isElectric: boolean = true): number {
    const factor = isElectric ? CARBON_FACTORS.TRAIN_ELECTRIC : CARBON_FACTORS.TRAIN_DIESEL;
    return Math.round(distanceKm * factor * 100) / 100;
}

/**
 * Calculate carbon footprint for bus travel
 */
export function calculateBusCarbon(distanceKm: number, isCoach: boolean = false): number {
    const factor = isCoach ? CARBON_FACTORS.BUS_COACH : CARBON_FACTORS.BUS_URBAN;
    return Math.round(distanceKm * factor * 100) / 100;
}

/**
 * Calculate carbon footprint for car travel
 */
export function calculateCarCarbon(distanceKm: number, passengers: number = 1, isElectric: boolean = false): number {
    let factor: number;
    if (isElectric) {
        factor = CARBON_FACTORS.CAR_ELECTRIC / passengers;
    } else {
        factor = CARBON_FACTORS.CAR_AVERAGE / passengers;
    }
    return Math.round(distanceKm * factor * 100) / 100;
}

/**
 * Get comparison percentages for a given carbon amount
 */
export function getComparison(carbonKg: number, distanceKm: number): { vsFlying: number; vsDriving: number } {
    const flightCarbon = calculateFlightCarbon(distanceKm);
    const carCarbon = calculateCarCarbon(distanceKm);

    return {
        vsFlying: flightCarbon > 0 ? Math.round((1 - carbonKg / flightCarbon) * 100) : 0,
        vsDriving: carCarbon > 0 ? Math.round((1 - carbonKg / carCarbon) * 100) : 0,
    };
}

/**
 * Generate carbon offset amount (in USD) based on emissions
 * Using ~$15/ton CO2 as average offset price
 */
export function calculateOffsetCost(carbonKg: number): number {
    const pricePerTon = 15;
    return Math.round((carbonKg / 1000) * pricePerTon * 100) / 100;
}

/**
 * Format carbon amount for display
 */
export function formatCarbon(carbonKg: number): string {
    if (carbonKg >= 1000) {
        return `${(carbonKg / 1000).toFixed(1)} tons CO₂`;
    }
    return `${carbonKg.toFixed(1)} kg CO₂`;
}

/**
 * Get sustainability rating based on carbon per km
 */
export function getSustainabilityRating(carbonPerKm: number): { rating: string; color: string; score: number } {
    if (carbonPerKm <= 0.03) {
        return { rating: "Excellent", color: "#22c55e", score: 5 };
    } else if (carbonPerKm <= 0.05) {
        return { rating: "Great", color: "#84cc16", score: 4 };
    } else if (carbonPerKm <= 0.10) {
        return { rating: "Good", color: "#eab308", score: 3 };
    } else if (carbonPerKm <= 0.20) {
        return { rating: "Fair", color: "#f97316", score: 2 };
    } else {
        return { rating: "Poor", color: "#ef4444", score: 1 };
    }
}

/**
 * Calculate "average tourist" carbon for comparison
 * Assumes typical tourist flies + rents car + takes taxis
 */
export function calculateTypicalTouristCarbon(distanceKm: number, tripDays: number): number {
    const flightCarbon = calculateFlightCarbon(distanceKm);
    // Assume 50km/day of car/taxi travel
    const localTravelCarbon = tripDays * 50 * CARBON_FACTORS.CAR_AVERAGE;
    return Math.round((flightCarbon + localTravelCarbon) * 100) / 100;
}
