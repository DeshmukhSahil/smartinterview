"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  HelpCircle,
  LogOut,
  UserRound,
  X,
  House,
  CalendarDays,
  FileText,
  ChevronRight,
} from "lucide-react";
import { ChirayuLogo } from "@/components/ui/chirayu-logo";
import PortalLoading from "@/components/PortalLoading";
import styles from "@/components/PortalShell.module.css";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [name, setName] = useState("Candidate");
  const account = useRef<HTMLDetailsElement>(null);
  const help = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const email = localStorage.getItem("candidate_email");
    const pass = localStorage.getItem("password_id");
    if (account.current) account.current.open = false;
    help.current?.close();
    if (!email || !pass) {
      setAuthenticated(false);
      if (/^\/portal\/interview\/[^/]+$/.test(pathname))
        sessionStorage.setItem("interview_return_path", pathname);
      router.replace("/login");
    } else {
      setName(localStorage.getItem("candidate_name") || "Candidate");
      setAuthenticated(true);
    }
  }, [pathname, router]);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (account.current && !account.current.contains(event.target as Node))
        account.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && account.current?.open) {
        account.current.open = false;
        account.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const signOut = () => {
    ["candidate_email", "candidate_name", "password_id"].forEach((key) =>
      localStorage.removeItem(key),
    );
    router.replace("/login");
  };
  const interviewPage =
    /^\/portal\/interview\/[^/]+\/?$/.test(pathname) && !pathname.endsWith("/create");

  return (
    <div className={styles.shell} data-candidate-portal>
      <a className={styles.skipLink} href="#candidate-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.breadcrumb}>
            <Link href="/portal">Home</Link>
            <ChevronRight size={16} />
            <span>
              {pathname === "/portal"
                ? "Overview"
                : pathname === "/portal/profile"
                  ? "My profile"
                  : "My interviews"}
            </span>
          </div>
          <Link
            href="/portal"
            className={styles.brand}
            aria-label="Chirayu Hire home"
          >
            <ChirayuLogo height={34} />
            <span>Hire</span>
          </Link>
          <nav className={styles.navigation} aria-label="Candidate navigation">
            <Link href="/portal" aria-current={pathname === "/portal" ? "page" : undefined}>
              Home
            </Link>
            <Link
              href="/portal/allinterviews"
              aria-current={
                pathname === "/portal/allinterviews" ||
                pathname.startsWith("/portal/interview/")
                  ? "page"
                  : undefined
              }
            >
              Interviews
            </Link>
            <Link
              href="/portal/profile"
              aria-current={pathname === "/portal/profile" ? "page" : undefined}
            >
              Profile
            </Link>
          </nav>
          <button
            className={styles.helpButton}
            type="button"
            aria-label="Help"
            onClick={() => help.current?.showModal()}
          >
            <HelpCircle size={18} />
          </button>
          <details ref={account} className={styles.account}>
            <summary aria-label="Your account">
              <span className={styles.avatar}>
                {name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span className={styles.accountName}>{name}</span>
              <ChevronDown size={16} />
            </summary>
            <div className={styles.accountPanel}>
              <p>{name}</p>
              <Link href="/portal/profile">
                <UserRound size={18} />
                Your profile
              </Link>
              <button type="button" onClick={signOut}>
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </details>
        </div>
      </header>
      <aside className={styles.sidebar} aria-label="Candidate sidebar">
        <Link
          href="/portal"
          className={styles.sidebarBrand}
          aria-label="Chirayu Hire home"
        >
          <ChirayuLogo height={42} />
          <span>Hire</span>
        </Link>
        <nav aria-label="Sidebar navigation">
          <Link href="/portal" aria-current={pathname === "/portal" ? "page" : undefined}>
            <House size={20} />
            Overview
          </Link>
          <Link
            href="/portal/allinterviews"
            aria-current={
              pathname === "/portal/allinterviews" ||
              pathname.startsWith("/portal/interview/")
                ? "page"
                : undefined
            }
          >
            <CalendarDays size={20} />
            My interviews
          </Link>
          <button
            disabled
            title="Application tracking is not available in the candidate portal"
          >
            <FileText size={20} />
            Applications<span className={styles.soon}>—</span>
          </button>
          <Link
            href="/portal/profile"
            aria-current={pathname === "/portal/profile" ? "page" : undefined}
          >
            <UserRound size={20} />
            My profile
          </Link>
          <button onClick={() => help.current?.showModal()}>
            <HelpCircle size={20} />
            Help
          </button>
        </nav>
        <div
          className={styles.sidebarStory}
          role="img"
          aria-label="Building a brighter tomorrow. People for a cleaner planet."
          style={{
            backgroundImage: `url('${process.env.NEXT_PUBLIC_BASE_PATH || ""}/brand/sidebar-story.webp')`,
          }}
        />
      </aside>
      <main
        id="candidate-content"
        tabIndex={-1}
        className={`${styles.content} ${interviewPage ? styles.interview : ""}`}
        aria-busy={!authenticated}
      >
        {authenticated ? children : <PortalLoading />}
      </main>
      <dialog
        ref={help}
        className="hire-dialog"
        aria-labelledby="candidate-help-title"
        aria-describedby="candidate-help-description"
      >
        <button
          type="button"
          className="hire-icon-button hire-dialog-close"
          aria-label="Close help"
          onClick={() => help.current?.close()}
        >
          <X size={20} />
        </button>
        <p className="hire-eyebrow">Here to help</p>
        <h2 id="candidate-help-title">A little guidance.</h2>
        <p id="candidate-help-description">
          For an access code, a change of time, or support with your
          application, contact the recruiter listed in your invitation email.
        </p>
        <p>
          For an AI interview, open your invitation to check your microphone and
          speakers before starting. Your camera is optional.
        </p>
        <button
          type="button"
          className="hire-button"
          onClick={() => help.current?.close()}
        >
          Got it
        </button>
      </dialog>
    </div>
  );
}
