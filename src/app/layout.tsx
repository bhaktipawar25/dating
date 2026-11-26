import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sign In | Date²",
    template: "%s | Date²",
  },
  description: "Sign in or create your Date² account.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-brand-ink antialiased selection:bg-brand-seafoam/60 selection:text-brand-forest">
        {children}
      </body>
    </html>
  );
}
