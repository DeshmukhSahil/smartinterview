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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages = [],
      system_prompt,
      model = "gemini-2.5-flash",
      question_count = 0,
      is_first_message = false,
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

    let userMessageText = "";
    if (is_first_message) {
      userMessageText = "Hello, I just got back from the site visit and I am ready for the debrief.";
    } else {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== "user") {
        return NextResponse.json({ message: "Please continue the interview." }, { headers: corsHeaders });
      }
      userMessageText = lastMessage.content;
    }

    const contextSuffix = question_count >= 12
      ? "\n\n(SYSTEM NOTE: You have asked 12+ questions. Please wrap up the interview now, summarize the next actions, and end your response with the exact token '[INTERVIEW_COMPLETE]'.)"
      : question_count >= 6
      ? "\n\n(SYSTEM NOTE: You have asked enough questions to cover the main topics. If you have gathered the core details, wrap up the conversation now, summarize the next actions, and end your response with the exact token '[INTERVIEW_COMPLETE]'. Otherwise, ask one final question.)"
      : "";

    // Format messages for Vercel AI SDK
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }));

    if (is_first_message) {
      formattedMessages.push({
        role: "user",
        content: userMessageText,
      });
    } else {
      const lastMsg = formattedMessages[formattedMessages.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        lastMsg.content += contextSuffix;
      }
    }

    const response = await generateText({
      model: modelProvider,
      system: system_prompt,
      messages: formattedMessages,
    });

    return NextResponse.json({ message: response.text }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("[site-assessment/chat] Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
