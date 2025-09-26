
"use client";

import { useEffect, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from './ui/skeleton';

export default function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const AuthComponent = (props: P) => {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (isAuthenticated === false) { // Explicitly check for false to avoid redirect on initial load
        router.push('/login');
      }
    }, [isAuthenticated, router]);

    if (isAuthenticated) {
      return <WrappedComponent {...props} />;
    }

    // Optional: show a loading state while checking auth
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="space-y-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
    );
  };

  return AuthComponent;
}
