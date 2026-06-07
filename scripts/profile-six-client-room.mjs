import { chromium, firefox, webkit, devices } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const baseURL = process.env.PROFILE_BASE_URL || process.env.E2E_BASE_URL || 'https://abhidya.github.io/Karachi-Coup/';
const label = process.env.PROFILE_LABEL || 'profile';
const outputDir = process.env.PROFILE_OUTPUT_DIR || 'metrics';
const resyncClicks = Number(process.env.PROFILE_RESYNC_CLICKS || '3');
const settleMs = Number(process.env.PROFILE_SETTLE_MS || '10000');

const participants = [
  { role: 'host', label: 'host-chromium-desktop', launcher: chromium, device: 'Desktop Chrome', name: 'Host Profile' },
  { role: 'client', label: 'client-chromium-pixel5', launcher: chromium, device: 'Pixel 5', name: 'Pixel Profile' },
  { role: 'client', label: 'client-webkit-iphone13', launcher: webkit, device: 'iPhone 13', name: 'iPhone Profile' },
  { role: 'client', label: 'client-firefox-desktop', launcher: firefox, device: 'Desktop Firefox', name: 'Firefox Profile' },
  { role: 'client', label: 'client-webkit-ipad', launcher: webkit, device: 'iPad Pro 11', name: 'iPad Profile' },
  { role: 'client', label: 'client-chromium-galaxy', launcher: chromium, device: 'Galaxy S9+', name: 'Galaxy Profile' },
  { role: 'client', label: 'client-chromium-desktop', launcher: chromium, device: 'Desktop Chrome', name: 'Desktop Profile' },
];

function emptyMetrics(participant) {
  return {
    role: participant.role,
    label: participant.label,
    device: participant.device,
    name: participant.name,
    requests: 0,
    requestsByResourceType: {},
    requestsByMethod: {},
    requestsByHost: {},
    responses: 0,
    responseStatuses: {},
    responseBytes: 0,
    responseBodyBytes: 0,
    responseBodyReadErrors: 0,
    failedRequests: [],
    websockets: [],
    websocketFramesSent: 0,
    websocketFramesReceived: 0,
    websocketBytesSent: 0,
    websocketBytesReceived: 0,
    console: [],
    consoleErrors: [],
    pageErrors: [],
    crashes: 0,
    userAgent: null,
    navigation: null,
    resourceTiming: null,
    memory: null,
  };
}

function inc(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function hostForUrl(rawUrl) {
  try {
    return new URL(rawUrl).host;
  } catch {
    return 'invalid-url';
  }
}

function frameBytes(payload) {
  if (typeof payload === 'string') return Buffer.byteLength(payload);
  if (payload && typeof payload.byteLength === 'number') return payload.byteLength;
  if (Buffer.isBuffer(payload)) return payload.length;
  return 0;
}

function attachMetrics(page, metrics) {
  page.on('request', (request) => {
    metrics.requests += 1;
    inc(metrics.requestsByResourceType, request.resourceType());
    inc(metrics.requestsByMethod, request.method());
    inc(metrics.requestsByHost, hostForUrl(request.url()));
  });

  page.on('response', async (response) => {
    metrics.responses += 1;
    inc(metrics.responseStatuses, String(response.status()));
    const contentLength = Number(response.headers()['content-length'] || 0);
    if (Number.isFinite(contentLength) && contentLength > 0) {
      metrics.responseBytes += contentLength;
    }
    try {
      const body = await response.body();
      metrics.responseBodyBytes += body.byteLength;
      if (!contentLength) metrics.responseBytes += body.byteLength;
    } catch {
      metrics.responseBodyReadErrors += 1;
    }
  });

  page.on('requestfailed', (request) => {
    metrics.failedRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText || 'failed',
    });
  });

  page.on('websocket', (ws) => {
    const socket = { url: ws.url(), framesSent: 0, framesReceived: 0, bytesSent: 0, bytesReceived: 0, closed: false };
    metrics.websockets.push(socket);
    ws.on('framesent', ({ payload }) => {
      socket.framesSent += 1;
      metrics.websocketFramesSent += 1;
      const bytes = frameBytes(payload);
      socket.bytesSent += bytes;
      metrics.websocketBytesSent += bytes;
    });
    ws.on('framereceived', ({ payload }) => {
      socket.framesReceived += 1;
      metrics.websocketFramesReceived += 1;
      const bytes = frameBytes(payload);
      socket.bytesReceived += bytes;
      metrics.websocketBytesReceived += bytes;
    });
    ws.on('close', () => {
      socket.closed = true;
    });
  });

  page.on('console', (message) => {
    const entry = { type: message.type(), text: message.text() };
    metrics.console.push(entry);
    if (message.type() === 'error') metrics.consoleErrors.push(entry);
  });

  page.on('pageerror', (error) => {
    metrics.pageErrors.push({ name: error.name, message: error.message });
  });

  page.on('crash', () => {
    metrics.crashes += 1;
  });
}

async function collectBrowserState(page, metrics) {
  const state = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const byInitiator = {};
    const byHost = {};
    let transferSize = 0;
    for (const resource of resources) {
      byInitiator[resource.initiatorType] = (byInitiator[resource.initiatorType] || 0) + 1;
      try {
        const host = new URL(resource.name).host;
        byHost[host] = (byHost[host] || 0) + 1;
      } catch {}
      transferSize += resource.transferSize || 0;
    }
    return {
      userAgent: navigator.userAgent,
      navigation: nav ? {
        type: nav.type,
        startTime: nav.startTime,
        domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
        loadEventEnd: nav.loadEventEnd,
        transferSize: nav.transferSize || 0,
        encodedBodySize: nav.encodedBodySize || 0,
        decodedBodySize: nav.decodedBodySize || 0,
      } : null,
      resourceTiming: {
        count: resources.length,
        byInitiator,
        byHost,
        transferSize,
      },
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      } : null,
    };
  });
  Object.assign(metrics, state);
}

