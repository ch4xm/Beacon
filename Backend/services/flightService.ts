import axios from "axios";
import "dotenv/config";

// Interface matches useful parts of Amadeus or generic flight data
export interface FlightOption {
    id: string;
    airline: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: string;
    currency: string;
    emissions?: number; // kg CO2
}

export interface FlightProvider {
    searchFlights(from: string, to: string, date: string): Promise<FlightOption[]>;
}

// Mock Implementation for Demo
class MockFlightProvider implements FlightProvider {
    async searchFlights(from: string, to: string, date: string): Promise<FlightOption[]> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Return hardcoded data based on locations to look somewhat real
        if ((from.includes("San Francisco") || from.includes("SFO")) && (to.includes("Los Angeles") || to.includes("LAX"))) {
            return [
                {
                    id: "mock-1",
                    airline: "United Airlines",
                    flightNumber: "UA1234",
                    departureTime: `${date}T08:00:00`,
                    arrivalTime: `${date}T09:30:00`,
                    duration: "1h 30m",
                    price: "150",
                    currency: "USD",
                    emissions: 90
                },
                {
                    id: "mock-2",
                    airline: "Delta",
                    flightNumber: "DL5678",
                    departureTime: `${date}T10:00:00`,
                    arrivalTime: `${date}T11:45:00`,
                    duration: "1h 45m",
                    price: "180",
                    currency: "USD",
                    emissions: 95
                }
            ];
        }

        if ((from.includes("Tokyo") || from.includes("HND")) && (to.includes("Osaka") || to.includes("KIX"))) {
            return [
                {
                    id: "mock-jp-1",
                    airline: "JAL",
                    flightNumber: "JL101",
                    departureTime: `${date}T09:00:00`,
                    arrivalTime: `${date}T10:15:00`,
                    duration: "1h 15m",
                    price: "12000",
                    currency: "JPY",
                    emissions: 70
                },
                {
                    id: "mock-jp-2",
                    airline: "ANA",
                    flightNumber: "NH202",
                    departureTime: `${date}T12:00:00`,
                    arrivalTime: `${date}T13:15:00`,
                    duration: "1h 15m",
                    price: "13500",
                    currency: "JPY",
                    emissions: 72
                }
            ];
        }

        return [];
    }
}

// Real Implementation (Skeleton)
class AmadeusFlightProvider implements FlightProvider {
    private apiKey = process.env.AMADEUS_API_KEY;
    private apiSecret = process.env.AMADEUS_API_SECRET;
    private token: string | null = null;

    private async getToken() {
        if (!this.apiKey || !this.apiSecret) return null;
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', this.apiKey);
            params.append('client_secret', this.apiSecret);

            const res = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token', params);
            this.token = res.data.access_token;
            return this.token;
        } catch (e) {
            console.error("Failed to get Amadeus token", e);
            return null;
        }
    }

    async searchFlights(from: string, to: string, date: string): Promise<FlightOption[]> {
        // Implement real call if keys exist
        // For this demo, we'll verify keys in the factory and default to mock if missing
        return [];
    }
}

// Factory
export const getFlightService = (): FlightProvider => {
    // Check if real keys are configured, otherwise return mock
    if (process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET) {
        // return new AmadeusFlightProvider(); // Uncomment when ready to test real API
        console.warn("Using Mock Flight Provider (Real API implementation pending)");
        return new MockFlightProvider();
    }
    return new MockFlightProvider();
};
