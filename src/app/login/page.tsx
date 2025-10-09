'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Leaf, LoaderCircle } from 'lucide-react';
import { Auth, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

async function handleLogin(auth: Auth, data: LoginFormValues) {
  try {
    await signInWithEmailAndPassword(auth, data.email, data.password);
    // onAuthStateChanged will handle the redirect
  } catch (error: any) {
    console.error("Login failed:", error);
    let description = "An unexpected error occurred. Please try again.";
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      description = "Invalid email or password. Please check your credentials and try again.";
    }
    throw new Error(description);
  }
}

async function handleGuestLogin(auth: Auth) {
    try {
        await signInAnonymously(auth);
    } catch (error: any) {
        console.error("Guest login failed:", error);
        throw new Error("Could not sign in as a guest. Please try again.");
    }
}


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
        await handleLogin(auth, data);
        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
        router.push('/dashboard');
    }
    catch (error: any) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const onGuestLogin = async () => {
    setIsLoading(true);
    try {
        await handleGuestLogin(auth);
         toast({
            title: "Guest Login Successful",
            description: "Welcome! As a guest, your data will not be saved.",
        });
        router.push('/dashboard');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Guest Login Failed",
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
            <Leaf className="h-10 w-10 text-primary mb-2" />
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} disabled={isLoading} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoaderCircle className="animate-spin" /> : 'Sign In'}
            </Button>
          </form>
           <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                Or continue with
                </span>
            </div>
            </div>

            <Button variant="secondary" className="w-full" onClick={onGuestLogin} disabled={isLoading}>
                 {isLoading ? <LoaderCircle className="animate-spin" /> : 'Continue as Guest'}
            </Button>

        </CardContent>
        <CardFooter className="flex-col gap-4">
            <div className="text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="underline">
                Sign up
              </Link>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
