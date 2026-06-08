"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import { LayoutDashboard, History, User, Menu, X } from "lucide-react";
import { ChirayuLogo } from "@/components/ui/chirayu-logo";

const Layout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("candidate_email");
    const pass = localStorage.getItem("password_id");

    // Don't guard `/login` path
    if (pathname === "/login") {
      setLoading(false);
      return;
    }

    if (!email || !pass) {
      router.replace("/login");
    } else {
      setAuthenticated(true);
      setLoading(false);
    }
  }, [pathname, router]);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "All Interviews", href: "/allinterviews", icon: History },
    { name: "Profile", href: "/profile", icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <ChirayuLogo size={48} />
          <div className="flex items-center gap-2 mt-4">
            <span className="size-2 bg-primary-blue rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="size-2 bg-solar-yellow rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="size-2 bg-success-green rounded-full animate-bounce" />
          </div>
          <span className="text-xs font-semibold text-soft-gray tracking-wide">
            Verifying Portal Credentials...
          </span>
        </div>
      </div>
    );
  }

  if (!authenticated && pathname !== "/login") {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground animate-fadeIn">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border-gray shrink-0 sticky top-0 h-screen py-6 px-4">
        {/* Logo Section */}
        <div className="mb-10 px-2">
          <Link href="/">
            <ChirayuLogo />
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-blue/10 text-primary-blue"
                    : "text-soft-gray hover:bg-gray-50 hover:text-dark-100"
                }`}
              >
                <Icon size={18} className={isActive ? "text-primary-blue" : "text-soft-gray"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="pt-4 border-t border-border-gray px-2 text-[10px] text-soft-gray">
          © 2026 Chirayu Power Pvt. Ltd.
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden w-full flex flex-col min-h-screen">
        <header className="w-full flex items-center justify-between px-4 py-3 bg-white border-b border-border-gray z-40">
          <Link href="/">
            <ChirayuLogo size={28} />
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-soft-gray hover:text-dark-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)}>
            <div
              className="w-64 bg-white h-full flex flex-col py-6 px-4 shadow-xl animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-10 px-2 flex justify-between items-center">
                <ChirayuLogo size={28} />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 text-soft-gray hover:text-dark-100 focus:outline-none"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary-blue/10 text-primary-blue"
                          : "text-soft-gray hover:bg-gray-50 hover:text-dark-100"
                      }`}
                    >
                      <Icon size={18} className={isActive ? "text-primary-blue" : "text-soft-gray"} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
              
              <div className="pt-4 border-t border-border-gray px-2 text-[10px] text-soft-gray">
                © 2026 Chirayu Power Pvt. Ltd.
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area - Mobile */}
        <main className="flex-1 p-4 md:p-8 bg-background max-w-full">
          {children}
        </main>
      </div>

      {/* Main Content Area - Desktop */}
      <main className="hidden md:block flex-1 p-8 bg-background overflow-y-auto max-w-[calc(100vw-16rem)] font-sans">
        {children}
      </main>
    </div>
  );
};

export default Layout;

