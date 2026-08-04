// app/[client]/layout.tsx
import { notFound } from "next/navigation";
import { UserModel } from "@/models/User";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ client: string }>;
}) {
  const { client } = await params;
  const user = await new UserModel().checkUserOnboarded(client.toLowerCase());

  if (!user) {
    notFound();
  }

  return <>{children}</>;
}