async function waitForText(page, text, timeout = 60_000) {
  await page.locator('body').getByText(text, { exact: false }).waitFor({ timeout });
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const browsers = new Map();
  const contexts = [];
  const pages = [];
  const timeline = [];

  function mark(event, details = {}) {
    timeline.push({ event, atMs: Math.round(performance.now() - started), ...details });
  }

  try {
    for (const participant of participants) {
      const key = participant.launcher.name();
      if (!browsers.has(key)) {
        browsers.set(key, await participant.launcher.launch({ headless: true }));
      }
      const browser = browsers.get(key);
      const metrics = emptyMetrics(participant);
      const context = await browser.newContext({ ...devices[participant.device] });
      const page = await context.newPage();
      attachMetrics(page, metrics);
      contexts.push(context);
      pages.push({ participant, page, metrics });
    }

    const host = pages[0];
    mark('host-goto-start');
    await host.page.goto(baseURL);
    await host.page.getByLabel('Your name').fill(host.participant.name);
    await host.page.getByTestId('create-room-button').click();
    await host.page.waitForURL(/#\/(host|lobby)\?room=/, { timeout: 60_000 });
    await host.page.getByTestId('current-scene').waitFor({ timeout: 60_000 });
    const roomCode = new URL(host.page.url()).hash.match(/room=([A-Z0-9]+)/)?.[1];
    if (!roomCode) throw new Error(`Could not read room code from ${host.page.url()}`);
    mark('host-room-created', { roomCode });

    const joinTimings = [];
    for (const entry of pages.slice(1)) {
      const joinStart = performance.now();
      mark('client-join-start', { label: entry.participant.label });
      await entry.page.goto(`${baseURL}#/join?room=${roomCode}`);
      await entry.page.getByLabel('Your name').fill(entry.participant.name);
      await entry.page.getByTestId('join-submit-button').click();
      await entry.page.waitForURL(new RegExp(`#\\/lobby\\?room=${roomCode}`), { timeout: 60_000 });
      await entry.page.getByTestId('current-scene').waitFor({ timeout: 60_000 });
      await waitForText(host.page, entry.participant.name, 60_000);
      await waitForText(entry.page, host.participant.name, 60_000);
      const joinMs = Math.round(performance.now() - joinStart);
      joinTimings.push({ label: entry.participant.label, name: entry.participant.name, joinMs });
      mark('client-join-complete', { label: entry.participant.label, joinMs });
    }

    const allClientNames = pages.slice(1).map((entry) => entry.participant.name);
    for (const name of allClientNames) await waitForText(host.page, name, 60_000);
    for (const entry of pages.slice(1)) await waitForText(entry.page, host.participant.name, 60_000);
    mark('all-clients-visible', { clients: allClientNames.length });

    const resyncStart = performance.now();
    for (const entry of pages.slice(1)) {
      for (let index = 0; index < resyncClicks; index += 1) {
        await entry.page.getByTestId('request-resync-button').click();
      }
    }
    await host.page.waitForTimeout(settleMs);
    const resyncMs = Math.round(performance.now() - resyncStart);
    mark('resync-stress-complete', { resyncClicksPerClient: resyncClicks, resyncMs });

    for (const entry of pages) {
      const bodyText = await entry.page.locator('body').innerText({ timeout: 10_000 });
      if (/CLIENT:ERROR|HOST:ERROR/i.test(bodyText)) {
        throw new Error(`${entry.participant.label} showed error state: ${bodyText.slice(0, 500)}`);
      }
      await collectBrowserState(entry.page, entry.metrics);
    }

    const summary = {
      label,
      baseURL,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started),
      roomCode,
      participantCount: participants.length,
      clientCount: participants.length - 1,
      resyncClicksPerClient: resyncClicks,
      joinTimings,
      resyncMs,
      totals: {},
      timeline,
      participants: pages.map(({ metrics }) => metrics),
    };

    summary.totals = summary.participants.reduce((acc, metric) => {
      acc.requests += metric.requests;
      acc.responses += metric.responses;
      acc.responseBytes += metric.responseBytes;
      acc.responseBodyBytes += metric.responseBodyBytes;
      acc.websockets += metric.websockets.length;
      acc.websocketFramesSent += metric.websocketFramesSent;
      acc.websocketFramesReceived += metric.websocketFramesReceived;
      acc.websocketBytesSent += metric.websocketBytesSent;
      acc.websocketBytesReceived += metric.websocketBytesReceived;
      acc.failedRequests += metric.failedRequests.length;
      acc.consoleErrors += metric.consoleErrors.length;
      acc.pageErrors += metric.pageErrors.length;
      acc.crashes += metric.crashes;
      return acc;
    }, {
      requests: 0,
      responses: 0,
      responseBytes: 0,
      responseBodyBytes: 0,
      websockets: 0,
      websocketFramesSent: 0,
      websocketFramesReceived: 0,
      websocketBytesSent: 0,
      websocketBytesReceived: 0,
      failedRequests: 0,
      consoleErrors: 0,
      pageErrors: 0,
      crashes: 0,
    });

    const safeLabel = label.replace(/[^A-Za-z0-9_.-]/g, '-');
    const outputPath = path.join(outputDir, `${safeLabel}.json`);
    await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify({ outputPath, totals: summary.totals, joinTimings, resyncMs }, null, 2));
  } finally {
    for (const context of contexts.reverse()) {
      await context.close().catch(() => {});
    }
    for (const browser of browsers.values()) {
      await browser.close().catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
