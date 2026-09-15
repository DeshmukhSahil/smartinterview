"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import {
  LayoutDashboard,
  History,
  User,
  Menu,
  X,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { ChirayuLogo } from "@/components/ui/chirayu-logo";
import PortalLoading from "@/components/PortalLoading";
import styles from "@/components/PortalShell.module.css";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [name, setName] = useState("Candidate");
  useEffect(() => {
    const email = localStorage.getItem("candidate_email");
    const pass = localStorage.getItem("password_id");
    setMobileOpen(false);
    if (!email || !pass) {
      setAuthenticated(false);
      if (/^\/interview\/[^/]+$/.test(pathname))
        sessionStorage.setItem("interview_return_path", pathname);
      router.replace("/login");
    } else {
      setName(localStorage.getItem("candidate_name") || "Candidate");
      setAuthenticated(true);
    }
  }, [pathname, router]);
  const interviewPage =
    /^\/interview\/[^/]+\/?$/.test(pathname) && !pathname.endsWith("/create");
  const title = interviewPage
    ? "Interview room"
    : pathname === "/allinterviews"
      ? "All interviews"
      : pathname === "/profile"
        ? "Your profile"
        : pathname.includes("feedback")
          ? "Interview feedback"
          : "Dashboard";
  const nav = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "All interviews", href: "/allinterviews", icon: History },
    { label: "Profile", href: "/profile", icon: User },
  ];
  return (
    <div className={styles.shell}>
      {mobileOpen && (
        <button
          className={styles.scrim}
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}
        aria-label="Portal sidebar"
      >
        <div className={styles.logo}>
          <Link href="/" aria-label="Chirayu Power home">
            <ChirayuLogo height={42} />
          </Link>
          <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={19} />
          </button>
        </div>
        <p className={styles.sectionLabel}>INTERVIEW PORTAL</p>
        <nav aria-label="Portal navigation">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <a
          className={styles.brandStory}
          href="https://chirayupower.com/about-us/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div
            className={styles.brandPhoto}
            style={{
              backgroundImage: `url(${process.env.NEXT_PUBLIC_BASE_PATH || ""}/brand/solar-sidebar.webp)`,
            }}
            aria-hidden="true"
          />
          <div>
            <span>THE COMPANY BEHIND YOUR NEXT STEP</span>
            <strong>Energy with integrity.</strong>
            <p>
              Get to know Chirayu Power <ArrowUpRight size={14} />
            </p>
          </div>
        </a>
        <footer>© {new Date().getFullYear()} Chirayu Power</footer>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.navbar}>
          <button
            className={styles.menu}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu size={20} />
          </button>
          <div className={styles.mobileLogo}>
            <ChirayuLogo height={30} />
          </div>
          <div className={styles.breadcrumb}>
            <span>Chirayu Hire</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className={styles.profile}>
            <span className={styles.avatar}>
              {name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <strong>{name}</strong>
              <span>Candidate portal</span>
            </div>
          </div>
        </header>
        <main
          className={`${styles.content} ${interviewPage ? styles.interview : ""}`}
          aria-busy={!authenticated}
        >
          {authenticated ? children : <PortalLoading />}
        </main>
      </div>
    </div>
  );
}
