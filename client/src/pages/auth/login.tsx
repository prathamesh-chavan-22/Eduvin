import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, login, isLoggingIn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      toast({ title: "Welcome back!" });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-border/50 shadow-2xl rounded-2xl overflow-hidden glass-panel">
          <CardHeader className="space-y-3 pb-8 text-center pt-10">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-display text-3xl font-bold tracking-tight">Welcome back</CardTitle>
            <CardDescription className="text-base">
              Sign in to your learning account
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="h-12 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a>
                </div>
                <Input
                  id="password"
                  type="password"
                  className="h-12 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
              </Button>
            </form>
            
            {/* Demo hints */}
            <div className="mt-8 p-4 bg-muted/50 rounded-xl text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">Demo Credentials:</p>
              <ul className="space-y-1">
                <li>LD: <code className="bg-background px-1 py-0.5 rounded">ld@demo.com</code> / pass</li>
                <li>Mgr: <code className="bg-background px-1 py-0.5 rounded">manager@demo.com</code> / pass</li>
                <li>Emp: <code className="bg-background px-1 py-0.5 rounded">employee@demo.com</code> / pass</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex relative items-center justify-center overflow-hidden bg-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary z-0" />
        {/* landing page hero scenic learning environment abstract */}
        <img 
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80" 
          alt="Students learning abstract"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
        />
        <div className="relative z-10 p-16 max-w-2xl text-center">
          <h2 className="font-display text-5xl font-bold tracking-tight text-foreground mb-6">
            Empower your team with continuous learning.
          </h2>
          <p className="text-xl text-muted-foreground">
            LMS Pro brings all your organizational knowledge into one accessible, interactive platform.
          </p>
        </div>
      </div>
    </div>
  );
}
