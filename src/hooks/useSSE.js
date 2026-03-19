import { useEffect, useRef } from "react";

export function useSSE(branchId, onEvent) {
  const esRef = useRef(null);
  useEffect(() => {
    if (!branchId) return;
    const es = new EventSource(`/api/events?branch_id=${branchId}`);
    esRef.current = es;
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    };
    es.onerror = () => {
      // Auto-reconnects after 3s — EventSource handles this natively
    };
    return () => es.close();
  }, [branchId]);
}
