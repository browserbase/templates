import { z } from "zod";
import { Activity } from "./types";
import { scraperEvents } from "./events";

export const activitySchema = z.object({
  activities: z.array(
    z.object({
      title: z.string(),
      price: z.number(),
      duration: z.string(),
      rating: z.number().optional(),
      reviewCount: z.number().optional(),
      url: z.string(),
    })
  ),
});

export type RawActivity = z.infer<typeof activitySchema>["activities"][number];

export function createEmitter(source: string) {
  return (action: string, detail?: string) => {
    scraperEvents.emit("action", { source, action, detail });
  };
}

export function toActivities(
  raw: RawActivity[],
  source: "viator" | "airbnb",
  urlPrefix: string,
  limit = 3
): Activity[] {
  return raw.slice(0, limit).map((a) => ({
    title: a.title,
    price: a.price,
    currency: "USD",
    duration: a.duration,
    rating: a.rating,
    reviewCount: a.reviewCount,
    url: a.url.startsWith("http") ? a.url : `${urlPrefix}${a.url}`,
    source,
    highlights: [],
  }));
}
