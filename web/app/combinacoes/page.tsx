import { listCombinations } from "@/lib/recipes";
import CombinacoesClient from "./combinacoes-client";

export default function CombinacoesPage() {
  const combinations = listCombinations();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Combinações de Materiais</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          {combinations.length} combinações de referência: o que a mistura passa a cheirar, o papel
          de cada material, o mecanismo e a família resultante.
        </p>
      </div>
      <CombinacoesClient combinations={combinations} />
    </div>
  );
}
