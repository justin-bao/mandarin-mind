import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  BookOpenCheck,
  Captions,
  CheckCircle2,
  Languages,
  Loader2,
  MessageCircle,
  Mic2,
  Sparkles,
} from "lucide-react";
import { FaGoogle } from "react-icons/fa";

const featureCards = [
  {
    icon: MessageCircle,
    title: "Guided conversation",
    description: "Practice realistic topics with prompts that adapt to your comfort level.",
  },
  {
    icon: Mic2,
    title: "Voice-first practice",
    description: "Speak aloud, hear natural replies, and build confidence sentence by sentence.",
  },
  {
    icon: BookOpenCheck,
    title: "Words that come back",
    description: "Turn useful phrases into review lists and flashcards before they fade.",
  },
  {
    icon: Captions,
    title: "Media study mode",
    description: "Work through captions and clips with the words you actually want to keep.",
  },
];

const proofPoints = ["AI conversation coach", "Phrase lists", "Flashcards", "Media captions"];

export default function AuthPage() {
  const { toast } = useToast();
  const isAuthScreen = window.location.pathname === "/auth";

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== "/api/auth/me",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail.trim(),
        password: registerPassword,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!data.session) {
        toast({ title: "Check your email", description: "Confirm your account, then sign in." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== "/api/auth/me",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (registerPassword !== registerConfirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (registerPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    registerMutation.mutate();
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
    }
  };

  const authCard = (
    <Card className="p-4">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogleSignIn}
        data-testid="button-google-login"
      >
        <FaGoogle className="h-4 w-4" aria-hidden="true" />
        Continue with Google
      </Button>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Tabs defaultValue="login">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
          <TabsTrigger value="register" className="flex-1">Create Account</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
                data-testid="input-login-email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
                data-testid="input-login-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={registerEmail}
                onChange={e => setRegisterEmail(e.target.value)}
                required
                autoComplete="email"
                data-testid="input-register-email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                placeholder="Min. 8 characters"
                value={registerPassword}
                onChange={e => setRegisterPassword(e.target.value)}
                required
                autoComplete="new-password"
                data-testid="input-register-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="register-confirm">Confirm Password</Label>
              <Input
                id="register-confirm"
                type="password"
                placeholder="Repeat password"
                value={registerConfirm}
                onChange={e => setRegisterConfirm(e.target.value)}
                required
                autoComplete="new-password"
                data-testid="input-register-confirm"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Creating account…" : "Create Account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );

  if (isAuthScreen) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="absolute inset-x-0 top-0 z-20">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <a href="/" className="flex items-center gap-2 font-semibold" aria-label="MandarinMind home">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Languages className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>MandarinMind</span>
            </a>
            <a className="text-sm text-muted-foreground transition-colors hover:text-foreground" href="/">
              Back to landing
            </a>
          </nav>
        </header>

        <main className="flex min-h-screen items-center justify-center px-4 py-24 sm:px-6">
          <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_24rem] lg:items-center">
            <div className="max-w-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Languages className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-normal sm:text-5xl">Sign in to start practicing.</h1>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Save your conversations, phrase lists, flashcards, media work, and usage settings in one Mandarin workspace.
              </p>
            </div>

            {authCard}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="flex items-center gap-2 font-semibold" aria-label="MandarinMind home">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Languages className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>MandarinMind</span>
          </a>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a className="transition-colors hover:text-foreground" href="#features">Features</a>
            <a className="transition-colors hover:text-foreground" href="/auth">Sign in</a>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="relative isolate overflow-hidden border-b border-border bg-[radial-gradient(circle_at_50%_20%,hsl(var(--primary)/0.20),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--card)))]">
          <div className="absolute inset-x-10 bottom-0 top-24 -z-10 mx-auto hidden max-w-5xl opacity-35 sm:block lg:opacity-50" aria-hidden="true">
            <div className="mx-auto h-full max-h-[34rem] rounded-lg border border-border/80 bg-card/80 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-muted-foreground">Today’s speaking practice</span>
              </div>
              <div className="grid h-full grid-cols-[13rem_1fr]">
                <div className="hidden border-r border-border bg-sidebar/70 p-4 sm:block">
                  {["Conversation", "Phrase Lists", "Flashcards", "Media"].map((item, index) => (
                    <div
                      key={item}
                      className={`mb-2 rounded-md px-3 py-2 text-sm ${index === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <div className="max-w-sm rounded-lg border border-border bg-background/95 p-4">
                    <p className="font-chinese text-2xl font-semibold">你今天想聊什么？</p>
                    <p className="mt-2 text-sm text-muted-foreground">What would you like to talk about today?</p>
                  </div>
                  <div className="ml-auto max-w-sm rounded-lg bg-primary p-4 text-primary-foreground">
                    <p className="font-chinese text-xl font-semibold">我想练习点咖啡。</p>
                    <p className="mt-2 text-sm opacity-90">I want to practice ordering coffee.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="rounded-lg border border-border bg-background/90 p-4">
                      <p className="text-xs text-muted-foreground">Focus words</p>
                      <p className="mt-1 font-chinese text-lg">杯 · 热 · 少糖</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background/90 p-4">
                      <p className="text-xs text-muted-foreground">Fluency</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-600">+18%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto flex min-h-[36rem] max-w-6xl flex-col justify-end px-4 pb-10 pt-28 sm:min-h-[42rem] sm:px-6 lg:min-h-[46rem]">
            <div className="max-w-3xl pb-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-muted-foreground backdrop-blur">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Mandarin practice that feels like a real exchange
              </div>
              <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-normal sm:text-6xl lg:text-7xl">
                MandarinMind
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Build speaking confidence with AI conversations, remembered phrases, flashcards, and media study in one focused Mandarin workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a href="/auth">
                    Start practicing
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full bg-background/80 backdrop-blur sm:w-auto">
                  <a href="#features">See what’s inside</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-card/40">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-5 sm:grid-cols-4 sm:px-6">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-normal sm:text-4xl">Keep the whole practice loop moving.</h2>
            <p className="mt-4 text-muted-foreground">
              MandarinMind keeps conversation, review, and media work close together so every new phrase has somewhere useful to go.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card/50 px-4 py-16 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-normal sm:text-4xl">Ready when you are.</h2>
              <p className="mt-3 text-muted-foreground">
                Open your practice workspace when you want to save conversations, phrase lists, and review progress.
              </p>
            </div>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href="/auth">
                Start practicing
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
