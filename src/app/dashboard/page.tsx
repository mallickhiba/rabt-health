
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, FileText, Languages, Send, Users } from 'lucide-react';
import { NewPatientForm } from '@/components/patients/NewPatientForm';

const features = [
    {
        icon: <Languages className="h-8 w-8 text-primary" />,
        title: 'Real-Time Translation',
        description: 'Communicate effortlessly with patients in their native language through live, two-way voice translation.',
    },
    {
        icon: <FileText className="h-8 w-8 text-primary" />,
        title: 'Automated SOAP Notes',
        description: 'Save time on administrative tasks. Automatically generate structured SOAP notes from your conversation transcript.',
    },
    {
        icon: <Send className="h-8 w-8 text-primary" />,
        title: 'Send Instructions via WhatsApp',
        description: 'Ensure patient understanding by sending clarified instructions and voice notes directly to their WhatsApp.',
    },
];


export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <Card className="w-full bg-gradient-to-br from-primary/10 via-background to-background">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome to Rabt Health</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your AI-powered partner for breaking down language barriers in healthcare.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl mb-6">
            Rabt Health empowers you to communicate seamlessly with patients, regardless of the language they speak. Start a new encounter to experience real-time translation, automated clinical note generation, and simplified patient instruction delivery.
          </p>
           <div className="flex gap-4">
                <Button asChild size="lg">
                    <Link href="/patients">
                        <Users className="mr-2 h-5 w-5" />
                        Manage Patients
                    </Link>
                </Button>
                <NewPatientForm />
            </div>
        </CardContent>
      </Card>
      
      <div>
        <h2 className="text-2xl font-semibold mb-4">Core Features</h2>
        <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
                 <Card key={index} className="flex flex-col">
                    <CardHeader className="flex-row items-start gap-4">
                        {feature.icon}
                        <div className="flex-1">
                            <CardTitle>{feature.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                    <CardFooter>
                         <Button variant="outline" asChild>
                            <Link href="/patients">
                                Get Started <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      </div>

    </div>
  );
}
