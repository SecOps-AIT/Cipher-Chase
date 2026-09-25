"use client";

import { useEffect, useRef } from "react";
import { supabase, isRealtimeAvailable, RealtimeEvent } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface SupabaseRealtimeOptions {
  table: string;
  event?: RealtimeEvent | "*";
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

/**
 * Hook for subscribing to Supabase Realtime changes
 * 
 * Falls back gracefully if Supabase is not configured
 * 
 * @example
 * ```tsx
 * useSupabaseRealtime({
 *   table: "Team",
 *   filter: `eventId=eq.${eventId}`,
 *   onUpdate: (payload) => {
 *     console.log("Team updated:", payload.new);
 *     refreshData();
 *   },
 * });
 * ```
 */
let channelSeq = 0;

export function useSupabaseRealtime(options: SupabaseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Each hook instance needs its own channel — reusing a name across
  // instances (e.g. multiple components subscribing to the same table)
  // makes the Supabase client return an already-subscribed channel, and
  // calling .on()/.subscribe() on it again throws "cannot add
  // postgres_changes callbacks after subscribe()".
  const instanceIdRef = useRef(++channelSeq);

  useEffect(() => {
    // Skip if Supabase is not configured
    if (!isRealtimeAvailable() || !supabase) {
      return;
    }

    const { table, event = "*", filter, onInsert, onUpdate, onDelete, onChange } = options;

    // Create a unique channel name per hook instance
    const channelName = `realtime:${table}${filter ? `:${filter}` : ""}:${instanceIdRef.current}`;

    // Subscribe to changes
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        {
          event: event as any,
          schema: "public",
          table: table,
          filter: filter,
        },
        (payload: any) => {
          // Call appropriate handler based on event type
          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload);
          } else if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate(payload);
          } else if (payload.eventType === "DELETE" && onDelete) {
            onDelete(payload);
          }

          // Always call onChange if provided
          if (onChange) {
            onChange(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✓ Subscribed to ${table} realtime updates`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`✗ Failed to subscribe to ${table} realtime updates`);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.table,
    options.event,
    options.filter,
    // Intentionally omit callback functions to prevent re-subscription on every render
  ]);

  return {
    isAvailable: isRealtimeAvailable(),
  };
}
