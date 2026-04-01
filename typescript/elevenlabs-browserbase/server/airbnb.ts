import { Stagehand } from "@browserbasehq/stagehand";
import { SearchParams, Activity } from "./types";
import { activitySchema, createEmitter, toActivities } from "./scraper-utils";

const emit = createEmitter("airbnb");

export async function airbnbSearch(
  stagehand: Stagehand,
  params: SearchParams
): Promise<Activity[]> {
  try {
    const page = stagehand.context.activePage()!;

    emit("navigate", "https://www.airbnb.com/s/experiences");
    await page.goto("https://www.airbnb.com/s/experiences");

    const searchAction = `Search for experiences in "${params.location}". Enter the location into the location/search field. If there is a date picker, set the date to ${params.date}. If there is a guests filter, set it to ${params.groupSize} guests. Submit the search.`;
    emit("act", searchAction);
    await stagehand.act(searchAction);

    const extractInstruction = `Extract the top 3 experience results from the search results page. For each result, get the title, price (as a number, per person if shown), duration, rating (as a number), review count (as a number), and the URL/link to the experience page.`;
    emit("extract", extractInstruction);
    const results = await stagehand.extract(extractInstruction, activitySchema as any);

    const activities = toActivities(results.activities, "airbnb", "https://www.airbnb.com");

    emit("done", `Found ${activities.length} activities`);
    return activities;
  } catch (error) {
    emit("error", String(error));
    console.error("Airbnb search failed:", error);
    return [];
  }
}
