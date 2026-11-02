export const viewport = {
  themeColor: "#230b17",
};

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh overflow-hidden bg-[#230b17] font-sans text-zinc-100">
      <div className="app-shell app-shell--full relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#230b17]">
        {children}
      </div>
    </div>
  );
}
