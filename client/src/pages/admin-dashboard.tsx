import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { Loader2, Users, FileText, Settings } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AdminStats {
  totalUsers: number;
  totalExams: number;
  totalSubmissions: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/stats"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  if (!user || user.role !== "admin") {
    return null; // Will be redirected by protected route
  }

  const roleData = [
    { name: 'Professors', value: users?.filter((u: any) => u.role === 'professor').length || 0, color: 'hsl(var(--primary))' },
    { name: 'Students', value: users?.filter((u: any) => u.role === 'student').length || 0, color: 'hsl(var(--secondary))' },
    { name: 'Admins', value: users?.filter((u: any) => u.role === 'admin').length || 0, color: 'hsl(var(--accent))' },
  ];

  return (
    <AppShell>
      <div className="py-6">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            System overview and management
          </p>
        </div>
        
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          {/* Stats Overview */}
          {isLoading ? (
            <div className="flex justify-center mt-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <StatsCard 
                title="Total Users"
                value={stats?.totalUsers || 0}
                icon={<Users className="w-6 h-6" />}
                linkText="Manage users"
                linkHref="#users"
                color="primary"
              />
              <StatsCard 
                title="Total Exams"
                value={stats?.totalExams || 0}
                icon={<FileText className="w-6 h-6" />}
                linkText="View all"
                linkHref="#exams"
                color="secondary"
              />
              <StatsCard 
                title="Total Submissions"
                value={stats?.totalSubmissions || 0}
                icon={<FileText className="w-6 h-6" />}
                linkText="View all"
                linkHref="#submissions"
                color="accent"
              />
            </div>
          )}

          {/* User Distribution */}
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {roleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium">AI Detection Sensitivity</h4>
                      <p className="text-sm text-gray-500">System-wide default setting</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium">Backup & Restore</h4>
                      <p className="text-sm text-gray-500">Manage system data</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Run Backup
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium">System Logs</h4>
                      <p className="text-sm text-gray-500">View activity logs</p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Logs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Management */}
          <div className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <Button size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </CardHeader>
              <CardContent>
                {users && users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.slice(0, 5).map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.fullName}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.role === 'professor' ? 'bg-primary/10 text-primary' :
                              user.role === 'admin' ? 'bg-accent/10 text-accent' :
                              'bg-secondary/10 text-secondary'
                            }`}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">Edit</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-4 text-center text-gray-500">
                    No users found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Analytics */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-4">
                  Analytics dashboard coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
