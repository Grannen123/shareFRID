/**
 * EmailPanel Component
 *
 * Displays and manages Outlook emails, with filtering by customer contacts.
 */

import { useState } from "react";
import {
  Mail,
  MailOpen,
  Paperclip,
  ExternalLink,
  ChevronLeft,
  RefreshCw,
  Send,
  Loader2,
  AlertCircle,
  Star,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  ScrollArea,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import {
  useEmails,
  useEmail,
  useSendEmail,
  useMarkEmailAsRead,
  useCustomerEmails,
  type GraphEmail,
} from "@/hooks/useGraphApi";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { sv } from "date-fns/locale";

interface EmailPanelProps {
  contactEmails?: string[];
  title?: string;
  showCompose?: boolean;
}

export function EmailPanel({
  contactEmails = [],
  title = "E-post",
  showCompose = true,
}: EmailPanelProps) {
  const { isMicrosoftConnected } = useAuth();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  // Queries
  const {
    data: allEmails,
    isLoading: isLoadingAll,
    refetch: refetchAll,
  } = useEmails({
    top: 50,
    search: searchQuery || undefined,
  });

  const {
    data: customerEmails,
    isLoading: isLoadingCustomer,
    refetch: refetchCustomer,
  } = useCustomerEmails(contactEmails, 50);

  const { data: selectedEmail, isLoading: isLoadingEmail } =
    useEmail(selectedEmailId);
  const sendEmail = useSendEmail();
  const markAsRead = useMarkEmailAsRead();

  // Determine which emails to show
  const emails = contactEmails.length > 0 ? customerEmails : allEmails;
  const isLoading = contactEmails.length > 0 ? isLoadingCustomer : isLoadingAll;
  const refetch = contactEmails.length > 0 ? refetchCustomer : refetchAll;

  // Handle email selection
  const handleSelectEmail = async (email: GraphEmail) => {
    setSelectedEmailId(email.id);
    if (!email.isRead) {
      await markAsRead.mutateAsync(email.id);
    }
  };

  // Handle send email
  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject) return;

    try {
      await sendEmail.mutateAsync({
        subject: composeData.subject,
        body: composeData.body,
        toRecipients: composeData.to.split(",").map((e) => e.trim()),
      });

      setIsComposeOpen(false);
      setComposeData({ to: "", subject: "", body: "" });
      refetch();
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  // Not connected to Microsoft
  if (!isMicrosoftConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">
              Microsoft-konto krävs
            </h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Anslut ditt Microsoft-konto för att se e-post från Outlook.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show selected email
  if (selectedEmail) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedEmailId(null)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="flex-1 truncate text-base">
              {selectedEmail.subject}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(selectedEmail.webLink, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEmail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedEmail.from.emailAddress.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedEmail.from.emailAddress.address}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  {format(new Date(selectedEmail.receivedDateTime), "PPp", {
                    locale: sv,
                  })}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Till:{" "}
                {selectedEmail.toRecipients
                  .map((r) => r.emailAddress.address)
                  .join(", ")}
              </div>
              {selectedEmail.hasAttachments && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Paperclip className="h-4 w-4" />
                  <span>Har bilagor</span>
                </div>
              )}
              <div className="border-t pt-4">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: selectedEmail.body.content,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {title}
            {contactEmails.length > 0 && (
              <Badge variant="default">{contactEmails.length} kontakter</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {showCompose && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsComposeOpen(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Skriv
              </Button>
            )}
          </div>
        </div>

        {contactEmails.length === 0 && (
          <div className="mt-3">
            <Input
              placeholder="Sök e-post..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !emails?.value || emails.value.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500">Inga e-postmeddelanden</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-gray-100">
              {emails.value.map((email) => (
                <button
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={cn(
                    "w-full text-left py-3 px-2 -mx-2 hover:bg-gray-50 transition-colors",
                    !email.isRead && "bg-blue-50/50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      {email.isRead ? (
                        <MailOpen className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Mail className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm truncate",
                            !email.isRead && "font-semibold",
                          )}
                        >
                          {email.from.emailAddress.name ||
                            email.from.emailAddress.address}
                        </p>
                        <span className="text-xs text-gray-500 shrink-0">
                          {formatDistanceToNow(
                            new Date(email.receivedDateTime),
                            {
                              addSuffix: true,
                              locale: sv,
                            },
                          )}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-sm truncate",
                          !email.isRead ? "text-gray-900" : "text-gray-700",
                        )}
                      >
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {email.bodyPreview}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {email.hasAttachments && (
                          <Paperclip className="h-3 w-3 text-gray-400" />
                        )}
                        {email.importance === "high" && (
                          <Star className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Compose dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nytt meddelande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Till (separera med komma)"
              value={composeData.to}
              onChange={(e) =>
                setComposeData({ ...composeData, to: e.target.value })
              }
            />
            <Input
              placeholder="Ämne"
              value={composeData.subject}
              onChange={(e) =>
                setComposeData({ ...composeData, subject: e.target.value })
              }
            />
            <Textarea
              placeholder="Meddelande..."
              value={composeData.body}
              onChange={(e) =>
                setComposeData({ ...composeData, body: e.target.value })
              }
              rows={8}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
              Avbryt
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={
                !composeData.to || !composeData.subject || sendEmail.isPending
              }
            >
              {sendEmail.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Skicka
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
