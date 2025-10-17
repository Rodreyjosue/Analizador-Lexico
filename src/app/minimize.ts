import { AFD } from './subset';


export function minimizarAFD(afd: AFD): AFD {
// Convertir trans Map a estructura indexable
const estados = Array.from(afd.estados);
const alfabeto = new Set<string>();
for (const [s, m] of afd.trans) for (const k of m.keys()) alfabeto.add(k);
const alpha = Array.from(alfabeto);


// Inicial partition: finales | no-finales
const P: Set<string>[] = [new Set(afd.acepta), new Set(estados.filter(s => !afd.acepta.has(s)))];
const W: Set<string>[] = [new Set(afd.acepta)];


function obtenerTransicion(estado: string, a: string): string | null {
const m = afd.trans.get(estado);
if (!m) return null;
return m.get(a) || null;
}


while (W.length) {
const A = W.pop()!;
for (const c of alpha) {
// X = { q | transition(q,c) in A }
const X = new Set<string>();
for (const q of estados) {
const r = obtenerTransicion(q, c);
if (r && A.has(r)) X.add(q);
}
// refine partitions in P by X
const nuevaP: Set<string>[] = [];
for (const Y of P) {
const inter = new Set([...Y].filter(x => X.has(x)));
const diff = new Set([...Y].filter(x => !X.has(x)));
if (inter.size && diff.size) {
nuevaP.push(inter);
nuevaP.push(diff);
// update W
const idx = P.indexOf(Y);
if (W.includes(Y as any)) {
W.splice(W.indexOf(Y as any), 1);
W.push(inter); W.push(diff);
} else {
if (inter.size <= diff.size) W.push(inter); else W.push(diff);
}
} else {
nuevaP.push(Y);
}
}
P.length = 0; P.push(...nuevaP);
}
}

// Construir AFD minimizado: cada bloque de P es un estado
const claveBloque = (s: string) => {
for (const b of P) if (b.has(s)) return Array.from(b).sort().join('|');
return s;
};
const estadosMin = new Set<string>();
const transMin = new Map<string, Map<string, string>>();
const aceptaMin = new Set<string>();
let inicioMin = claveBloque(afd.inicio);


for (const b of P) {
const nombre = Array.from(b).sort().join('|');
estadosMin.add(nombre);
for (const s of b) if (afd.acepta.has(s)) { aceptaMin.add(nombre); break; }
}


for (const s of afd.estados) {
const bs = claveBloque(s);
if (!transMin.has(bs)) transMin.set(bs, new Map());
const m = afd.trans.get(s);
if (!m) continue;
for (const [a, t] of m) {
transMin.get(bs)!.set(a, claveBloque(t));
}
}


return { inicio: inicioMin, acepta: aceptaMin, estados: estadosMin, trans: transMin };
}