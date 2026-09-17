import { listRecipes, recipeFacets } from "@/lib/recipes";
import FormulasClient from "./formulas-client";

export default function FormulasPage() {
  const recipes = listRecipes();
  const facets = recipeFacets();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Fórmulas de Referência</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          {recipes.length} fórmulas reais (DIY, publicadas e clássicas) com ingredientes, pirâmide e
          descrição. As mais documentadas aparecem primeiro. Abra uma para ver os detalhes e simular
          no Modo Direto.
        </p>
      </div>
      <FormulasClient recipes={recipes} facets={facets} />
    </div>
  );
}
