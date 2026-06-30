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
      <body suppressHydrationWarning className="flex h-dvh items-center justify-center overflow-x-hidden max-md:py-0 md:py-6">
        <div className="app-shell mx-auto flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden bg-background max-md:rounded-none max-md:shadow-none max-md:ring-0 md:rounded-[2rem] md:shadow-2xl md:ring-1 md:ring-black/10 dark:md:ring-white/10">
          {children}
        </div>
      </body>
    </html>
  );
}
