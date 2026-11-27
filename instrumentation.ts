export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    (globalThis as unknown as { __vd_startedAt?: number }).__vd_startedAt = Date.now();
    const { startOutboxLoop } = await import("./lib/db/outbox");
    startOutboxLoop();
  }
}
