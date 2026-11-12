import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV Signal — Find the right words for your next role",
  description: "Research the keywords employers use across job postings. Compare your CV with source-backed skills and see strong, partial, and missing matches.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
