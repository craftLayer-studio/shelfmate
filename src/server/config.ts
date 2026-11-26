/** Public base URL used in QR codes and share links. Dev default matches `pnpm dev` (port 3157). */
export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3157").replace(/\/$/, "");
}

/** Demo mode shows OTPs on screen and enables simulated payments. On unless DEMO_MODE=off. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE !== "off";
}
