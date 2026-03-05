import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luminvera - Pakistan's Premier Multi-Vendor Marketplace",
  description: "Shop millions of products from verified sellers. Fast delivery across Pakistan. Electronics, Fashion, Home & Living, Beauty, and more.",
  keywords: ["Luminvera", "Pakistan", "E-commerce", "Online Shopping", "Multi-vendor", "Electronics", "Fashion", "Daraz alternative", "Online Marketplace"],
  authors: [{ name: "Luminvera Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Luminvera - Pakistan's #1 Marketplace",
    description: "Shop millions of products from verified sellers across Pakistan",
    url: "https://luminvera.pk",
    siteName: "Luminvera",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Luminvera - Pakistan's Premier Marketplace",
    description: "Shop millions of products from verified sellers across Pakistan",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
