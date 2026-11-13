import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { DemoBanner } from "@/components/DemoBanner";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "Growth Advisor",
  description: "Know your numbers, get one clear next step, and watch your business grow.",
  appleWebApp: { capable: true, title: "Growth Advisor", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b1f33",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA">
      <body className="min-h-screen">
        <DemoBanner />
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
