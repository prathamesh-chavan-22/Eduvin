import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Loader2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function AttendanceList() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: attendanceRecords = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/attendance/list"],
  });

  if (authLoading) {
    return null;
  }

  if (!user || (user.role !== "l_and_d" && user.role !== "manager")) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only admin and manager can view attendance list.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const downloadCSV = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) return;

    const headers = ["Date", "Time", "Name", "Email", "Status"];
    const csvContent = [
      headers.join(","),
      ...attendanceRecords.map((r: any) =>
        `"${r.date}","${r.time}","${r.full_name}","${r.email}","${r.status}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_sheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-3xl flex items-center gap-2">
              <ClipboardList className="w-8 h-8 text-primary" />
              Attendance Sheet
            </CardTitle>
            <CardDescription className="text-lg">
              View attendance records for all employees and students.
            </CardDescription>
          </div>
          <Button onClick={downloadCSV} disabled={isLoading || !attendanceRecords?.length} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : attendanceRecords?.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No attendance records found.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords?.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.date}</TableCell>
                      <TableCell>{record.time}</TableCell>
                      <TableCell>{record.full_name}</TableCell>
                      <TableCell>{record.email}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
