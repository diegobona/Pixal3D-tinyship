/** Kept as a separate module so the deployed scheduled handler can be tested directly. */
export async function runScheduledJobs(controller, env, request = fetch) {
  if (!env.APP_BASE_URL) {
    console.error("[scheduled-jobs] APP_BASE_URL is not configured.");
    return;
  }
  const origin = new URL(env.APP_BASE_URL);
  if (origin.protocol !== "https:" || origin.username || origin.password) {
    throw new Error("Scheduled jobs require an HTTPS application origin.");
  }
  const jobs = [
    ["yearly-credit-cron", "/api/cron/refresh-yearly-credits", env.CRON_SECRET],
    ...["pixal3d", "trellis", "hunyuan3d"].map((model) => [
      `space-monitor:${model}`, `/api/cron/space-monitor/${model}`, env.SPACE_MONITOR_SECRET,
    ]),
  ];
  const results = await Promise.allSettled(jobs.map(async ([name, path, secret]) => {
    if (!secret) {
      console.warn("[scheduled-jobs] Job secret not configured; skipped", name);
      return;
    }
    const response = await request(new URL(path, origin.origin), {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(180_000),
      headers: {
        "x-cron-secret": secret,
        "x-cron-source": "cloudflare-scheduled",
        "x-cron-scheduled-time": String(controller.scheduledTime || Date.now()),
      },
    });
    // Do not put response bodies or authentication headers in Worker logs.
    await response.body?.cancel();
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  }));
  results.forEach((result, index) => {
    if (result.status === "rejected") console.error("[scheduled-jobs] Failed", jobs[index][0]);
  });
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("One or more scheduled jobs failed; inspect each authenticated job status.");
  }
}
