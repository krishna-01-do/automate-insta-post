export const CATEGORIES = [
  "Funny", "Relatable", "Adulting", "Dating", "Relationships",
  "Psychology-inspired observations", "Human behaviour", "Dark humour",
  "Sarcasm", "Gen Z", "Work", "Money", "Overthinking", "Friendships",
  "Modern life", "Deep thoughts",
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
