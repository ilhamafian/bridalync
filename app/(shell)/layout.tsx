export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh items-center justify-center overflow-x-hidden bg-background font-sans max-md:py-0 md:bg-zinc-200 md:py-6 dark:md:bg-zinc-950">
      <div className="app-shell relative mx-auto flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden bg-background max-md:rounded-none max-md:shadow-none max-md:ring-0 md:rounded-[2rem] md:shadow-2xl md:ring-1 md:ring-black/10 dark:md:ring-white/10">
        {children}
      </div>
    </div>
  );
}
