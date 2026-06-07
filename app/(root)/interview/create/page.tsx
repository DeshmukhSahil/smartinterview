"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

        const response = await fetch("/api/vapi/generate", {
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
            amount: 5, // let's keep it 5 for testing
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
      const response = await fetch("/api/interview/save", {
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
    <div className="min-h-screen flex justify-center items-center px-4 py-12">
      <div className="w-full max-w-3xl bg-[#111827] p-8 rounded-2xl shadow-xl">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          {isVerifying ? "Verify Questions" : "Create Interview from JD"}
        </h1>

        {!isVerifying ? (
          <div className="space-y-5">
            {/* Role */}
            <input
              type="text"
              placeholder="Enter the role (e.g. Frontend Developer)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-4 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder-gray-400"
            />

            {/* AI Model Selection */}
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full p-4 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gemini-2.5-flash">Cloud (Gemini 2.5 Flash - Recommended)</option>
              <option value="gemini-3.5-flash">Cloud (Gemini 3.5 Flash)</option>
              <option value="gemini-2.5-pro">Cloud (Gemini 2.5 Pro)</option>
              <option value="tinyllama">Local (TinyLlama - Fast/Low RAM)</option>
              <option value="llama3">Local (Llama 3 - Better/High RAM)</option>
            </select>

            {/* Company Knowledge */}
            <textarea
              placeholder="Enter company knowledge and core values..."
              value={companyKnowledge}
              onChange={(e) => setCompanyKnowledge(e.target.value)}
              rows={6}
              className="w-full p-4 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder-gray-400 resize-y"
            />

            {/* Job Description */}
            <textarea
              placeholder="Paste the full Job Description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              className="w-full p-4 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder-gray-400 resize-y"
            />

            {/* Candidate Resume */}
            <textarea
              placeholder="Paste Candidate's Resume here..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={8}
              className="w-full p-4 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder-gray-400 resize-y"
            />

            {/* Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-4 rounded-lg transition"
            >
              {loading ? "Analyzing Context & Generating..." : "Generate Interview"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-gray-300">
              Please review the generated questions. You can edit them directly below.
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {generatedQuestions.map((q, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-gray-400 font-bold mt-2">{i + 1}.</span>
                  <textarea
                    value={q}
                    onChange={(e) => handleQuestionChange(i, e.target.value)}
                    rows={2}
                    className="w-full p-3 rounded-lg border border-gray-600 bg-gray-900 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setIsVerifying(false)}
                className="w-1/3 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 rounded-lg transition"
              >
                Back
              </button>
              <button
                onClick={handleSaveAndStart}
                disabled={saving}
                className="w-2/3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold py-4 rounded-lg transition"
              >
                {saving ? "Saving..." : "Save & Start Interview"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}