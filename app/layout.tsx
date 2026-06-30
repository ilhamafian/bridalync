import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSerif = Noto_Serif({subsets:['latin'],variable:'--font-serif'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bridalync",
  description: "Simple calendar date picker",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-serif", notoSerif.variable)}
    >
      <body suppressHydrationWarning className="flex h-dvh items-center justify-center py-6 max-[390px]:py-0">
        <div className="app-shell flex min-h-0 flex-col overflow-hidden bg-background shadow-2xl ring-1 ring-black/10 max-[390px]:rounded-none min-[391px]:rounded-[2rem] dark:ring-white/10">
          {children}
        </div>
      </body>
    </html>
  );
}
