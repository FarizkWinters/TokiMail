import { useRoute, Link } from "wouter";
import { 
  useListMessages, 
  getListMessagesQueryKey, 
  useGetMailbox,
  useDeleteMessage,
  useMarkMessageRead,
  useDeleteMailbox
} from "@workspace/api-client-react";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowLeft, Copy, Trash2, RefreshCw, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function Inbox() {
  const [, params] = useRoute("/inbox/:address");
  const address = params?.address || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mailbox, isLoading: isMailboxLoading } = useGetMailbox(address, {
    query: { enabled: !!address }
  });

  const { data: messagesData, isLoading: isMessagesLoading, refetch } = useListMessages(address, {
    query: { 
      enabled: !!address,
      refetchInterval: 15000,
      queryKey: getListMessagesQueryKey(address)
    }
  });

  const deleteMessage = useDeleteMessage();
  const markRead = useMarkMessageRead();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    toast({ title: "Copied to clipboard" });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteMessage.mutate({ address, id }, {
      onSuccess: () => {
        toast({ title: "Message deleted" });
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(address) });
      }
    });
  };

  const handleMarkRead = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markRead.mutate({ address, id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(address) });
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          {isMailboxLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-semibold">{address}</span>
              <Button variant="ghost" size="icon" className="size-8" onClick={copyToClipboard}>
                <Copy className="size-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isMessagesLoading}>
            <RefreshCw className={`size-4 mr-2 ${isMessagesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        {isMessagesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : messagesData?.messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-muted/10">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="size-6 opacity-50" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">Inbox is empty</p>
            <p className="text-sm">Auto-refreshing every 15 seconds. Waiting for mail.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messagesData?.messages.map((msg) => (
              <Link key={msg.id} href={`/message/${address}/${msg.id}`} className="block">
                <div className={`p-4 border rounded-xl flex items-start gap-4 transition-all hover:border-primary/50 group ${
                  !msg.isRead 
                    ? "bg-primary/5 border-primary/20" 
                    : "bg-card border-border"
                }`}>
                  {!msg.isRead ? (
                    <div className="size-2 mt-2 rounded-full bg-primary shrink-0" />
                  ) : (
                    <div className="size-2 mt-2 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold truncate">
                          {msg.fromName ? `${msg.fromName} <${msg.fromAddress}>` : msg.fromAddress}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-4 font-mono">
                        {formatDistanceToNow(new Date(msg.receivedAt))} ago
                      </span>
                    </div>
                    <div className={`text-base truncate ${!msg.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {msg.subject || "(No Subject)"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!msg.isRead && (
                      <Button variant="ghost" size="icon" onClick={(e) => handleMarkRead(msg.id, e)} title="Mark as read">
                        <CheckCircle2 className="size-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(msg.id, e)}>
                      <Trash2 className="size-4" />
                    </Button>
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
