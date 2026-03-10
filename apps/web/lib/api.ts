"use client";

import { getSessionUser, type SessionUser, type UserRole } from "./auth-session";

export interface Payslip {
  id: string;
  userId: string;
  period: string;
  grossSalary?: number;
  lines?: Array<{ code: string; description: string; amount: number }>;
  netSalary: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  managerId?: string;
  companyId: string;
}

export interface OrgNode {
  id: string;
  label: string;
  role: UserRole;
}

export interface OrgEdge {
  from: string;
  to: string;
}

export interface OrgChartResponse {
  nodes: OrgNode[];
  edges: OrgEdge[];
}

export interface TimeEntry {
  id: string;
  userId: string;
  type: "clock_in" | "clock_out";
  at: string;
}

export interface WorkdaySummary {
  userId: string;
  date: string;
  minutesWorked: number;
  mode: "office" | "smartworking";
}

interface ApiErrorPayload {
  message?: string | string[];
}

function getApiBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const origin = env && env.length > 0 ? env : "http://localhost:4000";
  const withoutTrailingSlash = origin.replace(/\/+$/, "");
  return withoutTrailingSlash.endsWith("/api") ? withoutTrailingSlash : `${withoutTrailingSlash}/api`;
}

function buildApiUrl(path: string): string {
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function getAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

async function parseError(response: Response): Promise<never> {
  let detail = `Errore API (${response.status})`;
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (Array.isArray(payload.message)) {
      detail = payload.message.join(", ");
    } else if (payload.message) {
      detail = payload.message;
    }
  } catch {
    // no-op
  }
  throw new Error(detail);
}

export async function login(email: string, password: string): Promise<{ token: string; user: SessionUser }> {
  const response = await fetch(buildApiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as { token: string; user: SessionUser };
}

export async function fetchCurrentUser(token: string): Promise<SessionUser> {
  const cached = getSessionUser();

  // #region agent log
  fetch("http://127.0.0.1:7773/ingest/f66d9d87-9031-47a1-a078-e26a7e72191d", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "228f3b"
    },
    body: JSON.stringify({
      sessionId: "228f3b",
      runId: "pre-fix",
      hypothesisId: "H4",
      location: "apps/web/lib/api.ts:fetchCurrentUser:useCachedSession",
      message: "Using cached session user",
      data: {
        hasCached: Boolean(cached),
        hasToken: Boolean(token)
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion agent log

  if (!cached) {
    throw new Error("Sessione non disponibile");
  }

  return cached;
}

export async function fetchPayslips(token: string): Promise<Payslip[]> {
  const response = await fetch(buildApiUrl("/payroll/payslips"), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as Payslip[];
}

export async function fetchUsers(token: string): Promise<User[]> {
  const response = await fetch(buildApiUrl("/users"), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as User[];
}

export async function fetchOrgChart(token: string): Promise<OrgChartResponse> {
  const response = await fetch(buildApiUrl("/org/chart"), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as OrgChartResponse;
}

export async function clock(token: string, type: "clock_in" | "clock_out"): Promise<TimeEntry> {
  const response = await fetch(buildApiUrl("/attendance/clock"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ type, at: new Date().toISOString() })
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as TimeEntry;
}

export async function fetchAttendanceEntries(token: string): Promise<TimeEntry[]> {
  const response = await fetch(buildApiUrl("/attendance/entries"), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as TimeEntry[];
}

export async function fetchAttendanceSummary(token: string): Promise<WorkdaySummary[]> {
  const response = await fetch(buildApiUrl("/attendance/summary"), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as WorkdaySummary[];
}

export async function generatePayslip(
  token: string,
  userId: string,
  period: string
): Promise<Payslip> {
  const response = await fetch(buildApiUrl(`/payroll/${userId}/${period}/generate`), {
    method: "POST",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as Payslip;
}

export async function downloadPayslipPdf(token: string, userId: string, period: string): Promise<void> {
  const response = await fetch(buildApiUrl(`/payroll/${userId}/${period}/pdf`), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = `payday-cedolino-${userId}-${period}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}
