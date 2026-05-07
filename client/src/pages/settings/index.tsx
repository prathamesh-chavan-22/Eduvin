import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, Lock, Globe, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateLanguage } from "@/hooks/use-speaking";

export default function Settings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fullNameRef = useRef<HTMLInputElement>(null);
    const currentPassRef = useRef<HTMLInputElement>(null);
    const newPassRef = useRef<HTMLInputElement>(null);
    const confirmPassRef = useRef<HTMLInputElement>(null);
    const [speakingLanguage, setSpeakingLanguage] = useState(user?.preferredLanguage || "en");
    const updateLanguage = useUpdateLanguage();

    if (!user) return null;

    const profileMutation = useMutation({
        mutationFn: async (data: Record<string, string>) => {
            const res = await apiRequest("PATCH", "/api/auth/profile", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            toast({ title: "Settings Saved", description: "Your profile has been updated successfully." });
        },
        onError: (err: any) => {
            toast({ variant: "destructive", title: "Save failed", description: err.message ?? "Please try again." });
        },
    });

    const handleProfileSave = (e: React.FormEvent) => {
        e.preventDefault();
        const newName = fullNameRef.current?.value?.trim();
        if (newName) profileMutation.mutate({ fullName: newName });
    };

    const handlePasswordSave = (e: React.FormEvent) => {
        e.preventDefault();
        const cur = currentPassRef.current?.value ?? "";
        const next = newPassRef.current?.value ?? "";
        const confirm = confirmPassRef.current?.value ?? "";
        if (!cur || !next) {
            toast({ variant: "destructive", title: "Please fill in all password fields." });
            return;
        }
        if (next !== confirm) {
            toast({ variant: "destructive", title: "New passwords do not match." });
            return;
        }
        profileMutation.mutate({ currentPassword: cur, newPassword: next });
    };

    const isSaving = profileMutation.isPending;

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
                            <CardDescription>Update your personal information.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileSave} className="space-y-6">
                                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center p-4 bg-muted/20 rounded-xl border border-border/50">
                                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                                        {user.fullName.charAt(0)}
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input id="fullName" ref={fullNameRef} defaultValue={user.fullName} />
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
                                {[
                                    { label: "Course Assignments", desc: "When you are assigned a new course or path.", defaultOn: true },
                                    { label: "Due Date Reminders", desc: "Reminders 3 days and 1 day before an assignment is due.", defaultOn: true },
                                    { label: "Weekly Digest", desc: "A summary of your learning progress each week.", defaultOn: false },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/10 transition-colors">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-medium">{item.label}</Label>
                                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                                        </div>
                                        <Switch defaultChecked={item.defaultOn} />
                                    </div>
                                ))}
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
                            <form onSubmit={handlePasswordSave} className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPass">Current Password</Label>
                                    <Input id="currentPass" type="password" ref={currentPassRef} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="newPass">New Password</Label>
                                    <Input id="newPass" type="password" ref={newPassRef} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPass">Confirm New Password</Label>
                                    <Input id="confirmPass" type="password" ref={confirmPassRef} />
                                </div>
                                <Button type="submit" variant="secondary" disabled={isSaving}>
                                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Update Password
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="language">
                    <Card className="border-border/50 shadow-md">
                        <CardHeader>
                            <CardTitle>Language & Region</CardTitle>
                            <CardDescription>Set your preferred language for the LMS AI interface and courses.</CardDescription>
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
                            
                            <div className="border-t pt-6">
                                <h4 className="font-semibold mb-4">Speaking Practice Language</h4>
                                <div className="space-y-2">
                                    <Label>Primary Language for Prompts & Feedback</Label>
                                    <Select 
                                        value={speakingLanguage} 
                                        onValueChange={(value) => {
                                            setSpeakingLanguage(value);
                                            updateLanguage.mutate(value, {
                                                onSuccess: () => {
                                                    toast({
                                                        title: "Language Updated",
                                                        description: "Your speaking practice language has been updated successfully."
                                                    });
                                                },
                                                onError: () => {
                                                    toast({
                                                        variant: "destructive",
                                                        title: "Update Failed",
                                                        description: "Failed to update language preference. Please try again."
                                                    });
                                                }
                                            });
                                        }}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                                            <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-sm text-muted-foreground">
                                        This language will be used for lesson prompts, voice guidance, and AI feedback in speaking practice.
                                    </p>
                                </div>
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
                                        <SelectItem value="ist">India Standard Time (IST)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button>Save Preferences</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
