import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, Lock, Globe, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    if (!user) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast({ title: "Settings Saved", description: "Your preferences have been updated successfully." });
        }, 1000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-display font-bold text-foreground">Account Settings</h1>
                <p className="text-muted-foreground mt-2">Manage your profile, preferences, and notifications.</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full md:w-auto md:inline-flex bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><User className="w-4 h-4 mr-2 hidden sm:block" /> Profile</TabsTrigger>
                    <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Bell className="w-4 h-4 mr-2 hidden sm:block" /> Notifications</TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Lock className="w-4 h-4 mr-2 hidden sm:block" /> Security</TabsTrigger>
                    <TabsTrigger value="language" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Globe className="w-4 h-4 mr-2 hidden sm:block" /> Language</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card className="border-border/50 shadow-md">
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>Update your personal information and avatar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center p-4 bg-muted/20 rounded-xl border border-border/50">
                                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                                        {user.fullName.charAt(0)}
                                    </div>
                                    <div className="space-y-2">
                                        <Button variant="outline" type="button" size="sm">Change Avatar</Button>
                                        <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input id="fullName" defaultValue={user.fullName} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" type="email" defaultValue={user.email} disabled />
                                        <p className="text-xs text-muted-foreground">Contact support to change email.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Role</Label>
                                        <Input id="role" defaultValue={user.role.replace('_', ' ').toUpperCase()} disabled className="bg-muted/50 font-medium" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="department">Department</Label>
                                        <Input id="department" defaultValue="Engineering" />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-border/50">
                                    <Button type="submit" disabled={isSaving} className="shadow-lg shadow-primary/20">
                                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card className="border-border/50 shadow-md">
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>Choose what alerts you want to receive.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Email Notifications</h4>
                                <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/10 transition-colors">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-medium">Course Assignments</Label>
                                        <p className="text-sm text-muted-foreground">When you are assigned a new course or path.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/10 transition-colors">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-medium">Due Date Reminders</Label>
                                        <p className="text-sm text-muted-foreground">Reminders 3 days and 1 day before an assignment is due.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/10 transition-colors">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-medium">Weekly Digest</Label>
                                        <p className="text-sm text-muted-foreground">A summary of your learning progress each week.</p>
                                    </div>
                                    <Switch />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card className="border-border/50 shadow-md">
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>Manage your password and active sessions.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handleSave} className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPass">Current Password</Label>
                                    <Input id="currentPass" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="newPass">New Password</Label>
                                    <Input id="newPass" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPass">Confirm New Password</Label>
                                    <Input id="confirmPass" type="password" />
                                </div>
                                <Button type="submit" variant="secondary" disabled={isSaving}>Update Password</Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="language">
                    <Card className="border-border/50 shadow-md">
                        <CardHeader>
                            <CardTitle>Language & Region</CardTitle>
                            <CardDescription>Set your preferred language for the LMS interface and courses.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 max-w-md">
                            <div className="space-y-2">
                                <Label>Interface Language</Label>
                                <Select defaultValue="en-us">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en-us">English (US)</SelectItem>
                                        <SelectItem value="en-uk">English (UK)</SelectItem>
                                        <SelectItem value="es">Español (Spanish)</SelectItem>
                                        <SelectItem value="fr">Français (French)</SelectItem>
                                        <SelectItem value="de">Deutsch (German)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Timezone</Label>
                                <Select defaultValue="est">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                                        <SelectItem value="est">Eastern Time (ET)</SelectItem>
                                        <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
                                        <SelectItem value="cet">Central European Time (CET)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSave} disabled={isSaving}>Save Preferences</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
