import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirection directe vers le dashboard pour les tests
  redirect('/dashboard');
}
