'use client';
import * as React from 'react';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
  onSignOut: () => void;
};

const protectedRoutes = ['/dashboard', '/patients', '/records'];
const publicRoutes = ['/login', '/signup'];

export function AuthLayout({ children, onSignOut }: AuthLayoutProps) {
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

  const recursiveClone = (element: ReactNode): ReactNode => {
    if (!React.isValidElement(element)) {
      return element;
    }

    let newProps: any = {};
    let hasChildren = false;

    if (element.props.children) {
      hasChildren = true;
      newProps.children = React.Children.map(element.props.children, child => recursiveClone(child));
    }
    
    const childString = JSON.stringify(element.props.children);
    if (childString && childString.includes('Sign Out')) {
      return React.cloneElement(element, { onClick: onSignOut, onTouchEnd: onSignOut });
    }

    return hasChildren ? React.cloneElement(element, newProps) : element;
  }

  // Find a deeply nested child that has "Sign Out" and attach the onClick
  const enhancedChildren = React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return recursiveClone(child);
      }
      return child;
  });
  
  if (isUserLoading) {
      return null; // Or a loading component
  }

  return <>{enhancedChildren}</>;
}
