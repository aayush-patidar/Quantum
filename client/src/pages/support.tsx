import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  Send,
  Loader2,
  MessageSquare,
  TicketCheck,
} from "lucide-react";
import type { SupportTicket, SupportMessage } from "@shared/schema";

const newTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  category: z.string().min(1, "Category is required"),
});

type NewTicketForm = z.infer<typeof newTicketSchema>;

function getStatusBadge(status: string) {
  switch (status) {
    case "open":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate" data-testid={`badge-status-${status}`}>Open</Badge>;
    case "in_progress":
      return <Badge className="bg-yellow-600 text-white no-default-hover-elevate" data-testid={`badge-status-${status}`}>In Progress</Badge>;
    case "resolved":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid={`badge-status-${status}`}>Resolved</Badge>;
    case "closed":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Closed</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "low":
      return <Badge variant="secondary" data-testid={`badge-priority-${priority}`}>Low</Badge>;
    case "medium":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate" data-testid={`badge-priority-${priority}`}>Medium</Badge>;
    case "high":
      return <Badge className="bg-orange-600 text-white no-default-hover-elevate" data-testid={`badge-priority-${priority}`}>High</Badge>;
    case "critical":
      return <Badge variant="destructive" data-testid={`badge-priority-${priority}`}>Critical</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-priority-${priority}`}>{priority}</Badge>;
  }
}

interface TicketWithMessages extends SupportTicket {
  messages: SupportMessage[];
}

function TicketThread({ ticketId }: { ticketId: string }) {
  const { toast } = useToast();
  const [replyMessage, setReplyMessage] = useState("");

  const { data: ticket, isLoading } = useQuery<TicketWithMessages>({
    queryKey: ["/api/support/tickets", ticketId],
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/support/tickets/${ticketId}/messages`, {
        message: replyMessage,
      });
      return res.json();
    },
    onSuccess: () => {
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", ticketId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="flex flex-col h-full" data-testid="ticket-thread">
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold" data-testid="text-ticket-subject">{ticket.subject}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {getStatusBadge(ticket.status)}
          {getPriorityBadge(ticket.priority)}
          <Badge variant="outline" data-testid="badge-ticket-category">{ticket.category}</Badge>
          <span className="text-xs text-muted-foreground" data-testid="text-ticket-created">
            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {ticket.messages?.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isStaff ? "justify-start" : "justify-end"}`}
              data-testid={`message-${msg.id}`}
            >
              <div
                className={`max-w-[80%] rounded-md p-3 ${
                  msg.isStaff ? "bg-muted" : "bg-primary text-primary-foreground"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-medium" data-testid={`text-message-sender-${msg.id}`}>
                    {msg.isStaff ? "Support Staff" : "You"}
                  </span>
                  <span className="text-xs opacity-70" data-testid={`text-message-time-${msg.id}`}>
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm" data-testid={`text-message-content-${msg.id}`}>{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Type your reply..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && replyMessage.trim() && sendMessage.mutate()}
            data-testid="input-reply"
          />
          <Button
            onClick={() => sendMessage.mutate()}
            disabled={sendMessage.isPending || !replyMessage.trim()}
            data-testid="button-send-reply"
          >
            {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const { toast } = useToast();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets"],
  });

  const form = useForm<NewTicketForm>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
      category: "general",
    },
  });

  const createTicket = useMutation({
    mutationFn: async (data: NewTicketForm) => {
      const res = await apiRequest("POST", "/api/support/tickets", data);
      return res.json();
    },
    onSuccess: (ticket: SupportTicket) => {
      setDialogOpen(false);
      form.reset();
      setSelectedTicketId(ticket.id);
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      toast({ title: "Ticket created", description: "Your support ticket has been submitted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col h-full" data-testid="page-support">
      <div className="p-6 pb-0">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Support</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">Get help with your quantum computing workflows</p>
      </div>

      <div className="flex flex-1 min-h-0 p-6 gap-4">
        <Card className="w-80 flex-shrink-0 flex flex-col" data-testid="card-ticket-list">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Tickets</CardTitle>
            <Button size="sm" onClick={() => setDialogOpen(true)} data-testid="button-new-ticket">
              <Plus className="w-4 h-4 mr-1" />
              New Ticket
            </Button>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" data-testid={`skeleton-ticket-${i}`} />
                  ))}
                </div>
              ) : tickets && tickets.length > 0 ? (
                <div className="space-y-1 p-2">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`w-full text-left rounded-md p-3 transition-colors ${
                        selectedTicketId === ticket.id
                          ? "bg-accent"
                          : "hover-elevate"
                      }`}
                      data-testid={`button-ticket-${ticket.id}`}
                    >
                      <p className="text-sm font-medium truncate" data-testid={`text-ticket-subject-${ticket.id}`}>
                        {ticket.subject}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-ticket-date-${ticket.id}`}>
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <TicketCheck className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center" data-testid="text-no-tickets">
                    No support tickets yet
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col" data-testid="card-ticket-detail">
          {selectedTicketId ? (
            <TicketThread ticketId={selectedTicketId} />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground" data-testid="text-select-ticket">Select a ticket to view the conversation</p>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-new-ticket">
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
            <DialogDescription>Describe your issue and we will get back to you</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createTicket.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-ticket-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-ticket-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="backend">Backend</SelectItem>
                          <SelectItem value="account">Account</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createTicket.isPending} data-testid="button-submit-ticket">
                  {createTicket.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Submit Ticket
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}