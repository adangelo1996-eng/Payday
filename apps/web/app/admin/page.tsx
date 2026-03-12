"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-slate-300">Caricamento area amministrazione...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Amministrazione utenti</h1>
          <p className="text-sm text-slate-400">Area esclusiva admin per utenti, anagrafiche e relazioni.</p>
        </div>
        <Link href="/" className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
          Torna alla dashboard
        </Link>
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold">Nuovo utente</h2>
        <p className="mt-1 text-sm text-slate-400">
          Email generata automaticamente con formato `nome.cognome@payday.local`.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            placeholder="Nome"
            value={newUser.firstName}
            onChange={(event) => setNewUser((current) => ({ ...current, firstName: event.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <input
            placeholder="Cognome"
            value={newUser.lastName}
            onChange={(event) => setNewUser((current) => ({ ...current, lastName: event.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <select
            value={newUser.role}
            onChange={(event) =>
              setNewUser((current) => ({ ...current, role: event.target.value as CreateUserPayload["role"] }))
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="employee">employee</option>
            <option value="manager_controllo_gestione">manager_controllo_gestione</option>
            <option value="admin">admin</option>
          </select>
          <input
            type="number"
            min={1}
            max={86400}
            placeholder="Secondi target giornaliero"
            value={newUser.dailyTargetSeconds ?? 28800}
            onChange={(event) =>
              setNewUser((current) => ({ ...current, dailyTargetSeconds: Number(event.target.value) }))
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            max={120}
            placeholder="Ferie standard"
            value={newUser.vacationAllowanceDays ?? 22}
            onChange={(event) =>
              setNewUser((current) => ({ ...current, vacationAllowanceDays: Number(event.target.value) }))
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <select
            value={newUser.managerId ?? ""}
            onChange={(event) =>
              setNewUser((current) => ({ ...current, managerId: event.target.value || undefined }))
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">Nessun manager</option>
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <Button onClick={() => void onCreateUser()} disabled={submitting}>
            {submitting ? "Creazione..." : "Crea utente"}
          </Button>
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Gestione anagrafica utente</h2>
        <div className="mt-4">
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm md:w-96"
          >
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.fullName} ({item.email})
              </option>
            ))}
          </select>
        </div>
        {selectedUser ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Nome
              <input
                value={selectedUser.firstName ?? ""}
                onChange={(event) => updateSelectedUser({ firstName: event.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Cognome
              <input
                value={selectedUser.lastName ?? ""}
                onChange={(event) => updateSelectedUser({ lastName: event.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Ruolo
              <select
                value={selectedUser.role}
                onChange={(event) => updateSelectedUser({ role: event.target.value as User["role"] })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              >
                <option value="employee">employee</option>
                <option value="manager_controllo_gestione">manager_controllo_gestione</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Manager
              <select
                value={selectedUser.managerId ?? ""}
                onChange={(event) => updateSelectedUser({ managerId: event.target.value || undefined })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              >
                <option value="">Nessun manager</option>
                {users
                  .filter((item) => item.id !== selectedUser.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data di nascita
              <input
                type="date"
                value={selectedUser.birthDate ?? ""}
                onChange={(event) => updateSelectedUser({ birthDate: event.target.value || undefined })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Telefono
              <input
                value={selectedUser.phone ?? ""}
                onChange={(event) => updateSelectedUser({ phone: event.target.value || undefined })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              Indirizzo
              <input
                value={selectedUser.address ?? ""}
                onChange={(event) => updateSelectedUser({ address: event.target.value || undefined })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Secondi giornata standard
              <input
                type="number"
                min={1}
                max={86400}
                value={selectedUser.dailyTargetSeconds ?? 28800}
                onChange={(event) => updateSelectedUser({ dailyTargetSeconds: Number(event.target.value) })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Ferie standard annuali
              <input
                type="number"
                min={0}
                max={120}
                value={selectedUser.vacationAllowanceDays ?? 22}
                onChange={(event) => updateSelectedUser({ vacationAllowanceDays: Number(event.target.value) })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              />
            </label>
          </div>
        ) : null}
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => void onSaveSelectedUser()} disabled={!selectedUser || submitting}>
            {submitting ? "Salvataggio..." : "Salva modifiche"}
          </Button>
          <span className="text-xs text-slate-400">
            Admin: {user?.fullName} | Utenti gestiti: {users.length}
          </span>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>
    </main>
  );
}
