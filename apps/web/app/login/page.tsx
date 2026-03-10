"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession, type SessionUser } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (authError || !data.session || !data.user) {
        throw new Error(authError?.message ?? "Credenziali non valide");
      }

      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select('id, email, "fullName", role')
        .eq("email", email)
        .single();
      if (userError || !userRow) {
        throw new Error(userError?.message ?? "Utente applicativo non trovato");
      }

      const sessionUser: SessionUser = {
        id: userRow.id,
        email: userRow.email,
        fullName: userRow.fullName,
        role: userRow.role
      };

      const token = data.session.access_token;

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
          hypothesisId: "H3",
          location: "apps/web/app/login/page.tsx:onSubmit:afterLogin",
          message: "Supabase login succeeded",
          data: {
            hasSession: Boolean(data.session),
            tokenLength: token.length
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion agent log

      saveSession(token, sessionUser);
      router.replace("/");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Login non riuscito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 px-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle>Accesso area riservata</CardTitle>
            <CardDescription>
              Login con credenziali aziendali. I ruoli sono assegnati da admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="email@azienda.ch"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <Button type="submit" disabled={loading} className="w-full" size="md" variant="primary">
                {loading ? "Accesso in corso..." : "Entra"}
              </Button>
            </form>
            <p className="mt-4 text-xs text-slate-500">
              Demo: admin@payday.ch / AdminPayday123! - manager@payday.ch / ManagerPayday123! - employee@payday.ch /
              EmployeePayday123!
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
