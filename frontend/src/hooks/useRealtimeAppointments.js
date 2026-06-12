/**
 * useRealtimeAppointments.js
 * Custom hook for Supabase Realtime appointment subscriptions.
 * Works for patient, doctor, and admin views.
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../utils/supabase";

function getClient() {
  return supabase;
}

/**
 * useRealtimeAppointments
 * @param {Object} options
 * @param {"patient"|"doctor"|"admin"} options.role  - who is listening
 * @param {number}   options.entityId               - patient.id or doctor.id
 * @param {Function} options.onInsert               - called with new row on INSERT
 * @param {Function} options.onUpdate               - called with updated row on UPDATE
 * @param {Function} options.onDelete               - called with old row on DELETE
 */
export function useRealtimeAppointments({ role, entityId, onInsert, onUpdate, onDelete }) {
  const channelRef = useRef(null);

  const subscribe = useCallback(() => {
    const supabase = getClient();
    if (!supabase || !entityId) return;

    // Build filter based on role
    const filter = role === "patient"
      ? `patient_id=eq.${entityId}`
      : role === "doctor"
        ? `doctor_id=eq.${entityId}`
        : null; // admin listens to all

    const channelName = `appointments-${role}-${entityId || "all"}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "appointments",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT" && onInsert) onInsert(payload.new);
          if (payload.eventType === "UPDATE" && onUpdate) onUpdate(payload.new, payload.old);
          if (payload.eventType === "DELETE" && onDelete) onDelete(payload.old);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [role, entityId, onInsert, onUpdate, onDelete]);

  useEffect(() => {
    subscribe();
    return () => {
      const supabase = getClient();
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [subscribe]);
}

/**
 * useRealtimePreScreenings
 * For patient reports page — updates when new screening is saved
 */
export function useRealtimePreScreenings({ patientId, onInsert, onUpdate }) {
  const channelRef = useRef(null);

  useEffect(() => {
    const supabase = getClient();
    if (!supabase || !patientId) return;

    const channel = supabase
      .channel(`screenings-patient-${patientId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "pre_screenings",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && onInsert) onInsert(payload.new);
          if (payload.eventType === "UPDATE" && onUpdate) onUpdate(payload.new, payload.old);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [patientId, onInsert, onUpdate]);
}