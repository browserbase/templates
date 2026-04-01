export interface SearchParams {
  location: string;
  date: string;
  groupSize: number;
  interests: string[];
  budgetPerPerson?: number;
}

export interface Activity {
  title: string;
  price: number;
  currency: string;
  duration: string;
  rating?: number;
  reviewCount?: number;
  url: string;
  source: "viator" | "airbnb";
  highlights?: string[];
}
