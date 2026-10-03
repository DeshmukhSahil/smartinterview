"use client";
import React, { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import Navbar from "@/components/Navbar";
import styles from "./ContactPage.module.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const TITLE_TEXT = "Let's Talk";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type FormState = { name: string; email: string; message: string; company: string };
type Field = keyof Omit<FormState, "company">;

const SOCIALS: { label: string; href: string; icon: React.ReactNode }[] = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/chirayupower/",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/chirayupower/",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/chirayupower/",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@chirayupower",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

const GALLERY_IMAGES = [
  { src: `${BASE_PATH}/assets/contact/commercial.png`, alt: "Chirayu Power commercial solar installation" },
  { src: `${BASE_PATH}/assets/contact/Counter.png`, alt: "Chirayu Power solar system counter and metrics" },
  { src: `${BASE_PATH}/assets/contact/residential.png`, alt: "Chirayu Power residential solar solutions" },
  { src: `${BASE_PATH}/assets/contact/Stats-img.png`, alt: "Chirayu Power high-performance solar statistics" },
  { src: `${BASE_PATH}/assets/contact/open-access.png`, alt: "Chirayu Power open access solar farm" },
  { src: `${BASE_PATH}/assets/contact/bess_battery_storage.png`, alt: "Chirayu Power battery energy storage system (BESS)" },
];

export default function ContactPage() {
  const prefersReducedMotion = useReducedMotion();
  const [form, setForm] = useState<FormState>({ name: "", email: "", message: "", company: "" });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const errors: Partial<Record<Field, string>> = {};
  if (form.name.trim().length < 2) errors.name = "Enter your name.";
  if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (form.message.trim().length < 10) errors.message = "Please add a few more details (at least 10 characters).";

  const markTouched = (field: Field) => setTouched(t => ({ ...t, [field]: true }));
  const invalidClass = (field: Field, base: string) => `${base} ${touched[field] && errors[field] ? styles.invalid : ""}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setTouched({ name: true, email: true, message: true });
    if (Object.keys(errors).length) return;

    setBusy(true);
    try {
      const r = await fetch(`${BASE_PATH}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Could not send your message. Please try again.");
      setSubmitted(true);
      setForm({ name: "", email: "", message: "", company: "" });
      setTouched({});
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className={styles.contactPage}>
        {/* 1. Top hero panoramic visual banner */}
        <div className={styles.heroBannerContainer}>
          <div className={styles.bannerWrapper}>
            <Image
              src={`${BASE_PATH}/assets/contact/industrial.png`}
              alt="Chirayu Power industrial solar installation"
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
            <div className={styles.bannerOverlay} aria-hidden="true" />
          </div>
        </div>

        <div className={styles.contentContainer}>
          {/* 2. TALK SOLAR section label & divider */}
          <section className={styles.sectionHeader} aria-label="Section Heading">
            <span className={styles.talkSolarTag}>TALK SOLAR</span>
            <hr className={styles.dividerLine} />
          </section>

          {/* 3. Main contact two-column area */}
          <div className={styles.mainGrid}>
            <div className={styles.leftCol}>
              <motion.h1
                className={styles.pageTitle}
                aria-label={TITLE_TEXT}
                initial={prefersReducedMotion ? false : "hidden"}
                whileInView="visible"
                viewport={{ once: true, amount: 0.35 }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.04 } } }}
              >
                {TITLE_TEXT.split(" ").map((word, wordIndex, words) => (
                  <React.Fragment key={`${word}-${wordIndex}`}>
                    <span className={styles.headingWord}>
                      {Array.from(word).map((character, characterIndex) => (
                        <motion.span
                          key={`${character}-${characterIndex}`}
                          aria-hidden="true"
                          className={styles.letterSpan}
                          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
                        >
                          {character}
                        </motion.span>
                      ))}
                    </span>
                    {wordIndex < words.length - 1 ? " " : null}
                  </React.Fragment>
                ))}
              </motion.h1>
              <motion.p
                className={styles.subtitle}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.9, delay: prefersReducedMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                Got a project on your mind? Let&apos;s discuss how Chirayu Power can help you build reliable,
                high-performance solar solutions.
              </motion.p>

              <div className={styles.contactInfoGroup}>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Call Us</span>
                  <a href="tel:+919112114440" className={styles.phoneLink}>+91 91121 14440</a>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Email Us</span>
                  <a href="mailto:sales@chirayupower.com" className={styles.emailLink}>sales@chirayupower.com</a>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Office</span>
                  <p className={styles.addressText}>C-1/1, M.I.D.C., Near Law College, Khamgaon &ndash; 444303, Maharashtra</p>
                </div>
              </div>

              <div className={styles.socialRow} aria-label="Social media profiles">
                {SOCIALS.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={styles.socialIconLink} aria-label={s.label}>
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Right column: large rounded contact form */}
            <div className={styles.formCard}>
              {submitted ? (
                <div className={styles.successMessage} role="status">
                  Thank you! Your message has been sent successfully. Our team will get back to you shortly.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                  <div className={styles.formField}>
                    <label htmlFor="contact-name" className={styles.visuallyHidden}>Name</label>
                    <input
                      type="text"
                      id="contact-name"
                      name="name"
                      placeholder="Name"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      onBlur={() => markTouched("name")}
                      autoComplete="name"
                      className={invalidClass("name", styles.formInput)}
                    />
                    {touched.name && errors.name && <span className={styles.errorMessage}>{errors.name}</span>}
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="contact-email" className={styles.visuallyHidden}>Email</label>
                    <input
                      type="email"
                      id="contact-email"
                      name="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      onBlur={() => markTouched("email")}
                      autoComplete="email"
                      className={invalidClass("email", styles.formInput)}
                    />
                    {touched.email && errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="contact-message" className={styles.visuallyHidden}>Your Message</label>
                    <textarea
                      id="contact-message"
                      name="message"
                      placeholder="Your Message"
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      onBlur={() => markTouched("message")}
                      className={invalidClass("message", styles.formTextarea)}
                    />
                    {touched.message && errors.message && <span className={styles.errorMessage}>{errors.message}</span>}
                  </div>

                  {/* Honeypot: hidden from real visitors via CSS/aria-hidden and
                      skipped in tab order, but still present for a bot that
                      fills every field blindly -- a filled value is discarded
                      server-side without sending anything or erroring. */}
                  <div className={styles.visuallyHidden} aria-hidden="true">
                    <label htmlFor="contact-company">Company</label>
                    <input
                      type="text"
                      id="contact-company"
                      name="company"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.company}
                      onChange={e => setForm({ ...form, company: e.target.value })}
                    />
                  </div>

                  <button type="submit" disabled={busy} className={styles.submitBtn} id="contact-submit-button">
                    {busy ? "Sending..." : "Submit"}
                  </button>

                  {serverError && <div className={styles.formError} role="alert">{serverError}</div>}
                </form>
              )}
            </div>
          </div>

          {/* 4. Large whitespace followed by 3x2 image gallery */}
          <section className={styles.gallerySection} aria-label="Solar Projects Gallery">
            <div className={styles.galleryGrid}>
              {GALLERY_IMAGES.map(image => (
                <div key={image.src} className={styles.galleryCard}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className={styles.galleryImg}
                  />
                </div>
              ))}
            </div>
          </section>

          <footer className={styles.minimalFooter}>
            <span>CHIRAYU POWER PVT. LTD. &middot; ENERGY WITH INTEGRITY</span>
            <span>BUILD SOMETHING THAT MATTERS. &#8599;</span>
          </footer>
        </div>
      </div>
    </>
  );
}
