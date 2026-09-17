# Perfumista — ESTADO / HANDOFF (para retomar em nova sessão)

App **assistente de perfumaria** do João (uso pessoal). PWA estática, instalável, offline. Ajuda a: consultar químicos aromáticos (preço BR + dados técnicos), **prever** o resultado de uma fórmula (Modo Direto), **sugerir** ingredientes a partir de notas desejadas (Modo Reverso), estudar (Curso + quizzes + revisão espaçada), e **organizar/planejar compras** por cor de tampa.

## 🌐 No ar (produção)
- **Principal:** https://perfumista-app.vercel.app  (Vercel, conta `jbrittoad`, projeto `perfumista`; aliases: perfumista-app / perfumaria-app / perfumista-diy)
- **Backup:** https://jbrittoad.github.io/perfumista/ (GitHub Pages, branch `gh-pages`)
- **Instalar:** Android Chrome → menu ⋮ → "Instalar app" (NÃO usar navegador in-app do WhatsApp/IG). iOS Safari → Compartilhar → Adicionar à Tela de Início (sempre manual). Tem banner de instalação no app.

## 🏗️ Arquitetura
- **PWA 100% estática** — Next.js 16 App Router, `output: 'export'`. Tudo client-side; dados em JSON embutido (`web/lib/data/`). Sem servidor no runtime. Service worker (`web/public/sw.js`) = offline. Manifest + ícones em `web/public/`.
- **`web/`** = o app. **`materials/`** = scraping + banco + processamento. **`knowledge/`** = base de conhecimento + dados de pesquisa. **`scraper/`** = projeto Fragrantica (PAUSADO, ignorar).
- **Telas:** `/hoje` (home/hub, é o start_url) · `/` (Catálogo) · `/material/[id]` · `/direto` · `/reverso` · `/fragrancias` (escolher por cor + resumo + lista de compras) · `/compras` (sugestão 20/cor) · `/formulas` + `/formulas/[id]` · `/combinacoes` · `/curso` + `/curso/[lessonId]` + `/curso/quiz/[moduleId]` · `/metodo` · `/revisar` (SRS).
- **Motor** (heurístico, puro, client): `web/lib/engine.ts` + `web/lib/accords.ts`. Trata potência/traço (Stevens), solventes (diluente), óleos essenciais (multi-nota), avisos IFRA. Calibrado: 100% família em acordes, 76,8% em fórmulas reais documentadas. NÃO é validado por cheiro — é estimativa.

