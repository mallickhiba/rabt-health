
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase, useAuth } from '@/firebase';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { FileText, Home, Leaf, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    signOut(auth).then(() => {
      router.push('/login');
    });
  };

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
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/records">
                      <FileText />
                      <span>Records</span>
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
              <p className="font-semibold"></p>
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
