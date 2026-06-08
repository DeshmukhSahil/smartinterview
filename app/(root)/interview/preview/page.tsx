"use client";

import { useState, useEffect } from "react";
import Agent from "@/components/Agent";
import { Loader2 } from "lucide-react";

export default function PreviewPage() {
  const [previewData, setPreviewData] = useState<any | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Receive form details from Vite parent page
      if (event.data && event.data.type === "SYNC_PREVIEW") {
        setPreviewData(event.data.payload);
      }
    };
    window.addEventListener("message", handleMessage);
    
    // Request initial state from parent if already rendered
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!previewData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 h-full">
        <svg className="size-10 text-soft-gray animate-pulse mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-xs font-bold text-dark-100">AI Companion Playground</h3>
        <p className="text-[10px] text-soft-gray mt-1 max-w-[280px]">
          Enter your guidelines on the left, then click <b>"Load Preview"</b> to start testing the AI companion here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-inner h-full flex flex-col justify-between">
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
          <span className="size-1.5 bg-green-500 rounded-full animate-ping" />
          Live Playground Session
        </span>
        <button
          onClick={() => setPreviewData(null)}
          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
        >
          Reset Session
        </button>
      </div>

      <div className="flex-1 min-h-[450px]">
        <Agent
          userName="HR Tester"
          userId="hr-tester-user"
          interviewId="preview-session"
          type="interview"
          questions={previewData.questions || ["Tell me about yourself."]}
          jobDescription={previewData.job_description || "Software Engineer Position"}
          companyKnowledge={previewData.company_knowledge || "Chirayu Power Pvt. Ltd."}
          aiModel={previewData.ai_model || "gemini-2.5-flash"}
          resume={previewData.resume || "Candidate background details"}
          role={previewData.role || "Software Engineer"}
          systemPrompt={previewData.system_prompt || ""}
        />
      </div>
    </div>
  );
}
