/**
 * Dictation Button Component
 *
 * A button that provides voice-to-text functionality using Whisper.
 * Shows recording state, audio level visualization, and processing state.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, AlertCircle, X } from "lucide-react";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface DictationButtonProps {
  onTranscript: (text: string) => void;
  language?: string;
  maxDuration?: number;
  className?: string;
  disabled?: boolean;
}

type DictationState = "idle" | "recording" | "processing" | "error";

export function DictationButton({
  onTranscript,
  language = "sv",
  maxDuration = 120,
  className,
  disabled = false,
}: DictationButtonProps) {
  const { getAccessToken } = useAuth();
  const [state, setState] = useState<DictationState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSupported =
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    "getUserMedia" in navigator.mediaDevices &&
    typeof MediaRecorder !== "undefined";

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyzerRef.current = null;
    audioChunksRef.current = [];
    setAudioLevel(0);
    setRecordingTime(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Update audio level for visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyzerRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalized = Math.min(100, (average / 128) * 100);

    setAudioLevel(normalized);

    if (state === "recording") {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [state]);

  // Transcribe audio
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error("Ingen åtkomsttoken");
    }

    // Use Supabase Edge Function for transcription
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("language", language);

    const response = await fetch(`${supabaseUrl}/functions/v1/transcribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Transkribering misslyckades: ${response.status}`,
      );
    }

    const result = await response.json();
    return result.text || "";
  };

  // Start recording
  const startRecording = async () => {
    if (!isSupported || disabled) return;

    try {
      cleanup();
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Set up audio analyzer
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setState("processing");

        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || "audio/webm",
          });

          const transcript = await transcribeAudio(audioBlob);
          onTranscript(transcript);
          setState("idle");
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Transkribering misslyckades",
          );
          setState("error");
        } finally {
          cleanup();
        }
      };

      mediaRecorder.start(1000);
      setState("recording");

      // Start audio level updates
      updateAudioLevel();

      // Recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Max duration timeout
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, maxDuration * 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte starta inspelning",
      );
      setState("error");
      cleanup();
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setState("idle");
  };

  // Handle button click
  const handleClick = () => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle" || state === "error") {
      startRecording();
    }
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled
              className={className}
            >
              <MicOff className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Diktering stöds inte i denna webbläsare</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {state === "recording" && (
        <>
          {/* Audio level indicator */}
          <div className="flex items-center gap-1">
            <div className="flex items-end gap-0.5 h-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all duration-75",
                    audioLevel > i * 20 ? "bg-red-500" : "bg-gray-200",
                  )}
                  style={{
                    height: `${Math.min(100, Math.max(20, audioLevel * (1 + i * 0.2)))}%`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 tabular-nums">
              {formatTime(recordingTime)}
            </span>
          </div>

          {/* Cancel button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelRecording}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={state === "recording" ? "destructive" : "ghost"}
              size="sm"
              onClick={handleClick}
              disabled={disabled || state === "processing"}
              className={cn(
                state === "recording" && "animate-pulse",
                state === "error" && "text-red-500",
              )}
            >
              {state === "processing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : state === "recording" ? (
                <MicOff className="h-4 w-4" />
              ) : state === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span className="ml-1">
                {state === "processing"
                  ? "Bearbetar..."
                  : state === "recording"
                    ? "Stoppa"
                    : state === "error"
                      ? "Försök igen"
                      : "Diktera"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {state === "recording" ? (
              <p>Klicka för att stoppa och transkribera</p>
            ) : state === "processing" ? (
              <p>Transkriberar med Whisper AI...</p>
            ) : state === "error" ? (
              <p>{error || "Ett fel uppstod"}</p>
            ) : (
              <p>Klicka för att börja diktera</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
