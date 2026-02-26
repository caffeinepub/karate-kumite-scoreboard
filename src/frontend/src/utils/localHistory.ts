import type { RecordMatch } from '../backend';

const HISTORY_KEY = 'kumite_match_history_v1';

// Serialize RecordMatch to JSON-safe format (BigInt → string with marker)
function serializeMatch(match: RecordMatch): object {
  return JSON.parse(
    JSON.stringify(match, (_key, value) =>
      typeof value === 'bigint' ? `__bigint__${value.toString()}` : value
    )
  );
}

// Deserialize back — restore BigInt from marker strings
function deserializeMatch(obj: unknown): RecordMatch {
  const json = JSON.stringify(obj);
  const restored = JSON.parse(json, (_key, value) => {
    if (typeof value === 'string' && value.startsWith('__bigint__')) {
      return BigInt(value.slice(10));
    }
    return value;
  });
  return restored as RecordMatch;
}

export function saveMatchLocal(match: RecordMatch): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const existing: object[] = raw ? JSON.parse(raw) : [];
    existing.push(serializeMatch(match));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
}

export function loadMatchesLocal(): RecordMatch[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown[] = JSON.parse(raw);
    return parsed.map(deserializeMatch);
  } catch {
    return [];
  }
}

export function clearHistoryLocal(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}
