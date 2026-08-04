export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-landing-cream font-serif text-landing-ink">
      {children}
    </div>
  );
}
