/**
 * livros/[slug]/page.tsx — a casca estática de cada livro.
 *
 * `output: 'export'` exige generateStaticParams: uma rota HTML por livro, tudo
 * pré-renderizado e cacheável pelo service worker. A leitura em si é client-side
 * (Leitor), porque depende de localStorage e de rolagem.
 */

import { LIVROS, getLivro } from "@/lib/livros";
import Leitor from "./leitor";

export function generateStaticParams() {
  return LIVROS.map((l) => ({ slug: l.slug }));
}

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const livro = getLivro(slug);
  if (!livro) return <div className="p-6">Livro não encontrado.</div>;
  return <Leitor slug={slug} />;
}
