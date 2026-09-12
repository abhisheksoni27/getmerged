import posthog from "posthog-js";

export const EVENT_QUEUE_KEY = "opendoor_first_merge_events_v1";
export const MAX_QUEUE_SIZE = 50;

let inMemoryQueue: Array<{ event: string; properties: Record<string, unknown>; timestamp: number }> = [];

export function queueTrackEvent(event: string, properties: Record<string, unknown> = {}) {
  const item = { event, properties, timestamp: Date.now() };
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      let queue: Array<{ event: string; properties: Record<string, unknown>; timestamp: number }> = [];
      try {
        const raw = localStorage.getItem(EVENT_QUEUE_KEY);
        if (raw) queue = JSON.parse(raw);
      } catch {
        queue = inMemoryQueue;
      }
      if (!Array.isArray(queue)) queue = [];
      queue.push(item);
      if (queue.length > MAX_QUEUE_SIZE) {
        queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
      }
      localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(queue));
      inMemoryQueue = queue;
    } else {
      inMemoryQueue.push(item);
      if (inMemoryQueue.length > MAX_QUEUE_SIZE) {
        inMemoryQueue = inMemoryQueue.slice(inMemoryQueue.length - MAX_QUEUE_SIZE);
      }
    }
  } catch {
    inMemoryQueue.push(item);
    if (inMemoryQueue.length > MAX_QUEUE_SIZE) {
      inMemoryQueue = inMemoryQueue.slice(inMemoryQueue.length - MAX_QUEUE_SIZE);
    }
  }

  flushEventQueue();
}

export function flushEventQueue() {
  try {
    let itemsToFlush: Array<{ event: string; properties: Record<string, unknown>; timestamp: number }> = [];
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(EVENT_QUEUE_KEY);
      if (raw) {
        itemsToFlush = JSON.parse(raw);
      }
    }
    if (itemsToFlush.length === 0) {
      itemsToFlush = inMemoryQueue;
    }

    if (itemsToFlush.length > 0 && typeof posthog !== "undefined" && typeof posthog.capture === "function") {
      const remaining: typeof itemsToFlush = [];
      for (const item of itemsToFlush) {
        try {
          posthog.capture(item.event, {
            ...item.properties,
            queued_at: item.timestamp,
            first_merge_track: true,
          });
        } catch {
          remaining.push(item);
        }
      }
      inMemoryQueue = remaining;
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(remaining));
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // Non-blocking best effort
  }
}

export function useFirstMergeEventQueue() {
  return { queueTrackEvent, flushEventQueue };
}
