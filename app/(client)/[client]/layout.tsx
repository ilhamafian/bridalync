// app/[client]/layout.tsx
import { notFound } from "next/navigation";
import { LocaleProvider } from "@/components/LocaleProvider";
import { UserThemeProvider } from "@/components/UserThemeProvider";
import { UserModel } from "@/models/User";
import { DEFAULT_THEME, DEFAULT_THEME_COLOR } from "@/schemas/userSchema";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ client: string }>;
}) {
  const { client } = await params;
  const user = await new UserModel().findOnboardedByUsername(client.toLowerCase());

  if (!user) {
    notFound();
  }

  return (
    <UserThemeProvider
      theme={user.theme ?? DEFAULT_THEME}
      color={user.theme_color ?? DEFAULT_THEME_COLOR}
    >
      <LocaleProvider>{children}</LocaleProvider>
    </UserThemeProvider>
  );
}
