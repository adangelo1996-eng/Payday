"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { adminStrings } from "./strings";
import {
  createUser,
  fetchCurrentUser,
  fetchUsers,
  setLeaveAllowance,
  updateUser,
  type CreateUserPayload,
  type User
} from "@/lib/api";
import { clearSession, getToken, type SessionUser } from "@/lib/auth-session";

const DEFAULT_NEW_USER: CreateUserPayload = {
  firstName: "",
  lastName: "",
  role: "employee",
  companyId: "comp-1",
  dailyTargetSeconds: 28800,
  vacationAllowanceDays: 22
};

export default function AdminPage(): React.JSX.Element {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState<CreateUserPayload>(DEFAULT_NEW_USER);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUser = users.find((item) => item.id === selectedUserId) ?? null;

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
        const currentUser = await fetchCurrentUser(tokenValue);
        if (currentUser.role !== "admin") {
          router.replace("/");
          return;
        }
        const allUsers = await fetchUsers(tokenValue);
        setUser(currentUser);
        setUsers(allUsers);
        setSelectedUserId(allUsers[0]?.id ?? "");
      } catch (loadError) {
        clearSession();
        router.replace("/login");
        setError(loadError instanceof Error ? loadError.message : "Errore caricamento area admin");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  async function refreshUsers(): Promise<void> {
    if (!token) {
      return;
    }
    const allUsers = await fetchUsers(token);
    setUsers(allUsers);
    if (!selectedUserId && allUsers[0]) {
      setSelectedUserId(allUsers[0].id);
    }
  }

  async function onCreateUser(): Promise<void> {
    if (!token) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createUser(token, newUser);
      setNewUser(DEFAULT_NEW_USER);
      await refreshUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Errore creazione utente");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveSelectedUser(): Promise<void> {
    if (!token || !selectedUser) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateUser(token, selectedUser.id, {
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        role: selectedUser.role,
        managerId: selectedUser.managerId,
        dailyTargetSeconds: selectedUser.dailyTargetSeconds,
        vacationAllowanceDays: selectedUser.vacationAllowanceDays,
        birthDate: selectedUser.birthDate,
        phone: selectedUser.phone,
        address: selectedUser.address
      });
      await setLeaveAllowance(token, selectedUser.id, selectedUser.vacationAllowanceDays ?? 22);
      await refreshUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Errore aggiornamento utente");
    } finally {
      setSubmitting(false);
    }
  }

  function updateSelectedUser(patch: Partial<User>): void {
    if (!selectedUser) {
      return;
    }
    setUsers((current) => current.map((item) => (item.id === selectedUser.id ? { ...item, ...patch } : item)));
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-300">Caricamento area amministrazione...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50">
            {adminStrings.users.title}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {adminStrings.users.subtitle}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 shadow-sm shadow-black/40 transition hover:bg-slate-800/80"
        >
          {adminStrings.users.backToDashboard}
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,4fr)]">
        <GlassCard
          title="Utenti"
          description="Elenco completo degli utenti con ricerca rapida. Usa il bottone in fondo per crearne uno nuovo."
          className="h-full"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <input
              placeholder={adminStrings.users.searchPlaceholder}
              className="h-8 flex-1 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/80"
            />
          </div>
          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1 text-xs">
            {users.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedUserId(item.id)}
                className={[
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition",
                  selectedUserId === item.id
                    ? "bg-slate-800/80 text-slate-50"
                    : "bg-slate-900/60 text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{item.fullName}</p>
                  <p className="truncate text-[11px] text-slate-400">{item.email}</p>
                </div>
                <span className="ml-2 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                  {item.role}
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setSelectedUserId("");
                setNewUser(DEFAULT_NEW_USER);
              }}
              className="mt-2 flex w-full items-center justify-center rounded-xl border border-dashed border-slate-600/80 bg-slate-900/40 px-3 py-2 text-[11px] font-medium text-slate-200 transition hover:border-slate-300 hover:bg-slate-900/80"
            >
              + Aggiungi nuovo utente
            </button>
          </div>
        </GlassCard>

        <GlassCard
          title={
            selectedUser
              ? adminStrings.users.detailTitleExisting
              : adminStrings.users.detailTitleNew
          }
          description={
            selectedUser
              ? adminStrings.users.detailSubtitleExisting
              : adminStrings.users.detailSubtitleNew
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-300">Nome</span>
              <input
                value={selectedUser ? selectedUser.firstName ?? "" : newUser.firstName}
                onChange={(event) =>
                  selectedUser
                    ? updateSelectedUser({ firstName: event.target.value })
                    : setNewUser((current) => ({ ...current, firstName: event.target.value }))
                }
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-300">Cognome</span>
              <input
                value={selectedUser ? selectedUser.lastName ?? "" : newUser.lastName}
                onChange={(event) =>
                  selectedUser
                    ? updateSelectedUser({ lastName: event.target.value })
                    : setNewUser((current) => ({ ...current, lastName: event.target.value }))
                }
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-300">Ruolo accesso</span>
              <select
                value={selectedUser ? selectedUser.role : newUser.role}
                onChange={(event) =>
                  selectedUser
                    ? updateSelectedUser({ role: event.target.value as User["role"] })
                    : setNewUser((current) => ({
                        ...current,
                        role: event.target.value as CreateUserPayload["role"]
                      }))
                }
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
              >
                <option value="employee">employee</option>
                <option value="manager_controllo_gestione">manager_controllo_gestione</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-300">Manager</span>
              <select
                value={selectedUser ? selectedUser.managerId ?? "" : newUser.managerId ?? ""}
                onChange={(event) => {
                  const value = event.target.value || undefined;
                  selectedUser
                    ? updateSelectedUser({ managerId: value })
                    : setNewUser((current) => ({ ...current, managerId: value }));
                }}
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
              >
                <option value="">Nessun manager</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-300">Secondi giornata standard</span>
              <input
                type="number"
                min={1}
                max={86400}
                value={
                  selectedUser
                    ? selectedUser.dailyTargetSeconds ?? 28800
                    : newUser.dailyTargetSeconds ?? 28800
                }
                onChange={(event) => {
                  const value = Number(event.target.value);
                  selectedUser
                    ? updateSelectedUser({ dailyTargetSeconds: value })
                    : setNewUser((current) => ({ ...current, dailyTargetSeconds: value }));
                }}
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-300">Ferie standard annuali</span>
              <input
                type="number"
                min={0}
                max={120}
                value={
                  selectedUser
                    ? selectedUser.vacationAllowanceDays ?? 22
                    : newUser.vacationAllowanceDays ?? 22
                }
                onChange={(event) => {
                  const value = Number(event.target.value);
                  selectedUser
                    ? updateSelectedUser({ vacationAllowanceDays: value })
                    : setNewUser((current) => ({ ...current, vacationAllowanceDays: value }));
                }}
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-300">Telefono</span>
              <input
                value={selectedUser ? selectedUser.phone ?? "" : newUser.phone ?? ""}
                onChange={(event) => {
                  const value = event.target.value || undefined;
                  selectedUser
                    ? updateSelectedUser({ phone: value })
                    : setNewUser((current) => ({ ...current, phone: value }));
                }}
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-300">Data di nascita</span>
              <input
                type="date"
                value={selectedUser ? selectedUser.birthDate ?? "" : newUser.birthDate ?? ""}
                onChange={(event) => {
                  const value = event.target.value || undefined;
                  selectedUser
                    ? updateSelectedUser({ birthDate: value })
                    : setNewUser((current) => ({ ...current, birthDate: value }));
                }}
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
              />
            </label>
            <label className="md:col-span-2 flex flex-col gap-1 text-xs">
              <span className="text-slate-300">Indirizzo</span>
              <input
                value={selectedUser ? selectedUser.address ?? "" : newUser.address ?? ""}
                onChange={(event) => {
                  const value = event.target.value || undefined;
                  selectedUser
                    ? updateSelectedUser({ address: value })
                    : setNewUser((current) => ({ ...current, address: value }));
                }}
                className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {selectedUser ? (
              <Button onClick={() => void onSaveSelectedUser()} disabled={!selectedUser || submitting}>
                {submitting ? "Salvataggio..." : "Salva modifiche"}
              </Button>
            ) : (
              <Button onClick={() => void onCreateUser()} disabled={submitting}>
                {submitting ? "Creazione..." : "Crea utente"}
              </Button>
            )}
            <span className="text-[11px] text-slate-400">
              Admin: {user?.fullName} · Utenti totali: {users.length}
            </span>
          </div>

          {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
        </GlassCard>
      </div>
    </div>
  );
}
