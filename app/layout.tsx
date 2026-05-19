import React from "react";
import type { Metadata } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Slait - Code Session Intelligence",
  description:
    "Upload coding session logs and get evidence-backed scoring across planning, debugging, iteration, and execution quality.",
  icons: {
    icon: "/images/Slait_Icon.png",
    apple: "/images/Slait_Icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body
        className={`${figtree.className} ${figtree.variable} ${geistMono.variable} font-sans antialiased text-foreground`}
      >
        <div className="min-h-screen page-bg">
          <AuthProvider>
            <PageTransition>{children}</PageTransition>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
