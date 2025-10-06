'use client';
import * as React from 'react';
import { useUser, useAuth } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { type ReactNode, useEffect, Children } from 'react';
import { signOut } from 'firebase/auth';

type AuthLayoutProps = {
  children: ReactNode;
};

const protectedRoutes = ['/dashboard', '/patients', '/records'];
const publicRoutes = ['/login', '/signup'];

export function AuthLayout({ children }: AuthLayoutProps) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) return;

    const isProtectedRoute = protectedRoutes.includes(pathname) || pathname.startsWith('/patients/');
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user && isProtectedRoute) {
      router.push('/login');
    } else if (user && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, pathname]);

  const handleSignOut = () => {
    signOut(auth);
    router.push('/login');
  };

  const childrenWithSignOut = Children.map(children, (child) => {
    if (
      React.isValidElement(child) &&
      (child.type as any)?.displayName?.includes('Sidebar')
    ) {
      // It's a sidebar component, let's find the sign out button
      return React.cloneElement(child as React.ReactElement<any>, {
        // This is a bit brittle, assumes structure. A better way would be context.
        // For now, we will traverse to find the element that has `LogOut`
        children: Children.map(
          (child.props as any).children,
          (grandchild) => {
            if (
              React.isValidElement(grandchild) &&
              (grandchild.type as any)?.displayName?.includes('SidebarFooter')
            ) {
              return React.cloneElement(grandchild, {
                children: (
                  <div onClick={handleSignOut}>
                    {grandchild.props.children}
                  </div>
                ),
              });
            }
            if (
              React.isValidElement(grandchild) &&
              grandchild.props.children &&
              JSON.stringify(grandchild.props.children).includes('Sign Out')
            ) {
                 return <div onClick={handleSignOut}>{child}</div>;
            }
            return grandchild;
          }
        ),
      });
    }

    if (
      React.isValidElement(child) &&
      (child.props as any).children &&
      typeof (child.props as any).children === 'object' &&
      !Array.isArray((child.props as any).children)
    ) {
        const grandChild = (child.props as any).children;
        if ( React.isValidElement(grandChild) && (grandChild.props as any).children) {
            const grandChildChildren = (grandChild.props as any).children;
            if (Array.isArray(grandChildChildren)) {
                const signOutButton = grandChildChildren.find((c: any) => c?.props?.children?.toString().includes('Sign Out'));
                if (signOutButton) {
                     return <div onClick={handleSignOut}>{children}</div>;
                }
            }
        }

    }


    return child;
  });

  if (pathname === '/login' || pathname === '/signup') {
    return <>{children}</>;
  }


  if (isUserLoading) {
    return null; // or a loading spinner
  }

  // Find a deeply nested child that has "Sign Out" and attach the onClick
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

    if (typeof element.props.children === 'string' && element.props.children.includes('Sign Out')) {
       return <div onClick={handleSignOut} className="w-full">{element}</div>;
    }


    return hasChildren ? React.cloneElement(element, newProps) : element;
  }

  const enhancedChildren = recursiveClone(children);

  return <>{enhancedChildren}</>;
}
