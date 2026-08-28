import { Stagehand } from "@browserbasehq/stagehand";
import { SearchParams, Activity } from "./types";
import { viatorSearch } from "./viator";
import { airbnbSearch } from "./airbnb";
import { scraperEvents } from "./events";

export { scraperEvents };

function createStagehand() {
  return new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    model: {
      modelName: "anthropic/claude-sonnet-4-6",
      apiKey: process.env.ANTHROPIC_API_KEY!,
    },
  });
}

export async function searchActivities(
  params: SearchParams
): Promise<Activity[]> {
  const stagehandViator = createStagehand();
  const stagehandAirbnb = createStagehand();

  try {
    await Promise.all([stagehandViator.init(), stagehandAirbnb.init()]);

    const viatorSessionId = stagehandViator.browserbaseSessionID;
    const airbnbSessionId = stagehandAirbnb.browserbaseSessionID;

    scraperEvents.emit("sessions", {
      viator: viatorSessionId,
      airbnb: airbnbSessionId,
    });

    const [viatorResults, airbnbResults] = await Promise.all([
      viatorSearch(stagehandViator, params),
      airbnbSearch(stagehandAirbnb, params),
    ]);

    const merged = [...viatorResults, ...airbnbResults];

    scraperEvents.emit("done");

    return merged.slice(0, 6);
  } finally {
    await Promise.all([
      stagehandViator.close().catch(console.error),
      stagehandAirbnb.close().catch(console.error),
    ]);
  }
}
