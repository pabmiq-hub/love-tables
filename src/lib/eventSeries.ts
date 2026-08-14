import { supabase } from "@/integrations/supabase/client";

export interface EventSeries {
  id: string;
  name: string;
  slug: string;
  organizer_id: string;
  created_at: string;
  updated_at: string;
}

export interface SeriesDateEntry {
  /** ISO date, e.g. 2026-09-12 */
  date: string;
  /** HH:MM or empty */
  time: string;
}

export const slugifySeries = (input: string): string =>
  input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const buildSeriesUrl = (slug: string, organizerSlug?: string | null): string => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return organizerSlug ? `${origin}/o/${organizerSlug}/s/${slug}` : `${origin}/s/${slug}`;
};

export const listSeries = async (organizerUserId: string): Promise<EventSeries[]> => {
  const { data, error } = await supabase
    .from("event_series")
    .select("*")
    .eq("organizer_id", organizerUserId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as EventSeries[];
};

export const createSeries = async (
  organizerUserId: string,
  name: string,
  desiredSlug?: string,
): Promise<EventSeries> => {
  const base = slugifySeries(desiredSlug || name) || `serie-${Date.now()}`;
  let slug = base;
  let attempt = 0;

  // Retry on slug collision (unique constraint)
  while (attempt < 5) {
    const { data, error } = await supabase
      .from("event_series")
      .insert([{ organizer_id: organizerUserId, name: name.trim(), slug }])
      .select()
      .single();

    if (!error && data) return data as EventSeries;
    if (error && error.code !== "23505") throw error;

    attempt += 1;
    slug = `${base}-${attempt + 1}`;
  }

  throw new Error("No se pudo generar un enlace único para la serie");
};

export const updateSeries = async (
  seriesId: string,
  updates: { name?: string; slug?: string },
): Promise<void> => {
  const payload: Record<string, string> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.slug !== undefined) payload.slug = slugifySeries(updates.slug);
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from("event_series").update(payload).eq("id", seriesId);
  if (error) throw error;
};

/** Fields that must not be copied when cloning an event for a future date of the series */
const RESET_ON_CLONE: Record<string, unknown> = {
  status: "pending",
  participants_count: 0,
  original_participants_count: null,
  tables: null,
  custom_tables: null,
  current_round: null,
  draft_round: null,
  completed_rounds: null,
  round_started_at: null,
  round_paused_at: null,
  round_elapsed_seconds: null,
  emails_sent_at: null,
  scheduled_email_at: null,
  selection_closed_at: null,
  reminder_scheduled_at: null,
  checkin_open: null,
  public_preliminary_tables_available: false,
};

const STRIP_ON_CLONE = ["id", "created_at", "updated_at", "organizer_profile_id"];

/**
 * Clone a base event into one new event per date entry, all sharing the same series.
 * Returns the ids of the created events.
 */
export const createSeriesEventsFromBase = async (
  baseEventId: string,
  seriesId: string,
  entries: SeriesDateEntry[],
): Promise<string[]> => {
  if (entries.length === 0) return [];

  const { data: base, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", baseEventId)
    .single();
  if (error || !base) throw error || new Error("Evento base no encontrado");

  const rows = entries.map((entry) => {
    const clone: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    STRIP_ON_CLONE.forEach((k) => delete clone[k]);
    Object.assign(clone, RESET_ON_CLONE);

    clone.series_id = seriesId;
    clone.date = entry.date;
    clone.event_time = entry.time ? entry.time : null;

    const prelim = clone.preliminary_round as { enabled?: boolean } | null;
    clone.preliminary_round = prelim?.enabled ? { enabled: true, tables: [], started_at: null } : null;

    const game = clone.game_mode as { enabled?: boolean; dynamics?: unknown[] } | null;
    clone.game_mode = game?.enabled ? { enabled: true, dynamics: game.dynamics || [], played: {} } : null;

    return clone;
  });

  const { data: inserted, error: insertError } = await supabase
    .from("events")
    .insert(rows as never)
    .select("id");
  if (insertError) throw insertError;

  return (inserted || []).map((r) => r.id);
};

/** Resolve the shared series link to the event that is currently open */
export const resolveSeriesCurrentEvent = async (
  slug: string,
): Promise<{ eventId: string; seriesName: string; organizerSlug: string | null } | null> => {
  const { data, error } = await supabase.rpc("get_series_current_event", { _slug: slug });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.event_id) return null;
  return {
    eventId: row.event_id as string,
    seriesName: (row.series_name as string) || "",
    organizerSlug: (row.organizer_slug as string) || null,
  };
};
