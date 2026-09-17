import { db, queueStats } from "./db.js";

const count = (t: string) => (db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as { n: number }).n;

console.log("=== BASE DE MATERIAIS ===");
console.log("materiais canônicos:", count("materials"));
console.log("sinônimos:", count("material_synonyms"));
console.log("ofertas (fornecedores):", count("offers"));
console.log("páginas cruas salvas:", count("pages_raw"));
console.log("\n=== FILA DE SCRAPING ===");
console.table(queueStats());

console.log("\n=== OFERTAS POR FONTE ===");
console.table(db.prepare("SELECT source, COUNT(*) n, ROUND(MIN(price),2) min_preco, ROUND(MAX(price),2) max_preco FROM offers GROUP BY source").all());

console.log("\n=== MATERIAIS COM DADO TÉCNICO ===");
console.table(db.prepare("SELECT COUNT(*) total, COUNT(cas) com_cas, COUNT(odor_family) com_familia, COUNT(note_type) com_nota, COUNT(boiling_point_c) com_pe FROM materials").all());
