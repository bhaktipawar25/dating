import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Date² — Date Smart • Connect Meaningfully",
    template: "%s | Date²",
  },
  description:
    "Inclusive Romance & Verified Companionship. Sign in or create your Date² account.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-brand-ink antialiased selection:bg-date2-paleLavender selection:text-date2-midnight">
        {children}
      </body>
    </html>
  );
}
