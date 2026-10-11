import { Stagehand } from "@browserbasehq/stagehand";
import { SearchParams, Activity } from "./types";
import { activitySchema, createEmitter, toActivities } from "./scraper-utils";

const emit = createEmitter("viator");

export async function viatorSearch(
  stagehand: Stagehand,
  params: SearchParams
): Promise<Activity[]> {
  try {
    const page = stagehand.context.activePage()!;

    emit("navigate", "https://www.viator.com");
    await page.goto("https://www.viator.com");

    const searchAction = `Type "${params.location}" into the search bar and press Enter to search`;
    emit("act", searchAction);
    await stagehand.act(searchAction);

    const filterAction = `If there is a date filter or date picker, set the date to ${params.date}. If there is a group size or travelers filter, set it to ${params.groupSize} travelers. If these filters are not easily accessible, skip this step.`;
    emit("act", filterAction);
    await stagehand.act(filterAction);

    const extractInstruction = `Extract the top 3 activity/tour results from the search results page. For each result, get the title, price (as a number), duration, rating (as a number), review count (as a number), and the URL/link to the activity page.`;
    emit("extract", extractInstruction);
    const results = await stagehand.extract(extractInstruction, activitySchema as any);

    const activities = toActivities(results.activities, "viator", "https://www.viator.com");

    emit("done", `Found ${activities.length} activities`);
    return activities;
  } catch (error) {
    emit("error", String(error));
    console.error("Viator search failed:", error);
    return [];
  }
}
