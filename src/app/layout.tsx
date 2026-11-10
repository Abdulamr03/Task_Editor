import type { Metadata } from "next";
import { getTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Editor",
  description: "Track daily tasks, learning paths and projects.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getTheme();
  return (
    <html lang="en" data-theme={theme}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
