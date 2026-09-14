"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, Phone, Sun, Moon } from "lucide-react";
import styles from "./Navbar.module.css";

type NavItem = {
  label: string;
  href: string;
  items?: {
    title: string;
    href: string;
  }[];
};

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    items: [
      { title: "About us", href: "/#about" },
      { title: "Why Chirayu Power", href: "/#why-chirayu" },
    ],
  },
  {
    label: "Services",
    href: "/#services",
    items: [
      { title: "Industrial Solar (EPC)", href: "/#industrial-solar" },
      { title: "Open Access Solar", href: "/#open-access" },
      { title: "Group Captive Solar", href: "/#group-captive" },
      { title: "Commercial Solar", href: "/#commercial" },
      { title: "Residential Solar", href: "/#residential" },
      { title: "Utility-Scale Solar", href: "/#utility" },
      { title: "Battery Storage (BESS)", href: "/#bess" },
    ],
  },
  {
    label: "Finance",
    href: "/#finance",
  },
  {
    label: "Investors",
    href: "/#investors",
  },
  {
    label: "Case Study",
    href: "/#casestudy",
    items: [
      { title: "All Case Studies", href: "/#casestudy" },
      { title: "2.9 MW Simplex Chemopack", href: "/#simplex" },
      { title: "2.3 MW Kirti Gold Latur", href: "/#kirti" },
    ],
  },
  {
    label: "Knowledge Center",
    href: "/#knowledge-center",
    items: [
      { title: "Distribution Open Access (DOA)", href: "/#doa" },
      { title: "DOA Savings Estimator", href: "/#calculator" },
      { title: "MERC & MSEDCL Circulars", href: "/#circulars" },
    ],
  },
  {
    label: "Careers",
    href: "/apply",
  },
  {
    label: "Interview Portal",
    href: "/login",
  },
  {
    label: "Contact Us",
    href: "/#contact",
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

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

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""}`}>
      <div className={styles.navbarInner}>
        {/* Brand Area */}
        <Link href="/" className={styles.brandArea} aria-label="Chirayu Power Home">
          <div className={styles.logoWrapper}>
            <img
              src="/assets/chirayu-icon1.png"
              alt="Chirayu Power Logo"
              className={styles.logoImg}
            />
          </div>
        </Link>

        {/* Navigation Links */}
        <div className={styles.navLinks}>
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            if (!item.items) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <div key={item.label} className={styles.navDropdown}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                >
                  {item.label}
                  <ChevronDown size={12} className={styles.dropdownChevron} />
                </Link>

                <div className={styles.dropdownPanel}>
                  {item.items.map(subItem => (
                    <Link
                      key={subItem.title}
                      href={subItem.href}
                      className={styles.dropdownItem}
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Area */}
        <div className={styles.actionArea}>
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeToggle}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <a href="/#contact" className={styles.contactPill}>
            <Phone size={12} />
            <span>Enquire</span>
          </a>

          <button
            type="button"
            className={styles.mobileToggle}
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileOpen && (
          <div className={styles.mobileMenu}>
            {navItems.map(item => (
              <div key={item.label} className={styles.mobileGroup}>
                <Link
                  href={item.href}
                  className={styles.mobileMainLink}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>

                {item.items && (
                  <div className={styles.mobileSubLinks}>
                    {item.items.map(subItem => (
                      <Link
                        key={subItem.title}
                        href={subItem.href}
                        onClick={() => setMobileOpen(false)}
                      >
                        {subItem.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
