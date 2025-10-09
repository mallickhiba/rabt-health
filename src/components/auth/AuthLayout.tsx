'use client';
import * as React from 'react';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

const protectedRoutes = ['/dashboard', '/patients'];
const publicRoutes = ['/login', '/signup'];

export function AuthLayout({ children }: AuthLayoutProps) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) return;

    const isProtectedRoute = protectedRoutes.some(p => pathname.startsWith(p));
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user && isProtectedRoute) {
      router.push('/login');
    } else if (user && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, pathname]);
  
  if (isUserLoading && protectedRoutes.some(p => pathname.startsWith(p))) {
      return null; // Or a loading component for protected routes
  }

  return <>{children}</>;
}
