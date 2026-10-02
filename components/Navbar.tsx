"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import styles from "./Navbar.module.css";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Career Home", href: "/" },
  { label: "Contact Us", href: "https://chirayupower.com/contact-us" },
];

const isExternal = (href: string) => href.startsWith("http");

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          // Use hysteresis: trigger at 30px, untrigger at 10px to eliminate boundary bounce
          setIsScrolled(prev => (prev ? scrollY > 10 : scrollY > 30));
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""}`}>
      <div className={styles.navbarInner}>
        {/* Brand Area -- always the main company site, not this careers
            app's own home (that's what the "Career Home" nav link is for). */}
        <a href="https://chirayupower.com" className={styles.brandArea} aria-label="Chirayu Power Home">
          <div className={styles.logoWrapper}>
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/assets/chirayu-icon1.png`}
              alt="Chirayu Power Logo"
              className={styles.logoImg}
            />
          </div>
        </a>

        {/* Navigation Links */}
        <div className={styles.navLinks}>
          {navItems.map(item => {
            const isActive = !isExternal(item.href) && (pathname === item.href || (item.href === "/" && /^\/(departments|roles|jobs)(\/|$)/.test(pathname)) || (item.href !== "/" && pathname.startsWith(item.href)));
            const className = `${styles.navLink} ${isActive ? styles.active : ""}`;

            return isExternal(item.href) ? (
              <a key={item.label} href={item.href} className={className}>
                {item.label}
              </a>
            ) : (
              <Link key={item.label} href={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Action Area */}
        <div className={styles.actionArea}>
          <button
            type="button"
            className={styles.mobileToggle}
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="careers-mobile-navigation"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileOpen && (
          <div id="careers-mobile-navigation" className={styles.mobileMenu}>
            {navItems.map(item =>
              isExternal(item.href) ? (
                <a
                  key={item.label}
                  href={item.href}
                  className={styles.mobileMainLink}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={styles.mobileMainLink}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
