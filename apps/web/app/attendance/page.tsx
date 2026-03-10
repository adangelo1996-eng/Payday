"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clock, fetchAttendanceEntries, fetchAttendanceSummary, fetchCurrentUser, type TimeEntry, type WorkdaySummary } from "@/lib/api";
import { clearSession, getToken, type SessionUser } from "@/lib/auth-session";

export default function AttendancePage(): React.JSX.Element {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<WorkdaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState<"clock_in" | "clock_out" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      router.replace("/login");
      return;
    }
    const tokenValue = currentToken;
    setToken(tokenValue);

    async function load(): Promise<void> {
      try {
        const [currentUser, list, daySummary] = await Promise.all([
          fetchCurrentUser(tokenValue),
          fetchAttendanceEntries(tokenValue),
          fetchAttendanceSummary(tokenValue)
        ]);
        setUser(currentUser);
        setEntries(list);
        setSummary(daySummary);
      } catch (loadError) {
        clearSession();
        router.replace("/login");
        setError(loadError instanceof Error ? loadError.message : "Errore caricamento timbrature");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const item of [...entries].sort((a, b) => b.at.localeCompare(a.at))) {
      const day = item.at.slice(0, 10);
      const current = map.get(day) ?? [];
      current.push(item);
      map.set(day, current);
    }
    return [...map.entries()];
  }, [entries]);

  async function onClock(type: "clock_in" | "clock_out"): Promise<void> {
    if (!token) {
      return;
    }
    setError(null);
    setSubmitLoading(type);
    try {
      await clock(token, type);
      const [list, daySummary] = await Promise.all([
        fetchAttendanceEntries(token),
        fetchAttendanceSummary(token)
      ]);
      setEntries(list);
      setSummary(daySummary);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Errore timbratura");
    } finally {
      setSubmitLoading(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-slate-300">Caricamento timbrature...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timbrature</h1>
          <p className="text-sm text-slate-400">Storico giornaliero e giorni passati per {user?.fullName}.</p>
          {user?.role !== "employee" ? (
            <Link
              href="/payroll-calc"
              className="mt-2 inline-block rounded-lg border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
            >
              Vai a Calcolo Cedolino
            </Link>
          ) : null}
        </div>
        <Link href="/" className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
          Torna alla dashboard
        </Link>
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold">Azioni rapide</h2>
        <div className="mt-3 flex gap-3">
          <button
            onClick={() => void onClock("clock_in")}
            disabled={submitLoading !== null}
            className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-70"
          >
            {submitLoading === "clock_in" ? "Timbrando..." : "Timbratura entrata"}
          </button>
          <button
            onClick={() => void onClock("clock_out")}
            disabled={submitLoading !== null}
            className="rounded-lg bg-amber-300 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-70"
          >
            {submitLoading === "clock_out" ? "Timbrando..." : "Timbratura uscita"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Riepilogo giorni lavorati</h2>
        <div className="mt-3 space-y-2 text-sm">
          {summary.length === 0 ? <p className="text-slate-400">Nessun riepilogo disponibile.</p> : null}
          {[...summary]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((item) => (
              <div key={`${item.userId}-${item.date}`} className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2">
                <span>{item.date}</span>
                <span className="text-slate-300">
                  {item.minutesWorked} min - {item.mode}
                </span>
              </div>
            ))}
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Storico timbrature per giorno</h2>
        <div className="mt-3 space-y-4">
          {grouped.length === 0 ? <p className="text-slate-400">Nessuna timbratura registrata.</p> : null}
          {grouped.map(([day, dayEntries]) => (
            <article key={day} className="rounded-lg border border-slate-700 p-3">
              <h3 className="text-sm font-semibold text-cyan-300">{day}</h3>
              <div className="mt-2 space-y-2">
                {dayEntries.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span>{item.type === "clock_in" ? "Entrata" : "Uscita"}</span>
                    <span className="text-slate-400">{new Date(item.at).toLocaleTimeString("it-CH")}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
