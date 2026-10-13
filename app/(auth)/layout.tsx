export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh overflow-hidden bg-background font-sans">
      <div className="app-shell app-shell--full relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        {children}
      </div>
    </div>
  );
}
