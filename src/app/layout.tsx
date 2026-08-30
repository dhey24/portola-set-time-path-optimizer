import type { Metadata, Viewport } from "next";
import { Anton } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-poster",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Disco Biscuits — Portola Path Planner",
  description:
    "Blindly spend your disco biscuits on Portola 2026 sets, then get your crew's optimal set-hopping paths.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16205c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${anton.variable}`}>
      <body className="min-h-full flex flex-col">
        <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col px-4 pb-16 pt-6 sm:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
