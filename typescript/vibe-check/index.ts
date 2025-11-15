// VibeCheck - Stagehand-Powered Vibe Search on Google Maps

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import "dotenv/config";

// ============= CLI PARSING =============

const vibe = process.argv[2];
const location = process.argv[3] || "San Francisco";
const venueType = process.argv[4]; // optional venue type filter

if (!vibe) {
  console.log('Usage: npm start "<vibe>" "[location]" "[venue type]"');
  console.log(
    'Example: npm start "sunset vibes" "San Francisco" "rooftop bar"'
  );
  console.log("\nLocation defaults to San Francisco if not provided.");
  console.log(
    "Venue type is fully optional (e.g., bar, restaurant, cafe, club, etc.)"
  );
  process.exit(1);
}

// ============= MAIN =============

async function main(): Promise<void> {
  // ============= ASCII ART =============

  console.log("\n");
  console.log("\x1b[33m██╗░░░██╗██╗██████╗░███████╗");
  console.log("██║░░░██║██║██╔══██╗██╔════╝");
  console.log("╚██╗░██╔╝██║██████╦╝█████╗░░");
  console.log("░╚████╔╝░██║██╔══██╗██╔══╝░░");
  console.log("░░╚██╔╝░░██║██████╦╝███████╗");
  console.log("░░░╚═╝░░░╚═╝╚═════╝░╚══════╝\x1b[0m");
  console.log("\n   > Vibe........: " + vibe);
  console.log("   > Location....: " + location);
  if (venueType) {
    console.log("   > Venue Type..: " + venueType);
  }
  console.log();

  // ============= INITIALIZE STAGEHAND =============

  // Initialize Stagehand
  console.log("\n🅱️  Initializing Stagehand...\n");
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    model: "google/gemini-2.5-flash",
    // auto-loads GEMINI_API_KEY from environment
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      browserSettings: {
        // Viewport optimized for AI models
        viewport: {
          width: 1288,
          height: 711,
        },
      },
    },
  });

  await stagehand.init();
  console.log("\n🅱️  Browser initialized...\n");

  // Get session URL for debugging
  const sessionId = stagehand.browserbaseSessionId;
  if (sessionId) {
    const liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
    console.log(`\n🅱️  Live View: ${liveViewUrl}\n`);
  }

  // ============= STAGEHAND: OBSERVE - ACT - EXTRACT =============

  // Get a page
  const page = stagehand.context.pages()[0];

  // Navigate to Google Maps
  console.log("\n🅱️  Navigating to Google Maps...\n");
  await page.goto("https://www.google.com/maps");

  // Build search query
  const searchQuery = `${vibe} ${
    venueType ? venueType + "s" : "venues"
  } in ${location}`;
  console.log(`\n🅱️  Searching for: ${searchQuery}\n`);

  // Search for venues - be very explicit and break down actions atomically
  await stagehand.act(`click on the search box`);
  await stagehand.act(`type "${searchQuery}" into the search box`);
  await stagehand.act(`press Enter or click the search button`);
  await stagehand.observe(`make sure we can see the map search results`);

  console.log("\n🅱️  Extracting venue data...\n");

  // Extract venues with vibe scoring (note: extraction uses a11y tree, text only - no images)
  const venuesData = await stagehand.extract(
    "Extract all the venues you can from the search results.",
    z.object({
      venues: z
        .array(
          z.object({
            name: z.string().describe("venue name"),
            address: z.string().describe("full address"),
            description: z.string().describe("venue description"),
            starRating: z
              .string()
              .describe("Google Maps star rating (e.g., '4.5')"),
            reviews: z
              .string()
              .describe("Available individual reviews for the venue"),
          })
        )
        .describe("list of venues from search results"),
    })
  );

  console.log("\n🅱️  Venue data extracted:\n");
  console.log(JSON.stringify(venuesData, null, 2));

  // ============= STAGEHAND AGENT =============

  console.log("\n🅱️  Using agent to score venues...\n");
  const agent = stagehand.agent({
    model: "google/gemini-2.5-flash",
    // auto-loads GEMINI_API_KEY from environment
  });

  const scoringInstruction = `
For each venue, determine a vibe score of how well it matches the vibe "${vibe}" of either 1, 2, 3, 4, or 5.
Take into account:
- Venue name (does the name suggest this vibe?)
${venueType ? `- Category/venue type (should be a ${venueType})` : ""}
- Description text (does it mention relevant atmosphere or theme?)
- Review snippets (any keywords about ambiance/mood that fit the vibe?)
- Star rating (higher rated venues are better)
- Keywords (look for vibe-related words in any visible text)

Be generous with scoring. Do not search again. Use the data provided.

Data: 
${JSON.stringify(venuesData, null, 2)}

Output as a JSON array, where each item has:
- vibeScore (number)
- name (string)
- address (string)
- starRating (string)
- reviewSummary (string)

// Example:
[
  {
    "vibeScore": 5,
    "name": "Awesome Venue",
    "address": "123 Sunset Blvd, San Francisco, CA",
    "starRating": "4.6",
    "reviewSummary": "Beautiful views and great music."
  },
  ...
]
`;

  const result = await agent.execute(scoringInstruction);

  console.log("\n🅱️  Closing browser...\n");
  await stagehand.close();

  // ============= PROCESS OUTPUT =============

  // Strip the JSON formatting
  const output = result.message
    .trim()
    .replace(/^```json\n?/, "")
    .replace(/\n?```$/, "");

  type VibeScore = {
    vibeScore: number;
    name: string;
    address: string;
    starRating: string;
    reviewSummary: string;
  };

  const vibeScores = JSON.parse(output) as VibeScore[];

  console.log("\n🅱️  Vibe scores:\n");
  console.log(JSON.stringify(vibeScores, null, 2));

  // Sort by vibe score and take top 3
  const topVenues = vibeScores
    .sort((a, b) => b.vibeScore - a.vibeScore)
    .slice(0, 3);

  // ============= DISPLAY RESULTS =============

  if (topVenues && topVenues.length > 0) {
    console.log("\n");
    console.log("    ╦  ╦╦╔╗ ╔═╗");
    console.log("    ╚╗╔╝║╠╩╗║╣");
    console.log("     ╚╝ ╩╚═╝╚═╝");
    console.log("    ══════════════════════");
    console.log(`    >> ${venuesData.venues.length} VIBES ANALYZED`);
    console.log(`    >> TOP 3 VIBES FOUND`);
    console.log(`    >> FOR VIBE: ${vibe} in ${location}`);
    console.log();

    topVenues.forEach((venue, index) => {
      const rank = index + 1;
      const rankLabels = ["◆◆◆ PRIME VIBE", "◆◆ GOOD VIBE", "◆ VIBES"];

      console.log(`\n    ┌─ [${rank}] ${rankLabels[index]}`);
      console.log(`    │`);
      console.log(`    │  \x1b[1m\x1b[36m${venue.name}\x1b[0m`);
      console.log(`    │  ${venue.address}`);
      console.log(`    │`);

      // Visual bars
      const vibeBlocks =
        "▓".repeat(Math.round(venue.vibeScore * 2)) +
        "░".repeat(10 - Math.round(venue.vibeScore * 2));
      const ratingNum = parseFloat(venue.starRating) || 0;
      const ratingBlocks =
        "▓".repeat(Math.round(ratingNum * 2)) +
        "░".repeat(10 - Math.round(ratingNum * 2));

      console.log(`    │  VIBE···· [${vibeBlocks}] ${venue.vibeScore}`);
      console.log(`    │  RATING·· [${ratingBlocks}] ${venue.starRating}`);
      console.log(`    │`);
      console.log(`    │  "${venue.reviewSummary}"`);
      console.log(`    └─`);
    });

    console.log("\n    ※ Quick vibe check only - please vibe responsibly ※\n");
    console.log("    █ THANKS FOR VIBING! █");
  } else {
    console.log("\n");
    console.log("    ╦  ╦╦╔╗ ╔═╗");
    console.log("    ╚╗╔╝║╠╩╗║╣");
    console.log("     ╚╝ ╩╚═╝╚═╝");
    console.log("    ══════════════════════");
    console.log("\n  ╔══════════════════════");
    console.log("    ║   NO VIBES FOUND      ║");
    console.log("    ║   TRY DIFFERENT VIBE  ║");
    console.log("    ╚══════════════════════\n");
  }
}

// ============= ERROR HANDLING =============

main().catch((err) => {
  console.error("\n🅱️  Error:", err);
  process.exit(1);
});
