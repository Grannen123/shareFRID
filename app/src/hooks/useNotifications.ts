/**
 * Notifications Hook
 *
 * Provides notification functionality:
 * - Deadline reminders
 * - Status changes
 * - New messages
 * - Task assignments
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Types
export type NotificationType =
  | "deadline"
  | "status_change"
  | "assignment"
  | "message"
  | "billing"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  priority: "low" | "normal" | "high";
}

export interface NotificationPreferences {
  deadlineReminders: boolean;
  statusChanges: boolean;
  assignments: boolean;
  messages: boolean;
  billing: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  preferences: NotificationPreferences;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  deadlineReminders: true,
  statusChanges: true,
  assignments: true,
  messages: true,
  billing: true,
  emailNotifications: false,
  pushNotifications: false,
};

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(
        data?.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          entityType: n.entity_type,
          entityId: n.entity_id,
          isRead: n.is_read,
          createdAt: n.created_at,
          priority: n.priority || "normal",
        })) || [],
      );
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setPreferences({
          deadlineReminders: data.deadline_reminders ?? true,
          statusChanges: data.status_changes ?? true,
          assignments: data.assignments ?? true,
          messages: data.messages ?? true,
          billing: data.billing ?? true,
          emailNotifications: data.email_notifications ?? false,
          pushNotifications: data.push_notifications ?? false,
        });
      }
    } catch {
      // Use defaults if no preferences exist
    }
  }, [user]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    fetchPreferences();

    // Subscribe to new notifications
    subscriptionRef.current = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            link: payload.new.link,
            entityType: payload.new.entity_type,
            entityId: payload.new.entity_id,
            isRead: payload.new.is_read,
            createdAt: payload.new.created_at,
            priority: payload.new.priority || "normal",
          };

          setNotifications((prev) => [newNotification, ...prev]);

          // Show browser notification if enabled
          if (
            preferences.pushNotifications &&
            Notification.permission === "granted"
          ) {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: "/icon.png",
            });
          }
        },
      )
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [
    user,
    fetchNotifications,
    fetchPreferences,
    preferences.pushNotifications,
  ]);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      try {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notificationId)
          .eq("user_id", user.id);

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
        );
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [user],
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [user]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      try {
        await supabase
          .from("notifications")
          .delete()
          .eq("id", notificationId)
          .eq("user_id", user.id);

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } catch (error) {
        console.error("Failed to delete notification:", error);
      }
    },
    [user],
  );

  // Update preferences
  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      if (!user) return;

      const newPreferences = { ...preferences, ...prefs };
      setPreferences(newPreferences);

      try {
        await supabase.from("notification_preferences").upsert({
          user_id: user.id,
          deadline_reminders: newPreferences.deadlineReminders,
          status_changes: newPreferences.statusChanges,
          assignments: newPreferences.assignments,
          messages: newPreferences.messages,
          billing: newPreferences.billing,
          email_notifications: newPreferences.emailNotifications,
          push_notifications: newPreferences.pushNotifications,
        });
      } catch (error) {
        console.error("Failed to update preferences:", error);
      }
    },
    [user, preferences],
  );

  // Request push notification permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    preferences,
    updatePreferences,
    requestPushPermission,
  };
}

/**
 * Create a notification (server-side use)
 */
export async function createNotification(
  userId: string,
  notification: Omit<Notification, "id" | "isRead" | "createdAt">,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      entity_type: notification.entityType,
      entity_id: notification.entityId,
      priority: notification.priority,
      is_read: false,
    });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Create deadline reminder notifications
 */
export async function createDeadlineReminder(
  userId: string,
  caseNumber: string,
  caseTitle: string,
  _deadline: string,
  daysUntil: number,
): Promise<boolean> {
  const urgencyWord =
    daysUntil === 0
      ? "idag"
      : daysUntil === 1
        ? "imorgon"
        : `om ${daysUntil} dagar`;

  return createNotification(userId, {
    type: "deadline",
    title: `Deadline ${urgencyWord}`,
    message: `Ärende ${caseNumber}: ${caseTitle}`,
    link: `/cases/${caseNumber}`,
    entityType: "case",
    entityId: caseNumber,
    priority: daysUntil <= 1 ? "high" : daysUntil <= 3 ? "normal" : "low",
  });
}
