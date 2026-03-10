"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { OrgChart } from "@/components/org-chart";
import { PayslipArea } from "@/components/payslip-area";
import {
  clock,
  downloadPayslipPdf,
  fetchAttendanceEntries,
  fetchAttendanceSummary,
  fetchCurrentUser,
  fetchOrgChart,
  fetchPayslips,
  type TimeEntry,
  type WorkdaySummary,
  type OrgChartResponse,
  type Payslip
} from "@/lib/api";
import { clearSession, getToken, getSessionUser, type SessionUser } from "@/lib/auth-session";

export default function HomePage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [orgData, setOrgData] = useState<OrgChartResponse>({ nodes: [], edges: [] });
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<WorkdaySummary[]>([]);
  const [clockLoading, setClockLoading] = useState<"clock_in" | "clock_out" | null>(null);
  const [clockError, setClockError] = useState<string | null>(null);

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      router.replace("/login");
      return;
    }
    const tokenValue = currentToken;
    const cachedUser = getSessionUser();
    if (cachedUser) {
      setUser(cachedUser);
    }
    setToken(tokenValue);

    async function load(): Promise<void> {
      try {
        const [me, payslipList, chart] = await Promise.all([
          fetchCurrentUser(tokenValue),
          fetchPayslips(tokenValue),
          fetchOrgChart(tokenValue)
        ]);
        const [entriesList, summaryList] = await Promise.all([
          fetchAttendanceEntries(tokenValue),
          fetchAttendanceSummary(tokenValue)
        ]);
        setUser(me);
        setPayslips(payslipList);
        setOrgData(chart);
        setEntries(entriesList);
        setSummary(summaryList);
      } catch (loadError) {
        clearSession();
        router.replace("/login");
        setError(loadError instanceof Error ? loadError.message : "Sessione non valida");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = entries
    .filter((item) => item.at.slice(0, 10) === today)
    .sort((a, b) => b.at.localeCompare(a.at));
  const recentEntries = [...entries].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const todaySummary = summary.find((item) => item.date === today);

  async function onExportPdf(userId: string, period: string): Promise<void> {
    if (!token) {
      return;
    }
    await downloadPayslipPdf(token, userId, period);
  }

  async function onClock(type: "clock_in" | "clock_out"): Promise<void> {
    if (!token) {
      return;
    }
    setClockError(null);
    setClockLoading(type);
    try {
      await clock(token, type);
      const [entriesList, summaryList] = await Promise.all([
        fetchAttendanceEntries(token),
        fetchAttendanceSummary(token)
      ]);
      setEntries(entriesList);
      setSummary(summaryList);
    } catch (submitError) {
      setClockError(submitError instanceof Error ? submitError.message : "Errore timbratura");
    } finally {
      setClockLoading(null);
    }
  }

  function onLogout(): void {
    clearSession();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <p className="text-slate-300">Caricamento dashboard...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <p className="text-rose-300">{error ?? "Utente non disponibile"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">PAYDAY HR Cloud Enterprise</h1>
          <p className="mt-1 text-slate-400">
            Benvenuto {user.fullName}. Timbratura, ferie, malattia, approvazioni e payroll svizzero
            integrato.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/attendance" className="rounded-lg border border-slate-600 px-3 py-1 hover:bg-slate-800">
              Vai a Timbrature
            </Link>
            {user.role !== "employee" ? (
              <Link
                href="/payroll-calc"
                className="rounded-lg border border-slate-600 px-3 py-1 hover:bg-slate-800"
              >
                Calcolo cedolino
              </Link>
            ) : null}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300"
        >
          Esci
        </button>
      </header>

      <Dashboard todayEntriesCount={todayEntries.length} />

      <section className="card mt-6">
        <h2 className="text-xl font-semibold">Timbrature rapide</h2>
        <p className="mt-1 text-sm text-slate-400">Registra entrata/uscita e controlla lo stato giornaliero.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => void onClock("clock_in")}
            disabled={clockLoading !== null}
            className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-70"
          >
            {clockLoading === "clock_in" ? "Timbrando..." : "Timbratura entrata"}
          </button>
          <button
            onClick={() => void onClock("clock_out")}
            disabled={clockLoading !== null}
            className="rounded-lg bg-amber-300 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-70"
          >
            {clockLoading === "clock_out" ? "Timbrando..." : "Timbratura uscita"}
          </button>
        </div>
        {clockError ? <p className="mt-3 text-sm text-rose-300">{clockError}</p> : null}
        <div className="mt-4 text-sm text-slate-300">
          <p>Timbrature oggi: {todayEntries.length}</p>
          <p>
            Minuti lavorati oggi: {todaySummary?.minutesWorked ?? 0} ({todaySummary?.mode ?? "office"})
          </p>
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="text-xl font-semibold">Storico timbrature recenti</h2>
        <div className="mt-4 space-y-2 text-sm">
          {recentEntries.length === 0 ? <p className="text-slate-400">Nessuna timbratura registrata.</p> : null}
          {recentEntries.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2">
              <span>{item.type === "clock_in" ? "Entrata" : "Uscita"}</span>
              <span className="text-slate-400">{new Date(item.at).toLocaleString("it-CH")}</span>
            </div>
          ))}
        </div>
      </section>

      <PayslipArea
        role={user.role}
        currentUserId={user.id}
        currentUserName={user.fullName}
        payslips={payslips}
        onExportPdf={onExportPdf}
      />
      <OrgChart nodes={orgData.nodes} edges={orgData.edges} />
    </main>
  );
}
