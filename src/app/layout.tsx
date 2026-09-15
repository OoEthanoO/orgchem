import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://chem.ethanyanxu.com"),
  applicationName: "chem",
  title: "chem — chemical structures and naming practice",
  description:
    "Explore organic structures and coordination complexes from names and formulas. Practise chemical naming, ligands and oxidation states.",
};

/**
 * Settles the theme before first paint. Without this the page would flash the
 * light palette while React hydrates.
 */
const THEME_SCRIPT = `(()=>{try{const s=localStorage.getItem("chem-theme")??localStorage.getItem("orgchem-theme");const d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=s==="light"||s==="dark"?s:(d?"dark":"light")}catch{document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
