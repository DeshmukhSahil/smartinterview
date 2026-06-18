import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, ngrok-skip-browser-warning",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

const REPORT_SYSTEM_PROMPT = `You are an expert Sales Intelligence Analyst for Chirayu Power Pvt. Ltd., a Solar, Renewable Energy and Engineering company.

Your job is to analyse a site visit interview transcript between a salesperson and an AI interviewer (Arjun), and generate a comprehensive structured site assessment report.

Return ONLY a valid JSON object with the following structure, no explanation or markdown:

{
  "executive_summary": "2-3 paragraph written narrative summary of the visit, key findings, and recommended next steps",
  
  "customer_intelligence": {
    "interest_level": "High/Medium/Low",
    "decision_maker_name": "Name if mentioned",
    "decision_maker_role": "Role if mentioned",
    "budget_indication": "Mentioned budget or Not Discussed",
    "timeline_to_decide": "Immediate/1-3 months/3-6 months/No urgency/Unknown",
    "key_concerns": "Main objections or concerns raised",
    "products_of_interest": "Products the customer showed interest in",
    "competitor_mentioned": "Yes/No — name if yes",
    "purchase_probability": "High/Medium/Low",
    "follow_up_preferred_mode": "Phone/WhatsApp/Meeting/Email"
  },
  
  "site_assessment": {
    "roof_type": "Flat/Sloped/RCC/GI Sheet/Other",
    "roof_condition": "Good/Moderate/Requires work",
    "roof_area_available": "Estimated kW capacity or area if mentioned",
    "structural_concerns": "Yes/No — description if yes",
    "shading_issues": "None/Partial/Significant",
    "grid_connectivity": "Single Phase/Three Phase/Unknown",
    "electrical_readiness": "Ready/Needs upgrade/Unknown",
    "accessibility": "Easy/Moderate/Difficult",
    "net_metering_possible": "Yes/No/Unknown",
    "installation_complexity": "Standard/Complex/Custom"
  },
  
  "area_intelligence": {
    "area_type": "Residential/Commercial/Industrial/Mixed",
    "area_density": "High/Medium/Low",
    "average_income_category": "Low/Middle/Upper-Middle/High",
    "construction_activity": "None/Low/Medium/High",
    "existing_solar_installations": 0,
    "infrastructure_quality": "Good/Average/Poor",
    "building_types_observed": "Villas/Apartments/Bungalows/Commercial units",
    "growth_potential": "High/Medium/Low",
    "strategic_importance": "Key insight about why this area matters for business"
  },
  
  "competitor_intelligence": {
    "competitors": [
      {
        "name": "Competitor name",
        "presence_level": "Strong/Moderate/Weak",
        "strength": "What they do well in this area",
        "weakness": "Their known weakness",
        "pricing_compared_to_us": "Cheaper/Similar/More expensive/Unknown"
      }
    ],
    "total_competitors_known": 0,
    "market_saturation": "High/Medium/Low",
    "competitive_advantage_opportunity": "What differentiates us in this area"
  },
  
  "future_opportunities": {
    "referral_contacts": [
      {
        "name": "Contact name",
        "role": "Role/Relation",
        "phone": "Phone if mentioned",
        "type": "Society chairperson/Builder/Electrician/Architect/Other"
      }
    ],
    "societies": [
      {
        "name": "Society name",
        "units": 0,
        "chairperson": "Name if mentioned",
        "potential_kw": 0
      }
    ],
    "builder_projects": [
      {
        "builder_name": "Builder name",
        "project": "Project name",
        "units": 0,
        "stage": "Under construction/Ready possession/Planning"
      }
    ],
    "products_suitable": ["List of products that fit this area/customer type"],
    "cross_sell_potential": "Any cross-sell opportunities (EV, Water Heater, etc.)",
    "nearby_similar_leads": "Yes/No/Possibly — description",
    "estimated_area_market_size_kw": 0
  },
  
  "ai_recommendations": {
    "immediate_next_action": "Specific next step the salesperson should take within 24 hours",
    "follow_up_strategy": "Recommended approach for this specific customer",
    "suggested_pitch_angle": "What angle to emphasize in next meeting (cost savings/reliability/government subsidy/ROI)",
    "documents_to_prepare": ["List of documents, proposals, or presentations to prepare"],
    "escalation_needed": "Yes/No — Manager to accompany on next visit if Yes",
    "conversion_probability_rationale": "Why you rated them as High/Medium/Low"
  },
  
  "opportunity_score": 75,
  "market_potential_score": 80,
  "referral_score": 60,
  "risk_assessment": "Low",
  "follow_up_priority": "Within Week"
}

SCORING GUIDE:
- opportunity_score (0-100): How likely is this specific lead to convert? 80+ = hot lead
- market_potential_score (0-100): How much business potential does the AREA have overall?
- referral_score (0-100): How many referral/networking opportunities were found?
- risk_assessment: Low/Medium/High — risk of no conversion or loss to competitor
- follow_up_priority: Immediate (today)/Within Week/Within Month/Cold

Be specific and extract every detail from the conversation. If something was not mentioned, write "Not mentioned" or use null. Never make up information.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversation_transcript = [],
      lead_context = "",
      area_name = "",
      model = "gemini-2.5-flash",
    } = body;

    const isGemini = model.toLowerCase().includes("gemini");
    let modelProvider: any;

    if (isGemini) {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json(
          { error: "Google Generative AI key (GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY) is not configured in environment." },
          { status: 500, headers: corsHeaders }
        );
      }
      modelProvider = google(model);
    } else {
      const customOllama = createOllama({
        baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/api",
      });
      modelProvider = customOllama(model);
    }

    const transcriptText = conversation_transcript
      .map((msg: { role: string; content: string }) => `${msg.role === "assistant" ? "ARJUN (AI Manager)" : "SALESPERSON"}: ${msg.content}`)
      .join("\n\n");

    const prompt = `
${lead_context}

AREA: ${area_name}

INTERVIEW TRANSCRIPT:
${transcriptText}

Now generate the complete structured site assessment report as valid JSON based on this conversation.
    `.trim();

    const response = await generateText({
      model: modelProvider,
      system: REPORT_SYSTEM_PROMPT,
      prompt: prompt,
    });

    let responseText = response.text || "";
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    const report = JSON.parse(jsonText);
    return NextResponse.json({ report, raw: responseText }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("[site-assessment/generate-report] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate report", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
