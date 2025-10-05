
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
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collectionGroup, query } from 'firebase/firestore';
import type { SoapNote, Instruction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

type Record = (SoapNote & { type: 'SOAP Note' }) | (Instruction & { type: 'Instruction' });

function RecordRow({ record }: { record: Record }) {
  const date = record.createdAt || record.sentAt;
  return (
    <TableRow>
      <TableCell className="font-medium">{record.id.substring(0, 6)}...</TableCell>
      <TableCell>{record.patientId.substring(0, 6)}...</TableCell>
      <TableCell>{date ? format(new Date(date), 'PPP') : 'N/A'}</TableCell>
      <TableCell>
        <Badge variant={record.type === 'SOAP Note' ? 'secondary' : 'default'}>
          {record.type}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button asChild variant="outline" size="sm">
          <Link href={`/patients/${record.patientId}`}>
            <FileText className="mr-2 h-4 w-4" />
            View Patient
          </Link>
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

export default function RecordsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const soapNotesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collectionGroup(firestore, 'soap_notes'));
    }, [user, firestore]);

    const instructionsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collectionGroup(firestore, 'instructions'));
    }, [user, firestore]);

    const { data: soapNotes, isLoading: isLoadingNotes } = useCollection<SoapNote>(soapNotesQuery);
    const { data: instructions, isLoading: isLoadingInstructions } = useCollection<Instruction>(instructionsQuery);

    const records: Record[] = [
        ...(soapNotes || []).map(note => ({ ...note, type: 'SOAP Note' as const })),
        ...(instructions || []).map(inst => ({ ...inst, type: 'Instruction' as const }))
    ].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.sentAt).getTime();
        const dateB = new Date(b.createdAt || b.sentAt).getTime();
        return dateB - dateA;
    });

    const showLoading = isUserLoading || isLoadingNotes || isLoadingInstructions;

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Patient Records</CardTitle>
        <CardDescription>
          An overview of all recent patient records across all your patients.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record ID</TableHead>
              <TableHead>Patient ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {showLoading && (
                <TableRow>
                    <TableCell colSpan={5}>
                         <TableSkeleton />
                    </TableCell>
                </TableRow>
            )}
            {!showLoading && records && records.length > 0 && (
                records.map((record) => <RecordRow key={`${record.type}-${record.id}`} record={record} />)
            )}
            {!showLoading && (!records || records.length === 0) && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        No records found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
