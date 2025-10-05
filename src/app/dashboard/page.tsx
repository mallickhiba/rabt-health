
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
       <Card>
        <CardHeader>
          <CardTitle>Welcome to Rabt Health</CardTitle>
          <CardDescription>
            Your centralized platform for breaking language barriers in healthcare.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Start a new patient encounter, manage your existing patients, or review past records.
          </p>
          <div className="flex gap-2">
            <Button asChild>
                <Link href="/patients">Manage Patients</Link>
            </Button>
             <Button asChild variant="outline">
                <Link href="/records">View All Records</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
           <CardDescription>
            Get started with a new patient encounter.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="mb-4">You can start by creating a new patient profile.</p>
            <Button asChild>
                {/* This will eventually trigger a "New Patient" modal */}
                <Link href="/patients">Add New Patient</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
