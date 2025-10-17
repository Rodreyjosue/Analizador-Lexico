import { Token } from './lexer';


const precedencia: Record<string, number> = {
'^': 4,
'*': 3,
'/': 3,
'+': 2,
'-': 2,
};
const asociativoDerecha: Record<string, boolean> = {
'^': true,
};


export function infijoAPostfijo(tokens: Token[]): string[] {
const salida: string[] = [];
const pila: string[] = [];
for (const t of tokens) {
if (t.tipo === 'NUMERO' || t.tipo === 'VARIABLE' || t.tipo === 'FRAC') {
salida.push(t.lexema);
} else if (t.tipo === 'OPERADOR_+' || t.tipo === 'OPERADOR_-' || t.tipo === 'OPERADOR_*' || t.tipo === 'OPERADOR_/' || t.tipo === 'EXPONENTE') {
const op = t.lexema;
while (pila.length) {
const top = pila[pila.length - 1];
if (top === '(') break;
const pTop = precedencia[top] || 0;
const pOp = precedencia[op] || 0;
if (pTop > pOp || (pTop === pOp && !asociativoDerecha[op])) {
salida.push(pila.pop()!);
} else break;
}
pila.push(op);
} else if (t.tipo === 'PARENTESIS_I') {
pila.push('(');
} else if (t.tipo === 'PARENTESIS_D') {
while (pila.length && pila[pila.length - 1] !== '(') {
salida.push(pila.pop()!);
}
if (pila.length && pila[pila.length - 1] === '(') pila.pop();
}
}
while (pila.length) salida.push(pila.pop()!);
return salida;
}