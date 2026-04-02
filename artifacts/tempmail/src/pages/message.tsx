import { useRoute, Link, useLocation } from "wouter";
import { useGetMessage, useDeleteMessage, useMarkMessageRead, getListMessagesQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Trash2, Code2, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function MessageView() {
  const [, params] = useRoute("/message/:address/:id");
  const address = params?.address || "";
  const id = Number(params?.id) || 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: msg, isLoading } = useGetMessage(address, id, {
    query: { enabled: !!(address && id) }
  });

  const markRead = useMarkMessageRead();
  const deleteMessage = useDeleteMessage();
  
  const markedRef = useRef(false);

  useEffect(() => {
    if (msg && !msg.isRead && !markedRef.current) {
      markedRef.current = true;
      markRead.mutate({ address, id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(address) });
        }
      });
    }
  }, [msg, address, id, markRead, queryClient]);

  const handleDelete = () => {
    deleteMessage.mutate({ address, id }, {
      onSuccess: () => {
        toast({ title: "Message deleted" });
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(address) });
        setLocation(`/inbox/${address}`);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full mt-8" />
      </div>
    );
  }

  if (!msg) {
    return <div className="p-8 text-center text-muted-foreground">Message not found</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <Link href={`/inbox/${address}`}>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="text-sm font-mono text-muted-foreground hidden sm:block">
            {address}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
            <Trash2 className="size-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {msg.subject || "(No Subject)"}
            </h1>
            
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">From</div>
                <div className="font-medium flex items-center gap-2">
                  {msg.fromName && <span>{msg.fromName}</span>}
                  <span className="text-muted-foreground font-mono text-sm">&lt;{msg.fromAddress}&gt;</span>
                </div>
              </div>
              <div className="sm:text-right">
                <div className="text-sm text-muted-foreground mb-1">Received</div>
                <div className="font-mono text-sm">
                  {format(new Date(msg.receivedAt), "MMM d, yyyy HH:mm:ss")}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            <Tabs defaultValue={msg.bodyHtml ? "html" : "text"} className="w-full">
              <div className="border-b border-border px-4 py-2 bg-muted/20 flex items-center justify-between">
                <TabsList className="bg-transparent space-x-2">
                  {msg.bodyHtml && (
                    <TabsTrigger value="html" className="data-[state=active]:bg-background data-[state=active]:text-primary border border-transparent data-[state=active]:border-border shadow-none">
                      <ExternalLink className="size-4 mr-2" /> HTML
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="text" className="data-[state=active]:bg-background data-[state=active]:text-primary border border-transparent data-[state=active]:border-border shadow-none">
                    <FileText className="size-4 mr-2" /> Plain Text
                  </TabsTrigger>
                  {msg.bodyHtml && (
                    <TabsTrigger value="source" className="data-[state=active]:bg-background data-[state=active]:text-primary border border-transparent data-[state=active]:border-border shadow-none">
                      <Code2 className="size-4 mr-2" /> Source
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              
              <div className="p-0 bg-white dark:bg-[#0a0a0a]">
                {msg.bodyHtml && (
                  <TabsContent value="html" className="m-0 p-4 min-h-[400px]">
                    <iframe 
                      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                      srcDoc={msg.bodyHtml}
                      className="w-full min-h-[600px] border-0 bg-white"
                      title="Email HTML Content"
                    />
                  </TabsContent>
                )}
                <TabsContent value="text" className="m-0 p-6 min-h-[400px]">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-foreground/90 font-sans">
                    {msg.bodyText || "No plain text content."}
                  </pre>
                </TabsContent>
                {msg.bodyHtml && (
                  <TabsContent value="source" className="m-0 p-0 min-h-[400px]">
                    <div className="bg-[#1e1e1e] p-4 text-gray-300 font-mono text-xs overflow-x-auto rounded-b-xl">
                      <pre><code>{msg.bodyHtml}</code></pre>
                    </div>
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
