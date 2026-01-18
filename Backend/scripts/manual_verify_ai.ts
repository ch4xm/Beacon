
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from Backend root BEFORE importing service
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log("Environment loaded. API Key present:", !!process.env.GEMINI_API_KEY);

async function verify() {
    // Dynamic import to ensure env is loaded first
    const { generateItinerary, generateCarbonComparison, answerTripQuestion } = await import('../services/ai');

    console.log("Starting verification...");

    if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is missing in .env");
        process.exit(1);
    }

    try {
        console.log("\n--- Testing generateItinerary ---");
        const itinerary = await generateItinerary(
            "Paris",
            "Romantic",
            2,
            [],
            "Trains are available."
        );
        console.log("Itinerary Result:", JSON.stringify(itinerary, null, 2));

        console.log("\n--- Testing generateCarbonComparison ---");
        const carbon = await generateCarbonComparison(
            "London",
            "Paris",
            [{ mode: "Train", carbonKg: 5 }],
            50
        );
        console.log("Carbon Result:", JSON.stringify(carbon, null, 2));

        console.log("\n--- Testing answerTripQuestion ---");
        const answer = await answerTripQuestion(
            "What is the weather like in Paris in May?",
            {
                origin: "London",
                destination: "Paris",
                itineraryType: "Romantic",
                localPins: []
            }
        );
        console.log("Answer Result:", answer);

        console.log("\nVerification Complete!");
    } catch (error) {
        console.error("Verification failed:", error);
    }
}

verify();
