
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarFooter } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Leaf, Home, Users, FileText, LogOut } from 'lucide-react';
import Link from 'next/link';
import { FirebaseClientProvider, useUser } from '@/firebase';
import { AuthLayout } from '@/components/auth/AuthLayout';

export const metadata: Metadata = {
  title: 'Rabt Health',
  description: 'A doctor-facing that breaks language barriers in Pakistani healthcare.',
};

function AppSidebar({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
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
          <SidebarFooter>
             <AuthLayout>
                <SidebarMenu>
                  <SidebarMenuItem>
                     <SidebarMenuButton>
                        <LogOut/>
                        <span>Sign Out</span>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
            </AuthLayout>
          </SidebarFooter>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center justify-between border-b bg-background px-4 md:pl-2">
          <SidebarTrigger />
          <p className="font-semibold"></p>
        </header>
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppWithAuth({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useUser();
  return user ? <AppSidebar>{children}</AppSidebar> : <>{children}</>;
}


function AppProviders({ children }: { children: React.ReactNode }) {
  'use client';
  return (
    <FirebaseClientProvider>
      <AuthLayout>
        <AppWithAuth>{children}</AppWithAuth>
      </AuthLayout>
    </FirebaseClientProvider>
  )
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body antialiased')}>
        <AppProviders>
          {children}
        </AppProviders>
        <Toaster />
      </body>
    </html>
  );
}
