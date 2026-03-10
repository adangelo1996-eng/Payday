"use client";

interface Node {
  id: string;
  label: string;
  role: string;
}

interface Edge {
  from: string;
  to: string;
}

interface Props {
  nodes: Node[];
  edges: Edge[];
}

export function OrgChart({ nodes, edges }: Props): React.JSX.Element {
  return (
    <section className="card mt-6">
      <h2 className="text-xl font-semibold">Organigramma dinamico</h2>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {nodes.map((node) => (
          <div key={node.id} className="rounded-lg border border-slate-700 p-3">
            <p className="text-sm font-medium text-slate-200">{node.label}</p>
            <p className="text-xs text-cyan-300">{node.role}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">Dipendenze gerarchiche: {edges.length}</p>
    </section>
  );
}
