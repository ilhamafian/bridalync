"use client";

import { useState } from "react";

export default function CalendarInput() {
  const [date, setDate] = useState("");

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <label htmlFor="date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Select a date
      </label>
      <input
        id="date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
      />
      {date && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Selected:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </p>
      )}
    </div>
  );
}
