"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
const base=process.env.NEXT_PUBLIC_BASE_PATH || "";
export default function SubscriptionAction() {
  const {action}=useParams<{action:string}>();
  const [token,setToken]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  useEffect(()=>{setToken(window.location.hash.slice(1));},[]);
  const valid=(action==="confirm" || action==="unsubscribe") && /^[a-f0-9]{64}$/.test(token);
  async function submit(e: React.FormEvent) {
    e.preventDefault();setBusy(true);setError("");
    try {
      const r=await fetch(`${base}/api/hiring/alerts/action`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,token})});
      const body=await r.json();if(!r.ok) throw new Error(body.error);
      setMessage(body.message);history.replaceState(null,"",location.pathname);
    } catch(e) {setError((e as Error).message || "Please try again.");}
    finally {setBusy(false);}
  }
  return <main className="mx-auto max-w-xl px-6 py-16 text-slate-800">
    <h1 className="mb-4 text-2xl font-semibold">{action==="unsubscribe"?"Unsubscribe from career emails":"Confirm your job alerts"}</h1>
    {message?<p role="status">{message}</p>:valid?<form onSubmit={submit} className="space-y-4">
      <p>{action==="unsubscribe"?"Stop receiving job alerts and career newsletters from Chirayu Power.":"Confirm that you want Chirayu Power to email you about new jobs and any career newsletters you selected."}</p>
      <button type="submit" disabled={busy} className="rounded border bg-blue-800 px-5 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{busy?"Updating...":action==="unsubscribe"?"Unsubscribe":"Confirm subscription"}</button>
      {error && <p role="alert">{error}</p>}
    </form>:<p>Open the complete link from your email. If it has expired, sign up again.</p>}
    <a href={`${base}/`} className="mt-6 inline-block text-blue-800 underline">Back to careers</a>
  </main>;
}
