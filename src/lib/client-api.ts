"use client";
export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  let payload: { error?: { code?: string; message?: string } } & T;
  try {
    payload = await response.json();
  } catch {
    throw new Error("সার্ভারের উত্তর পাওয়া যায়নি। সংযোগ যাচাই করে আবার চেষ্টা করুন।");
  }
  if (!response.ok) throw new Error(payload.error?.message ?? "অনুরোধটি সফল হয়নি। আবার চেষ্টা করুন।");
  return payload;
}
export function notifyMutation() {
  window.dispatchEvent(new Event("takatrack-data-changed"));
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel("takatrack-data");
    channel.postMessage("changed");
    channel.close();
  }
}
