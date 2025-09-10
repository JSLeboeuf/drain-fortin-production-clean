import { Call } from "@/types";

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function getCalls(): Promise<Call[]> {
  try {
    const data = await fetchJson(`/api/calls`);
    return normalizeCalls(data);
  } catch {
    try {
      const data = await fetchJson(`/api/events?type=call`);
      return normalizeCallsFromEvents(data);
    } catch {
      return [];
    }
  }
}

export async function getAnalyticsSummary(): Promise<{
  totalCalls: number;
  answeredPct: number;
  avgDuration: number;
  conversionPct: number;
  topIntents: { intent: string; count: number }[];
}> {
  try {
    const data = await fetchJson(`/api/analytics`);
    return normalizeAnalytics(data);
  } catch {
    try {
      const events = await fetchJson(`/api/events`);
      return aggregateFromEvents(events);
    } catch {
      return { totalCalls: 0, answeredPct: 0, avgDuration: 0, conversionPct: 0, topIntents: [] };
    }
  }
}

function normalizeCalls(raw: any[]): Call[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c: any) => ({
    id: String(c.id ?? c.callId ?? cryptoRandom()),
    phoneNumber: c.phoneNumber ?? c.caller ?? "",
    startTime: new Date(c.startTime ?? c.startedAt ?? Date.now()),
    endTime: c.endTime ? new Date(c.endTime) : undefined,
    duration: Number(c.duration ?? 0),
    transcript: c.transcript ?? "",
    priority: c.priority ?? "P3",
    status: c.status ?? "completed",
    recordingUrl: c.recordingUrl,
    metadata: c.metadata ?? {},
  }));
}

function normalizeCallsFromEvents(raw: any[]): Call[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e: any) => (e.type ?? e.eventType) === "call")
    .map((e: any) => ({
      id: String(e.id ?? e.eventId ?? cryptoRandom()),
      phoneNumber: e.phoneNumber ?? e.caller ?? "",
      startTime: new Date(e.timestamp ?? e.time ?? Date.now()),
      endTime: undefined,
      duration: Number(e.duration ?? 0),
      transcript: e.transcript ?? "",
      priority: e.priority ?? "P3",
      status: e.status ?? "completed",
      recordingUrl: e.recordingUrl,
      metadata: e.metadata ?? {},
    }));
}

function normalizeAnalytics(raw: any): {
  totalCalls: number;
  answeredPct: number;
  avgDuration: number;
  conversionPct: number;
  topIntents: { intent: string; count: number }[];
} {
  const totalCalls = Number(raw?.totalCalls ?? 0);
  const answeredPct = Number(raw?.answeredPct ?? raw?.answeredRate ?? 0);
  const avgDuration = Number(raw?.avgCallDuration ?? raw?.averageCallDuration ?? 0);
  const conversionPct = Number(raw?.conversionPct ?? raw?.conversionRate ?? 0);
  const topIntents = Array.isArray(raw?.topIntents)
    ? raw.topIntents.map((i: any) => ({ intent: String(i.intent ?? i.name ?? "inconnu"), count: Number(i.count ?? 0) }))
    : [];
  return { totalCalls, answeredPct, avgDuration, conversionPct, topIntents };
}

function aggregateFromEvents(events: any[]): {
  totalCalls: number;
  answeredPct: number;
  avgDuration: number;
  conversionPct: number;
  topIntents: { intent: string; count: number }[];
} {
  if (!Array.isArray(events)) return { totalCalls: 0, answeredPct: 0, avgDuration: 0, conversionPct: 0, topIntents: [] };
  const calls = events.filter((e) => (e.type ?? e.eventType) === "call");
  const total = calls.length;
  const answered = calls.filter((c) => (c.status ?? "").startsWith("completed") || (c.answered ?? false)).length;
  const avg = total ? Math.round((calls.reduce((s, c) => s + Number(c.duration ?? 0), 0) / total)) : 0;
  const intentsMap = new Map<string, number>();
  for (const c of calls) {
    const intent = String(c.intent ?? c.metadata?.intent ?? c.metadata?.service ?? "inconnu");
    intentsMap.set(intent, (intentsMap.get(intent) ?? 0) + 1);
  }
  const topIntents = Array.from(intentsMap.entries())
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  // Conversion not derivable: leave 0
  return { totalCalls: total, answeredPct: total ? Math.round((answered / total) * 100) : 0, avgDuration: avg, conversionPct: 0, topIntents };
}

function cryptoRandom() {
  // lightweight unique id fallback
  return Math.random().toString(36).slice(2);
}

