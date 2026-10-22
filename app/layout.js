import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "LAMHA Tech - HR & Payroll Management",
  description: "Streamline employee management, attendance tracking, payroll, performance, and daily operations – all in one powerful platform.",
  applicationName: "LAMHA Tech",
  icons: {
    icon: "/Icon/icon.png",
    shortcut: "/Icon/icon.png",
    apple: "/Icon/icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
