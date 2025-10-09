
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, useAuth, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Home, Leaf, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';


interface FirebaseClientProviderProps {
  children: ReactNode;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || user.isAnonymous || !firestore) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleSignOut = () => {
    signOut(auth).then(() => {
      router.push('/login');
    });
  };
  
  const getDisplayName = () => {
    if (!user) return '';
    if (user.isAnonymous) return 'Guest User';
    if (userProfile) return `${userProfile.firstName} ${userProfile.lastName}`;
    return user.email;
  }
  
  const getInitials = () => {
    if (!user) return '';
    if (user.isAnonymous) return 'G';
    if (userProfile) return `${userProfile.firstName.charAt(0)}${userProfile.lastName.charAt(0)}`;
    return user.email?.charAt(0).toUpperCase() ?? 'U';
  }


  return (
    <AuthLayout>
      {user ? (
         <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                    <Leaf className="w-5 h-5" />
                  </Button>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold tracking-tight">Rabt Health</h2>
                  </div>
                </div>
              </SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard">
                      <Home />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/patients">
                      <Users />
                      <span>Patients</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleSignOut}>
                        <LogOut/>
                        <span>Sign Out</span>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="flex h-12 items-center justify-between border-b bg-background px-4 md:pl-2">
              <SidebarTrigger />
              <div className="flex items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2">
                             <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials()}</AvatarFallback>
                            </Avatar>
                            <span className="hidden sm:inline-block">{getDisplayName()}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign Out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <>{children}</>
      )}
    </AuthLayout>
  )
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <AppLayout>
        {children}
      </AppLayout>
    </FirebaseProvider>
  );
}
