import { BookOpen } from "lucide-react";

export default function DocsPage() {
  const endpoints = [
    {
      method: "GET",
      path: "/api/mailboxes",
      desc: "List all active mailboxes",
      res: `{
  "mailboxes": [
    {
      "id": 1,
      "address": "test@tokito.me",
      "createdAt": "2024-01-01...",
      "messageCount": 5,
      "unreadCount": 2
    }
  ],
  "total": 1
}`
    },
    {
      method: "POST",
      path: "/api/mailboxes",
      desc: "Create a custom mailbox",
      req: `{ "localPart": "developer" }`,
      res: `{
  "id": 2,
  "address": "developer@tokito.me",
  ...
}`
    },
    {
      method: "GET",
      path: "/api/mailboxes/:address/messages",
      desc: "List messages in a mailbox",
      res: `{
  "messages": [
    {
      "id": 1,
      "subject": "Welcome",
      "fromAddress": "sender@example.com",
      "isRead": false,
      "receivedAt": "..."
    }
  ],
  "total": 1,
  "unread": 1
}`
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <BookOpen className="size-8 text-primary" />
          API Documentation
        </h1>
        <p className="text-muted-foreground">REST API reference for programmatic integration with tokito.me.</p>
      </div>

      <div className="prose prose-invert max-w-none">
        <p>
          All requests must include your API key in the <code>Authorization</code> header using the Bearer scheme.
          Base URL is <code>https://tokito.me</code>.
        </p>

        <div className="bg-[#1e1e1e] p-4 rounded-lg mt-4 border border-border">
          <code className="text-primary font-mono">Authorization: Bearer tm_xyz123</code>
        </div>
      </div>

      <div className="space-y-8 mt-8">
        {endpoints.map((ep, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-4">
              <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20 text-primary'
              }`}>
                {ep.method}
              </span>
              <code className="text-lg font-mono text-foreground font-semibold">{ep.path}</code>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-muted-foreground">{ep.desc}</p>
              
              {ep.req && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Request Body</h4>
                  <pre className="bg-[#1e1e1e] p-4 rounded-lg font-mono text-sm text-gray-300 overflow-x-auto">
                    {ep.req}
                  </pre>
                </div>
              )}
              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Response Example</h4>
                <pre className="bg-[#1e1e1e] p-4 rounded-lg font-mono text-sm text-primary/90 overflow-x-auto border border-primary/10">
                  {ep.res}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
