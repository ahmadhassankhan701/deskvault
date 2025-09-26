
"use client"
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/reports');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  return null; // Or a loading spinner
}
