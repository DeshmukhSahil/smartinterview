"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, FileText, Landmark, UserCheck } from "lucide-react";

export default function CreateInterviewPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [companyKnowledge, setCompanyKnowledge] = useState(
    `Company Overview:
Chirayu Power Pvt. Ltd. is a Renewable Energy / Solar EPC company founded in 2014, headquartered in Khamgaon, Maharashtra, India. We handle complete EPC execution including site assessment, system design, engineering, procurement, installation, commissioning, monitoring, and O&M services.

Vision & Mission:
To become India's most trusted and ethical renewable energy solutions provider. We deliver reliable, transparent solutions, drive sustainable growth, and support India's clean energy transition.

Core Values:
1. Transparency: Open communication.
2. Integrity: Ethical business practices.
3. Innovation: Adoption of modern technologies.
4. Quality Excellence: Engineering precision and safety.
5. Sustainability: Commitment to environmental responsibility.

Interview Instructions:
You are an interviewer representing Chirayu Power. Keep these values and facts in mind. Assess if the candidate aligns with our engineering-driven, customer-first, and ethical culture. If they ask questions about the company, use this knowledge to answer accurately.`
  );
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification State
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!role || !jobDescription || !companyKnowledge) {
      alert("Please fill in Role, Job Description, and Company Knowledge");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/vapi/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          jobDescription,
          companyKnowledge,
          aiModel,
          resume,
          amount: 5,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedQuestions(data.questions);
        setIsVerifying(true);
      } else {
        alert("Failed to generate questions. " + (data.error || ""));
        console.log(data);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong generating questions.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (index: number, newValue: string) => {
    const updated = [...generatedQuestions];
    updated[index] = newValue;
    setGeneratedQuestions(updated);
  };

  const handleSaveAndStart = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/interview/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          jobDescription,
          companyKnowledge,
          aiModel,
          resume,
          questions: generatedQuestions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/interview/${data.id}`);
      } else {
        alert("Failed to save interview");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong saving the interview.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-6 px-4">
      <div className="w-full max-w-3xl bg-white p-8 rounded-2xl border border-border-gray shadow-md">
        <h1 className="text-3xl font-bold text-dark-100 mb-2 text-center">
          {isVerifying ? "Verify Generated Questions" : "Generate Mock Interview Session"}
        </h1>
        <p className="text-sm text-soft-gray text-center mb-8">
          {isVerifying
            ? "Inspect, refine, or rewrite the generated interview questions before initiation."
            : "Compile context, job requirements, and candidate records to create a tailored mock interview."}
        </p>

        {!isVerifying ? (
          <div className="space-y-6">
            {/* Role Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                <UserCheck size={16} className="text-primary-blue" />
                Target Professional Role
              </label>
              <input
                type="text"
                placeholder="e.g. Solar Design Engineer, Operations Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-border-gray bg-white text-dark-100 placeholder-light-400 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all"
              />
            </div>

            {/* AI Model Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                <Cpu size={16} className="text-primary-blue" />
                Interview AI Engine Model
              </label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-border-gray bg-white text-dark-100 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all font-medium cursor-pointer"
              >
                <option value="gemini-2.5-flash">Cloud (Gemini 2.5 Flash - Recommended)</option>
                <option value="gemini-3.5-flash">Cloud (Gemini 3.5 Flash)</option>
                <option value="gemini-2.5-pro">Cloud (Gemini 2.5 Pro)</option>
                <option value="tinyllama">Local (TinyLlama - Fast/Low RAM)</option>
                <option value="llama3">Local (Llama 3 - Better/High RAM)</option>
              </select>
            </div>

            {/* Company Knowledge */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                <Landmark size={16} className="text-primary-blue" />
                Corporate Context & Guidelines
              </label>
              <textarea
                placeholder="Enter company facts, core values, guidelines..."
                value={companyKnowledge}
                onChange={(e) => setCompanyKnowledge(e.target.value)}
                rows={6}
                className="w-full p-3.5 rounded-xl border border-border-gray bg-white text-dark-100 placeholder-light-400 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all resize-y"
              />
            </div>

            {/* Job Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                <FileText size={16} className="text-primary-blue" />
                Job Description Details
              </label>
              <textarea
                placeholder="Paste structural details, job roles, qualifications..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={6}
                className="w-full p-3.5 rounded-xl border border-border-gray bg-white text-dark-100 placeholder-light-400 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all resize-y"
              />
            </div>

            {/* Resume Details */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                <FileText size={16} className="text-primary-blue" />
                Candidate Resume Content
              </label>
              <textarea
                placeholder="Paste candidate record details, experience history..."
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                rows={6}
                className="w-full p-3.5 rounded-xl border border-border-gray bg-white text-dark-100 placeholder-light-400 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all resize-y"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 disabled:bg-primary-blue/50 text-white font-bold py-4 rounded-xl shadow-sm cursor-pointer transition-all text-sm uppercase tracking-wider"
            >
              {loading ? "Analyzing Context & Synthesizing..." : "Initiate Interview Generation"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-soft-gray bg-gray-50 p-4 rounded-xl border border-border-gray">
              Please review the generated questions. You can edit them directly below.
            </p>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {generatedQuestions.map((q, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-primary-blue font-bold mt-3 text-sm">{i + 1}.</span>
                  <textarea
                    value={q}
                    onChange={(e) => handleQuestionChange(i, e.target.value)}
                    rows={2}
                    className="w-full p-3 rounded-xl border border-border-gray bg-white text-dark-100 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setIsVerifying(false)}
                className="w-1/3 bg-white hover:bg-gray-50 text-soft-gray font-semibold py-3.5 border border-border-gray rounded-xl transition cursor-pointer text-sm"
              >
                Go Back
              </button>
              <button
                onClick={handleSaveAndStart}
                disabled={saving}
                className="w-2/3 bg-success-green hover:bg-success-green/90 disabled:bg-success-green/50 text-white font-bold py-3.5 rounded-xl shadow-sm transition cursor-pointer text-sm uppercase tracking-wider"
              >
                {saving ? "Saving Data..." : "Confirm & Launch Interview"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}