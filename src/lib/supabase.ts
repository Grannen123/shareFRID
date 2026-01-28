/**
 * @fileoverview Supabase-klient och utilities.
 *
 * VIKTIGT: Använd ALLTID `withTimeout()` på alla Supabase-anrop
 * för att undvika att appen hänger vid nätverksproblem.
 *
 * @example
 * // RÄTT
 * const { data, error } = await withTimeout(supabase.from("customers").select("*"));
 *
 * // FEL - kan hänga oändligt
 * const { data } = await supabase.from("customers").select("*");
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials saknas i .env");
}

const globalScope = globalThis as { __supabase?: SupabaseClient<any> };

const supabaseClient =
  globalScope.__supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    // Ingen global fetch wrapper - använd withTimeout() på query-nivå istället
    // för att undvika konflikter med Supabase auth-anrop
  });

if (!globalScope.__supabase) {
  globalScope.__supabase = supabaseClient;
}

export const supabase = supabaseClient;

// Utility för att wrappa queries med timeout
type AbortableQuery<T> = PromiseLike<T> & {
  abortSignal?: (signal: AbortSignal) => unknown;
};

/**
 * Wrappar en Supabase-query med timeout för att förhindra oändlig väntan.
 * Använd denna på ALLA Supabase-anrop utom auth-operationer.
 *
 * @param queryBuilder - Supabase query builder (t.ex. supabase.from("x").select())
 * @param ms - Timeout i millisekunder (default: 10000ms)
 * @returns Promise med query-resultatet
 * @throws Error med "Timeout efter Xms" vid timeout
 *
 * @example
 * const { data, error } = await withTimeout(
 *   supabase.from("customers").select("*").eq("id", id),
 *   5000 // 5 sekunder
 * );
 */
export async function withTimeout<T>(
  queryBuilder: AbortableQuery<T>,
  ms: number = 10000,
): Promise<T> {
  const timeoutError = new Error(`Timeout efter ${ms}ms`);
  const controller =
    typeof queryBuilder.abortSignal === "function"
      ? new AbortController()
      : null;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const queryPromise = (() => {
    if (controller && typeof queryBuilder.abortSignal === "function") {
      const builderWithSignal = queryBuilder.abortSignal(controller.signal);
      return Promise.resolve(
        (builderWithSignal ?? queryBuilder) as AbortableQuery<T>,
      );
    }

    return Promise.resolve(queryBuilder);
  })();

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (controller) {
        controller.abort();
      }
      reject(timeoutError);
    }, ms);
  });

  try {
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw timeoutError;
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
