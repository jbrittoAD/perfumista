import type { NextConfig } from "next";

// basePath CONDICIONAL por env:
//  - sem NEXT_PUBLIC_BASE_PATH => raiz (LAN/Vercel, como hoje).
//  - com NEXT_PUBLIC_BASE_PATH=/perfumista => servido sob o subpath (GitHub Pages).
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // PWA 100% estática: gera a pasta out/ com HTML/CSS/JS servíveis por qualquer host.
  output: "export",
  // Sem servidor de otimização de imagem no export estático.
  images: { unoptimized: true },
  // Prefixo de rotas e de assets (_next). Vazio = raiz; setado = subpath.
  basePath: base,
  assetPrefix: base || undefined,
};

export default nextConfig;
