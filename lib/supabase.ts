import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client for Realtime functionality
 * 
 * This client is used ONLY for Supabase Realtime subscriptions to enhance
 * live updates for leaderboard, scores, and team status changes.
 * 
 * Prisma remains the authoritative database access layer for all
 * transactional operations, queries, and game logic.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️  Supabase credentials not configured. Realtime features will be disabled. " +
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env to enable."
  );
}

/**
 * Browser-safe Supabase client for realtime subscriptions
 * Used in client components for live updates
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10, // Rate limit to prevent overload
        },
      },
    })
  : null;

/**
 * Check if Supabase Realtime is available
 */
export function isRealtimeAvailable(): boolean {
  return supabase !== null;
}

/**
 * Database table names for realtime subscriptions
 */
export const REALTIME_TABLES = {
  TEAMS: "Team",
  SCORE_EVENTS: "ScoreEvent",
  SUBMISSIONS: "Submission",
  QUESTIONS: "Question",
  ROUNDS: "Round",
} as const;

/**
 * Realtime event types
 */
export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

/**
 * Helper to create a table channel name
 */
export function createChannelName(table: string, filter?: string): string {
  return filter ? `${table}:${filter}` : table;
}
