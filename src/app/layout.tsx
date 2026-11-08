import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Editor",
  description: "Track daily tasks, learning paths and projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
