'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Patient } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { NewPatientForm } from '@/components/patients/NewPatientForm';
import { languages } from '@/lib/languages';


function PatientRow({ patient }: { patient: Patient }) {
  const patientLanguage = languages.find(lang => lang.code === patient.language)?.name || patient.language;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={`https://picsum.photos/seed/${patient.id}/40/40`} data-ai-hint="person" alt={patient.name} />
            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{patient.name}</span>
        </div>
      </TableCell>
      <TableCell>{patient.phoneNumber}</TableCell>
      <TableCell>
        <Badge variant="outline">{patientLanguage}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button asChild variant="outline" size="sm">
          <Link href={`/patients/${patient.id}`}>Start Encounter</Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function TableSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
    )
}


export default function PatientsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const patientsCollection = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/patients`);
    }, [user, firestore]);

    const { data: patients, isLoading } = useCollection<Patient>(patientsCollection);

    const showLoading = isUserLoading || isLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Patient Management</CardTitle>
            <CardDescription>
            View and manage your patient list.
            </CardDescription>
        </div>
        <NewPatientForm />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Language</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showLoading && (
                <TableRow>
                    <TableCell colSpan={4}>
                         <TableSkeleton />
                    </TableCell>
                </TableRow>
            )}
            {!showLoading && patients && patients.length > 0 && (
                patients.map((patient) => <PatientRow key={patient.id} patient={patient} />)
            )}
            {!showLoading && (!patients || patients.length === 0) && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                        No patients found. Click "New Patient" to add one.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
