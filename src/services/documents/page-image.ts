import { store } from "@/services/storage/store";
import type { DocumentPage } from "@/types/kashfara";

export async function getPageImageForVision(
  page: DocumentPage
): Promise<{ base64: string; mimeType: string } | null> {
  if (page.image_url && page.image_url.startsWith("data:")) {
    const match = page.image_url.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], base64: match[2] };
    }
  }
  if (page.image_path) {
    const b64 = await store.readPageImageBase64(page.image_path);
    if (b64) {
      return { mimeType: page.mime_type || "image/png", base64: b64 };
    }
  }
  return null;
}
