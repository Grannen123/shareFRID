/**
 * Dictation Hook using OpenAI Whisper API
 *
 * Provides voice-to-text functionality for journal entries
 * and other text input fields.
 */

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface DictationState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  audioLevel: number;
}

interface UseDictationOptions {
  language?: string;
  onTranscriptUpdate?: (transcript: string) => void;
  onError?: (error: string) => void;
  maxDuration?: number; // Max recording duration in seconds
}

interface UseDictationReturn extends DictationState {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  cancelRecording: () => void;
  isSupported: boolean;
}

const WHISPER_API_URL = "/api/transcribe"; // Edge function endpoint

export function useDictation(
  options: UseDictationOptions = {},
): UseDictationReturn {
  const {
    language = "sv",
    onTranscriptUpdate,
    onError,
    maxDuration = 120, // 2 minutes default
  } = options;

  const { getAccessToken } = useAuth();

  const [state, setState] = useState<DictationState>({
    isRecording: false,
    isProcessing: false,
    transcript: "",
    error: null,
    audioLevel: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if browser supports required APIs
  const isSupported =
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    "getUserMedia" in navigator.mediaDevices &&
    typeof MediaRecorder !== "undefined";

  // Update audio level for visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyzerRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalized = Math.min(100, (average / 128) * 100);

    setState((prev) => ({ ...prev, audioLevel: normalized }));

    if (state.isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [state.isRecording]);

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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyzerRef.current = null;
    audioChunksRef.current = [];
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const error = "Diktering stöds inte i denna webbläsare";
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    try {
      cleanup();

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Set up audio analyzer for level visualization
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

      mediaRecorder.start(1000); // Collect data every second

      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
        transcript: "",
      }));

      // Start audio level updates
      updateAudioLevel();

      // Set max duration timeout
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, maxDuration * 1000);
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Kunde inte starta inspelning";
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      cleanup();
    }
  }, [isSupported, cleanup, maxDuration, onError, updateAudioLevel]);

  // Stop recording and transcribe
  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        resolve("");
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isProcessing: true,
        }));

        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || "audio/webm",
          });

          // Transcribe using Whisper API
          const transcript = await transcribeAudio(audioBlob);

          setState((prev) => ({
            ...prev,
            isProcessing: false,
            transcript,
          }));

          onTranscriptUpdate?.(transcript);
          resolve(transcript);
        } catch (err) {
          const error =
            err instanceof Error ? err.message : "Transkribering misslyckades";
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error,
          }));
          onError?.(error);
          reject(new Error(error));
        } finally {
          cleanup();
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [cleanup, onError, onTranscriptUpdate]);

  // Cancel recording without transcribing
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setState((prev) => ({
      ...prev,
      isRecording: false,
      isProcessing: false,
      audioLevel: 0,
    }));
  }, [cleanup]);

  // Transcribe audio using Edge Function
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error("Ingen åtkomsttoken");
    }

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("language", language);

    const response = await fetch(WHISPER_API_URL, {
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

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported,
  };
}

/**
 * Dictation button component for use with useDictation hook
 */
export { DictationButton } from "@/components/shared/DictationButton";
