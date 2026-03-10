"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { saveSession } from "@/lib/auth-session";

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await login(email, password);
      saveSession(session.token, session.user);
      router.replace("/");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Login non riuscito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-semibold">Accesso area riservata</h1>
        <p className="text-sm text-slate-400">
          Login con credenziali aziendali. I ruoli sono assegnati da admin.
        </p>
        <input
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2"
          type="email"
          placeholder="email@azienda.ch"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Accesso in corso..." : "Entra"}
        </button>
        <p className="text-xs text-slate-500">
          Demo: admin@payday.ch / AdminPayday123! - manager@payday.ch / ManagerPayday123! -
          employee@payday.ch / EmployeePayday123!
        </p>
      </motion.form>
    </main>
  );
}
