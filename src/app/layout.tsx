import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ML Models Visualizer",
  description:
    "Nine foundational machine learning algorithms rendered as fluid, step-by-step interactive visualizations.",
  keywords: [
    "Machine Learning",
    "ML Visualizer",
    "Decision Trees",
    "K-Means",
    "DBSCAN",
    "Gradient Descent",
    "Interactive ML",
  ],
  authors: [{ name: "Elias Pond" }],
  creator: "Elias Pond",
  openGraph: {
    title: "ML Models Visualizer",
    description: "Interactive, animated ML algorithm visualizations.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ML Models Visualizer",
    description: "Interactive, animated ML algorithm visualizations.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
