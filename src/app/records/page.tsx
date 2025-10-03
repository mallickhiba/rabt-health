
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

const records = [
  {
    id: 'REC001',
    patientName: 'Aisha Khan',
    date: '2024-07-28',
    type: 'SOAP Note',
    status: 'Completed',
  },
  {
    id: 'REC002',
    patientName: 'Bilal Ahmed',
    date: '2024-07-25',
    type: 'Follow-up',
    status: 'Completed',
  },
  {
    id: 'REC003',
    patientName: 'Fatima Ali',
    date: '2024-06-15',
    type: 'Initial Consultation',
    status: 'Completed',
  },
  {
    id: 'REC004',
    patientName: 'Aisha Khan',
    date: '2024-05-20',
    type: 'Lab Results',
    status: 'Reviewed',
  },
];

export default function RecordsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Records</CardTitle>
        <CardDescription>
          An overview of all recent patient records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.id}</TableCell>
                <TableCell>{record.patientName}</TableCell>
                <TableCell>{record.date}</TableCell>
                <TableCell>{record.type}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      record.status === 'Completed' ? 'default' : 'secondary'
                    }
                  >
                    {record.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href="#">
                      <FileText className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
