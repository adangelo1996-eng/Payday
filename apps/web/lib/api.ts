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
  firstName?: string;
  lastName?: string;
  role: UserRole;
  managerId?: string;
  companyId: string;
  dailyTargetSeconds?: number;
  vacationAllowanceDays?: number;
  birthDate?: string;
  phone?: string;
  address?: string;
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

export interface AttendanceStatus {
  date: string;
  hasOpenClockIn: boolean;
  nextType: "clock_in" | "clock_out";
  entriesCount: number;
  minutesWorked: number;
  dailyTargetSeconds: number;
  remainingSeconds: number;
}

export interface LeavePlan {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: "draft" | "pending" | "approved" | "rejected";
  version: number;
}

export interface LeaveBalance {
  userId: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  residualDays: number;
}

export interface ApprovalItem {
  id: string;
  entityId: string;
  type: "leave" | "sickness";
  requestedBy: string;
  approverId?: string;
  status: "pending" | "approved" | "rejected";
  at: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  role: UserRole;
  managerId?: string;
  companyId: string;
  dailyTargetSeconds?: number;
  vacationAllowanceDays?: number;
  birthDate?: string;
  phone?: string;
  address?: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: UserRole;
  managerId?: string;
  dailyTargetSeconds?: number;
  vacationAllowanceDays?: number;
  birthDate?: string;
  phone?: string;
  address?: string;
}

interface ApiErrorPayload {
  message?: string | string[];
}

function debugAgentLog(
  hypothesisId: "H1" | "H2" | "H3" | "H4" | "H5",
  location: string,
  message: string,
  data: Record<string, unknown>
): void {
  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/da1f9aea-fe4e-4a64-8920-44501363a538", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad76a1" },
    body: JSON.stringify({
      sessionId: "ad76a1",
      runId: "run1",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
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
  const url = buildApiUrl("/auth/login");
  debugAgentLog("H1", "apps/web/lib/api.ts:183", "Login request configured", {
    requestUrl: url,
    frontendOrigin: typeof window !== "undefined" ? window.location.origin : "server",
    apiBaseEnv: process.env.NEXT_PUBLIC_API_BASE_URL ?? null
  });
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    debugAgentLog("H5", "apps/web/lib/api.ts:194", "Login fetch resolved", {
      status: response.status,
      ok: response.ok
    });
    if (!response.ok) {
      await parseError(response);
    }
    return (await response.json()) as { token: string; user: SessionUser };
  } catch (error) {
    debugAgentLog("H3", "apps/web/lib/api.ts:203", "Login fetch threw before response", {
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
    throw error;
  }
}

export async function fetchCurrentUser(token: string): Promise<SessionUser> {
  const response = await fetch(buildApiUrl("/users/me"), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    const cached = getSessionUser();
    if (cached) {
      return cached;
    }
    await parseError(response);
  }
  return (await response.json()) as SessionUser;
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

export async function createUser(token: string, payload: CreateUserPayload): Promise<User> {
  const response = await fetch(buildApiUrl("/users"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as User;
}

export async function updateUser(token: string, userId: string, payload: UpdateUserPayload): Promise<User> {
  const response = await fetch(buildApiUrl(`/users/${userId}`), {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as User;
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

export async function fetchAttendanceEntries(token: string, date?: string): Promise<TimeEntry[]> {
  const search = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(buildApiUrl(`/attendance/entries${search}`), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as TimeEntry[];
}

export async function fetchAttendanceSummary(token: string, date?: string): Promise<WorkdaySummary[]> {
  const search = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(buildApiUrl(`/attendance/summary${search}`), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as WorkdaySummary[];
}

export async function fetchAttendanceStatus(token: string, date?: string): Promise<AttendanceStatus> {
  const search = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(buildApiUrl(`/attendance/status${search}`), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as AttendanceStatus;
}

export async function createLeavePlan(
  token: string,
  payload: Pick<LeavePlan, "startDate" | "endDate">
): Promise<LeavePlan> {
  const response = await fetch(buildApiUrl("/leave/plan"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as LeavePlan;
}

export async function fetchLeaveBalance(token: string, year: number): Promise<LeaveBalance> {
  const response = await fetch(buildApiUrl(`/leave/balance?year=${year}`), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as LeaveBalance;
}

export async function setLeaveAllowance(token: string, userId: string, allocatedDays: number): Promise<LeaveBalance> {
  const response = await fetch(buildApiUrl(`/leave/balance/${userId}`), {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ allocatedDays })
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as LeaveBalance;
}

export async function fetchApprovals(
  token: string,
  status?: "pending" | "approved" | "rejected"
): Promise<ApprovalItem[]> {
  const search = status ? `?status=${status}` : "";
  const response = await fetch(buildApiUrl(`/approvals${search}`), {
    method: "GET",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as ApprovalItem[];
}

export async function approveApproval(token: string, approvalId: string): Promise<ApprovalItem> {
  const response = await fetch(buildApiUrl(`/approvals/${approvalId}/approve`), {
    method: "PATCH",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as ApprovalItem;
}

export async function rejectApproval(token: string, approvalId: string): Promise<ApprovalItem> {
  const response = await fetch(buildApiUrl(`/approvals/${approvalId}/reject`), {
    method: "PATCH",
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    await parseError(response);
  }
  return (await response.json()) as ApprovalItem;
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
