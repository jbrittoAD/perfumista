import type { Metadata } from "next";
import TodayPanel from "./today-panel";

export const metadata: Metadata = {
  title: "Hoje — Perfumista",
  description: "Seu painel diário: o que estudar, revisar e treinar hoje em ~30 minutos.",
};

export default function HojePage() {
  return <TodayPanel />;
}
