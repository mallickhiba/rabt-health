
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

const patients = [
  {
    id: '1',
    name: 'Aisha Khan',
    lastVisit: '2024-07-28',
    status: 'Active',
    avatar: 'https://picsum.photos/seed/1/40/40',
    initials: 'AK',
  },
  {
    id: '2',
    name: 'Bilal Ahmed',
    lastVisit: '2024-07-25',
    status: 'Active',
    avatar: 'https://picsum.photos/seed/2/40/40',
    initials: 'BA',
  },
  {
    id: '3',
    name: 'Fatima Ali',
    lastVisit: '2024-06-15',
    status: 'Inactive',
    avatar: 'https://picsum.photos/seed/3/40/40',
    initials: 'FA',
  },
];

export default function PatientsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Management</CardTitle>
        <CardDescription>
          View and manage your patient list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={patient.avatar} alt={patient.name} />
                      <AvatarFallback>{patient.initials}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{patient.name}</span>
                  </div>
                </TableCell>
                <TableCell>{patient.lastVisit}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      patient.status === 'Active' ? 'default' : 'secondary'
                    }
                  >
                    {patient.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/records`}>View Records</Link>
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
