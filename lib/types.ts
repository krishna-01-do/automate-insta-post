export const CATEGORIES = [
  "Desi adulting", "Indian family sarcasm", "Salary and UPI struggles", "Savage dating",
  "Relatable situationships", "Indian office humour", "College and exam chaos",
  "Funny overthinking", "Traffic and commute pain", "Being broke after salary day",
  "Family WhatsApp groups", "Relatives and wedding questions", "Food delivery decisions",
  "Friendship roasting", "Social battery problems", "Everyday Indian struggles",
] as const;

export type GeneratedPost = {
  category: string;
  quote: string;
  caption: string;
  hashtags: string[];
};

export type PostRow = GeneratedPost & {
  id: string;
  image_url: string | null;
  status: "generated" | "pending" | "publishing" | "failed";
  scheduled_at: string;
  generated_at: string;
  instagram_container_id: string | null;
  retry_count: number;
  error_message: string | null;
  publishing_started_at: string | null;
  created_at: string;
  updated_at: string;
};
