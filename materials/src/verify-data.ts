/** Checagens de integridade da base. Sai com código !=0 se achar problema grave. */
import { db } from "./db.js";

const q = (sql: string) => (db.prepare(sql).get() as any);
const checks: { nome: string; valor: number; ok: boolean; detalhe?: string }[] = [];
const add = (nome: string, valor: number, ok: boolean, detalhe?: string) => checks.push({ nome, valor, ok, detalhe });

// 1. Materiais no app precisam ter ao menos uma oferta
add("materiais no app sem oferta", q("SELECT COUNT(*) n FROM materials m WHERE is_aroma_chemical=1 AND NOT EXISTS(SELECT 1 FROM offers o WHERE o.material_id=m.id)").n, true, "deve ser 0");
// 2. Ofertas órfãs (sem material)
add("ofertas sem material_id", q("SELECT COUNT(*) n FROM offers WHERE material_id IS NULL").n, true, "deve ser 0");
// 3. price_per_g negativo ou zero
add("price_per_g inválido (<=0)", q("SELECT COUNT(*) n FROM offers WHERE price_per_g IS NOT NULL AND price_per_g<=0").n, true, "deve ser 0");
// 4. CAS duplicado em materiais (deveria ser único)
add("CAS duplicados em materials", q("SELECT COUNT(*) n FROM (SELECT cas FROM materials WHERE cas IS NOT NULL GROUP BY cas HAVING COUNT(*)>1)").n, true, "deve ser 0");
// 5. note_type inválido
add("note_type inválido", q("SELECT COUNT(*) n FROM materials WHERE note_type IS NOT NULL AND note_type NOT IN ('topo','coracao','base')").n, true, "deve ser 0");
// 6. material_kind inválido
add("material_kind inválido", q("SELECT COUNT(*) n FROM materials WHERE material_kind IS NOT NULL AND material_kind NOT IN ('aroma_chemical','essential_oil','solvent','base_essencia')").n, true, "deve ser 0");
// 7. preço absurdo (>100000)
add("preços absurdos (>100k)", q("SELECT COUNT(*) n FROM offers WHERE price>100000").n, true, "suspeito");

// Cobertura (informativo)
const cov = q("SELECT COUNT(*) t, COUNT(odor_family) fam, COUNT(note_type) nota, COUNT(odor_strength) forca, COUNT(cas) cas, COUNT(ifra_limit_pct) ifra FROM materials WHERE is_aroma_chemical=1");
const banned = q("SELECT COUNT(*) n FROM materials WHERE ifra_limit_pct=0").n;

console.log("=== CHECAGENS DE INTEGRIDADE ===");
let falhou = false;
for (const c of checks) {
  const status = c.valor === 0 ? "OK " : "⚠️ ";
  if (c.valor !== 0) falhou = true;
  console.log(`  ${status} ${c.nome}: ${c.valor} (${c.detalhe})`);
}
console.log("\n=== COBERTURA (is_aroma_chemical=1) ===");
const p = (x: number) => `${x} (${Math.round((x / cov.t) * 100)}%)`;
console.log(`  total=${cov.t} | família=${p(cov.fam)} | nota=${p(cov.nota)} | força=${p(cov.forca)} | cas=${p(cov.cas)} | ifra=${cov.ifra} | proibidos(ifra=0)=${banned}`);
console.log(`\nRESULTADO: ${falhou ? "⚠️ há avisos" : "✅ tudo OK"}`);
process.exit(falhou ? 1 : 0);
