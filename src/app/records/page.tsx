import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecordsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Records</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Patient records will be displayed here.</p>
      </CardContent>
    </Card>
  );
}
