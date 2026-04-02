import { useState } from "react";
import { useListApiKeys, getListApiKeysQueryKey, useCreateApiKey, useDeleteApiKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Copy, KeyRound, Plus, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function KeysPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data, isLoading } = useListApiKeys({
    query: { queryKey: getListApiKeysQueryKey() }
  });

  const createKey = useCreateApiKey();
  const deleteKey = useDeleteApiKey();

  const handleCreate = () => {
    if (!name.trim()) return;
    createKey.mutate({ data: { name: name.trim() } }, {
      onSuccess: (res) => {
        setNewKey((res as any).key); // The type includes key on creation
        setName("");
        queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
        toast({ title: "API Key created" });
      },
      onError: () => {
        toast({ title: "Failed to create key", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteKey.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "API Key deleted" });
        if (newKey) setNewKey(null);
        queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">API Keys</h1>
        <p className="text-muted-foreground">Manage keys for programmatic access to the TempMail API.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Create New Key</h2>
        <div className="flex items-center gap-3">
          <Input 
            placeholder="Key description (e.g. CI/CD Runner)" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="max-w-md"
          />
          <Button onClick={handleCreate} disabled={!name.trim() || createKey.isPending}>
            <Plus className="size-4 mr-2" />
            Generate Key
          </Button>
        </div>
      </div>

      {newKey && (
        <div className="bg-primary/10 border border-primary text-primary-foreground rounded-xl p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-6 text-primary shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-lg text-primary mb-1">Store this key safely</h3>
              <p className="text-sm opacity-90 text-primary/80 mb-4">
                This is the only time the full API key will be displayed. You will not be able to view it again.
              </p>
              <div className="flex items-center gap-2 bg-background/50 border border-primary/30 rounded p-3 text-foreground">
                <code className="flex-1 font-mono font-medium text-lg tracking-wider">{newKey}</code>
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(newKey)} className="bg-primary text-black hover:bg-primary/80">
                  <Copy className="size-4 mr-2" /> Copy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Active Keys</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : data?.keys.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <KeyRound className="size-8 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">No API keys generated yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Prefix</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last Used</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.keys.map((k) => (
                  <tr key={k.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{k.keyPrefix}...</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(k.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {k.lastUsedAt ? format(new Date(k.lastUsedAt), "MMM d, yyyy") : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(k.id)} disabled={deleteKey.isPending}>
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-12 bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-2">Using the API</h3>
        <p className="text-muted-foreground text-sm mb-4">Pass your API key in the Authorization header to authenticate requests.</p>
        <div className="bg-[#1e1e1e] p-4 rounded-lg overflow-x-auto text-gray-300 font-mono text-sm">
          <pre><code>{`curl -X GET https://tokito.me/api/mailboxes \\
  -H "Authorization: Bearer tm_your_api_key_here"`}</code></pre>
        </div>
      </div>
    </div>
  );
}
