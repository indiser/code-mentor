import React, { useState, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAnalyzeCode, useDetectLanguage } from "@workspace/api-client-react";
import { Check, Copy, Wand2, Terminal, AlertTriangle, Bug, Code2, Lightbulb, Play, AlertCircle } from "lucide-react";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", 
  "C++", "C", "PHP", "Ruby", "Swift", "Kotlin"
];

function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<string>("auto");
  const { toast } = useToast();
  
  const analyzeMutation = useAnalyzeCode();
  const detectMutation = useDetectLanguage();
  
  const [copied, setCopied] = useState(false);

  const handleAnalyze = () => {
    if (!code.trim()) {
      toast({ title: "No code provided", description: "Please enter some code to analyze.", variant: "destructive" });
      return;
    }
    
    analyzeMutation.mutate({
      data: {
        code,
        language: language !== "auto" ? language : undefined
      }
    });
  };

  const handleAutoDetect = () => {
    if (!code.trim()) return;
    detectMutation.mutate({ data: { code } }, {
      onSuccess: (res) => {
        setLanguage(res.language);
        toast({ title: "Language Detected", description: `Detected ${res.language} with ${res.confidence} confidence.` });
      },
      onError: () => {
        toast({ title: "Detection Failed", description: "Could not auto-detect language.", variant: "destructive" });
      }
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const severityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'major': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'minor': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
              <Terminal size={18} />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Debug<span className="text-primary">Mentor</span></h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-6">
        
        {/* INPUT AREA */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Code2 size={16} /> Input Source
            </h2>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[140px] h-8 text-xs font-mono bg-card border-border">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              {language === "auto" && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 bg-card border-border" 
                  onClick={handleAutoDetect}
                  disabled={detectMutation.isPending || !code.trim()}
                  title="Detect Language"
                >
                  <Wand2 size={14} className={detectMutation.isPending ? "animate-pulse" : ""} />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col min-h-[400px] lg:min-h-[600px] border border-border rounded-md overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-primary/50 transition-shadow">
            <div className="bg-card px-4 py-2 border-b border-border flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
              <span className="ml-2 opacity-50">editor.ts</span>
            </div>
            <Textarea 
              className="flex-1 bg-background border-0 focus-visible:ring-0 rounded-none font-mono text-sm resize-none p-4 placeholder:text-muted-foreground/30 leading-relaxed"
              placeholder="// Paste your broken code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
          </div>

          <Button 
            className="w-full font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]" 
            size="lg"
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Wand2 size={16} className="animate-spin" /> Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play size={16} /> Analyze Code
              </span>
            )}
          </Button>
        </div>

        {/* RESULTS AREA */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ActivityIcon size={16} /> Analysis Results
          </h2>
          
          <div className="flex-1 bg-card border border-border rounded-md overflow-hidden relative">
            
            {!analyzeMutation.data && !analyzeMutation.isPending && !analyzeMutation.isError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary/40 mb-4 border border-primary/10">
                  <Terminal size={32} />
                </div>
                <h3 className="text-lg font-medium mb-2">Ready to debug</h3>
                <p className="text-muted-foreground max-w-md text-sm">
                  Paste your problematic code in the editor and hit analyze. We'll identify the root cause and provide a fix.
                </p>
              </div>
            )}

            {analyzeMutation.isPending && (
              <div className="absolute inset-0 flex flex-col gap-4 p-6 animate-pulse">
                <div className="h-8 bg-border/50 rounded w-1/3"></div>
                <div className="flex-1 bg-border/20 rounded border border-border/50"></div>
                <div className="h-32 bg-border/20 rounded border border-border/50"></div>
              </div>
            )}

            {analyzeMutation.isError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-destructive/5">
                <AlertCircle size={48} className="text-destructive mb-4 opacity-80" />
                <h3 className="text-lg font-bold text-destructive mb-2">Analysis Failed</h3>
                <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                  {analyzeMutation.error?.error || "We couldn't analyze this code snippet. Please try again."}
                </p>
                <Button variant="outline" onClick={handleAnalyze}>Try Again</Button>
              </div>
            )}

            {analyzeMutation.data && (
              <div className="h-full flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Left column: Bug & Explanation */}
                <div className="w-full lg:w-1/2 flex flex-col divide-y divide-border">
                  <div className="p-6 flex-1 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold flex items-center gap-2 text-foreground">
                        <Bug size={18} className="text-primary" /> Bug Found
                      </h3>
                      <Badge variant="outline" className={`${severityColor(analyzeMutation.data.severity)} uppercase text-[10px] tracking-wider px-2 py-0.5`}>
                        {analyzeMutation.data.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {analyzeMutation.data.bug_description}
                    </p>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col gap-4 bg-muted/30">
                    <h3 className="font-semibold flex items-center gap-2 text-foreground">
                      <AlertTriangle size={18} className="text-orange-400" /> Why It Broke
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {analyzeMutation.data.root_cause_explanation}
                    </p>
                    
                    <div className="mt-auto pt-4">
                      <div className="bg-primary/5 border border-primary/20 rounded p-4 flex gap-3">
                        <Lightbulb size={16} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-bold text-primary mb-1 uppercase tracking-wider">Prevention Tip</span>
                          <span className="text-sm text-muted-foreground">{analyzeMutation.data.prevention_tip}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column: Fixed Code */}
                <div className="w-full lg:w-1/2 flex flex-col bg-[#0a0a0a]">
                  <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <Check size={16} className="text-green-500" /> Fixed Code
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs bg-muted/50 hover:bg-muted"
                      onClick={() => handleCopy(analyzeMutation.data.fixed_code)}
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      <span className="ml-2">{copied ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>
                  <div className="flex-1 p-0 overflow-auto relative group">
                    <pre className="p-6 text-sm font-mono leading-relaxed text-blue-100">
                      <code>{analyzeMutation.data.fixed_code}</code>
                    </pre>
                  </div>
                </div>
                
              </div>
            )}
            
          </div>
        </div>

      </main>
    </div>
  );
}

function ActivityIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2" />
    </svg>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Force dark mode on document body
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
