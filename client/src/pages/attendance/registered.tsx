import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, CheckCircle2, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function RegisteredEmployees() {
  const { user, isLoading: authLoading } = useAuth();
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: registeredUsers = [], isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/attendance/registered-users"],
  });

  const deleteRegistration = async (userId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the face registration for ${name}?`)) return;
    
    setIsDeleting(userId);
    try {
      const response = await apiRequest("DELETE", `/api/attendance/register/${userId}`);
      const data = await response.json();
      toast({ title: "Deleted", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/registered-users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete face data.", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  if (authLoading) {
    return null;
  }

  if (!user || user.role !== "l_and_d") {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only admin can view registered face data.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card className="shadow-lg border border-border/60">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Registered Employees
          </CardTitle>
          <CardDescription className="text-base mt-2">
            See which employees have registered their face and delete old registrations if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : !registeredUsers || registeredUsers.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground text-lg">
              No employees found.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-semibold">Employee Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredUsers.map((emp: any) => (
                    <TableRow key={emp.id} className="hover:bg-muted/10">
                      <TableCell className="font-medium text-base">{emp.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                      <TableCell className="text-center">
                        {emp.is_registered ? (
                          <Badge variant="default" className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border border-green-500/30 px-3 py-1">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Registered
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground border-dashed border px-3 py-1 bg-transparent">
                            Not Registered
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {emp.is_registered && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => deleteRegistration(emp.id, emp.full_name)}
                            disabled={isDeleting === emp.id}
                            className="shadow-sm"
                          >
                            {isDeleting === emp.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-1.5" />
                            )}
                            Delete Face
                          </Button>
                        )}
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
