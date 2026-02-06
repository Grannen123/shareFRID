/**
 * Notification Center Component
 *
 * Displays notifications in a dropdown panel.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { parseISO, formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock,
  AlertCircle,
  MessageSquare,
  UserPlus,
  Receipt,
  Settings,
} from "lucide-react";
import {
  Button,
  Badge,
  ScrollArea,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import {
  useNotifications,
  type Notification,
  type NotificationType,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; color: string }
> = {
  deadline: { icon: Clock, color: "text-orange-500" },
  status_change: { icon: AlertCircle, color: "text-blue-500" },
  assignment: { icon: UserPlus, color: "text-green-500" },
  message: { icon: MessageSquare, color: "text-purple-500" },
  billing: { icon: Receipt, color: "text-yellow-500" },
  system: { icon: Settings, color: "text-gray-500" },
};

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifieringar</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Markera alla som lästa
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <Bell className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>Inga notifieringar</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onDelete={() => deleteNotification(notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/settings/notifications">
              <Settings className="h-4 w-4 mr-2" />
              Inställningar
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Single notification item
function NotificationItem({
  notification,
  onClick,
  onDelete,
}: {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
}) {
  const config = TYPE_CONFIG[notification.type];
  const Icon = config.icon;

  const content = (
    <div
      className={cn(
        "p-3 hover:bg-gray-50 transition-colors cursor-pointer",
        !notification.isRead && "bg-primary-50/50",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full bg-gray-100",
            config.color,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className={cn("text-sm", !notification.isRead && "font-medium")}
              >
                {notification.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>

            {notification.priority === "high" && (
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(parseISO(notification.createdAt), {
                addSuffix: true,
                locale: sv,
              })}
            </span>

            <div className="flex items-center gap-1">
              {!notification.isRead && (
                <span className="w-2 h-2 rounded-full bg-primary-500" />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3 text-gray-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link to={notification.link} className="block group">
        {content}
      </Link>
    );
  }

  return <div className="group">{content}</div>;
}
