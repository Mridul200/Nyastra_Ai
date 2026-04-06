import { NavLink, useLocation } from "react-router-dom";
import { Scale, Search, Upload, MessageSquare, FileText, Menu, X, LogIn, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/", label: "Home", icon: Scale },
  { to: "/search", label: "Case Search", icon: Search },
  { to: "/upload", label: "Upload Case", icon: Upload },
  { to: "/chatbot", label: "AI Chatbot", icon: MessageSquare },
  { to: "/documents", label: "Documents", icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border backdrop-blur-xl bg-background/80">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">Nyastra <span className="text-gradient">AI</span></span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}

            {user ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="ml-2 gap-2 text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            ) : (
              <NavLink to="/auth">
                <Button variant="outline" size="sm" className="ml-2 gap-2 border-border text-foreground">
                  <LogIn className="w-4 h-4" /> Sign In
                </Button>
              </NavLink>
            )}
          </nav>

          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-background px-4 pb-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            ) : (
              <NavLink
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </NavLink>
            )}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-zinc-950 border-t border-white/5 py-12 px-4 transition-all">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-8">
            {/* Brand identity */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-primary" />
                </div>
                <span className="font-display font-bold text-xl text-white tracking-tight">Nyastra</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
                From Case Search to Courtroom Ready. The ultimate intelligence hub for advocates.
              </p>
            </div>

            {/* Quick Links */}
            <nav className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
              <NavLink to="/privacy" className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 hover:text-primary transition-colors">
                Privacy Policy
              </NavLink>
              <span className="w-1 h-1 rounded-full bg-zinc-800 hidden sm:block" />
              <NavLink to="/terms" className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 hover:text-primary transition-colors">
                Terms of Service
              </NavLink>
              <span className="w-1 h-1 rounded-full bg-zinc-800 hidden sm:block" />
              <NavLink to="/contact" className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 hover:text-primary transition-colors">
                Contact Us
              </NavLink>
            </nav>

            {/* Legal & Credits */}
            <div className="pt-8 border-t border-white/5 w-full max-w-xs space-y-2">
              <p className="text-[10px] sm:text-xs text-zinc-500 font-medium">
                &copy; 2026 Nyastra. All Rights Reserved.
              </p>
              <p className="text-[9px] sm:text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none">
                Designed & Developed by Mridul Mani Tripathi
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
