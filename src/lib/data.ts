import { createSupabaseServerClient } from "./supabase/server";
import type { Block, BlockWeekStatRow, FlagRow } from "./types";

export async function getAllBlocks(): Promise<Block[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("blocks").select("*").order("id");
  if (error) throw error;
  return data as Block[];
}

export async function getAvailableWeeks(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("block_week_stats")
    .select("week_start")
    .order("week_start", { ascending: false });
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => r.week_start as string)));
}

export async function getStatsForWeek(week: string): Promise<BlockWeekStatRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("block_week_stats").select("*").eq("week_start", week);
  if (error) throw error;
  return data as BlockWeekStatRow[];
}

export async function getStatsForBlock(blockId: string): Promise<BlockWeekStatRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("block_week_stats")
    .select("*")
    .eq("block_id", blockId)
    .order("week_start");
  if (error) throw error;
  return data as BlockWeekStatRow[];
}

export async function getBlock(blockId: string): Promise<Block | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("blocks").select("*").eq("id", blockId).maybeSingle();
  if (error) throw error;
  return data as Block | null;
}

export async function getFlags(): Promise<FlagRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("flags")
    .select("*")
    .order("week_start", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return data as FlagRow[];
}
