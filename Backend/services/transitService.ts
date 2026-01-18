import axios from "axios";
import "dotenv/config";

export interface TransitOption {
    id: string;
    mode: "TRAIN" | "BUS" | "SUBWAY";
    carrier: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price?: string;
    currency?: string;
    emissions?: number;
}

export interface TransitProvider {
    searchTransit(fromLat: number, fromLng: number, toLat: number, toLng: number, date: string): Promise<TransitOption[]>;
}

class MockTransitProvider implements TransitProvider {
    async searchTransit(fromLat: number, fromLng: number, toLat: number, toLng: number, date: string): Promise<TransitOption[]> {
        // Mock data logic
        // Approximate coordinates for SF/LA
        const isSF = (lat: number) => Math.abs(lat - 37.7) < 1;
        const isLA = (lat: number) => Math.abs(lat - 34.0) < 1;

        if ((isSF(fromLat) && isLA(toLat)) || (isSF(toLat) && isLA(fromLat))) {
             return [
                {
                    id: "mock-tr-1",
                    mode: "TRAIN",
                    carrier: "Amtrak Coast Starlight",
                    departureTime: `${date}T08:00:00`,
                    arrivalTime: `${date}T20:00:00`,
                    duration: "12h",
                    price: "60",
                    currency: "USD",
                    emissions: 20
                },
                {
                    id: "mock-tr-2",
                    mode: "BUS",
                    carrier: "Greyhound",
                    departureTime: `${date}T10:00:00`,
                    arrivalTime: `${date}T18:00:00`,
                    duration: "8h",
                    price: "45",
                    currency: "USD",
                    emissions: 35 // Bus slightly more than train per pax usually
                }
            ];
        }
        
        // Approximate coords for Tokyo/Osaka
        const isTokyo = (lat: number) => Math.abs(lat - 35.6) < 1;
        const isOsaka = (lat: number) => Math.abs(lat - 34.6) < 1;

        if ((isTokyo(fromLat) && isOsaka(toLat)) || (isTokyo(toLat) && isOsaka(fromLat))) {
            return [
                 {
                    id: "mock-tr-jp-1",
                    mode: "TRAIN",
                    carrier: "Shinkansen Nozomi",
                    departureTime: `${date}T10:00:00`,
                    arrivalTime: `${date}T12:30:00`,
                    duration: "2h 30m",
                    price: "14500",
                    currency: "JPY",
                    emissions: 15
                }
            ];
        }

        return [];
    }
}

export const getTransitService = (): TransitProvider => {
     // If Google Routes API logic is added, switch here
     return new MockTransitProvider();
};
