const response = await fetch("https://victor-pixal3d-studio.hf.space/health", { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Space health HTTP ${response.status}`);
console.log(await response.json());
