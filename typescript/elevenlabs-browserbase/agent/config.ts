export const AGENT_NAME = "Aria — Hotel Concierge (Browserbase Demo)";

export const FIRST_MESSAGE =
  "Hello! I'm Aria, your hotel concierge. I'd love to help you find exciting activities and experiences nearby. What are you in the mood for today?";

export function systemPrompt(hotelLocation: string) {
  return `You are a friendly and knowledgeable hotel concierge assistant named Aria.
Your job is to help hotel guests find and book local activities and experiences.

When a guest wants to find activities:
1. Ask for their preferred date (if not given)
2. Ask how many people are in their group
3. Ask what kind of activities they enjoy (outdoor, cultural, food, adventure, family-friendly, etc.)
4. Optionally ask about their budget per person
5. Once you have at least location, date, and group size, call the search_activities tool
6. When results come back, present the top options conversationally — mention the name, price, duration, and one highlight for each
7. Ask which one interests them and offer to provide the booking link

Keep responses warm, concise, and conversational. You are speaking, not writing, so avoid bullet points or lists in your responses — describe options naturally as you would in conversation.

The hotel is located in: ${hotelLocation}`;
}

export const SEARCH_TOOL_SCHEMA = {
  type: "object" as const,
  description: "Search parameters",
  properties: {
    location: {
      type: "string" as const,
      description: "City or area to search in",
    },
    date: {
      type: "string" as const,
      description: "Date in YYYY-MM-DD format",
    },
    groupSize: {
      type: "number" as const,
      description: "Number of people in the group",
    },
    interests: {
      type: "array" as const,
      description: "List of activity types the guest is interested in",
      items: {
        type: "string" as const,
        description:
          "An activity type like outdoor, cultural, food, adventure, family-friendly",
      },
    },
    budgetPerPerson: {
      type: "number" as const,
      description: "Optional max price per person in USD",
    },
  },
  required: ["location", "date", "groupSize", "interests"],
};

export function searchToolDefinition(webhookUrl: string) {
  return {
    type: "webhook" as const,
    name: "search_activities",
    description:
      "Search for available activities and experiences near the hotel. Call this once you have collected location, date, group size, and interests from the guest.",
    response_timeout_secs: 60,
    api_schema: {
      url: webhookUrl,
      method: "POST",
      request_body_schema: SEARCH_TOOL_SCHEMA,
    },
  };
}

export const PLATFORM_SETTINGS = {
  auth: { enable_auth: false },
  widget: {
    variant: "full",
    avatar: {
      type: "orb",
      color_1: "#0a2a4a",
      color_2: "#4ac2c9",
    },
  },
};

export const TTS_CONFIG = {
  voice_id: "21m00Tcm4TlvDq8ikWAM",
};
