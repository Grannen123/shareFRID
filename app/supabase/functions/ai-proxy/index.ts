/**
 * AI Proxy Edge Function for Grannfrid CRM
 *
 * This function proxies AI requests to Claude and Gemini APIs,
 * keeping API keys secure on the server side.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limiting map (in production, use Redis or similar)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT) {
    return false;
  }

  limit.count++;
  return true;
}

interface ClaudeRequest {
  messages: Array<{ role: string; content: string }>;
  context?: {
    customer?: { name: string; fortnoxNumber: string };
    caseData?: { caseNumber: string; title: string; description?: string };
    knowledgeArticles?: Array<{ title: string; content: string }>;
  };
}

interface GeminiRequest {
  prompt: string;
  context?: string;
}

const SYSTEM_PROMPT = `Du är Grannfrids AI-assistent, en hjälpsam och professionell assistent för bostadskonsulter i Sverige.

Du hjälper användare med:
- Störningsärenden och hur de ska hanteras
- Juridiska frågor kring andrahandsuthyrning, störningar, och uppsägning
- Skriva mallar och brev
- Sammanfatta ärenden och journalanteckningar
- Beräkna timbank och fakturering
- Hitta information i kunskapsbanken

Svara alltid på svenska. Var professionell men vänlig. När du refererar till juridik, hänvisa till relevant lagstiftning (hyreslagen, bostadsrättslagen, etc.).

Om du inte är säker på något, säg det tydligt och föreslå att användaren konsulterar en jurist.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client and verify user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "claude";

    if (provider === "claude") {
      return handleClaudeRequest(req);
    } else if (provider === "gemini") {
      return handleGeminiRequest(req);
    } else {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("AI Proxy Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleClaudeRequest(req: Request): Promise<Response> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Claude API not configured" }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const body: ClaudeRequest = await req.json();

  // Build context string
  let contextString = "";
  if (body.context?.customer) {
    contextString += `\n\nAktuell kund: ${body.context.customer.name} (${body.context.customer.fortnoxNumber})`;
  }
  if (body.context?.caseData) {
    contextString += `\n\nAktuellt ärende: ${body.context.caseData.caseNumber} - ${body.context.caseData.title}`;
    if (body.context.caseData.description) {
      contextString += `\nBeskrivning: ${body.context.caseData.description}`;
    }
  }
  if (body.context?.knowledgeArticles?.length) {
    contextString += "\n\nRelevant kunskap från kunskapsbanken:";
    body.context.knowledgeArticles.forEach((article) => {
      contextString += `\n\n### ${article.title}\n${article.content}`;
    });
  }

  const systemPrompt = SYSTEM_PROMPT + contextString;

  // Filter and convert messages
  const claudeMessages = body.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: claudeMessages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Claude API error:", errorText);
    return new Response(JSON.stringify({ error: "Claude API error" }), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  return new Response(JSON.stringify({ content: data.content[0].text }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleGeminiRequest(req: Request): Promise<Response> {
  const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!GOOGLE_AI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Gemini API not configured" }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const body: GeminiRequest = await req.json();
  const fullPrompt = body.context
    ? `${body.context}\n\n${body.prompt}`
    : body.prompt;

  const contents = [
    {
      role: "user",
      parts: [{ text: fullPrompt }],
    },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);
    return new Response(JSON.stringify({ error: "Gemini API error" }), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  return new Response(
    JSON.stringify({ content: data.candidates[0].content.parts[0].text }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
