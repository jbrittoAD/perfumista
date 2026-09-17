/**
 * photo.tsx — A foto do "objeto do mundo real" que o cheiro evoca.
 *
 * Regra do projeto: a imagem principal da carta é uma FOTOGRAFIA (abacaxi,
 * lascas de cedro, pedra molhada) — nunca a estrutura molecular. As 95 fotos
 * são baixadas do Wikimedia Commons por scripts/fetch_photos.py.
 *
 * Como o download pode falhar para alguma chave, todo card tem um fallback
 * embutido: o gradiente curado da própria chave + o emoji do objeto. O usuário
 * nunca vê um retângulo quebrado — no pior caso vê uma capa colorida coerente
 * com a família.
 */

"use client";

import { useState } from "react";
import { photoMeta, photoSrc } from "@/lib/deck";

export default function Photo({
  photoKey,
  seed = 0,
  eager = false,
  className = "",
}: {
  photoKey: string;
  /** Id da carta: escolhe a variante quando a chave tem mais de uma foto. */
  seed?: number;
  eager?: boolean;
  className?: string;
}) {
  const meta = photoMeta(photoKey);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{ background: `linear-gradient(155deg, ${meta.grad[0]}, ${meta.grad[1]})` }}
    >
      {!failed && (
        <img
          src={photoSrc(photoKey, seed)}
          alt={meta.label}
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full select-none object-cover"
        />
      )}
      {failed && (
        <div className="grid h-full w-full place-items-center">
          <span className="text-[5.5rem] opacity-30 drop-shadow-lg" aria-hidden>
            {meta.emoji}
          </span>
        </div>
      )}
    </div>
  );
}
