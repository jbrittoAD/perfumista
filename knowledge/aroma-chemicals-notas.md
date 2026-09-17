# Base Mestra de Químicos Aromáticos — Notas de Compilação e Caveats

> Companheiro do arquivo `data/aroma-chemicals.json`. Alimenta o motor heurístico do app Perfumista.
> **Data de compilação:** 2026-07-12. **Regra editorial:** dado incerto = `null` + nota. Nenhum CAS ou número IFRA foi inventado.

---

## 1. Resumo quantitativo

- **Total de materiais:** 205
- **Foco:** químicos aromáticos e naturais realmente usados em DIY / fine fragrance (cobre a lista prioritária do brief: linalool, limoneno, aldeídos C-6 a C-16, Iso E Super, Hedione, Galaxolide/muscs macrocíclicos, Ambroxan/Cetalox/Ambrocenide, vanillin/ethyl vanillin, coumarin, eugenol, geraniol/citronellol, PEA, benzyl acetate/salicylate, cis-3-hexenol, dihydromyrcenol, Calone, Helional, iso raldeine/methyl ionone, Cashmeran, Sandalore/Javanol/Ebanol/Polysantol/Bacdanol, patchouli/patchoulol, oakmoss/Evernyl, damascones/damascenone, rose oxide, ionones, etc.).

### Cobertura por campo (não-nulo / total)

| Campo | Cobertura | Observação |
|---|---|---|
| `name` | 205/205 (100%) | nome canônico em inglês |
| `name_pt` | 205/205 (100%) | tradução PT ou transliteração comum |
| `synonyms` | 205/205 (100%) | inclui nomes comerciais (Ambroxan, Iso E Super, Javanol…) e traduções |
| `cas` | 201/205 (98%) | 4 nulos **intencionais** (ver §4) |
| `odor_family` | 205/205 (100%) | 14 famílias controladas |
| `note` | 205/205 (100%) | topo / coracao / base |
| `strength` | 205/205 (100%) | baixa / média / alta (editorial — ver caveat 5) |
| `descriptors` | 205/205 (100%) | 3–8 descritores por material |
| `typical_use_pct` | 205/205 (100%) | faixa no concentrado; ordem de grandeza |
| `ifra_limit_pct` | 22/205 populados | **183 nulos** — maioria não-restrita OU não confirmada (ver §3 e §4) |
| `key_uses` | 205/205 (100%) | função / acordes |

### Distribuição por família olfativa
floral 45 · woody 25 · gourmand 21 · green 17 · herbal 16 · spicy 14 · balsamic 13 · musk 13 · citrus 10 · amber 9 · aldehydic 8 · animalic 5 · aquatic 5 · leather 4

### Distribuição por posição na pirâmide
base 75 · coracao 72 · topo 58

---

## 2. Valores IFRA verificados nesta rodada (51ª Emenda, Cat. 4 leave-on)

Confirmados diretamente contra fontes primárias/oficiais durante a compilação:

| Material | `ifra_limit_pct` | Fonte de verificação |
|---|---|---|
| Coumarin (cumarina) | **1.5** | IFRA 51st Amendment; múltiplas reafirmações (Scentspiracy, certificados) |
| Cinnamaldehyde | **0.25** | reafirmação 49ª→51ª (fine fragrance); ver conflito em §3 |
| Geraniol | **0.056** | Certificado IFRA-51 Perfumer's Apprentice (doc 9492) |
| Citronellol | **0.076** | idem PA IFRA-51 |
| Eugenol | **0.178** | idem PA IFRA-51 |
| Citral | **0.115** (mistura) / ~0.6 (neat) | valor 0.115 do cert. PA para mistura; ver caveat |
| Isoeugenol | **0.008** | idem PA IFRA-51 |
| Methyl eugenol | **0.01** | idem PA IFRA-51 |
| Phenylacetaldehyde | **0.015** | idem PA IFRA-51 |
| Rose ketones (α/β/δ-damascone, β-damascenone) | **0.043** (soma dos isômeros) | IFRA rose ketones STD (49ª mantida na 51ª) |
| Galaxolide (HHCB) | **1.5** | IFRA (restrição ambiental PBT) |
| Oakmoss / Treemoss | **0.1** + spec atranol/cloroatranol <100 ppm | IFRA STD; valor exato da 51ª a reconferir |

