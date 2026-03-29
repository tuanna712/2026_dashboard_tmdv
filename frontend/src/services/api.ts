import type { ApiEnvelope } from "@/types/api";

const base = import.meta.env.VITE_API_URL || "";

async function parseEnvelope<T>(res: Response): Promise<T> {
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(res.statusText || "Invalid response");
  }
  const body = json as ApiEnvelope<T> | { detail?: unknown };
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "message" in body && typeof body.message === "string"
        ? body.message
        : res.statusText;
    const errs =
      typeof body === "object" && body && "errors" in body && Array.isArray(body.errors)
        ? (body.errors as string[]).join("; ")
        : "";
    throw new Error(errs || msg);
  }
  if (
    typeof body === "object" &&
    body &&
    "data" in body &&
    "message" in body &&
    "errors" in body
  ) {
    return (body as ApiEnvelope<T>).data;
  }
  throw new Error("Invalid API response shape");
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" },
  });
  return parseEnvelope<T>(res);
}
