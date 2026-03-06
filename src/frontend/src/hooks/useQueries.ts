import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { RecordMatch } from "../backend";
import { loadMatchesLocal, saveMatchLocal } from "../utils/localHistory";
import { useActor } from "./useActor";

export function useGetAllMatches() {
  const { actor, isFetching } = useActor();
  return useQuery<RecordMatch[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMatches();
    },
    enabled: !!actor && !isFetching,
  });
}

// Always-available local history — reads from localStorage, refreshes when a
// new match is saved or the component is mounted. This is the primary source
// used by HistoryModal so that history works even without a canister connection.
export function useLocalHistory() {
  const [matches, setMatches] = useState<RecordMatch[]>(() =>
    loadMatchesLocal(),
  );

  const refresh = useCallback(() => setMatches(loadMatchesLocal()), []);

  // Listen for storage events (cross-tab) and custom 'match-saved' events (same tab)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "kumite_match_history_v1") refresh();
    };
    const onMatchSaved = () => refresh();

    window.addEventListener("storage", onStorage);
    window.addEventListener("match-saved", onMatchSaved);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("match-saved", onMatchSaved);
    };
  }, [refresh]);

  return { matches, refresh };
}

export function useSaveMatchLocal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const save = (match: RecordMatch) => {
    // 1. Always save to localStorage immediately — this is reliable
    saveMatchLocal(match);
    // Fire a custom event so same-tab listeners know to refresh
    window.dispatchEvent(new CustomEvent("match-saved"));

    // 2. Best-effort save to backend canister
    if (actor) {
      actor
        .saveMatch(match)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["matches"] });
        })
        .catch(() => {
          // silently ignore — localStorage copy is the source of truth
        });
    }
  };

  return { save };
}

export function useGetDefaultSettings() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["defaultSettings"],
    queryFn: async () => {
      if (!actor)
        return { minutes: BigInt(1), seconds: BigInt(30), tatamiNumber: "1" };
      return actor.getDefaultSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveMatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (match: RecordMatch) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.saveMatch(match);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useUpdateSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tatamiNumber?: string;
      minutes?: bigint;
      seconds?: bigint;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateSettings(
        params.tatamiNumber ?? null,
        params.minutes ?? null,
        params.seconds ?? null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defaultSettings"] });
    },
  });
}
