/**
 * Cloudflare Email Worker for TokiMail
 *
 * SETUP INSTRUCTIONS:
 * 1. Cloudflare Dashboard -> Workers & Pages -> Create a Worker
 * 2. Paste this script into the Worker editor
 * 3. Set environment variables in Worker settings:
 *    - WEBHOOK_SECRET: same as WEBHOOK_SECRET in your API server
 *    - API_URL: your deployed API URL (e.g. https://yourapp.up.railway.app/api/inbound)
 * 4. Deploy the Worker
 * 5. Cloudflare Dashboard -> Email -> Email Routing -> Catch-all -> Send to Worker
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

    const rawEmail = await streamToArrayBuffer(message.raw);
    const parsed = parseMime(rawEmail);

    const payload = {
      to: message.to.toLowerCase().trim(),
      from: parsed.fromAddress || message.from,
      fromName: parsed.fromName || null,
      subject: parsed.subject || "(No subject)",
      bodyText: parsed.bodyText || null,
      bodyHtml: parsed.bodyHtml || null,
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
        console.log(`Email to ${message.to} forwarded successfully`);
      }
    } catch (err) {
      console.error("Failed to forward email:", err);
    }
  },
};

async function streamToArrayBuffer(stream) {
  const reader = stream.getReader();
  const chunks = [];
  let totalLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function uint8ArrayToString(arr) {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(arr);
}

function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

function decodeBase64Content(str) {
  try {
    const cleaned = str.replace(/\s/g, "");
    const bytes = atob(cleaned);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i);
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(arr);
  } catch {
    return str;
  }
}

function decodeEncodedWord(str) {
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === "B") {
        const bytes = atob(text);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        return new TextDecoder(charset, { fatal: false }).decode(arr);
      } else {
        const decoded = text.replace(/_/g, " ");
        return decodeQuotedPrintable(decoded);
      }
    } catch {
      return text;
    }
  });
}

function parseContentType(headerValue) {
  if (!headerValue) return { type: "text/plain", params: {} };
  const parts = headerValue.split(";").map((s) => s.trim());
  const type = (parts[0] || "text/plain").toLowerCase();
  const params = {};
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf("=");
    if (eq === -1) continue;
    const key = parts[i].substring(0, eq).trim().toLowerCase();
    let val = parts[i].substring(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    params[key] = val;
  }
  return { type, params };
}

function parseHeaderBlock(headerText) {
  const headers = {};
  const lines = headerText.split(/\r?\n/);
  let currentKey = null;
  for (const line of lines) {
    if (/^[ \t]/.test(line) && currentKey) {
      headers[currentKey] += " " + line.trim();
    } else {
      const colon = line.indexOf(":");
      if (colon === -1) continue;
      currentKey = line.substring(0, colon).trim().toLowerCase();
      headers[currentKey] = line.substring(colon + 1).trim();
    }
  }
  return headers;
}

function decodeBody(body, encoding) {
  const enc = (encoding || "7bit").toLowerCase().trim();
  if (enc === "quoted-printable") return decodeQuotedPrintable(body);
  if (enc === "base64") return decodeBase64Content(body);
  return body;
}

function parsePart(partText) {
  const sepIdx = partText.search(/\r?\n\r?\n/);
  if (sepIdx === -1) return { headers: {}, body: partText };
  const headerText = partText.substring(0, sepIdx);
  const body = partText.substring(sepIdx).replace(/^\r?\n\r?\n/, "");
  return { headers: parseHeaderBlock(headerText), body };
}

function extractParts(body, boundary) {
  const delimiter = "--" + boundary;
  const parts = [];
  const lines = body.split(/\r?\n/);
  let currentPart = null;
  let inPart = false;

  for (const line of lines) {
    if (line.startsWith(delimiter + "--")) {
      if (currentPart !== null) parts.push(currentPart);
      break;
    } else if (line.startsWith(delimiter)) {
      if (currentPart !== null) parts.push(currentPart);
      currentPart = "";
      inPart = true;
    } else if (inPart && currentPart !== null) {
      currentPart += (currentPart === "" ? "" : "\n") + line;
    }
  }
  if (currentPart !== null && currentPart !== "") parts.push(currentPart);
  return parts;
}

function processNode(headers, body) {
  const ctRaw = headers["content-type"] || "text/plain";
  const { type, params } = parseContentType(ctRaw);
  const encoding = headers["content-transfer-encoding"];

  if (type.startsWith("multipart/")) {
    const boundary = params["boundary"];
    if (!boundary) return { bodyText: null, bodyHtml: null };
    const subParts = extractParts(body, boundary);
    let bodyText = null;
    let bodyHtml = null;

    for (const subPart of subParts) {
      const { headers: subHeaders, body: subBody } = parsePart(subPart);
      const result = processNode(subHeaders, subBody);
      if (result.bodyText && !bodyText) bodyText = result.bodyText;
      if (result.bodyHtml && !bodyHtml) bodyHtml = result.bodyHtml;
    }
    return { bodyText, bodyHtml };
  }

  const decoded = decodeBody(body, encoding);

  if (type === "text/html") {
    return { bodyText: null, bodyHtml: decoded };
  }
  if (type === "text/plain") {
    return { bodyText: decoded, bodyHtml: null };
  }
  return { bodyText: null, bodyHtml: null };
}

function parseMime(rawBytes) {
  const raw = uint8ArrayToString(rawBytes);
  const sepIdx = raw.search(/\r?\n\r?\n/);
  if (sepIdx === -1) return { subject: "", fromName: null, fromAddress: "", bodyText: raw, bodyHtml: null };

  const headerText = raw.substring(0, sepIdx);
  const body = raw.substring(sepIdx).replace(/^\r?\n\r?\n/, "");
  const headers = parseHeaderBlock(headerText);

  const subject = decodeEncodedWord(headers["subject"] || "");
  const fromHeader = headers["from"] || "";
  const fromName = extractFromName(fromHeader);
  const fromAddress = extractFromAddress(fromHeader);

  const { bodyText, bodyHtml } = processNode(headers, body);

  return { subject, fromName, fromAddress, bodyText, bodyHtml };
}

function extractFromName(fromHeader) {
  const match = fromHeader.match(/^"?([^"<@\n][^"<\n]*?)"?\s*</);
  return match ? decodeEncodedWord(match[1].trim()) : null;
}

function extractFromAddress(fromHeader) {
  const angleMatch = fromHeader.match(/<([^>]+)>/);
  if (angleMatch) return angleMatch[1].trim();
  const emailMatch = fromHeader.match(/[\w.+%-]+@[\w.-]+\.\w+/);
  return emailMatch ? emailMatch[0] : fromHeader.trim();
}
