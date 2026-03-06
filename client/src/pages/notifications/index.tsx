import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BookOpen, AlertCircle, CheckCircle2, Mic, Settings } from "lucide-react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { format } from "date-fns";

export default function NotificationCenter() {
    const { user } = useAuth();
    const { data: notifications = [] } = useNotifications();
    const markAsRead = useMarkNotificationRead();

    if (!user) return <Redirect to="/login" />;

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAllRead = () => {
        notifications.filter(n => !n.isRead).forEach(n => markAsRead.mutate(n.id));
    };

    const getIcon = (title: string) => {
        if (title.toLowerCase().includes('course')) return <BookOpen className="w-5 h-5 text-blue-500" />;
        if (title.toLowerCase().includes('complet')) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        if (title.toLowerCase().includes('practice')) return <Mic className="w-5 h-5 text-purple-500" />;
        if (title.toLowerCase().includes('alert')) return <AlertCircle className="w-5 h-5 text-amber-500" />;
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <Bell className="w-8 h-8 text-primary" />
                        Notification Center
                    </h1>
                    <p className="text-muted-foreground mt-2">View and manage all your alerts and updates.</p>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={handleMarkAllRead}>Mark All as Read</Button>
                    )}
                    <Button variant="secondary" size="icon"><Settings className="w-4 h-4" /></Button>
                </div>
            </div>

            <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        All Updates <Badge variant="secondary" className="ml-2 bg-muted-foreground/20">{notifications.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="unread" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Unread {unreadCount > 0 && <Badge variant="default" className="ml-2 bg-primary">{unreadCount}</Badge>}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    {notifications.length === 0 ? (
                        <EmptyState />
                    ) : (
                        notifications.map((notification) => (
                            <NotificationCard
                                key={notification.id}
                                notification={notification}
                                icon={getIcon(notification.title)}
                                onRead={() => !notification.isRead && markAsRead.mutate(notification.id)}
                            />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="unread" className="space-y-4">
                    {unreadCount === 0 ? (
                        <EmptyState message="You're all caught up!" />
                    ) : (
                        notifications.filter(n => !n.isRead).map((notification) => (
                            <NotificationCard
                                key={notification.id}
                                notification={notification}
                                icon={getIcon(notification.title)}
                                onRead={() => markAsRead.mutate(notification.id)}
                            />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function NotificationCard({ notification, icon, onRead }: { notification: any, icon: React.ReactNode, onRead: () => void }) {
    return (
        <Card
            className={`border-border/50 transition-colors hover:bg-muted/10 cursor-pointer ${!notification.isRead ? 'border-l-4 border-l-primary shadow-sm' : 'opacity-70 shadow-none'}`}
            onClick={onRead}
        >
            <CardContent className="p-5 flex gap-4 items-start focus-visible:outline-none">
                <div className={`p-2 rounded-full shrink-0 ${!notification.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                    {icon}
                </div>
                <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                        <h4 className={`font-semibold ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                        </h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                            {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>

                    {notification.title?.toLowerCase().includes('course') && !notification.isRead && (
                        <Button variant="ghost" className="px-0 h-auto text-primary text-sm mt-2">View Course &rarr;</Button>
                    )}
                </div>
                {!notification.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 self-center" />}
            </CardContent>
        </Card>
    );
}

function EmptyState({ message = "No notifications yet." }: { message?: string }) {
    return (
        <Card className="border-dashed border-border/50 bg-muted/10">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">{message}</p>
            </CardContent>
        </Card>
    );
}
