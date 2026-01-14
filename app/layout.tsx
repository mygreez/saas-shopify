import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'my Greez - Créez vos fiches produits Shopify en un clic',
  description: 'Créez rapidement des fiches produits Shopify optimisées avec analyse d\'images et IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

