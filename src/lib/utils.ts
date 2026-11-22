import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DocumentRecord } from "@/types/kashfara";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Strips heavy base64 image_url payloads before sending a DocumentRecord to
 * server reasoning endpoints, keeping API payloads tiny and fast.
 */
export function stripPageImagesForApi(doc: DocumentRecord): DocumentRecord {
  return {
    ...doc,
    pages: doc.pages.map((p) => ({
      ...p,
      image_url: undefined,
      image_path: undefined,
    })),
  };
}

/**
 * Re-attaches client-side image_url previews after receiving a processed
 * DocumentRecord back from the server.
 */
export function mergePageImagesFromClient(
  serverDoc: DocumentRecord,
  clientDoc: DocumentRecord
): DocumentRecord {
  const imageMap = new Map(clientDoc.pages.map((p) => [p.page_number, p.image_url]));
  return {
    ...serverDoc,
    pages: serverDoc.pages.map((p) => ({
      ...p,
      image_url: p.image_url || imageMap.get(p.page_number),
    })),
  };
}
