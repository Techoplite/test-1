import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Silent Charts · Daily Signals",
  description:
    "NYSE 4:00 PM ET closes, percent change, and range-break signals for SPX, NDX, VIX, TLT, and the US 10-year Treasury yield.",
  icons: {
    icon: [{ url: "/silent-charts-logo.png", type: "image/png" }],
    shortcut: ["/silent-charts-logo.png"],
    apple: "/silent-charts-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
