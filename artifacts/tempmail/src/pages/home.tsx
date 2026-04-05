import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Copy, Plus, RefreshCw, Mail as MailIcon, Trash2, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  useListMailboxes, 
  getListMailboxesQueryKey, 
  useCreateMailbox, 
  useGenerateMailbox,
  useGetStats,
  useDeleteMailbox,
  useListDomains,
  getListDomainsQueryKey,
} from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addressInput, setAddressInput] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [showDomainPicker, setShowDomainPicker] = useState(false);

  const { data: domainsData } = useListDomains({
    query: { queryKey: getListDomainsQueryKey() }
  });

  const domains = domainsData?.domains ?? [];
  const activeDomain = selectedDomain || domains[0]?.name || "tokito.me";

  const { data: mailboxesData, isLoading, refetch } = useListMailboxes({ 
    query: { 
      queryKey: getListMailboxesQueryKey(),
      refetchInterval: 15000 
    } 
  });
  
  const { data: stats } = useGetStats();

  const createMailbox = useCreateMailbox();
  const generateMailbox = useGenerateMailbox();
  const deleteMailbox = useDeleteMailbox();

  const isFullAddress = addressInput.includes("@");
  const trimmed = addressInput.trim();
  const resolvedAddress = isFullAddress ? trimmed : (trimmed ? `${trimmed}@${activeDomain}` : "");
  const mode: "idle" | "create" | "open" = !trimmed ? "idle" : isFullAddress ? "open" : "create";

  const handleSubmit = () => {
    if (mode === "open") {
      setLocation(`/inbox/${resolvedAddress}`);
    } else if (mode === "create") {
      const parts = resolvedAddress.split("@");
      const localPart = parts[0] ?? "";
      const domain = parts[1] ?? activeDomain;
      createMailbox.mutate({ data: { localPart, domain } }, {
        onSuccess: (data) => {
          toast({ title: "Mailbox created" });
          queryClient.invalidateQueries({ queryKey: getListMailboxesQueryKey() });
          setLocation(`/inbox/${data.address}`);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          toast({ title: msg ?? "Failed to create mailbox", variant: "destructive" });
        }
      });
    }
  };

  const handleGenerate = () => {
    generateMailbox.mutate({ domain: activeDomain }, {
      onSuccess: (data) => {
        toast({ title: "Mailbox generated" });
        queryClient.invalidateQueries({ queryKey: getListMailboxesQueryKey() });
        setLocation(`/inbox/${data.address}`);
      }
    });
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleDelete = (address: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteMailbox.mutate({ address }, {
      onSuccess: () => {
        toast({ title: "Mailbox deleted" });
        queryClient.invalidateQueries({ queryKey: getListMailboxesQueryKey() });
      }
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Mailboxes</h1>
        <p className="text-muted-foreground text-base">
          Create throwaway addresses instantly. Disposable infrastructure for testing.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Smart unified input */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === "open" ? "Open Inbox" : "Custom Address"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "open"
                ? "Navigate directly to an existing mailbox"
                : "Type a username to create, or paste a full address to open"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="username or full@address.com"
                className="font-mono pr-3"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {/* Domain picker — only show when not full address mode */}
            {!isFullAddress && domains.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowDomainPicker(!showDomainPicker)}
                  className="flex items-center gap-1.5 h-10 px-3 border border-border rounded-md bg-muted/50 font-mono text-sm text-primary hover:bg-muted transition-colors whitespace-nowrap"
                >
                  @{activeDomain}
                  <ChevronDown className={`size-3 transition-transform ${showDomainPicker ? 'rotate-180' : ''}`} />
                </button>
                {showDomainPicker && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[180px]">
                    {domains.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => { setSelectedDomain(d.name); setShowDomainPicker(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-mono hover:bg-muted/50 transition-colors text-left ${activeDomain === d.name ? 'text-primary bg-primary/5' : 'text-foreground'}`}
                      >
                        @{d.name}
                        {activeDomain === d.name && <span className="size-1.5 rounded-full bg-primary ml-2" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={mode === "idle" || createMailbox.isPending}
              variant={mode === "open" ? "outline" : "default"}
            >
              {mode === "open" ? "Open" : "Create"}
            </Button>
          </div>

          {/* Preview */}
          <div className="text-xs font-mono">
            {mode === "create" && (
              <span className="text-muted-foreground">
                Will create: <span className="text-primary">{resolvedAddress}</span>
              </span>
            )}
            {mode === "open" && (
              <span className="text-muted-foreground">
                Will open: <span className="text-primary">{resolvedAddress}</span>
              </span>
            )}
            {mode === "idle" && (
              <span className="text-muted-foreground">yourname@{activeDomain}</span>
            )}
          </div>
        </div>

        {/* Random Address */}
        <div className="bg-card border border-primary/20 rounded-xl p-6 shadow-sm flex flex-col items-start justify-center relative overflow-hidden">
          <div className="absolute -right-12 -top-12 size-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-lg font-semibold mb-2">Random Address</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate an instantly available inbox at{" "}
            {domains.length > 1 ? (
              <span className="font-mono text-primary">@{activeDomain}</span>
            ) : (
              <span className="font-mono text-primary">@{activeDomain}</span>
            )}.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generateMailbox.isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4 mr-2" />
            Generate New Mailbox
          </Button>
        </div>
      </div>

      <div className="border-y border-border py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <div className="shrink-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-mono">Available Domains</div>
          <div className="flex flex-wrap gap-1.5">
            {domains.length > 0
              ? domains.map(d => (
                  <span key={d.id} className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-full font-mono text-xs font-medium">
                    @{d.name}
                  </span>
                ))
              : <span className="font-mono text-sm text-primary">@{stats?.domain}</span>
            }
          </div>
        </div>
        <div className="hidden sm:block w-px h-8 bg-border" />
        <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
          <span>✓ No registration required</span>
          <span>✓ Auto-delete after 7 days</span>
          <span>✓ Private &amp; anonymous</span>
          <span>✓ OTP auto-detection</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Active Mailboxes</h3>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`size-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : mailboxesData?.mailboxes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/20">
            <MailIcon className="size-8 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">No mailboxes active.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mailboxesData?.mailboxes.map((mailbox) => (
              <Link key={mailbox.id} href={`/inbox/${mailbox.address}`} className="block group">
                <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded bg-muted flex items-center justify-center">
                      <MailIcon className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-mono font-medium flex items-center gap-2">
                        {mailbox.address}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => copyToClipboard(mailbox.address, e)}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span>Created {formatDistanceToNow(new Date(mailbox.createdAt))} ago</span>
                        {mailbox.lastActivity && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span>Last activity: {formatDistanceToNow(new Date(mailbox.lastActivity))} ago</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono">{mailbox.messageCount}</span> msgs
                      </div>
                      {mailbox.unreadCount > 0 && (
                        <div className="flex items-center gap-1.5 text-primary font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                          </span>
                          {mailbox.unreadCount} unread
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDelete(mailbox.address, e)}
                        disabled={deleteMailbox.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <div className="size-8 rounded flex items-center justify-center bg-primary/10 text-primary">
                        <ArrowRight className="size-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
