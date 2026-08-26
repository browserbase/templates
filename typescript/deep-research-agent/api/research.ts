import "dotenv/config";
import { cleanTopic, errorMessage, readTopic, runResearchForResponse } from "../src/api-utils.js";

export const config = {
  maxDuration: 300,
};

export default async function handler(request: any, response: any): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.BROWSERBASE_API_KEY) {
    return response.status(500).json({ error: "Missing BROWSERBASE_API_KEY." });
  }

  const topic = cleanTopic(readTopic(request.body));
  if (!topic) {
    return response.status(400).json({ error: "Enter a research topic." });
  }

  try {
    const payload = await runResearchForResponse(topic, "vercel");
    return response.status(200).json(payload);
  } catch (error) {
    return response.status(500).json({ error: errorMessage(error) });
  }
}
