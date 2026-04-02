/**
 * Cloudflare Email Worker for tokito.me TempMail
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard -> Workers & Pages -> Create a Worker
 * 2. Paste this script into the Worker editor
 * 3. Set environment variables in the Worker settings:
 *    - WEBHOOK_SECRET: Your secret (same as WEBHOOK_SECRET in your API server)
 *    - API_URL: Your deployed API URL (e.g. https://yourapp.replit.app/api/inbound)
 * 4. Deploy the Worker
 * 5. Go to Cloudflare Dashboard -> Email -> Email Routing -> Routes
 * 6. Add a Catch-all rule: "Send to Worker" -> select your deployed worker
 *    (Make sure to REMOVE or keep below your existing Gmail rule, or change to catch-all)
 *
 * HOW IT WORKS:
 * - Any email sent to *@tokito.me triggers this Worker
 * - The Worker forwards the email to your API server via webhook
 * - Your API stores the email so it can be read on the website
 */

export default {
  async email(message, env, ctx) {
    const webhookUrl = env.API_URL;
    const webhookSecret = env.WEBHOOK_SECRET;

    if (!webhookUrl) {
      console.error("API_URL environment variable is not set");
      message.setReject("Configuration error");
      return;
    }

    // Parse the email using the PostalMime-compatible API
    // Cloudflare provides message.raw as a ReadableStream
    const rawEmail = await streamToText(message.raw);

    // Parse basic fields
    const to = message.to;
    const from = message.from;

    // Parse headers to get subject and from name
    const headers = parseHeaders(rawEmail);
    const subject = headers["subject"] || "(No subject)";
    const fromHeader = headers["from"] || from;
    const fromName = parseFromName(fromHeader);
    const fromAddress = parseFromAddress(fromHeader) || from;

    // Get body parts
    const { bodyText, bodyHtml } = parseBody(rawEmail);

    // Build the webhook payload
    const payload = {
      to: to.toLowerCase().trim(),
      from: fromAddress,
      fromName: fromName || null,
      subject,
      bodyText: bodyText || null,
      bodyHtml: bodyHtml || null,
      secret: webhookSecret || "",
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Webhook failed: ${response.status} - ${text}`);
      } else {
        console.log(`Email to ${to} forwarded successfully`);
      }
    } catch (err) {
      console.error("Failed to forward email:", err);
    }
  },
};

async function streamToText(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(combined);
}

function parseHeaders(rawEmail) {
  const headers = {};
  const headerSection = rawEmail.split(/\r?\n\r?\n/)[0] || "";
  const lines = headerSection.split(/\r?\n/);
  let currentKey = null;
  for (const line of lines) {
    if (/^\s+/.test(line) && currentKey) {
      headers[currentKey] += " " + line.trim();
    } else {
      const match = line.match(/^([^:]+):\s*(.*)/);
      if (match) {
        currentKey = match[1].toLowerCase();
        headers[currentKey] = match[2];
      }
    }
  }
  return headers;
}

function parseFromName(fromHeader) {
  const match = fromHeader.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : null;
}

function parseFromAddress(fromHeader) {
  const angleMatch = fromHeader.match(/<([^>]+)>/);
  if (angleMatch) return angleMatch[1];
  const emailMatch = fromHeader.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return emailMatch ? emailMatch[0] : null;
}

function parseBody(rawEmail) {
  const parts = rawEmail.split(/\r?\n\r?\n/);
  if (parts.length < 2) return { bodyText: null, bodyHtml: null };

  const headerSection = parts[0] || "";
  const contentTypeMatch = headerSection.match(/content-type:\s*([^\r\n;]+)/i);
  const contentType = contentTypeMatch ? contentTypeMatch[1].trim().toLowerCase() : "text/plain";

  if (contentType === "text/plain") {
    return { bodyText: parts.slice(1).join("\n\n"), bodyHtml: null };
  }

  if (contentType === "text/html") {
    return { bodyText: null, bodyHtml: parts.slice(1).join("\n\n") };
  }

  if (contentType.includes("multipart/")) {
    const boundaryMatch = headerSection.match(/boundary="?([^"\r\n]+)"?/i);
    if (!boundaryMatch) return { bodyText: parts.slice(1).join("\n\n"), bodyHtml: null };
    const boundary = boundaryMatch[1];
    const body = parts.slice(1).join("\n\n");
    const partRegex = new RegExp(`--${escapeRegex(boundary)}(--)?([\\s\\S]*?)(?=--${escapeRegex(boundary)}|$)`, "g");
    let bodyText = null;
    let bodyHtml = null;
    let match;
    while ((match = partRegex.exec(body)) !== null) {
      const partContent = match[2] || "";
      const partHeaderEnd = partContent.indexOf("\n\n");
      if (partHeaderEnd === -1) continue;
      const partHeaders = partContent.substring(0, partHeaderEnd).toLowerCase();
      const partBody = partContent.substring(partHeaderEnd + 2);
      if (partHeaders.includes("text/plain") && !bodyText) {
        bodyText = partBody.trim();
      } else if (partHeaders.includes("text/html") && !bodyHtml) {
        bodyHtml = partBody.trim();
      }
    }
    return { bodyText, bodyHtml };
  }

  return { bodyText: parts.slice(1).join("\n\n"), bodyHtml: null };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
