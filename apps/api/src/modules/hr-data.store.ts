import { Injectable, NotFoundException } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  LeavePlan,
  Payslip,
  SicknessEvent,
  TimeEntry,
  User,
  WorkdaySummary
} from "./models";
import { calculateSwissPayroll } from "./swiss-payroll.util";

interface ApprovalRecord {
  id: string;
  entityId: string;
  type: "leave" | "sickness";
  requestedBy: string;
  approverId?: string;
  status: "pending" | "approved" | "rejected";
  at: string;
}

interface Delegation {
  managerId: string;
  delegateManagerId: string;
  from: string;
  to: string;
}

@Injectable()
export class HrDataStore {
  private readonly supabase?: SupabaseClient;
  private seeded = false;
  private readonly users: User[] = [
    {
      id: "u-admin",
      email: "admin@payday.ch",
      fullName: "HR Admin",
      role: "admin",
      companyId: "comp-1"
    },
    {
      id: "u-manager",
      email: "manager@payday.ch",
      fullName: "Manager Controllo",
      role: "manager_controllo_gestione",
      companyId: "comp-1"
    },
    {
      id: "u-employee",
      email: "employee@payday.ch",
      fullName: "Dipendente Demo",
      role: "employee",
      managerId: "u-manager",
      companyId: "comp-1"
    }
  ];

  private readonly roles = [
    { id: "r1", name: "admin", permissions: ["*"] },
    {
      id: "r2",
      name: "manager_controllo_gestione",
      permissions: ["approve:leave", "approve:sickness", "read:team", "read:payslip:team"]
    },
    {
      id: "r3",
      name: "employee",
      permissions: ["clock", "request:leave", "request:sickness", "read:self", "read:payslip:self"]
    }
  ];

