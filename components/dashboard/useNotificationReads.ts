"use client";

import { useCallback, useMemo, useState } from "react";

import { usePublishUnreadNotificationCount } from "@/components/dashboard/UnreadNotifications";
import {
  isActivityUnread,
  type ActivityItem,
  type NotificationReadState,
} from "@/utils/activity";

async function postMarkRead(body: { all: true } | { ids: string[] }) {
  const response = await fetch("/api/notifications/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to mark notifications as read");
  return (await response.json()) as { seenAt?: string };
}

export function useNotificationReads(
  activity: ActivityItem[],
  initialState: NotificationReadState
) {
  const [state, setState] = useState(initialState);

  const isUnread = useCallback(
    (item: ActivityItem) => isActivityUnread(item, state),
    [state]
  );
  const unreadCount = useMemo(
    () => activity.filter(isUnread).length,
    [activity, isUnread]
  );
  usePublishUnreadNotificationCount(unreadCount);

  const markRead = useCallback(
    (item: ActivityItem) => {
      if (!isActivityUnread(item, state)) return;
      setState((current) => ({
        ...current,
        readIds: [...current.readIds, item.id],
      }));
      postMarkRead({ ids: [item.id] }).catch((error) => {
        console.error(error);
        setState((current) => ({
          ...current,
          readIds: current.readIds.filter((id) => id !== item.id),
        }));
      });
    },
    [state]
  );

  const markAllRead = useCallback(() => {
    const previous = state;
    setState({ seenAt: new Date().toISOString(), readIds: [] });
    postMarkRead({ all: true })
      .then(({ seenAt }) => {
        if (seenAt) setState({ seenAt, readIds: [] });
      })
      .catch((error) => {
        console.error(error);
        setState(previous);
      });
  }, [state]);

  return { isUnread, unreadCount, markRead, markAllRead };
}
