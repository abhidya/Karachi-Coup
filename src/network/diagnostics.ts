const DIAGNOSTIC_KEY = 'karachi-coup:network-diagnostics';

export type NetworkDiagnostic = {
  stage: string;
  at: string;
  details?: Record<string, string | number | boolean | null>;
};

export function recordNetworkStage(stage: string, details?: Record<string, string | number | boolean | null>): void {
  if (typeof window === 'undefined') return;

  try {
    const diagnostic: NetworkDiagnostic = {
      stage,
      at: new Date().toISOString(),
      details,
    };
    window.localStorage.setItem(DIAGNOSTIC_KEY, JSON.stringify(diagnostic));
  } catch {
    // Ignore diagnostics failures.
  }
}

export function readNetworkDiagnostic(): NetworkDiagnostic | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(DIAGNOSTIC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NetworkDiagnostic;
  } catch {
    return null;
  }
}
