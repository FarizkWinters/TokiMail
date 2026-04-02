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

export async function getCloudfareDomains(): Promise<CloudflareZone[]> {
  const now = Date.now();
  if (cachedDomains && now < cacheExpiry) {
    return cachedDomains;
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    logger.warn("CLOUDFLARE_API_TOKEN not set, falling back to MAIL_DOMAIN");
    const fallback = process.env.MAIL_DOMAIN ?? "tokito.me";
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

    cachedDomains = data.result.map((z) => ({
      id: z.id,
      name: z.name,
      status: z.status,
    }));
    cacheExpiry = now + CACHE_TTL_MS;

    return cachedDomains;
  } catch (err) {
    logger.error({ err }, "Failed to fetch Cloudflare domains");
    const fallback = process.env.MAIL_DOMAIN ?? "tokito.me";
    return [{ id: "local", name: fallback, status: "active" }];
  }
}

export async function isValidDomain(domain: string): Promise<boolean> {
  const domains = await getCloudfareDomains();
  return domains.some((d) => d.name === domain);
}
