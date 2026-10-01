import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Moon,
  PenLine,
  Plug,
  ScrollText,
  Sun,
  LogOut,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { useActiveBrand } from "@/lib/use-brand";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/create", label: "Create Post", icon: PenLine },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/library", label: "Posts Library", icon: FileText },
  { to: "/accounts", label: "Accounts", icon: Plug },
  { to: "/logs", label: "Logs", icon: ScrollText },
] as const;

export function AppShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string>("");
  const { brands, brand, select } = useActiveBrand();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="p-6">
          <h1 className="text-xl font-semibold tracking-tight">SocialPilot</h1>
          <p className="eyebrow mt-1">Post studio</p>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60"
                }`}
              >
                <item.icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {email.slice(0, 1).toUpperCase() || "·"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{email || "Signed in"}</div>
              <div className="text-[10px] text-muted-foreground">{brand?.name ?? "No brand"}</div>
            </div>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                pathname === item.to
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mx-auto max-w-7xl space-y-8 p-5 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium leading-tight tracking-tight md:text-3xl">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {brands.length > 1 ? (
                <select
                  value={brand?.id ?? ""}
                  onChange={(e) => select(e.target.value)}
                  className="rounded-lg border border-input bg-card px-3 py-2 text-sm"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                onClick={toggle}
                aria-label="Toggle dark mode"
                className="rounded-lg border border-input bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <button
                onClick={signOut}
                className="rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium md:hidden"
              >
                Sign out
              </button>
              {action}
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
