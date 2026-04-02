import { logger } from "./logger";

interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

interface CloudflareResponse {
  success: boolean;
  result: CloudflareZone[];
  errors: { message: string }[];
}

let cachedDomains: CloudflareZone[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function getAllowedDomains(): string[] | null {
  const raw = process.env.ALLOWED_DOMAINS;
  if (!raw?.trim()) return null;
  return raw.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
}

export async function getCloudfareDomains(): Promise<CloudflareZone[]> {
  const now = Date.now();
  if (cachedDomains && now < cacheExpiry) {
    return cachedDomains;
  }

  const allowedDomains = getAllowedDomains();
  const token = process.env.CLOUDFLARE_API_TOKEN;

  // If no CF token but ALLOWED_DOMAINS is set, use them directly
  if (!token) {
    if (allowedDomains && allowedDomains.length > 0) {
      logger.info({ allowedDomains }, "Using ALLOWED_DOMAINS without Cloudflare API");
      const domains = allowedDomains.map((name) => ({ id: name, name, status: "active" }));
      cachedDomains = domains;
      cacheExpiry = now + CACHE_TTL_MS;
      return domains;
    }
    logger.warn("CLOUDFLARE_API_TOKEN not set, falling back to MAIL_DOMAIN");
    const fallback = process.env.MAIL_DOMAIN ?? "localhost";
    return [{ id: "local", name: fallback, status: "active" }];
  }

  try {
    const res = await fetch(
      "https://api.cloudflare.com/client/v4/zones?status=active&per_page=50",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      logger.error({ status: res.status }, "Cloudflare API error");
      throw new Error(`Cloudflare API returned ${res.status}`);
    }

    const data = (await res.json()) as CloudflareResponse;

    if (!data.success) {
      logger.error({ errors: data.errors }, "Cloudflare API failure");
      throw new Error(data.errors[0]?.message ?? "Unknown Cloudflare error");
    }

    let domains = data.result.map((z) => ({
      id: z.id,
      name: z.name,
      status: z.status,
    }));

    // Filter by ALLOWED_DOMAINS if set
    if (allowedDomains && allowedDomains.length > 0) {
      domains = domains.filter((d) => allowedDomains.includes(d.name.toLowerCase()));
      logger.info({ allowedDomains, matched: domains.map((d) => d.name) }, "Filtered domains by ALLOWED_DOMAINS");
    }

    cachedDomains = domains;
    cacheExpiry = now + CACHE_TTL_MS;

    return cachedDomains;
  } catch (err) {
    logger.error({ err }, "Failed to fetch Cloudflare domains");
    if (allowedDomains && allowedDomains.length > 0) {
      return allowedDomains.map((name) => ({ id: name, name, status: "active" }));
    }
    const fallback = process.env.MAIL_DOMAIN ?? "localhost";
    return [{ id: "local", name: fallback, status: "active" }];
  }
}

export async function isValidDomain(domain: string): Promise<boolean> {
  const domains = await getCloudfareDomains();
  return domains.some((d) => d.name === domain);
}

export function invalidateDomainCache() {
  cachedDomains = null;
  cacheExpiry = 0;
}
