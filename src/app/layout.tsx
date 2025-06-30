import type { Metadata } from "next";
import { Inter } from "next/font/google"
import "./globals.css";
import { Providers } from "@/app/providers"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })


export const metadata: Metadata = {
  title: "Server Hub",
  description: "Create, join and manage servers in one place",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
