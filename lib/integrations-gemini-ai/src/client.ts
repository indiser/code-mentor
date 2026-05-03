import { GoogleGenAI } from "@google/genai";

if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_GEMINI_API_KEY must be set. Did you forget to provision the Gemini AI integration?",
  );
}

const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;

// When using the standard Google AI endpoint, let the SDK use its own
// defaults (which include the correct /v1beta/ path). When a custom proxy
// URL is provided (e.g. Replit AI Integrations), pass it explicitly with
// an empty apiVersion because the proxy URL already contains the version.
const isStandardGoogleUrl =
  !baseUrl || baseUrl.includes("generativelanguage.googleapis.com");

export const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  ...(isStandardGoogleUrl
    ? {}
    : {
        httpOptions: {
          apiVersion: "",
          baseUrl,
        },
      }),
});
