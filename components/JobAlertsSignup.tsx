"use client";
import { useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { jobAlertSignupSchema } from "@/lib/hiring/jobAlerts";
const base=process.env.NEXT_PUBLIC_BASE_PATH || "";
const socials=[
  {label:"X",href:"https://x.com/Chirayu_Power",Icon:FaXTwitter,brand:"x"},
  {label:"Facebook",href:"https://www.facebook.com/share/1CA7tkNtrM/?mibextid=wwXIfr",Icon:FaFacebookF,brand:"facebook"},
  {label:"Instagram · Chirayu Power",href:"https://www.instagram.com/chirayu_power?stkn=NW00YTg3Nmg5cXJq",Icon:FaInstagram,brand:"instagram"},
  {label:"Instagram · Eventzone",href:"https://www.instagram.com/chirayupower_eventzone?stkn=NDFrM2l3a2x3dnl1",Icon:FaInstagram,brand:"instagram"},
  {label:"LinkedIn",href:"https://www.linkedin.com/company/chirayu-power-pvt-ltd/",Icon:FaLinkedinIn,brand:"linkedin"},
];
export default function JobAlertsSignup() {
  const id=useId();const first=useRef<HTMLInputElement>(null);const trigger=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(busy) return;
    const form=new FormData(e.currentTarget);
    const parsed=jobAlertSignupSchema.safeParse({email:form.get("email"),mobile:form.get("mobile"),consent:form.get("consent")==="on",newsletter:form.get("newsletter")==="on",website:form.get("website")});
    if(!parsed.success){setError(parsed.error.issues[0].message);return;}
    setBusy(true);setError("");
    try {
      const r=await fetch(`${base}/api/hiring/alerts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data)});
      const body=await r.json();if(!r.ok)throw new Error(body.error);
      setMessage(body.message);
    } catch(e){setError((e as Error).message || "Could not subscribe. Please try again.");}
    finally{setBusy(false);}
  }
  return <>
    <button ref={trigger} type="button" className="job-alerts-btn" aria-expanded={open} aria-controls={`${id}-form`}
      onClick={()=>{setOpen(!open);if(!open)requestAnimationFrame(()=>first.current?.focus());}}>
      <Bell size={16} aria-hidden="true"/> {open?"Close signup":"Get Job Alerts"}
    </button>
    {open && <div id={`${id}-form`} className="job-alerts-signup">
      {message?<p role="status">{message}</p>:<form onSubmit={submit} aria-label="Subscribe to job alerts" aria-busy={busy}>
        <fieldset disabled={busy}>
          <legend>Get new jobs by email</legend>
          <label htmlFor={`${id}-email`}>Email address <span aria-hidden="true">*</span></label>
          <input ref={first} id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} required />
          <label htmlFor={`${id}-mobile`}>Mobile number <span aria-hidden="true">*</span></label>
          <input id={`${id}-mobile`} name="mobile" type="tel" autoComplete="tel" placeholder="+91 98765 43210" maxLength={24} required aria-describedby={`${id}-mobile-hint`} />
          <p id={`${id}-mobile-hint`} className="job-alerts-hint">Include your country code. Job alerts are sent by email, not SMS.</p>
          <label className="job-alerts-consent"><input type="checkbox" name="consent" required/> <span>I agree to Chirayu Power storing my email and mobile number and sending me job-alert emails. I can unsubscribe at any time.</span></label>
          <label className="job-alerts-consent"><input type="checkbox" name="newsletter"/> <span>Also send me career newsletters (optional).</span></label>
          <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
          <button type="submit" className="job-alerts-btn">{busy?"Submitting...":"Send confirmation email"}</button>
        </fieldset>
        {error && <p role="alert" className="job-alerts-error">{error}</p>}
      </form>}
    </div>}
    <nav aria-label="Follow Chirayu Power" className="job-alerts-socials">
      <p>Follow us for more updates</p>
      <ul>{socials.map(({label,href,Icon,brand})=><li key={href}><a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}><span className={`social-brand social-brand-${brand}`} aria-hidden="true"><Icon/></span><span>{label}</span></a></li>)}</ul>
    </nav>
  </>;
}
