import { Link, useLocation } from "wouter";
import { Bell, LogOut, Search, User as UserIcon, BookOpen, Users, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay]);
  
  return debounced;
}

export function TopNav() {
  const { user, logout } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const [, navigate] = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: searchResults } = useQuery<{ courses: any[]; users: any[] }>({
    queryKey: ["/api/courses/search", { q: debouncedSearch }],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return { courses: [], users: [] };
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(debouncedSearch)}`, { credentials: "include" });
      return res.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const hasResults = searchResults && (searchResults.courses.length > 0 || searchResults.users.length > 0);

  const handleResultClick = (path: string) => {
    navigate(path);
    setSearchTerm("");
    setSearchOpen(false);
  };

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="hidden md:flex relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              placeholder="Search courses, users..."
              className="pl-9 pr-8 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/30 rounded-full h-10 w-[300px]"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(""); setSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {searchOpen && debouncedSearch.length >= 2 && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-[360px] bg-popover border border-border/50 rounded-xl shadow-2xl overflow-hidden z-50">
              {!hasResults ? (
                <div className="p-4 text-sm text-center text-muted-foreground">No results for "{debouncedSearch}"</div>
              ) : (
                <>
                  {searchResults!.courses.length > 0 && (
                    <>
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Courses</p>
                      </div>
                      {searchResults!.courses.map((c: any) => (
                        <button
                          key={c.id}
                          onMouseDown={() => handleResultClick(`/courses/${c.id}`)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-medium truncate">{c.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.status}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {searchResults!.users.length > 0 && (
                    <>
                      <div className="px-3 pt-3 pb-1 border-t border-border/30">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Team Members</p>
                      </div>
                      {searchResults!.users.map((u: any) => (
                        <button
                          key={u.id}
                          onMouseDown={() => handleResultClick(`/team`)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                            {u.fullName?.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-medium">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/5">
              <Bell className="w-5 h-5 text-foreground/80" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 rounded-xl shadow-xl overflow-hidden border-border/50">
            <div className="px-4 py-3 bg-muted/30 border-b border-border/50 flex justify-between items-center">
              <h4 className="font-semibold">Notifications</h4>
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-sm text-center text-muted-foreground">No notifications yet.</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${!n.isRead ? 'bg-primary/5' : ''}`}
                    onClick={() => !n.isRead && markRead.mutate(n.id)}
                  >
                    <h5 className="font-medium text-sm text-foreground">{n.title}</h5>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground/70 mt-2 block">
                      {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : 'Just now'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-primary/10 overflow-hidden">
              <span className="font-display font-bold text-primary text-sm uppercase">
                {user?.fullName.charAt(0)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground leading-none">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer rounded-md p-0" asChild>
              <Link href="/settings" className="w-full h-full px-2 py-1.5 flex items-center">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:text-destructive rounded-md">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
