/**
 * Whisper Transcription Edge Function
 *
 * Transcribes audio files using OpenAI's Whisper API.
 * Supports Swedish language primarily for journal dictation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const WHISPER_MODEL = "whisper-1";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (Whisper limit)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Ingen autentisering" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user with Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Ogiltig autentisering" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for OpenAI API key
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Whisper API inte konfigurerad" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) || "sv";

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "Ingen ljudfil bifogad" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Filen är för stor (max 25 MB)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Prepare request to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", WHISPER_MODEL);
    whisperFormData.append("language", language);
    whisperFormData.append("response_format", "json");

    // Add prompt for better transcription context
    whisperFormData.append(
      "prompt",
      "Detta är en journalanteckning för ett bostadsärende. " +
        "Vanliga termer inkluderar: störning, andrahandsuthyrning, ohyra, " +
        "hyresrätt, bostadsrätt, hyresgäst, fastighetsägare, styrelse, " +
        "uppsägning, förlikning, domstol.",
    );

    // Call Whisper API
    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: whisperFormData,
      },
    );

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.json().catch(() => ({}));
      console.error("Whisper API error:", errorData);
      return new Response(
        JSON.stringify({
          error: errorData.error?.message || "Transkribering misslyckades",
        }),
        {
          status: whisperResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result = await whisperResponse.json();

    // Log usage (optional - for monitoring)
    console.log(
      `Transcription completed for user ${user.id}, length: ${result.text?.length || 0} chars`,
    );

    return new Response(
      JSON.stringify({
        text: result.text,
        language: language,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Ett fel uppstod",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
