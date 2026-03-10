"use client";

import { motion } from "framer-motion";

interface Payslip {
  id: string;
  period: string;
  netSalary: number;
}

interface Props {
  role: "admin" | "manager_controllo_gestione" | "employee";
  currentUserId: string;
  payslips: Payslip[];
}

export function PayslipArea({ role, currentUserId, payslips }: Props): React.JSX.Element {
  return (
    <section className="card mt-6">
      <h2 className="text-xl font-semibold">Area riservata cedolini</h2>
      <p className="mt-1 text-sm text-slate-400">
        Accesso protetto: ogni dipendente vede solo i propri cedolini.
      </p>

      <div className="mt-4 space-y-3">
        {payslips.map((item, index) => (
          <motion.div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-slate-700 p-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <div>
              <p className="text-sm text-slate-300">{item.period}</p>
              <p className="text-lg font-medium">CHF {item.netSalary.toFixed(2)}</p>
            </div>
            <button className="rounded-lg bg-cyan-400 px-3 py-1 text-sm font-medium text-slate-900 transition hover:bg-cyan-300">
              Esporta PDF
            </button>
          </motion.div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Profilo: {role} | Utente: {currentUserId}
      </p>
    </section>
  );
}
