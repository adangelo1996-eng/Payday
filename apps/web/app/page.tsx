import { Dashboard } from "@/components/dashboard";
import { OrgChart } from "@/components/org-chart";
import { PayslipArea } from "@/components/payslip-area";

const orgData = {
  nodes: [
    { id: "u-admin", label: "HR Admin", role: "admin" },
    { id: "u-manager", label: "Manager Controllo", role: "manager_controllo_gestione" },
    { id: "u-employee", label: "Dipendente Demo", role: "employee" }
  ],
  edges: [{ from: "u-manager", to: "u-employee" }]
};

const payslips = [
  { id: "ps-1", period: "2026-01", netSalary: 4210.55 },
  { id: "ps-2", period: "2026-02", netSalary: 4230.9 }
];

export default function HomePage(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">PAYDAY HR Cloud Enterprise</h1>
          <p className="mt-1 text-slate-400">
            Timbratura, ferie, malattia, approvazioni e payroll svizzero integrato.
          </p>
        </div>
        <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300">
          Nuova richiesta ferie
        </button>
      </header>

      <Dashboard />
      <PayslipArea role="employee" currentUserId="u-employee" payslips={payslips} />
      <OrgChart nodes={orgData.nodes} edges={orgData.edges} />
    </main>
  );
}
