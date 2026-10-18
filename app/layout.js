import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "HRM SaaS - HR & Payroll Management",
  description: "Streamline employee management, attendance tracking, payroll, performance, and daily operations – all in one powerful platform.",
  icons: {
    icon: [
      {
        url: '/Icon/White%20Icon%404x.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/Icon/Asset%202%404x.png',
        media: '(prefers-color-scheme: light)',
      },
    ],
    shortcut: '/Icon/Asset%202%404x.png',
    apple: '/Icon/Asset%202%404x.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
