"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function LoginPage(): React.JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <motion.form
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
        <button className="w-full rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-slate-900">
          Entra
        </button>
      </motion.form>
    </main>
  );
}