  private readonly timeEntries: TimeEntry[] = [];
  private readonly workdaySummaries: WorkdaySummary[] = [];
  private readonly leavePlans: LeavePlan[] = [];
  private readonly sicknessEvents: SicknessEvent[] = [];
  private readonly approvals: ApprovalRecord[] = [];
  private readonly payslips: Payslip[] = [];
  private readonly delegations: Delegation[] = [];

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceRole) {
      this.supabase = createClient(url, serviceRole);
    }
  }

  private get useDb(): boolean {
    return Boolean(this.supabase);
  }

  private async ensureSeedUsers(): Promise<void> {
    if (!this.useDb || this.seeded) return;
    const { data, error } = await this.supabase!.from("users").select("id").limit(1);
    if (error) return;
    if (!data || data.length === 0) {
      await this.supabase!.from("users").insert(this.users);
    }
    this.seeded = true;
  }

  async listUsers(): Promise<User[]> {
    await this.ensureSeedUsers();
    if (this.useDb) {
      const { data } = await this.supabase!.from("users").select("*").order("fullName", { ascending: true });
      return (data as User[]) ?? [];
    }
    return this.users;
  }

  async getUser(userId: string): Promise<User> {
    const user = (await this.listUsers()).find((item) => item.id === userId);
    if (!user) throw new NotFoundException("Utente non trovato");
    return user;
  }

  listRoles(): unknown[] {
    return this.roles;
  }

  async assignRole(userId: string, role: User["role"]): Promise<User> {
    if (this.useDb) {
      const { data } = await this.supabase!
        .from("users")
        .update({ role })
        .eq("id", userId)
        .select("*")
        .single();
      if (!data) throw new NotFoundException("Utente non trovato");
      return data as User;
    }
    const user = this.users.find((item) => item.id === userId);
    if (!user) throw new NotFoundException("Utente non trovato");
    user.role = role;
    return user;
  }

  async isManagerOf(managerId: string, employeeId: string): Promise<boolean> {
    const employee = (await this.listUsers()).find((item) => item.id === employeeId);
    return employee?.managerId === managerId;
  }

  async addTimeEntry(userId: string, type: "clock_in" | "clock_out", at: string): Promise<TimeEntry> {
    const entry: TimeEntry = {
      id: `te-${Date.now()}`,
      userId,
      type,
      at
    };
    if (this.useDb) {
      await this.supabase!.from("time_entries").insert(entry);
      await this.refreshSummary(userId, at.slice(0, 10));
      return entry;
    }
    this.timeEntries.push(entry);
    await this.refreshSummary(userId, at.slice(0, 10));
    return entry;
  }

  async listTimeEntries(userId: string): Promise<TimeEntry[]> {
    if (this.useDb) {
      const { data } = await this.supabase!.from("time_entries").select("*").eq("userId", userId);
      return (data as TimeEntry[]) ?? [];
    }
    return this.timeEntries.filter((item) => item.userId === userId);
  }

  async listWorkdaySummary(userId: string): Promise<WorkdaySummary[]> {
    if (this.useDb) {
      const { data } = await this.supabase!.from("workday_summaries").select("*").eq("userId", userId);
      return (data as WorkdaySummary[]) ?? [];
    }
    return this.workdaySummaries.filter((item) => item.userId === userId);
  }

  private async refreshSummary(userId: string, date: string): Promise<void> {
    const dayEntries = (await this.listTimeEntries(userId))
      .filter((item) => item.at.startsWith(date))
      .sort((a, b) => a.at.localeCompare(b.at));

    const minutesWorked = dayEntries.reduce((acc, curr, index) => {
      if (curr.type === "clock_in") {
        const out = dayEntries[index + 1];
        if (out?.type === "clock_out") {
          const delta =
            (new Date(out.at).getTime() - new Date(curr.at).getTime()) / (1000 * 60);
          return acc + Math.max(0, Math.floor(delta));
        }
      }
      return acc;
    }, 0);

    const existing = (await this.listWorkdaySummary(userId)).find((item) => item.date === date);
    if (existing) {
      if (this.useDb) {
        await this.supabase!
          .from("workday_summaries")
          .update({ minutesWorked })
          .eq("userId", userId)
          .eq("date", date);
      } else {
        existing.minutesWorked = minutesWorked;
      }
      return;
    }
    const summary = {
      userId,
      date,
      minutesWorked,
      mode: "office"
    } as WorkdaySummary;
    if (this.useDb) {
      await this.supabase!.from("workday_summaries").insert(summary);
      return;
    }
    this.workdaySummaries.push(summary);
  }

  async upsertWorkMode(
    userId: string,
    date: string,
    mode: "office" | "smartworking"
  ): Promise<WorkdaySummary> {
    if (this.useDb) {
      const list = await this.listWorkdaySummary(userId);
      const summary = list.find((item) => item.date === date);
      if (!summary) {
        const newSummary: WorkdaySummary = { userId, date, minutesWorked: 0, mode };
        await this.supabase!.from("workday_summaries").insert(newSummary);
        return newSummary;
      }
      await this.supabase!
        .from("workday_summaries")
        .update({ mode })
        .eq("userId", userId)
        .eq("date", date);
      return { ...summary, mode };
    }
    const summary = this.workdaySummaries.find((item) => item.userId === userId && item.date === date);
    if (!summary) {
      const newSummary: WorkdaySummary = { userId, date, minutesWorked: 0, mode };
      this.workdaySummaries.push(newSummary);
      return newSummary;
    }
    summary.mode = mode;
    return summary;
  }

  async createLeavePlan(input: Omit<LeavePlan, "id" | "status" | "version">): Promise<LeavePlan> {
    const leave: LeavePlan = {
      id: `lv-${Date.now()}`,
      status: "pending",
      version: 1,
      ...input
    };
    if (this.useDb) {
      await this.supabase!.from("leave_plans").insert(leave);
    } else {
      this.leavePlans.push(leave);
    }
    const approval = {
      id: `ap-${Date.now()}`,
      entityId: leave.id,
      type: "leave",
      requestedBy: leave.userId,
      status: "pending",
      at: new Date().toISOString()
    } as ApprovalRecord;
    if (this.useDb) {
      await this.supabase!.from("approvals").insert(approval);
    } else {
      this.approvals.push(approval);
    }
    return leave;
  }

  async updateLeavePlan(leaveId: string, startDate: string, endDate: string): Promise<LeavePlan> {
    const leave = await this.getLeave(leaveId);
    if (!leave) throw new NotFoundException("Piano ferie non trovato");
    leave.startDate = startDate;
    leave.endDate = endDate;
    leave.version += 1;
    leave.status = "pending";
    if (this.useDb) {
      await this.supabase!
        .from("leave_plans")
        .update({ startDate, endDate, version: leave.version, status: leave.status })
        .eq("id", leaveId);
    }
    const approval = {
      id: `ap-${Date.now()}`,
      entityId: leave.id,
      type: "leave",
      requestedBy: leave.userId,
      status: "pending",
      at: new Date().toISOString()
    } as ApprovalRecord;
    if (this.useDb) {
      await this.supabase!.from("approvals").insert(approval);
    } else {
      this.approvals.push(approval);
    }
    return leave;
  }

  async approveLeave(leaveId: string, approverId: string): Promise<LeavePlan> {
    const leave = await this.getLeave(leaveId);
    if (!leave) throw new NotFoundException("Piano ferie non trovato");
    leave.status = "approved";
    if (this.useDb) {
      await this.supabase!.from("leave_plans").update({ status: "approved" }).eq("id", leaveId);
    }
    const approval = {
      id: `ap-${Date.now()}`,
      entityId: leave.id,
      type: "leave",
      requestedBy: leave.userId,
      approverId,
      status: "approved",
      at: new Date().toISOString()
    } as ApprovalRecord;
    if (this.useDb) {
      await this.supabase!.from("approvals").insert(approval);
    } else {
      this.approvals.push(approval);
    }
    return leave;
  }

  async listLeave(userId: string): Promise<LeavePlan[]> {
    if (this.useDb) {
      const { data } = await this.supabase!.from("leave_plans").select("*").eq("userId", userId);
      return (data as LeavePlan[]) ?? [];
    }
    return this.leavePlans.filter((item) => item.userId === userId);
  }

  async getLeave(leaveId: string): Promise<LeavePlan> {
    let leave: LeavePlan | undefined;
    if (this.useDb) {
      const { data } = await this.supabase!.from("leave_plans").select("*").eq("id", leaveId).single();
      leave = (data as LeavePlan) ?? undefined;
    } else {
      leave = this.leavePlans.find((item) => item.id === leaveId);
    }
    if (!leave) throw new NotFoundException("Piano ferie non trovato");
    return leave;
  }

  async createSicknessEvent(input: Omit<SicknessEvent, "id" | "status">): Promise<SicknessEvent> {
    const sickness: SicknessEvent = { id: `sk-${Date.now()}`, status: "pending", ...input };
    if (this.useDb) {
      await this.supabase!.from("sickness_events").insert(sickness);
    } else {
      this.sicknessEvents.push(sickness);
    }
    const approval = {
      id: `ap-${Date.now()}`,
      entityId: sickness.id,
      type: "sickness",
      requestedBy: sickness.userId,
      status: "pending",
      at: new Date().toISOString()
    } as ApprovalRecord;
    if (this.useDb) {
      await this.supabase!.from("approvals").insert(approval);
    } else {
      this.approvals.push(approval);
    }
    return sickness;
  }

  async approveSickness(id: string, approverId: string): Promise<SicknessEvent> {
    const sickness = await this.getSickness(id);
    if (!sickness) throw new NotFoundException("Evento malattia non trovato");
    sickness.status = "approved";
    if (this.useDb) {
      await this.supabase!.from("sickness_events").update({ status: "approved" }).eq("id", id);
    }
    const approval = {
      id: `ap-${Date.now()}`,
      entityId: sickness.id,
      type: "sickness",
      requestedBy: sickness.userId,
      approverId,
      status: "approved",
      at: new Date().toISOString()
    } as ApprovalRecord;
    if (this.useDb) {
      await this.supabase!.from("approvals").insert(approval);
    } else {
      this.approvals.push(approval);
    }
    return sickness;
  }

  async listSickness(userId: string): Promise<SicknessEvent[]> {
    if (this.useDb) {
      const { data } = await this.supabase!.from("sickness_events").select("*").eq("userId", userId);
      return (data as SicknessEvent[]) ?? [];
    }
    return this.sicknessEvents.filter((item) => item.userId === userId);
  }

  async getSickness(id: string): Promise<SicknessEvent> {
    let sickness: SicknessEvent | undefined;
    if (this.useDb) {
      const { data } = await this.supabase!.from("sickness_events").select("*").eq("id", id).single();
      sickness = (data as SicknessEvent) ?? undefined;
    } else {
      sickness = this.sicknessEvents.find((item) => item.id === id);
    }
    if (!sickness) throw new NotFoundException("Evento malattia non trovato");
    return sickness;
  }

  async getOrgChart(): Promise<unknown> {
    const users = await this.listUsers();
    return {
      nodes: users.map((user) => ({
        id: user.id,
        label: user.fullName,
        role: user.role
      })),
      edges: users
        .filter((user) => user.managerId)
        .map((user) => ({ from: user.managerId, to: user.id }))
    };
  }

  async addDelegation(
    managerId: string,
    delegateManagerId: string,
    from: string,
    to: string
  ): Promise<Delegation> {
    const delegation = { managerId, delegateManagerId, from, to };
    if (this.useDb) {
      await this.supabase!.from("delegations").insert(delegation);
    } else {
      this.delegations.push(delegation);
    }
    return delegation;
  }

  async getApproverChainForUser(userId: string): Promise<string[]> {
    const users = await this.listUsers();
    const chain: string[] = [];
    let current = users.find((item) => item.id === userId);
    while (current?.managerId) {
      const effectiveManager = await this.getEffectiveManager(current.managerId);
      chain.push(effectiveManager);
      current = users.find((item) => item.id === current?.managerId);
    }
    return chain;
  }

  private async getEffectiveManager(managerId: string): Promise<string> {
    const now = new Date().toISOString().slice(0, 10);
    const delegations = this.useDb
      ? (((await this.supabase!.from("delegations").select("*").eq("managerId", managerId)).data ??
          []) as Delegation[])
      : this.delegations;
    const delegation = delegations.find(
      (item) => item.managerId === managerId && now >= item.from && now <= item.to
    );
    return delegation?.delegateManagerId ?? managerId;
  }

  async generatePayslip(userId: string, period: string): Promise<Payslip> {
    const taxProfile = {
      canton: "TI",
      municipality: "Lugano",
      permitType: "B" as const,
      companyType: "commerciale",
      companySite: "TI-LUG"
    };
    const result = calculateSwissPayroll({
      period,
      grossMonthlySalary: 5800,
      age: 37,
      vacationDaysUsed: await this.countLeaveDays(userId, period),
      sicknessDays: await this.countSicknessDays(userId, period),
      smartworkingDays: await this.countSmartworkingDays(userId, period),
      overtimeAmount: 200,
      taxProfile
    });

    const payslip: Payslip = {
      id: `ps-${Date.now()}`,
      userId,
      period,
      grossSalary: result.grossAdjusted,
      netSalary: result.netSalary,
      lines: result.lines,
      pdfUrl: `/api/payroll/${userId}/${period}/pdf`
    };
    if (this.useDb) {
      await this.supabase!.from("payslips").insert({
        id: payslip.id,
        userId: payslip.userId,
        period: payslip.period,
        grossSalary: payslip.grossSalary,
        netSalary: payslip.netSalary,
        lines: payslip.lines,
        pdfUrl: payslip.pdfUrl
      });
    } else {
      this.payslips.push(payslip);
    }
    return payslip;
  }

  async getPayslipForPeriod(userId: string, period: string): Promise<Payslip | undefined> {
    const all = await this.listPayslips(userId, userId);
    return all.find((item) => item.period === period);
  }

  async listPayslips(requesterId: string, targetUserId?: string): Promise<Payslip[]> {
    const target = targetUserId ?? requesterId;
    if (this.useDb) {
      const { data } = await this.supabase!.from("payslips").select("*").eq("userId", target);
      return (data as Payslip[]) ?? [];
    }
    return this.payslips.filter((item) => item.userId === target);
  }

  private async countLeaveDays(userId: string, period: string): Promise<number> {
    const month = period.slice(0, 7);
    const leaves = await this.listLeave(userId);
    return leaves.filter((item) => item.startDate.startsWith(month))
      .length;
  }

  private async countSicknessDays(userId: string, period: string): Promise<number> {
    const month = period.slice(0, 7);
    const sickness = await this.listSickness(userId);
    return sickness.filter((item) => item.fromDate.startsWith(month))
      .length;
  }

  private async countSmartworkingDays(userId: string, period: string): Promise<number> {
    const month = period.slice(0, 7);
    const summaries = await this.listWorkdaySummary(userId);
    return summaries.filter(
      (item) => item.date.startsWith(month) && item.mode === "smartworking"
    ).length;
  }
}
