/**
 * CalendarPanel Component
 *
 * Displays and manages Outlook calendar events.
 */

import { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  ExternalLink,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Checkbox,
  Label,
  ScrollArea,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  type GraphCalendarEvent,
} from "@/hooks/useGraphApi";
import { cn } from "@/lib/utils";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
} from "date-fns";
import { sv } from "date-fns/locale";

interface CalendarPanelProps {
  title?: string;
  showCreateButton?: boolean;
}

export function CalendarPanel({
  title = "Kalender",
  showCreateButton = true,
}: CalendarPanelProps) {
  const { isMicrosoftConnected } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<GraphCalendarEvent | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    subject: "",
    body: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    attendees: "",
    isOnlineMeeting: false,
  });

  // Calculate week range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Query
  const {
    data: events,
    isLoading,
    refetch,
  } = useCalendarEvents({
    startDateTime: weekStart.toISOString(),
    endDateTime: weekEnd.toISOString(),
    top: 50,
  });

  const createEvent = useCreateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  // Navigate weeks
  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Handle create event
  const handleCreateEvent = async () => {
    if (!newEvent.subject || !newEvent.date) return;

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const startDateTime = `${newEvent.date}T${newEvent.startTime}:00`;
    const endDateTime = `${newEvent.date}T${newEvent.endTime}:00`;

    try {
      await createEvent.mutateAsync({
        subject: newEvent.subject,
        body: newEvent.body || undefined,
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
        location: newEvent.location || undefined,
        attendees: newEvent.attendees
          ? newEvent.attendees.split(",").map((e) => e.trim())
          : undefined,
        isOnlineMeeting: newEvent.isOnlineMeeting,
      });

      setIsCreateOpen(false);
      setNewEvent({
        subject: "",
        body: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "10:00",
        location: "",
        attendees: "",
        isOnlineMeeting: false,
      });
      refetch();
    } catch (err) {
      console.error("Create event failed:", err);
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna händelse?")) {
      return;
    }

    try {
      await deleteEvent.mutateAsync(eventId);
      setSelectedEvent(null);
      refetch();
    } catch (err) {
      console.error("Delete event failed:", err);
    }
  };

  // Group events by day
  const eventsByDay: Record<string, GraphCalendarEvent[]> = {};
  events?.value?.forEach((event) => {
    const date = format(parseISO(event.start.dateTime), "yyyy-MM-dd");
    if (!eventsByDay[date]) {
      eventsByDay[date] = [];
    }
    eventsByDay[date].push(event);
  });

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    return day;
  });

  // Not connected to Microsoft
  if (!isMicrosoftConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
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
              Anslut ditt Microsoft-konto för att se kalenderhändelser.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show selected event
  if (selectedEvent) {
    const startDate = parseISO(selectedEvent.start.dateTime);
    const endDate = parseISO(selectedEvent.end.dateTime);

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedEvent(null)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="flex-1 text-center text-base truncate">
              {selectedEvent.subject}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(selectedEvent.webLink, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>
              {format(startDate, "EEEE d MMMM", { locale: sv })}
              {", "}
              {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
            </span>
          </div>

          {selectedEvent.location?.displayName && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{selectedEvent.location.displayName}</span>
            </div>
          )}

          {selectedEvent.isOnlineMeeting && selectedEvent.onlineMeetingUrl && (
            <div className="flex items-center gap-3 text-sm">
              <Video className="h-4 w-4 text-blue-500" />
              <a
                href={selectedEvent.onlineMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Anslut till onlinemöte
              </a>
            </div>
          )}

          {selectedEvent.attendees.length > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <Users className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                {selectedEvent.attendees.map((attendee, i) => (
                  <div key={i}>
                    {attendee.emailAddress.name ||
                      attendee.emailAddress.address}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEvent.bodyPreview && (
            <div className="border-t pt-4 text-sm text-gray-600">
              {selectedEvent.bodyPreview}
            </div>
          )}

          <div className="border-t pt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteEvent(selectedEvent.id)}
              disabled={deleteEvent.isPending}
            >
              {deleteEvent.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Ta bort händelse
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {showCreateButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ny händelse
              </Button>
            )}
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mt-3">
          <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {format(weekStart, "d MMM", { locale: sv })} -{" "}
              {format(weekEnd, "d MMM yyyy", { locale: sv })}
            </span>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Idag
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {weekDays.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDay[dateKey] || [];
                const isToday = isSameDay(day, new Date());

                return (
                  <div key={dateKey}>
                    <div
                      className={cn(
                        "flex items-center gap-2 mb-2 pb-2 border-b",
                        isToday && "border-primary-500",
                      )}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                          isToday
                            ? "bg-primary-600 text-white"
                            : "text-gray-600",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <span
                        className={cn(
                          "text-sm",
                          isToday ? "font-medium" : "text-gray-500",
                        )}
                      >
                        {format(day, "EEEE", { locale: sv })}
                      </span>
                    </div>

                    {dayEvents.length === 0 ? (
                      <p className="text-xs text-gray-400 pl-10">
                        Inga händelser
                      </p>
                    ) : (
                      <div className="space-y-2 pl-10">
                        {dayEvents.map((event) => {
                          const startTime = format(
                            parseISO(event.start.dateTime),
                            "HH:mm",
                          );
                          const endTime = format(
                            parseISO(event.end.dateTime),
                            "HH:mm",
                          );

                          return (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className="w-full text-left p-2 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {startTime} - {endTime}
                                </span>
                                {event.isOnlineMeeting && (
                                  <Video className="h-3 w-3 text-blue-500" />
                                )}
                              </div>
                              <p className="text-sm font-medium truncate">
                                {event.subject}
                              </p>
                              {event.location?.displayName && (
                                <p className="text-xs text-gray-500 truncate">
                                  {event.location.displayName}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Create event dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ny kalenderhändelse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Titel</Label>
              <Input
                value={newEvent.subject}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, subject: e.target.value })
                }
                placeholder="Möte med kund"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Starttid</Label>
                <Input
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Sluttid</Label>
                <Input
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Plats</Label>
              <Input
                value={newEvent.location}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, location: e.target.value })
                }
                placeholder="Kontoret eller adress"
              />
            </div>
            <div>
              <Label>Deltagare (separera med komma)</Label>
              <Input
                value={newEvent.attendees}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, attendees: e.target.value })
                }
                placeholder="namn@example.com, namn2@example.com"
              />
            </div>
            <div>
              <Label>Beskrivning</Label>
              <Textarea
                value={newEvent.body}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, body: e.target.value })
                }
                rows={3}
                placeholder="Mötesagenda..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="onlineMeeting"
                checked={newEvent.isOnlineMeeting}
                onCheckedChange={(checked) =>
                  setNewEvent({
                    ...newEvent,
                    isOnlineMeeting: checked as boolean,
                  })
                }
              />
              <Label htmlFor="onlineMeeting" className="cursor-pointer">
                Skapa Teams-möte
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Avbryt
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={!newEvent.subject || createEvent.isPending}
            >
              {createEvent.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Skapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