CAS conferidos por amostragem (todos corretos): Iso E Super 54464-57-2, Ambroxan 6790-58-5, Hedione 24851-98-7, Galaxolide 1222-05-5, Javanol 198404-98-7, Ethylene brassylate 105-95-3, Calone 28940-11-6.

---

## 3. CAVEATS — onde as fontes conflitam

1. **`ifra_limit_pct` = valores da 51ª Emenda para os sensibilizantes clássicos MUITO menores do que tabelas antigas.**
   A base de conhecimento anterior (`base_conhecimento_perfumaria.md`, §7) listava geraniol 4.70%, citronelol 12%, eugenol 2.5%. **Esses números estão desatualizados/errados para Cat 4 da 51ª.** Os valores corretos verificados agora são geraniol **0.056%**, citronelol **0.076%**, eugenol **0.178%** (fonte: certificado IFRA-51 da Perfumer's Apprentice). Os números antigos provavelmente eram tetos do Code of Practice de emendas antigas, não os limites de sensibilização da Cat 4. → **Adotamos os valores baixos da 51ª.**

2. **Citral 0.115% vs ~0.6%.** O certificado PA mostra 0.115% (para a mistura Davana específica); outras fontes citam ~0.6% como limite neat. Registramos `0.6` no JSON com nota, mas há divergência real — o limite efetivo depende de quenchers (citral costuma ser "quenched" por limoneno/terpenos). **Reconferir contra o STD específico de Citral na 51ª.**

3. **Cinnamaldehyde 0.25% vs 0.05%.** 0.25% é a figura de fine fragrance mais citada; algumas fontes/categorias trazem 0.05%. Mantido 0.25% (Cat 4) com nota.

4. **Helional: 2.6% (Olfactorian) vs 5.3% (TGSC).** Conflito não resolvido → deixado `null` no JSON com explicação em `key_uses`. **Não chutar.**

5. **`strength` e `note` são EDITORIAIS**, não medições. "Força" ideal seria o proxy TGSC "avaliar a X%" ou o odor detection threshold (ODT); "note" (topo/coração/base) é difusa por natureza (linalool é topo OU coração conforme a fonte). Tratar como heurística.

6. **`typical_use_pct` é ordem de grandeza.** Faixas variam enormemente entre fontes (hobbyistas Reddit/Basenotes vs fine fragrance). Os tetos altos que aparecem no TGSC/PA ("até X%") são máximas do Code of Practice, geralmente mais largas que os limites estritos de Cat 4.

7. **PROIBIDOS incluídos como FLAG, não como recomendação.** `Lilial` (BMHCA, CAS 80-54-6) e `Lyral`/HICC (CAS 31906-04-4) estão com `ifra_limit_pct: 0.0` e `typical_use_pct: "0"` de propósito, para que o motor **nunca os sugira**. Substitutos listados: Florhydral, Bourgeonal, Cyclamen aldehyde, Florol.

8. **Nitromusks (Musk ketone 81-14-1).** Restrito (~1.4%) e evitado pela maioria das casas; incluído por relevância vintage. Musk xylene está PROIBIDO e foi omitido.

9. **Rose ketones — limite é COMBINADO.** O 0.043% Cat 4 aplica-se à **soma** dos isômeros de damascona/damascenona, não a cada um individualmente. O motor precisa somar α/β/δ-damascone + β-damascenone.

10. **Oakmoss vs Treemoss compartilham CAS 9000-50-4 em muitas listagens** (Evernia prunastri vs E. furfuracea têm CAS distintos em fontes diferentes; várias bases agrupam). Reconferir se o app precisar distinguir os dois quimicamente.

---

## 4. Campos `null` — justificativa (nunca é chute)

**CAS null (4):** materiais que **não têm CAS de molécula única** por serem misturas proprietárias ou exsudatos naturais:
- `Clearwood` (base biotech Firmenich — composição)
- `Suederal LT` (base de couro IFF — mistura)
- `Amber Xtreme / Sylvamber` (captive Firmenich — composição)
- `Ambergris tincture` (âmbar-gris natural — sem CAS único)

**`ifra_limit_pct` null (183):** duas categorias:
- **(a) Não restrito** pela IFRA (ex.: Iso E Super¹, Ambroxan, Hedione, PEA, vanillin, ethyl vanillin, ethyl maltol, most macrocyclic musks, sandalwood synthetics). `key_uses` diz "Not IFRA-restricted".
- **(b) Restrito mas % da Cat 4 NÃO confirmado nesta rodada** — marcado no `key_uses` com "verify" / "verify Cat 4". Inclui: benzyl salicylate/benzoate/alcohol, hydroxycitronellal (provável ~1.0), farnesol, nerolidol, amyl/hexyl/methyl salicylate, α-amyl e α-hexyl cinnamaldehyde, methyl heptine carbonate, cyclamen aldehyde, bourgeonal, trans-anethole, benzaldehyde, cinnamyl alcohol, IBQ, birch tar, opoponax, styrax, Peru balsam, cananga, mimosa, methyl ionone/α-isomethyl ionone. **Nesses, o app deve tratar como "potencialmente restrito — consultar STD"**, não como livre.

¹ Iso E Super (OTNE): historicamente teve teto Cat 4 ~20% em algumas fontes; deixado `null` porque não confirmei o valor exato da 51ª nesta rodada.

---

## 5. Fontes usadas

**Verificadas diretamente nesta compilação (primárias/oficiais):**
- IFRA 51st Amendment — Notification & Index of Standards (ifrafragrance.org / cloudfront)
- Certificado de Conformidade IFRA-51 da **Perfumer's Apprentice** (doc 9492) — limites de alérgenos Cat 4
- The Good Scents Company (thegoodscentscompany.com) — dados por material / CAS
- ScenTree, Givaudan (fichas de Javanol etc.), ChemicalBook, PubChem (verificação de CAS)
- Scentspiracy (scentspiracy.com/blog/ifra-limits) — resumos de limites IFRA

**Base de conhecimento interna reaproveitada e CORRIGIDA:**
- `knowledge/base_conhecimento_perfumaria.md` §7–8 (tabela de ~50 materiais + caveats) — usada como ponto de partida; valores IFRA de alérgenos foram **atualizados para a 51ª** (ver caveat 1).

**Fontes de domínio consultadas para descritores/uso (conhecimento estabelecido, corroborado por TGSC/PA/Fragrantica/Basenotes/Reddit r/DIYfragrance/Pellwall-Scentspiracy):**
- Perfumer's Apprentice (shop.perfumersapprentice.com)
- Fragrantica, Basenotes (threads de DIY), Reddit r/DIYfragrance
- Pellwall / Scentspiracy (perfis de materiais)

---

## 6. Recomendações de manutenção para o motor

1. **Confirmar os 183 `ifra_limit_pct` null da categoria (b)** baixando os STDs individuais da 51ª (perfumersworld.com hospeda os PDFs) antes de usar o motor para checagem de conformidade real.
2. **Resolver Citral e Helional** (conflitos §3.2 e §3.4) contra STDs específicos.
3. **Implementar soma de rose ketones** (§3.9) e de allergen groups (linalool+limonene por peróxido; salicilatos) na lógica de conformidade.
4. **Nunca sugerir materiais com `ifra_limit_pct: 0.0`** (Lilial, Lyral) — são flags de proibição.
5. Se o app precisar de força objetiva, substituir `strength` editorial por ODT/threshold quando disponível (TGSC / PMC3355402).
