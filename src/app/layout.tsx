import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Court Club | Un panier, un sourire",
  description: "Trois paniers pour gagner une réduction. Un mini-jeu à intégrer dans votre boutique.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
