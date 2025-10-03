import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PatientsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patients</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Patient management will be implemented here.</p>
      </CardContent>
    </Card>
  );
}
