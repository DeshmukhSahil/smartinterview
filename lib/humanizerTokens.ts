export interface HumanizerToken {
  token: string;
  label: string;
  category: "Gestures" | "Vocalizations" | "Transitions" | "Tones & Moods" | "Probing & Proving" | "Environment Context" | "Candidate Info";
  description: string;
  expansion: string;
}

// Programmatic lists to generate 500+ distinct tokens
const GESTURE_TYPES = [
  { name: "nod", label: "Nod", expansions: ["nodding", "giving a nod"] },
  { name: "smile", label: "Smile", expansions: ["smiling", "giving a smile"] },
  { name: "frown", label: "Frown", expansions: ["frowning", "expressing doubt with a frown"] },
  { name: "lean", label: "Lean", expansions: ["leaning", "shifting weight"] },
  { name: "scratch", label: "Scratch", expansions: ["scratching", "rubbing"] },
  { name: "adjust", label: "Adjust", expansions: ["adjusting", "straightening"] },
  { name: "gaze", label: "Gaze", expansions: ["gazing", "looking"] },
  { name: "tap", label: "Tap", expansions: ["tapping", "drumming"] },
  { name: "shrug", label: "Shrug", expansions: ["shrugging", "giving a slight shrug"] },
  { name: "sigh", label: "Sigh", expansions: ["sighing", "breathing out"] }
];

const MODIFIER_TYPES = [
  { name: "slow", label: "Slow", text: "slowly" },
  { name: "warm", label: "Warm", text: "warmly" },
  { name: "skeptical", label: "Skeptical", text: "skeptically" },
  { name: "intense", label: "Intense", text: "intently" },
  { name: "subtle", label: "Subtle", text: "slightly" },
  { name: "quick", label: "Quick", text: "quickly" },
  { name: "thoughtful", label: "Thoughtful", text: "thoughtfully" },
  { name: "tired", label: "Tired", text: "wearily" },
  { name: "approving", label: "Approving", text: "approvingly" },
  { name: "nervous", label: "Nervous", text: "hesitantly" }
];

const TARGETS = [
  { name: "chin", label: "Chin", text: "chin" },
  { name: "glasses", label: "Glasses", text: "glasses" },
  { name: "pen", label: "Pen", text: "pen" },
  { name: "notebook", label: "Notebook", text: "notebook" },
  { name: "ceiling", label: "Ceiling", text: "ceiling" },
  { name: "hands", label: "Hands", text: "hands" },
  { name: "camera", label: "Camera", text: "camera" },
  { name: "table", label: "Table", text: "desk" },
  { name: "forehead", label: "Forehead", text: "forehead" },
  { name: "shoulder", label: "Shoulder", text: "shoulders" }
];

const VOCAL_TYPES = [
  { name: "hmm", label: "Hmm", text: "making a thoughtful 'hmmm' sound" },
  { name: "ah", label: "Ah", text: "uttering a soft, understanding 'ah'" },
  { name: "chuckle", label: "Chuckle", text: "letting out a soft, appreciative chuckle" },
  { name: "throat", label: "Clear Throat", text: "clearing throat quietly" },
  { name: "groan", label: "Low Hum", text: "making a quiet humming sound of approval" },
  { name: "sigh", label: "Sigh", text: "letting out a quiet, relaxed sigh" },
  { name: "tsk", label: "Tsk Tsk", text: "making a subtle clicking 'tsk' sound" },
  { name: "breath", label: "Inhale", text: "taking a slow, deep breath" },
  { name: "exhale", label: "Exhale", text: "exhaling softly before speaking" },
  { name: "cough", label: "Cough", text: "giving a tiny, polite cough" }
];

const TONE_TYPES = [
  { name: "empathetic", label: "Empathetic", text: "empathetic, supportive, and understanding" },
  { name: "analytical", label: "Analytical", text: "logical, technical, and objective" },
  { name: "skeptical", label: "Skeptical", text: "inquisitive, probing, and slightly doubtful" },
  { name: "authoritative", label: "Authoritative", text: "expert, formal, and self-assured" },
  { name: "casual", label: "Casual", text: "friendly, relaxed, and informal" },
  { name: "enthusiastic", label: "Enthusiastic", text: "highly energetic, positive, and validating" },
  { name: "puzzled", label: "Puzzled", text: "confused, inquiring, and seeking clarity" },
  { name: "impressed", label: "Impressed", text: "appreciative, surprised, and highly positive" },
  { name: "strict", label: "Strict", text: "rigorous, challenging, and testing" },
  { name: "gentle", label: "Gentle", text: "soft, encouraging, and unhurried" }
];

