/**
 * Standalone test script — verifies the scraper works without ElevenLabs.
 *
 * Usage:
 *   npx tsx test-search.ts
 *   npx tsx test-search.ts "San Francisco" "2026-04-01" 2
 */
import "dotenv/config";
import { searchActivities } from "./server/scraper";

const location = process.argv[2] || process.env.HOTEL_LOCATION || "New York City";
const date = process.argv[3] || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
const groupSize = parseInt(process.argv[4] || "2", 10);

async function main() {
  console.log(`\nSearching activities in ${location} on ${date} for ${groupSize} people...\n`);
  console.log("This will launch two Browserbase sessions (Viator + Airbnb) in parallel.\n");

  const start = Date.now();
  const activities = await searchActivities({
    location,
    date,
    groupSize,
    interests: ["outdoor", "cultural", "food"],
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (activities.length === 0) {
    console.log("No activities found. Check your API keys and try again.");
    process.exit(1);
  }

  console.log(`Found ${activities.length} activities in ${elapsed}s:\n`);

  for (const activity of activities) {
    console.log(`  [${activity.source.toUpperCase()}] ${activity.title}`);
    console.log(`    Price: ${activity.currency} ${activity.price} | Duration: ${activity.duration}`);
    if (activity.rating) {
      console.log(`    Rating: ${activity.rating}/5 (${activity.reviewCount ?? 0} reviews)`);
    }
    console.log(`    URL: ${activity.url}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
