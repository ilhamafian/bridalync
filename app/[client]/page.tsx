import CalendarInput from "../components/CalendarInput";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Calendar
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Pick a date using the calendar picker below.
        </p>
        <CalendarInput />
      </main>
    </div>
  );
}