## 📦 Dados (em `web/lib/data/`, gerados de `materials/data/materials.db`)
- `materials.json` — 398 químicos aromáticos + óleos essenciais + solventes; campos: cas, name_canonical/name_pt, note_type, odor_family, **family_canon**, **cap_color** (9 cores), odor_description, **key_uses** ("para que serve"), odor_strength, recommended_dosage, typical_use_pct, ifra_limit_pct, molecular_weight/boiling_point_c/logp, min_price, **min_price_per_g** (preço/grama de material puro), offer_count, cheapest_source, offers[] (por fornecedor+tamanho+diluição), synonyms[].
- `facets.json` · `shopping.json` (por cor) · `recipes.json` (142 fórmulas reais) · `combinations.json` (43 combinações) · `course.json` (23 módulos/104 aulas/**138 quizzes**) · `flashcards.json` (205) · `metodo.json` · `quizzes.json`.
- **Fonte:** 3 fornecedores BR raspados — Flavorist, Perfumístico, Perfumoteca (~600 produtos, ~1360 ofertas). Ver [[fontes-dados-perfumista]] (memória).
- **Regenerar os JSON do app:** `python3 materials/scripts/build-web-data.py` (lê o .db + knowledge, gera materials/facets/shopping.json com cap_color+key_uses). Rode depois de re-raspar.

## 🎨 Cor de tampa = família (organização física dos frascos 20ml)
🟡 Amarelo=Cítrica · 🩷 Pink=Floral · 🌿 Verde Folha=Verde/Herbácea · 🌲 Verde Escuro=Amadeirada/Chipre · 💧 Verde Água=Aquática/Aldeídica · 🟠 Laranja=Gourmand/Frutada · 🔵 Azul=Aromática/Especiaria · ⚫ Preto=Oriental/Âmbar/Couro · ⚪ Branco=Almíscar. (Frascos vêm em lotes de 20; 1 lote/cor cobre a maioria; famílias grandes—Floral/Gourmand/Oriental/Amadeirada—pedem 2 lotes.)

## 🧠 Progresso do usuário / persistência
- localStorage por aparelho: `perfumista:course-progress`, `:quiz-results`, `:srs`, `:saved-formulas`, `:buylist`, `:sync-code`, `:install-dismissed`.
- **Sync entre aparelhos via Supabase** (offline-first, opcional): CÓDIGO já pronto em `web/lib/sync.ts` (painel em /hoje). Projeto Supabase `tgbnxnftahjrphxpazvz`, publishable key `sb_publishable_2xyzNzjovJcz2diJwJRL4Q_O4SyGomI`. **PENDENTE:** criar a tabela — rodar `bash /tmp/sb-setup.sh` (ou colar o SQL no SQL Editor). Cria `perfumista_state` + RPC `perfumista_get/set` (acesso por código). Sync liga sozinha quando a tabela existir.

## 🚀 Rodar / publicar
- Local dev: `cd web && npm install && npm run dev` (usa --webpack; node em `/opt/homebrew/bin` → `export PATH="/opt/homebrew/bin:$PATH"`).
- Build estático: `cd web && npm run build` → `out/`. Servir: `npx serve out -l tcp://0.0.0.0:3000`.
- **Redeploy Vercel** (após mudanças): `cd web && vercel build --prod && vercel deploy --prebuilt --prod --yes --archive=tgz`. ⚠️ `--archive=tgz` é ESSENCIAL (senão "Upload aborted"). Depois **re-apontar os aliases** (eles ficam presos no deploy antigo!): `vercel alias set <novo-deploy>.vercel.app perfumista-app.vercel.app` (idem perfumaria-app, perfumista-diy).
- Redeploy GH Pages: `NEXT_PUBLIC_BASE_PATH=/perfumista npm run build`, copiar `out/` pro branch gh-pages, push.

## ⚠️ Armadilhas do ambiente (não perder tempo)
- **node/npx/gh somem do PATH** às vezes → sempre `export PATH="/opt/homebrew/bin:$PATH"`. Se o symlink do node quebrar: `brew install node`.
- Meu `grep` no shell às vezes falha com `error: unknown option '-G'` — inofensivo; usar `rg` ou Read/python.
- Token do **Supabase** (Keychain) NÃO libera pra processo em segundo plano → criar tabela precisa de ação do usuário (script `/tmp/sb-setup.sh` com clique de "Permitir", ou dashboard).
- **Vercel:** token do CLI em `~/Library/Application Support/com.vercel.cli/auth.json` (usei p/ desligar deployment protection via `PATCH api.vercel.com/v9/projects/{id}?teamId={org}` `{"ssoProtection":null}`). Aliases não auto-atualizam por deploy.

## ⏭️ Pendências / próximos passos
1. **Ativar sync Supabase** (usuário roda o SQL) → validar ciclo salvar/ler entre aparelhos.
2. **Calibrar o motor** com fórmulas reais medidas (hoje é sanity contra acordes).
3. **Qualidade de dados:** `odor_family` cru é bagunçado (misturado PT/EN/descrições) → `family_canon`/`cap_color` já normalizam via keyword+pesquisa, mas há ruído; preto fica inflado (default). Dedupe de duplicatas Perfumoteca também é parcial.
4. IFRA por categoria de produto (hoje usa Cat 4 genérico); cobertura de força ~63%.
5. Salvar como scripts os passos que às vezes rodo "na mão" (o export já virou `build-web-data.py`).

## 📚 Domínio (para responder perguntas do usuário)
- Perfil **assaboneado/limpo** = aldeídos alifáticos (C-10/C-11/C-12 MNA) + almíscares brancos (Galaxolide/Habanolide) + floral limpo (hidroxicitronelol/Florhydral). Aldeídos são traços potentes (10%).
- **Sabonete puxando caramelo** = o acima + ponte de lactonas cremosas (lactona de leite, Aldeído C-14/C-18) + caramelo (Etil Maltol, Furaneol) + baunilha/cumarina. Etil maltol/furaneol = traços.
- Materiais parecidos: mesmo CAS → escolher por preço; parecido (mesma família/nota) → comparar descritor/força/uso (seção "Materiais parecidos" no detalhe).
