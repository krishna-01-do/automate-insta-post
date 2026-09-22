const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const env = {
  geminiApiKey: () => required("GEMINI_API_KEY"),
  geminiModel: () => process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  cloudinaryCloudName: () => required("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: () => required("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: () => required("CLOUDINARY_API_SECRET"),
  instagramAccessToken: () => required("INSTAGRAM_ACCESS_TOKEN"),
  instagramAccountId: () => required("INSTAGRAM_ACCOUNT_ID"),
  graphVersion: () => process.env.META_GRAPH_API_VERSION?.trim() || "v23.0",
  cronSecret: () => required("CRON_SECRET"),
};
