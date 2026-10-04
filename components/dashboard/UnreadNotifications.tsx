"use client";

import { createContext, useContext, useEffect, useState } from "react";

type UnreadNotificationsContextValue = {
  count: number;
  setCount: (count: number) => void;
};

const UnreadNotificationsContext =
  createContext<UnreadNotificationsContextValue | null>(null);

export function UnreadNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(0);

  return (
    <UnreadNotificationsContext.Provider value={{ count, setCount }}>
      {children}
    </UnreadNotificationsContext.Provider>
  );
}

export function useUnreadNotificationCount() {
  return useContext(UnreadNotificationsContext)?.count ?? 0;
}

export function usePublishUnreadNotificationCount(count: number) {
  const setCount = useContext(UnreadNotificationsContext)?.setCount;

  useEffect(() => {
    setCount?.(count);
  }, [count, setCount]);
}
