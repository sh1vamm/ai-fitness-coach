import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "AI Fitness Coach",
  description: "Real-time AI-powered fitness coaching with computer vision",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[rgb(10,10,20)] text-white">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
