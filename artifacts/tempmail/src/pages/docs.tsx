import { useState } from "react";
import { BookOpen, Copy, Check, Zap, Mail, Key, Trash2 } from "lucide-react";
import { useAppConfig } from "@/lib/use-app-config";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
      {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Badge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
    POST: "bg-green-500/15 text-green-400 border border-green-500/20",
    DELETE: "bg-red-500/15 text-red-400 border border-red-500/20",
    PATCH: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${colors[method] ?? ""}`}>
      {method}
    </span>
  );
}

interface Endpoint {
  method: string;
  path: string;
  desc: string;
  req?: string;
  res: string;
  note?: string;
}

interface Section {
  icon: React.ReactNode;
  title: string;
  endpoints: Endpoint[];
}

export default function DocsPage() {
  const config = useAppConfig();
  const baseUrl = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "https://yourdomain.com";

  const sections: Section[] = [
    {
      icon: <Mail className="size-4" />,
      title: "Mailboxes",
      endpoints: [
        {
          method: "POST",
          path: "/api/mailboxes/generate",
          desc: "Generate mailbox dengan alamat acak. Cocok untuk bot yang butuh email baru dengan cepat.",
          res: `{
  "id": 1,
  "address": "fastduck2763@yourdomain.com",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "messageCount": 0,
  "unreadCount": 0
}`,
        },
        {
          method: "POST",
          path: "/api/mailboxes",
          desc: "Buat mailbox dengan alamat kustom. Jika localPart dikosongkan, akan digenerate secara acak.",
          req: `{
  "localPart": "myuser",
  "domain": "yourdomain.com",
  "name": "Optional Display Name"
}`,
          res: `{
  "id": 2,
  "address": "myuser@yourdomain.com",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "messageCount": 0,
  "unreadCount": 0
}`,
        },
        {
          method: "GET",
          path: "/api/mailboxes",
          desc: "Daftar semua mailbox yang aktif beserta jumlah pesan dan unread.",
          res: `{
  "mailboxes": [
    {
      "id": 1,
      "address": "myuser@yourdomain.com",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "messageCount": 3,
      "unreadCount": 1
    }
  ],
  "total": 1
}`,
        },
        {
          method: "GET",
          path: "/api/mailboxes/:address",
          desc: "Info detail satu mailbox berdasarkan alamat email.",
          res: `{
  "id": 1,
  "address": "myuser@yourdomain.com",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "messageCount": 3,
  "unreadCount": 1
}`,
        },
        {
          method: "DELETE",
          path: "/api/mailboxes/:address",
          desc: "Hapus mailbox beserta semua pesannya. Tidak bisa dibatalkan.",
          res: `(204 No Content)`,
        },
      ],
    },
    {
      icon: <Zap className="size-4" />,
      title: "OTP & Messages",
      endpoints: [
        {
          method: "GET",
          path: "/api/mailboxes/:address/otp",
          desc: "Ambil OTP terbaru dari inbox. Poll endpoint ini sampai found: true. Cocok untuk bot otomasi — tidak perlu parsing manual.",
          note: "Poll tiap 2–5 detik. Endpoint memeriksa 10 pesan terbaru secara otomatis.",
          res: `// Ketika OTP sudah masuk:
{
  "found": true,
  "otp": "847291",
  "messageId": 42,
  "subject": "Your verification code is 847291",
  "from": "no-reply@service.com",
  "receivedAt": "2025-01-01T00:01:30.000Z"
}

// Ketika belum ada OTP:
{
  "found": false,
  "otp": null,
  "messageId": null,
  "subject": null,
  "from": null,
  "receivedAt": null
}`,
        },
        {
          method: "GET",
          path: "/api/mailboxes/:address/messages",
          desc: "Daftar semua pesan di mailbox. Diurutkan dari terlama ke terbaru.",
          res: `{
  "messages": [
    {
      "id": 1,
      "mailboxAddress": "myuser@yourdomain.com",
      "fromAddress": "noreply@service.com",
      "subject": "Your verification code",
      "receivedAt": "2025-01-01T00:01:30.000Z",
      "isRead": false,
      "hasHtml": true
    }
  ],
  "total": 1,
  "unread": 1
}`,
        },
        {
          method: "GET",
          path: "/api/mailboxes/:address/messages/:id",
          desc: "Detail satu pesan termasuk isi HTML dan plain text.",
          res: `{
  "id": 1,
  "mailboxAddress": "myuser@yourdomain.com",
  "fromAddress": "noreply@service.com",
  "subject": "Your verification code",
  "bodyText": "Your code is 847291. Valid for 10 minutes.",
  "bodyHtml": "<p>Your code is <b>847291</b>...</p>",
  "receivedAt": "2025-01-01T00:01:30.000Z",
  "isRead": false
}`,
        },
        {
          method: "PATCH",
          path: "/api/mailboxes/:address/messages/:id/read",
          desc: "Tandai pesan sebagai sudah dibaca.",
          res: `{
  "id": 1,
  "isRead": true,
  ...
}`,
        },
        {
          method: "DELETE",
          path: "/api/mailboxes/:address/messages/:id",
          desc: "Hapus satu pesan dari mailbox.",
          res: `(204 No Content)`,
        },
      ],
    },
    {
      icon: <Key className="size-4" />,
      title: "Domains & Utilities",
      endpoints: [
        {
          method: "GET",
          path: "/api/domains",
          desc: "Daftar domain yang tersedia untuk membuat mailbox.",
          res: `{
  "domains": [
    { "id": "abc123", "name": "yourdomain.com", "status": "active" }
  ]
}`,
        },
        {
          method: "GET",
          path: "/api/stats",
          desc: "Statistik layanan: total mailbox, pesan, dan domain utama.",
          res: `{
  "totalMailboxes": 42,
  "totalMessages": 187,
  "totalUnread": 5,
  "domain": "yourdomain.com"
}`,
        },
        {
          method: "GET",
          path: "/api/healthz",
          desc: "Health check untuk monitoring uptime.",
          res: `{ "status": "ok" }`,
        },
      ],
    },
  ];

  const botExamplePython = `import requests, time

BASE = "${baseUrl}/api"
API_KEY = "tmk_your_api_key_here"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

def get_temp_email() -> str:
    r = requests.post(f"{BASE}/mailboxes/generate", headers=HEADERS)
    return r.json()["address"]

def wait_for_otp(email: str, timeout: int = 60) -> str | None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(f"{BASE}/mailboxes/{email}/otp", headers=HEADERS)
        data = r.json()
        if data["found"]:
            return data["otp"]
        time.sleep(3)
    return None

# Contoh penggunaan
email = get_temp_email()
print(f"Email: {email}")

# Daftarkan email ke layanan target...

otp = wait_for_otp(email, timeout=120)
print(f"OTP: {otp}")`;

  const botExampleNode = `const BASE = "${baseUrl}/api";
const API_KEY = "tmk_your_api_key_here";
const headers = { Authorization: \`Bearer \${API_KEY}\` };

async function getTempEmail() {
  const res = await fetch(\`\${BASE}/mailboxes/generate\`, { method: "POST", headers });
  return (await res.json()).address;
}

async function waitForOTP(email, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(\`\${BASE}/mailboxes/\${email}/otp\`, { headers });
    const data = await res.json();
    if (data.found) return data.otp;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

// Contoh: 3 akun sekaligus secara parallel
const emails = await Promise.all(
  Array.from({ length: 3 }, () => getTempEmail())
);
console.log("Emails:", emails);

// Daftarkan semua email ke layanan target...

const otps = await Promise.all(emails.map((e) => waitForOTP(e)));
console.log("OTPs:", Object.fromEntries(emails.map((e, i) => [e, otps[i]])));`;

  const [activeLang, setActiveLang] = useState<"python" | "node">("python");

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1.5 flex items-center gap-2.5">
          <BookOpen className="size-6 text-primary" />
          API Documentation
        </h1>
        <p className="text-muted-foreground text-sm">
          REST API reference untuk integrasi programatik dengan {config.appName}.
        </p>
      </div>

      {/* Auth */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-sm">Autentikasi</h2>
        <p className="text-muted-foreground text-sm">
          Sertakan API key di setiap request menggunakan header <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code>.
        </p>
        <div className="bg-background border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <code className="text-primary font-mono text-sm">Authorization: Bearer tmk_your_api_key</code>
          <CopyButton text="Authorization: Bearer tmk_your_api_key" />
        </div>
        <p className="text-muted-foreground text-xs">
          Base URL: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{baseUrl}</code>
        </p>
      </div>

      {/* Bot Example */}
      <div className="bg-card border border-primary/20 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <span className="font-semibold text-sm">Contoh Integrasi Bot</span>
          </div>
          <div className="flex items-center gap-1 bg-background rounded-lg p-1 border border-border">
            <button
              onClick={() => setActiveLang("python")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeLang === "python" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Python
            </button>
            <button
              onClick={() => setActiveLang("node")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeLang === "node" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Node.js
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute top-3 right-3 z-10">
            <CopyButton text={activeLang === "python" ? botExamplePython : botExampleNode} />
          </div>
          <pre className="p-5 font-mono text-xs text-gray-300 overflow-x-auto leading-relaxed">
            {activeLang === "python" ? botExamplePython : botExampleNode}
          </pre>
        </div>
      </div>

      {/* Endpoint Sections */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {section.icon}
            {section.title}
          </div>
          <div className="space-y-3">
            {section.endpoints.map((ep, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border bg-muted/10 flex items-center gap-3">
                  <Badge method={ep.method} />
                  <code className="font-mono text-sm text-foreground">{ep.path}</code>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-muted-foreground text-sm">{ep.desc}</p>

                  {ep.note && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 text-xs text-primary/90">
                      💡 {ep.note}
                    </div>
                  )}

                  {ep.req && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Request Body</h4>
                      <div className="relative">
                        <div className="absolute top-2.5 right-2.5">
                          <CopyButton text={ep.req} />
                        </div>
                        <pre className="bg-background border border-border rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto">
                          {ep.req}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Response</h4>
                    <div className="relative">
                      <div className="absolute top-2.5 right-2.5">
                        <CopyButton text={ep.res} />
                      </div>
                      <pre className="bg-background border border-primary/10 rounded-lg p-4 font-mono text-xs text-primary/80 overflow-x-auto">
                        {ep.res}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer note */}
      <div className="border-t border-border pt-6 text-xs text-muted-foreground space-y-1">
        <p>Semua response menggunakan format JSON. Error dikembalikan sebagai <code className="font-mono bg-muted px-1 rounded">{"{ \"error\": \"pesan error\" }"}</code>.</p>
        <p>HTTP status: <code className="font-mono bg-muted px-1 rounded">200</code> sukses · <code className="font-mono bg-muted px-1 rounded">201</code> dibuat · <code className="font-mono bg-muted px-1 rounded">204</code> dihapus · <code className="font-mono bg-muted px-1 rounded">401</code> tidak terautentikasi · <code className="font-mono bg-muted px-1 rounded">404</code> tidak ditemukan · <code className="font-mono bg-muted px-1 rounded">409</code> konflik.</p>
      </div>
    </div>
  );
}
