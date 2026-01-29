import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

console.log("API Key loaded:", process.env.GEMINI_API_KEY ? "Yes (ends with ... " + process.env.GEMINI_API_KEY.slice(-4) + ")" : "No");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
    console.log("Testing gemini-1.5-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("Hello?");
        console.log("✅ gemini-1.5-flash WORKED!");
    } catch (error) {
        console.error("❌ gemini-1.5-flash FAILED:", error);
    }

    console.log("\nTesting gemini-pro...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        await model.generateContent("Hello?");
        console.log("✅ gemini-pro WORKED!");
    } catch (error) {
        console.error("❌ gemini-pro FAILED:", error);
    }
}

test();