// Helper to generate the static tokens array
const generateTokensList = (): HumanizerToken[] => {
  const list: HumanizerToken[] = [];

  // Core candidate variables
  list.push(
    { token: "{candidate_name}", label: "Candidate Name", category: "Candidate Info", description: "Candidate's full name", expansion: "Candidate" },
    { token: "{role}", label: "Target Role", category: "Candidate Info", description: "Target job title", expansion: "Software Engineer" },
    { token: "{techstack}", label: "Tech Stack", category: "Candidate Info", description: "List of tech stack skills", expansion: "React, Node.js" },
    { token: "{company_name}", label: "Company Name", category: "Candidate Info", description: "Your company name", expansion: "Chirayu Power Pvt. Ltd." },
    { token: "{difficulty}", label: "Difficulty", category: "Candidate Info", description: "Interview difficulty level", expansion: "Intermediate" }
  );

  // 1. Gestures: ~200 tokens
  // E.g. {gest_nod_slow_chin} -> (nodding slowly, touching chin)
  for (const g of GESTURE_TYPES) {
    for (const m of MODIFIER_TYPES) {
      for (const t of TARGETS) {
        list.push({
          token: `{gest_${g.name}_${m.name}_${t.name}}`,
          label: `${g.label} (${m.label} + ${t.label})`,
          category: "Gestures",
          description: `Behavior action: ${g.label} ${m.text} while interacting with ${t.label}`,
          expansion: `(${g.expansions[0]} ${m.text}, perhaps touching your ${t.text})`
        });
      }
    }
  }

  // 2. Vocalizations: ~100 tokens
  // E.g. {voc_hmm_warm} -> (making a thoughtful 'hmmm' sound warmly)
  for (const v of VOCAL_TYPES) {
    for (const m of MODIFIER_TYPES) {
      list.push({
        token: `{voc_${v.name}_${m.name}}`,
        label: `${v.label} (${m.label})`,
        category: "Vocalizations",
        description: `Sound marker: ${v.label} performed ${m.text}`,
        expansion: `(${v.text} ${m.text})`
      });
    }
  }

  // 3. Tones: ~100 tokens
  // E.g. {tone_empathetic_subtle} -> speak in a slightly empathetic, supportive, and understanding tone
  for (const t of TONE_TYPES) {
    for (const m of MODIFIER_TYPES) {
      list.push({
        token: `{tone_${t.name}_${m.name}}`,
        label: `Tone: ${t.label} (${m.label})`,
        category: "Tones & Moods",
        description: `Speak in a ${m.text} ${t.label} style`,
        expansion: `speak in a ${m.text} ${t.text} tone`
      });
    }
  }

  // 4. Transitions: ~50 tokens
  const TRANSITION_STYLES = ["smooth", "abrupt", "gradual", "clever", "deep"];
  const TRANSITION_TYPES = [
    { name: "next", label: "Next Topic", text: "transitioning directly to the next technical topic" },
    { name: "probe", label: "Follow-up Probe", text: "digging deeper into their last answered point" },
    { name: "scenario", label: "Scenario Shift", text: "presenting a hypothetical real-world scenario" },
    { name: "wrap", label: "Wrapping Up", text: "gently winding down the conversation" },
    { name: "chill", label: "Icebreaker", text: "offering a brief moment of conversational relief" }
  ];
  for (const tr of TRANSITION_TYPES) {
    for (const s of TRANSITION_STYLES) {
      list.push({
        token: `{trans_${tr.name}_${s}}`,
        label: `Transition: ${tr.label} (${s})`,
        category: "Transitions",
        description: `${tr.label} transition handled in a ${s} manner`,
        expansion: `${tr.text} in a ${s} manner`
      });
    }
  }

  // 5. Probing & Proving: ~50 tokens
  const PROBE_FIELDS = ["experience", "failure", "conflict", "architecture", "optimization", "collaboration", "growth", "leadership", "creativity", "stress"];
  const PROBE_STYLES = ["gentle", "academic", "uncompromising", "pragmatic", "reflective"];
  for (const f of PROBE_FIELDS) {
    for (const ps of PROBE_STYLES) {
      list.push({
        token: `{probe_${f}_${ps}}`,
        label: `Probe: ${f} (${ps})`,
        category: "Probing & Proving",
        description: `Deep probe on ${f} using a ${ps} style`,
        expansion: `ask a detailed follow-up question focusing on the candidate's ${f} from a ${ps} perspective`
      });
    }
  }

  // 6. Environment Context: ~30 tokens
  const ENV_TYPES = [
    { name: "coffee", label: "Coffee Sip", text: "stopping briefly to take a slow sip from a coffee mug" },
    { name: "type", label: "Keyboard Typing", text: "typing a short note on your keyboard before looking back up" },
    { name: "rustle", label: "Rustle Papers", text: "leafing through printed pages of the resume on the desk" },
    { name: "bell", label: "Muffled Bell", text: "hearing a faint phone ring or background buzz in the distance" },
    { name: "window", label: "Glance Window", text: "glancing briefly out the window, processing the response" }
  ];
  for (const env of ENV_TYPES) {
    for (const m of MODIFIER_TYPES) {
      list.push({
        token: `{env_${env.name}_${m.name}}`,
        label: `Environment: ${env.label} (${m.label})`,
        category: "Environment Context",
        description: `Contextual action: ${env.label} performed ${m.text}`,
        expansion: `(${env.text} ${m.text})`
      });
    }
  }

  return list;
};

// Expose the pre-built list containing 500+ humanizing tokens
export const HUMANIZER_TOKENS = generateTokensList();

// Function to resolve all tokens inside a prompt string
export const resolveHumanizerTokens = (
  promptText: string,
  candidateName = "Candidate",
  role = "Software Engineer",
  companyName = "Chirayu Power Pvt. Ltd.",
  difficulty = "Intermediate",
  techStack = ""
): string => {
  let resolved = promptText;

  // Substitute core candidate variables
  resolved = resolved
    .replace(/{candidate_name}/g, candidateName)
    .replace(/{role}/g, role)
    .replace(/{company_name}/g, companyName)
    .replace(/{difficulty}/g, difficulty)
    .replace(/{techstack}/g, techStack);

  // Match and substitute all other tokens programmatically
  // Finding {gest_nod_slow_chin} etc.
  const tokenRegex = /{([a-z0-9_]+)}/g;
  resolved = resolved.replace(tokenRegex, (match) => {
    // Check if we have a direct match in our token database
    const found = HUMANIZER_TOKENS.find((t) => t.token === match);
    if (found) {
      return found.expansion;
    }
    return match; // return as-is if token unknown
  });

  return resolved;
};
