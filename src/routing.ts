const baseUrl = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL;

export function formatRoomLink(roomId: string, cleanBaseUrl = baseUrl, origin = window.location.origin) {
  const base = new URL(cleanBaseUrl, origin).toString();
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}#/join?room=${encodeURIComponent(roomId)}`;
}
