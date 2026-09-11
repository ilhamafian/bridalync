import type { Metadata } from "next";
import { Cormorant_Garamond, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bridalync",
  description:
    "Book, plan, and track all in one place. The all-in-one tool for bridal hair and makeup artists.",
  applicationName: "Bridalync",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bridalync",
  },
  icons: {
    icon: [
      { url: "/bridalync.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFEFB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        geistMono.variable,
        cormorant.variable
      )}
    >
      <body suppressHydrationWarning className="min-h-dvh font-sans">
        {children}
      </body>
    </html>
  );
}
