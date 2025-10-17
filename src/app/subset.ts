import { AFN, Transicion } from './thompson';


export interface AFD {
inicio: string; // clave canonical de conjunto
acepta: Set<string>;
estados: Set<string>;
trans: Map<string, Map<string, string>>; // desdeEstado -> symbol -> haciaEstado
}

function claveCanonica(estados: Set<number>): string {
return Array.from(estados).sort((a, b) => a - b).join(',') || '∅';
}


function construirIndiceTrans(trans: Transicion[]): Map<number, Transicion[]> {
  const m = new Map<number, Transicion[]>();
  for (const t of trans) {
    if (!m.has(t.desde)) m.set(t.desde, []);
    m.get(t.desde)!.push(t);
  }
  return m;
}

export function clausuraEpsilon(afn: AFN, estados: Set<number>): Set<number> {
  const indice = construirIndiceTrans(afn.trans);
  const pila = Array.from(estados);
  const clausura = new Set(estados);
  while (pila.length) {
    const s = pila.pop()!;
    const salidas = indice.get(s) || [];
    for (const t of salidas) {
      if (t.simbolo === 'ε' || t.simbolo === '') {
        if (!clausura.has(t.hacia)) { clausura.add(t.hacia); pila.push(t.hacia); }
      }
    }
  }
  return clausura;
}

export function mover(afn: AFN, estados: Set<number>, simbolo: string): Set<number> {
  const indice = construirIndiceTrans(afn.trans);
  const res = new Set<number>();
  for (const s of estados) {
    const salidas = indice.get(s) || [];
    for (const t of salidas) {
      if (t.simbolo === simbolo) res.add(t.hacia);
    }
  }
  return res;
}



export function obtenerAlfabeto(afn: AFN): string[] {
const set = new Set<string>();
for (const t of afn.trans) if (t.simbolo !== 'ε') set.add(t.simbolo);
return Array.from(set);
}

export function construccionSubconjuntos(afn: AFN): AFD {
const alfabeto = obtenerAlfabeto(afn);
const conjuntoInicio = clausuraEpsilon(afn, new Set([afn.inicio]));
const claveInicio = claveCanonica(conjuntoInicio);
const estadosQ: Set<number>[] = [conjuntoInicio];
const visitados = new Set<string>();
const trans = new Map<string, Map<string, string>>();
const estadosAFD = new Set<string>();
const acepta = new Set<string>();


while (estadosQ.length) {
const actual = estadosQ.shift()!;
const claveActual = claveCanonica(actual);
if (visitados.has(claveActual)) continue;
visitados.add(claveActual);
estadosAFD.add(claveActual);
// check accept
for (const a of afn.acepta) if (actual.has(a)) { acepta.add(claveActual); break; }
for (const sym of alfabeto) {
const movido = mover(afn, actual, sym);
const cl = clausuraEpsilon(afn, movido);
const claveCl = claveCanonica(cl);
if (!trans.has(claveActual)) trans.set(claveActual, new Map());
if (cl.size > 0) {
trans.get(claveActual)!.set(sym, claveCl);
if (!visitados.has(claveCl)) estadosQ.push(cl);
}
}
}


return { inicio: claveInicio, acepta, estados: estadosAFD, trans };
}