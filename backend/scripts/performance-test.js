'use strict';

const base = process.env.PERF_BASE_URL || 'http://localhost:5000';
const endpoints = ['/api/v1/health/live', '/api/v1/health/ready', '/index.html'];
const DURATION_MS = 3000;
const CONCURRENCY = 2;
const REQUEST_INTERVAL_MS = 100;

async function benchmark(path) {
  const endsAt = Date.now() + DURATION_MS;
  const latencies = [];
  let requests = 0, errors = 0, non2xx = 0;
  async function worker() {
    while (Date.now() < endsAt) {
      const started = performance.now();
      try {
        const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(3000) });
        await response.arrayBuffer();
        if (!response.ok) non2xx += 1;
      } catch { errors += 1; }
      latencies.push(performance.now() - started); requests += 1;
      await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  latencies.sort((a,b) => a-b);
  const average = latencies.reduce((sum,value) => sum+value,0) / Math.max(1,latencies.length);
  return {
    endpoint:path, requestsPerSecond:Number((requests/(DURATION_MS/1000)).toFixed(2)),
    averageLatencyMs:Number(average.toFixed(2)), p95LatencyMs:Number((latencies[Math.floor(latencies.length*0.95)]||0).toFixed(2)),
    errors, non2xx
  };
}

async function main() {
  for (const path of endpoints) {
    process.stdout.write(`${JSON.stringify(await benchmark(path))}\n`);
  }
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
