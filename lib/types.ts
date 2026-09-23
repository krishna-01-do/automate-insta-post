export const CATEGORIES = [
  "Savage relatable", "Sarcastic adulting", "Funny modern life", "Savage dating",
  "Relatable situationships", "Sarcastic friendships", "Dark humour",
  "Funny overthinking", "Savage work life", "Relatable money problems",
  "Sarcastic social media", "Funny human behaviour", "Cool Gen Z observations",
  "Savage relationships", "Relatable awkward moments", "Funny everyday struggles",
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
