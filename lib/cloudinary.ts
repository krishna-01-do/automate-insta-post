import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";
import { withRetry } from "./utils";

let configured = false;
function configure() {
  if (configured) return;
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName(),
    api_key: env.cloudinaryApiKey(),
    api_secret: env.cloudinaryApiSecret(),
    secure: true,
  });
  configured = true;
}

export async function uploadQuoteImage(svg: string, publicId: string): Promise<string> {
  configure();
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return withRetry(async () => {
    const result = await cloudinary.uploader.upload(dataUri, {
      public_id: publicId,
      folder: "instagram-automation",
      resource_type: "image",
      overwrite: true,
      eager: [{ width: 1080, height: 1350, crop: "fill", format: "jpg", quality: "auto:good" }],
      eager_async: false,
    });
    const url = result.eager?.[0]?.secure_url;
    if (!url) throw new Error("Cloudinary did not return the rendered JPEG URL");
    return url;
  }, 3, 750);
}

export async function deleteQuoteImage(publicId: string): Promise<void> {
  configure();
  await withRetry(async () => {
    const result = await cloudinary.uploader.destroy(`instagram-automation/${publicId}`, {
      resource_type: "image",
      invalidate: true,
    });
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }
  }, 3, 750);
}
