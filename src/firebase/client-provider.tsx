'use client';

import React, { useEffect, useMemo, type ReactNode } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { useAuth } from '@/firebase';
import { initiateAnonymousSignIn } from './non-blocking-login';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

function AuthGate({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  useEffect(() => {
    // When the initial user loading is complete and we find there's no user,
    // we initiate a non-blocking anonymous sign-in.
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  // We can optionally show a loading state here while checking for a user
  // but for a seamless experience, we render children immediately.
  // The onAuthStateChanged listener in FirebaseProvider will handle re-renders.
  return <>{children}</>;
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
      <AuthGate>{children}</AuthGate>
    </FirebaseProvider>
  );
}
