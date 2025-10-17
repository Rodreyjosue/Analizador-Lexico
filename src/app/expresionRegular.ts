import { AFN, reiniciarContadorEstado } from './thompson';
import { AFD } from './subset';

const NUM = '\\d+(?:\\.\\d+)?(?:\\^-?\\d+)?';    
const VARS = '[a-zA-Z](?:\\^-?\\d+)?';          
const OP = '(?:[\\*\\/]|(?=[a-zA-Z(]))';
const PAR = `\\((?:${NUM}|${VARS})(?:[+-](?:${NUM}|${VARS})|${OP}(?:${NUM}|${VARS}))*\\)(?:\\^-?\\d+)?`;
const TERM = `(?:${NUM}|${VARS}|${PAR})`;

export const expresionBase = `^[+-]?${TERM}(?:${OP}${TERM})*(?:[+-]${TERM}(?:${OP}${TERM})*)*(?:=${TERM}(?:${OP}${TERM})*(?:[+-]${TERM}(?:${OP}${TERM})*)*)?$`;

// Normaliza la entrada
function normalizarEntrada(s: string): string {
  if (typeof s !== 'string') s = String(s ?? '');
  const limpiado = s.replace(/[\u00A0\u2007\u202F]/g, ' ');
  return limpiado.replace(/\s+/g, '').trim();
}

// Función que valida la expresión
export function esExpresionValida(entrada: string): boolean {
  try {
    const texto = normalizarEntrada(entrada);
    if (!texto) return false;
    
    const palabrasCompletas = texto.match(/\b[a-zA-Z]{2,}\b/g);
    if (palabrasCompletas && palabrasCompletas.length > 0) {
      console.log('Palabras no permitidas detectadas:', palabrasCompletas);
      return false;
    }
    
    const re = new RegExp(expresionBase, 'i'); 
    return re.test(texto);
  } catch (err) {
    console.error('Error al validar expresión:', err);
    return false;
  }
}

// Definir tipos para los símbolos del AFD
export type SimboloAFD = '[+-]' | '0-9' | '.' | '^' | '-' | 'a-z' | '(' | ')' | '[*/]' | '=';

// ==================== INTERFACES PARA VISUALIZACIÓN ====================

export interface PasoTransicion {
  desdeEstado: string;
  simbolo: string;
  haciaEstado: string;
  esValido: boolean;
  numeroPaso: number;
}

export interface ResultadoValidacion {
  esValido: boolean;
  esAceptado: boolean;
  pasos: PasoTransicion[];
  estadoFinal: string;
  entrada: string;
  pasoError?: number;
}

// ==================== FUNCIONES AUXILIARES MEJORADAS ====================

// 🎯 NUEVA FUNCIÓN: Obtener el estado principal (el de menor número)
function obtenerEstadoPrincipal(estados: Set<number>): string {
  if (estados.size === 0) return '∅';
  const estadosOrdenados = Array.from(estados).sort((a, b) => a - b);
  return `q${estadosOrdenados[0]}`; // Devuelve solo el estado de menor número
}

// Función auxiliar para agregar transiciones
function agregarTransicion(
  estados: Map<number, { transiciones: Map<string, number[]> }>, 
  desde: number, 
  simbolo: string, 
  haciaEstados: number[]
): void {
  const estado = estados.get(desde);
  if (estado) {
    estado.transiciones.set(simbolo, haciaEstados);
  }
}

// ==================== AFN CON TABLA ESPECÍFICA (18 estados) ====================
export function construirAFNDesdeRegexValidacion(): AFN {
  reiniciarContadorEstado();
  
  const estados = new Map<number, { transiciones: Map<string, number[]> }>();
  
  // Crear 18 estados (q0 a q17)
  for (let i = 0; i <= 17; i++) {
    estados.set(i, { transiciones: new Map() });
  }

  // ========== DEFINICIÓN DE TRANSICIONES SEGÚN TABLA AFN ==========
  
  // Estado q0 (INICIAL)
  agregarTransicion(estados, 0, '[+-]', [1]);
  agregarTransicion(estados, 0, '0-9', [2]);
  agregarTransicion(estados, 0, 'a-z', [3]);
  agregarTransicion(estados, 0, '(', [4]);

  // Estado q1 (Después de signo inicial)
  agregarTransicion(estados, 1, '0-9', [2]);
  agregarTransicion(estados, 1, 'a-z', [3]);
  agregarTransicion(estados, 1, '(', [4]);

  // Estado q2 (ACEPTACIÓN - Número)
  agregarTransicion(estados, 2, '[+-]', [5]);
  agregarTransicion(estados, 2, '0-9', [2]);
  agregarTransicion(estados, 2, '.', [6]);
  agregarTransicion(estados, 2, '^', [7]);
  agregarTransicion(estados, 2, '[*/]', [8]);
  agregarTransicion(estados, 2, '=', [9]);
  agregarTransicion(estados, 2, 'ε', [10]);
  agregarTransicion(estados, 2, ')', [11]);

  // Estado q3 (ACEPTACIÓN - Variable)
  agregarTransicion(estados, 3, '[+-]', [5]);
  agregarTransicion(estados, 3, '^', [7]);
  agregarTransicion(estados, 3, '[*/]', [8]);
  agregarTransicion(estados, 3, '=', [9]);
  agregarTransicion(estados, 3, 'ε', [10]);
  agregarTransicion(estados, 3, ')', [11]);

  // Estado q4 (Paréntesis abierto)
  agregarTransicion(estados, 4, '[+-]', [5]);
  agregarTransicion(estados, 4, '0-9', [2]);
  agregarTransicion(estados, 4, 'a-z', [3]);
  agregarTransicion(estados, 4, '(', [4]);
  agregarTransicion(estados, 4, ')', [11]);
  agregarTransicion(estados, 4, '[*/]', [8]);
  agregarTransicion(estados, 4, '=', [9]);
  agregarTransicion(estados, 4, 'ε', [10]);

  // Estado q5 (Después de signo en expresión)
  agregarTransicion(estados, 5, '0-9', [2]);
  agregarTransicion(estados, 5, 'a-z', [3]);
  agregarTransicion(estados, 5, '(', [4]);

  // Estado q6 (Después de punto decimal)
  agregarTransicion(estados, 6, '0-9', [12]);

  // Estado q7 (Después de exponente ^)
  agregarTransicion(estados, 7, '-', [13]);
  agregarTransicion(estados, 7, '0-9', [14]);
  agregarTransicion(estados, 7, 'a-z', [14]);
  agregarTransicion(estados, 7, '(', [14]);

  // Estado q8 (Después de operador */)
  agregarTransicion(estados, 8, '0-9', [2]);
  agregarTransicion(estados, 8, 'a-z', [3]);
  agregarTransicion(estados, 8, '(', [4]);

  // Estado q9 (Después de igual =)
  agregarTransicion(estados, 9, '0-9', [15]);
  agregarTransicion(estados, 9, 'a-z', [15]);
  agregarTransicion(estados, 9, '(', [15]);

  // Estado q10 (ACEPTACIÓN - Transición ε)
  agregarTransicion(estados, 10, '[+-]', [5]);
  agregarTransicion(estados, 10, '0-9', [2]);
  agregarTransicion(estados, 10, 'a-z', [3]);
  agregarTransicion(estados, 10, '(', [4]);
  agregarTransicion(estados, 10, '[*/]', [8]);
  agregarTransicion(estados, 10, '=', [9]);
  agregarTransicion(estados, 10, 'ε', [16]);

  // Estado q11 (Paréntesis cerrado)
  agregarTransicion(estados, 11, '[+-]', [5]);
  agregarTransicion(estados, 11, '0-9', [12]);
  agregarTransicion(estados, 11, '^', [7]);
  agregarTransicion(estados, 11, '[*/]', [8]);
  agregarTransicion(estados, 11, '=', [9]);
  agregarTransicion(estados, 11, 'ε', [10]);

  // Estado q12 (ACEPTACIÓN - Decimal completo)
  agregarTransicion(estados, 12, '[+-]', [5]);
  agregarTransicion(estados, 12, '0-9', [12]);
  agregarTransicion(estados, 12, '^', [7]);
  agregarTransicion(estados, 12, '[*/]', [8]);
  agregarTransicion(estados, 12, '=', [9]);
  agregarTransicion(estados, 12, 'ε', [10]);
  agregarTransicion(estados, 12, ')', [11]);

  // Estado q13 (Signo negativo en exponente)
  agregarTransicion(estados, 13, '0-9', [14]);
  agregarTransicion(estados, 13, 'a-z', [14]);
  agregarTransicion(estados, 13, '(', [14]);

  // Estado q14 (ACEPTACIÓN - Exponente completo)
  agregarTransicion(estados, 14, '[+-]', [5]);
  agregarTransicion(estados, 14, '0-9', [14]);
  agregarTransicion(estados, 14, '[*/]', [8]);
  agregarTransicion(estados, 14, '=', [9]);
  agregarTransicion(estados, 14, 'ε', [17]);
  agregarTransicion(estados, 14, ')', [11]);
  agregarTransicion(estados, 14, '^', [7]);
  agregarTransicion(estados, 14, 'a-z', [15]);
  

  // Estado q15 (ACEPTACIÓN - Término después de igual)
  agregarTransicion(estados, 15, '[+-]', [5]);
  agregarTransicion(estados, 15, '0-9', [15]);
  agregarTransicion(estados, 15, 'a-z', [15]);
  agregarTransicion(estados, 15, '(', [15]);
  agregarTransicion(estados, 15, '[*/]', [8]);
  agregarTransicion(estados, 15, '=', [9]);
  agregarTransicion(estados, 15, 'ε', [17]);
  agregarTransicion(estados, 15, ')', [11]);
  agregarTransicion(estados, 15, '^', [7]);
  agregarTransicion(estados, 15, 'a-z', [15]);

  // Estado q16 (ACEPTACIÓN - Final por ε)
  // Sin transiciones - estado de aceptación final

  // Estado q17 (ACEPTACIÓN - Final después de igual)
  agregarTransicion(estados, 17, '[+-]', [5]);
  agregarTransicion(estados, 17, '0-9', [15]);
  agregarTransicion(estados, 17, 'a-z', [15]);
  agregarTransicion(estados, 17, '(', [15]);
  agregarTransicion(estados, 17, '[*/]', [8]);
  agregarTransicion(estados, 17, '=', [9]);
  agregarTransicion(estados, 17, 'ε', [16]);

  // Convertir a estructura AFN estándar
  const trans: any[] = [];
  const estadosAFN = new Set<number>();
  const acepta = new Set<number>([2, 3, 10, 12, 14, 15, 16, 17]);

  for (const [desde, datosEstado] of estados) {
    estadosAFN.add(desde);
    for (const [simbolo, haciaEstados] of datosEstado.transiciones) {
      for (const hacia of haciaEstados) {
        trans.push({ desde, hacia, simbolo });
        estadosAFN.add(hacia);
      }
    }
  }

  return {
    inicio: 0,
    acepta,
    estados: estadosAFN,
    trans
  };
}

// ==================== AFD COMPLETO CON TABLA ESPECÍFICA (16 estados) ====================
export function construirAFDDesdeTabla(): AFD {
  // Estados numerados q0 a q15 según tabla AFD
  const estados = new Set<string>(['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15']);
  const inicio = '0';
  // Estados de aceptación según tabla: C(2), D(3), K(11), L(12), N(14), O(15)
  const acepta = new Set<string>(['2','3','11','12','14','15']);
  
  const trans = new Map<string, Map<string, string>>();
  
  // ========== DEFINICIÓN DE TRANSICIONES SEGÚN TABLA AFD ==========
  
  // Estado 0 (A - INICIAL)
  const trans0 = new Map<string, string>();
  trans0.set('[+-]', '1');  // B
  trans0.set('0-9', '2');   // C (ACEPTACIÓN)
  trans0.set('a-z', '3');   // D (ACEPTACIÓN)
  trans0.set('(', '4');     // E
  trans.set('0', trans0);
  
  // Estado 1 (B - Después de signo inicial)
  const trans1 = new Map<string, string>();
  trans1.set('0-9', '2');   // C
  trans1.set('a-z', '3');   // D
  trans1.set('(', '4');     // E
  trans.set('1', trans1);
  
  // Estado 2 (C - ACEPTACIÓN - Número completo)
  const trans2 = new Map<string, string>();
  trans2.set('[+-]', '5');  // F
  trans2.set('0-9', '2');   // C
  trans2.set('.', '6');     // G
  trans2.set('^', '7');     // H
  trans2.set('a-z', '3');   // D
  trans2.set('(', '4');     // E
  trans2.set('[*/]', '8');  // I
  trans2.set('=', '9');     // J
  trans.set('2', trans2);
  
  // Estado 3 (D - ACEPTACIÓN - Variable completa)
  const trans3 = new Map<string, string>();
  trans3.set('[+-]', '5');  // F
  trans3.set('^', '7');     // H
  trans3.set('a-z', '3');   // D
  trans3.set('(', '4');     // E
  trans3.set('[*/]', '8');  // I
  trans3.set('=', '9');     // J
  trans.set('3', trans3);
  
  // Estado 4 (E - Paréntesis abierto)
  const trans4 = new Map<string, string>();
  trans4.set('[+-]', '5');  // F
  trans4.set('0-9', '2');   // C
  trans4.set('a-z', '3');   // D
  trans4.set('(', '4');     // E
  trans4.set(')', '11');    // K (ACEPTACIÓN)
  trans4.set('[*/]', '8');  // I
  trans4.set('=', '9');     // J
  trans.set('4', trans4);
  
  // Estado 5 (F - Después de signo en expresión)
  const trans5 = new Map<string, string>();
  trans5.set('0-9', '2');   // C
  trans5.set('a-z', '3');   // D
  trans5.set('(', '4');     // E
  trans.set('5', trans5);
  
  // Estado 6 (G - Esperando decimal)
  const trans6 = new Map<string, string>();
  trans6.set('0-9', '12');  // L (ACEPTACIÓN)
  trans.set('6', trans6);
  
  // Estado 7 (H - Después de exponente ^)
  const trans7 = new Map<string, string>();
  trans7.set('-', '13');    // M
  trans7.set('0-9', '14');  // N (ACEPTACIÓN)
  trans7.set('a-z', '14');  // N
  trans7.set('(', '14');    // N
  trans.set('7', trans7);
  
  // Estado 8 (I - Después de operador)
  const trans8 = new Map<string, string>();
  trans8.set('0-9', '2');   // C
  trans8.set('a-z', '3');   // D
  trans8.set('(', '4');     // E
  trans.set('8', trans8);
  
  // Estado 9 (J - Después de igual =)
  const trans9 = new Map<string, string>();
  trans9.set('0-9', '15');  // O (ACEPTACIÓN)
  trans9.set('a-z', '15');  // O
  trans9.set('(', '15');    // O
  trans.set('9', trans9);
  
  // Estado 11 (K - ACEPTACIÓN - Paréntesis cerrado)
  const trans11 = new Map<string, string>();
  trans11.set('[+-]', '5');  // F
  trans11.set('0-9', '12');  // L
  trans11.set('^', '7');     // H
  trans11.set('a-z', '3');   // D
  trans11.set('(', '4');     // E
  trans11.set('[*/]', '8');  // I
  trans11.set('=', '9');     // J
  trans.set('11', trans11);
  
  // Estado 12 (L - ACEPTACIÓN - Decimal completo)
  const trans12 = new Map<string, string>();
  trans12.set('[+-]', '5');  // F
  trans12.set('0-9', '12');  // L
  trans12.set('^', '7');     // H
  trans12.set('a-z', '3');   // D
  trans12.set('(', '4');     // E
  trans12.set('[*/]', '8');  // I
  trans12.set('=', '9');     // J
  trans.set('12', trans12);
  
  // Estado 13 (M - Signo negativo en exponente)
  const trans13 = new Map<string, string>();
  trans13.set('0-9', '14');  // N
  trans13.set('a-z', '14');  // N
  trans13.set('(', '14');    // N
  trans.set('13', trans13);
  
  // Estado 14 (N - ACEPTACIÓN - Exponente completo)
  const trans14 = new Map<string, string>();
  trans14.set('[+-]', '5');  // F
  trans14.set('0-9', '14');  // N
  trans14.set('a-z', '15');  // O
  trans14.set('(', '15');    // O
  trans14.set('[*/]', '8');  // I
  trans14.set('=', '9');     // J
  trans.set('14', trans14);
  
  // Estado 15 (O - ACEPTACIÓN - Término después de igual)
  const trans15 = new Map<string, string>();
  trans15.set('[+-]', '5');  // F
  trans15.set('0-9', '15');  // O
  trans15.set('a-z', '15');  // O
  trans15.set('(', '15');    // O
  trans15.set('[*/]', '8');  // I
  trans15.set('=', '9');     // J
  trans.set('15', trans15);

  return {
    inicio,
    acepta,
    estados,
    trans
  };
}

// ==================== AFD SIMPLIFICADO CON TABLA EXACTA (12 estados) ====================
export function construirAFDSimplificado(): AFD {
  // Estados numerados según tabla simplificada
  const estados = new Set<string>(['0','1','2','3','4','5','6','7','8','9','10','11']);
  const inicio = '0';
  const acepta = new Set<string>(['2','11']); // U(2) y A(11)
  
  const trans = new Map<string, Map<string, string>>();
  
  // Estado 0 (S - INICIAL)
  const trans0 = new Map<string, string>();
  trans0.set('[+-]', '1');  // T
  trans0.set('0-9', '2');   // U (ACEPTACIÓN)
  trans0.set('a-z', '2');   // U
  trans0.set('(', '3');     // V
  trans.set('0', trans0);
  
  // Estado 1 (T - Después de signo inicial)
  const trans1 = new Map<string, string>();
  trans1.set('0-9', '2');   // U
  trans1.set('a-z', '2');   // U
  trans1.set('(', '3');     // V
  trans.set('1', trans1);
  
  // Estado 2 (U - ACEPTACIÓN - Término principal)
  const trans2 = new Map<string, string>();
  trans2.set('[+-]', '4');  // W
  trans2.set('0-9', '2');   // U
  trans2.set('.', '5');     // X
  trans2.set('^', '6');     // Y
  trans2.set('a-z', '2');   // U
  trans2.set('(', '3');     // V
  trans2.set(')', '2');     // U
  trans2.set('[*/]', '7');  // Z
  trans2.set('=', '8');     // P
  trans.set('2', trans2);
  
  // Estado 3 (V - Paréntesis abierto)
  const trans3 = new Map<string, string>();
  trans3.set('[+-]', '4');  // W
  trans3.set('0-9', '2');   // U
  trans3.set('a-z', '2');   // U
  trans3.set('(', '3');     // V
  trans3.set(')', '2');     // U
  trans3.set('[*/]', '7');  // Z
  trans3.set('=', '8');     // P
  trans.set('3', trans3);
  
  // Estado 4 (W - Después de signo)
  const trans4 = new Map<string, string>();
  trans4.set('0-9', '2');   // U
  trans4.set('a-z', '2');   // U
  trans4.set('(', '3');     // V
  trans.set('4', trans4);
  
  // Estado 5 (X - Procesando decimal)
  const trans5 = new Map<string, string>();
  trans5.set('0-9', '2');   // U
  trans.set('5', trans5);
  
  // Estado 6 (Y - Procesando exponente)
  const trans6 = new Map<string, string>();
  trans6.set('-', '10');    // R
  trans6.set('0-9', '11');  // A (ACEPTACIÓN)
  trans6.set('a-z', '11');  // A
  trans6.set('(', '11');    // A
  trans.set('6', trans6);
  
  // Estado 7 (Z - Después de operador)
  const trans7 = new Map<string, string>();
  trans7.set('0-9', '2');   // U
  trans7.set('a-z', '2');   // U
  trans7.set('(', '3');     // V
  trans.set('7', trans7);
  
  // Estado 8 (P - Después de igual)
  const trans8 = new Map<string, string>();
  trans8.set('0-9', '11');  // A
  trans8.set('a-z', '11');  // A
  trans8.set('(', '11');    // A
  trans.set('8', trans8);
  
  // Estado 10 (R - Signo negativo en exponente)
  const trans10 = new Map<string, string>();
  trans10.set('0-9', '11'); // A
  trans10.set('a-z', '11'); // A
  trans10.set('(', '11');   // A
  trans.set('10', trans10);
  
  // Estado 11 (A - ACEPTACIÓN - Término derecho o exponente)
  const trans11 = new Map<string, string>();
  trans11.set('[+-]', '4');  // W
  trans11.set('0-9', '11');  // A
  trans11.set('a-z', '11');  // A
  trans11.set('(', '11');    // A
  trans11.set('[*/]', '7');  // Z
  trans11.set('=', '8');     // P
  trans.set('11', trans11);

  return {
    inicio,
    acepta,
    estados,
    trans
  };
}

// ==================== VISUALIZADOR DE RECORRIDO MEJORADO ====================

// Función para simular el recorrido en el AFD
export function simularAFDPasoAPaso(
  entrada: string, 
  afd: AFD,
  tipoAFD: 'completo' | 'simplificado' = 'completo'
): ResultadoValidacion {
  const pasos: PasoTransicion[] = [];
  let estadoActual = afd.inicio;
  const entradaNormalizada = normalizarEntrada(entrada);
  
  // Mapeo de caracteres a categorías de símbolos del AFD
  function mapearCaracterASimbolo(caracter: string): string {
    if ('+-'.includes(caracter)) return '[+-]';
    if ('0123456789'.includes(caracter)) return '0-9';
    if ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(caracter)) return 'a-z';
    if ('*/'.includes(caracter)) return '[*/]';
    if ('()^=.'.includes(caracter)) return caracter;
    return 'INVALIDO';
  }

  let pasoError: number | undefined = undefined;

  // Procesar cada caracter de la entrada
  for (let i = 0; i < entradaNormalizada.length; i++) {
    const caracter = entradaNormalizada[i];
    const simbolo = mapearCaracterASimbolo(caracter);
    const transicionesActuales = afd.trans.get(estadoActual);
    
    if (!transicionesActuales) {
      // No hay transiciones definidas para este estado
      pasos.push({
        desdeEstado: estadoActual,
        simbolo: caracter,
        haciaEstado: 'ERROR',
        esValido: false,
        numeroPaso: i + 1
      });
      pasoError = i + 1;
      break;
    }

    let siguienteEstado: string | undefined;
    
    // Buscar transición exacta para el símbolo
    if (transicionesActuales.has(simbolo)) {
      siguienteEstado = transicionesActuales.get(simbolo);
    } else {
      // Buscar transición por categoría más amplia
      for (const [simboloTrans, estadoObjetivo] of transicionesActuales) {
        if (simboloTrans === '[+-]' && '+-'.includes(caracter)) {
          siguienteEstado = estadoObjetivo;
          break;
        }
        if (simboloTrans === '0-9' && '0123456789'.includes(caracter)) {
          siguienteEstado = estadoObjetivo;
          break;
        }
        if (simboloTrans === 'a-z' && 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(caracter)) {
          siguienteEstado = estadoObjetivo;
          break;
        }
        if (simboloTrans === '[*/]' && '*/'.includes(caracter)) {
          siguienteEstado = estadoObjetivo;
          break;
        }
        if (simboloTrans === caracter) {
          siguienteEstado = estadoObjetivo;
          break;
        }
      }
    }

    if (siguienteEstado) {
      // Transición válida encontrada
      pasos.push({
        desdeEstado: estadoActual,
        simbolo: caracter,
        haciaEstado: siguienteEstado,
        esValido: true,
        numeroPaso: i + 1
      });
      estadoActual = siguienteEstado;
    } else {
      // No se encontró transición válida
      pasos.push({
        desdeEstado: estadoActual,
        simbolo: caracter,
        haciaEstado: 'ERROR',
        esValido: false,
        numeroPaso: i + 1
      });
      pasoError = i + 1;
      break;
    }
  }

  // Verificar si el estado final es de aceptación
  const esAceptado = afd.acepta.has(estadoActual) && pasos.every(paso => paso.esValido);
  
  return {
    esValido: pasos.every(paso => paso.esValido),
    esAceptado,
    pasos,
    estadoFinal: estadoActual,
    entrada: entradaNormalizada,
    pasoError
  };
}

// 🎯 FUNCIÓN MEJORADA: Simular recorrido del AFN (MOSTRANDO SOLO ESTADO PRINCIPAL)
export function simularAFNPasoAPaso(
  entrada: string, 
  afn: AFN
): ResultadoValidacion {
  const pasos: PasoTransicion[] = [];
  let estadosActuales = new Set<number>([afn.inicio]);
  const entradaNormalizada = normalizarEntrada(entrada);
  
  // Mapeo de caracteres a categorías de símbolos
  function mapearCaracterASimbolo(caracter: string): string {
    if ('+-'.includes(caracter)) return '[+-]';
    if ('0123456789'.includes(caracter)) return '0-9';
    if ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(caracter)) return 'a-z';
    if ('*/'.includes(caracter)) return '[*/]';
    if ('()^=.'.includes(caracter)) return caracter;
    return 'INVALIDO';
  }

  // Calcular ε-clausura inicial
  estadosActuales = clausuraEpsilon(afn, estadosActuales);

  for (let i = 0; i < entradaNormalizada.length; i++) {
    const caracter = entradaNormalizada[i];
    const simbolo = mapearCaracterASimbolo(caracter);
    
    // 🎯 GUARDAR el estado antes del movimiento (para mostrar solo el estado principal)
    const estadoAntesMovimiento = new Set<number>(estadosActuales);
    
    // Mover con el símbolo actual
    const siguientesEstados = mover(afn, estadosActuales, simbolo);
    
    if (siguientesEstados.size === 0) {
      pasos.push({
        desdeEstado: obtenerEstadoPrincipal(estadoAntesMovimiento), // 🎯 Mostrar solo estado principal
        simbolo: caracter,
        haciaEstado: '∅',
        esValido: false,
        numeroPaso: i + 1
      });
      break;
    }
    
    // Calcular ε-clausura de los siguientes estados
    const siguientesEstadosConEpsilon = clausuraEpsilon(afn, siguientesEstados);
    
    pasos.push({
      desdeEstado: obtenerEstadoPrincipal(estadoAntesMovimiento), // 🎯 Mostrar solo estado principal
      simbolo: caracter,
      haciaEstado: obtenerEstadoPrincipal(siguientesEstadosConEpsilon), // 🎯 Mostrar solo estado principal
      esValido: true,
      numeroPaso: i + 1
    });
    
    estadosActuales = siguientesEstadosConEpsilon;
  }
  
  const esAceptado = Array.from(estadosActuales).some(estado => afn.acepta.has(estado));
  
  return {
    esValido: pasos.every(paso => paso.esValido),
    esAceptado,
    pasos,
    estadoFinal: obtenerEstadoPrincipal(estadosActuales), // 🎯 Mostrar solo estado principal
    entrada: entradaNormalizada
  };
}

// Función auxiliar para ε-clausura
function clausuraEpsilon(afn: AFN, estados: Set<number>): Set<number> {
  const clausura = new Set<number>(estados);
  const pila = Array.from(estados);
  
  while (pila.length > 0) {
    const estado = pila.pop()!;
    const transicionesEpsilon = afn.trans.filter(t => 
      t.desde === estado && (t.simbolo === 'ε' || t.simbolo === '')
    );
    
    for (const transicion of transicionesEpsilon) {
      if (!clausura.has(transicion.hacia)) {
        clausura.add(transicion.hacia);
        pila.push(transicion.hacia);
      }
    }
  }
  
  return clausura;
}

// Función auxiliar para move
function mover(afn: AFN, estados: Set<number>, simbolo: string): Set<number> {
  const resultado = new Set<number>();
  
  for (const estado of estados) {
    const transiciones = afn.trans.filter(t => 
      t.desde === estado && t.simbolo === simbolo
    );
    
    for (const transicion of transiciones) {
      resultado.add(transicion.hacia);
    }
  }
  
  return resultado;
}

// Función auxiliar para convertir Set a string
function conjuntoAString(estados: Set<number>): string {
  return Array.from(estados).sort((a, b) => a - b).join(',');
}

// Función para formatear el recorrido como texto
export function formatearPasosTransicion(resultado: ResultadoValidacion): string {
  const lineas: string[] = [];
  
  lineas.push(`Validación de expresión: "${resultado.entrada}"`);
  lineas.push(`Estado inicial: ${resultado.pasos[0]?.desdeEstado || 'N/A'}`);
  lineas.push('');
  
  resultado.pasos.forEach((paso) => {
    const numeroPaso = paso.numeroPaso.toString().padStart(2, '0');
    const desdeEstado = paso.desdeEstado.includes(',') ? `{${paso.desdeEstado}}` : `q${paso.desdeEstado}`;
    const haciaEstado = paso.haciaEstado.includes(',') ? `{${paso.haciaEstado}}` : `q${paso.haciaEstado}`;
    const transicion = `${desdeEstado} --(${paso.simbolo})--> ${haciaEstado}`;
    const estado = paso.esValido ? '✓' : '✗';
    lineas.push(`${numeroPaso}. ${transicion} ${estado}`);
  });
  
  lineas.push('');
  const estadoFinal = resultado.estadoFinal.includes(',') ? `{${resultado.estadoFinal}}` : `q${resultado.estadoFinal}`;
  lineas.push(`Estado final: ${estadoFinal}`);
  lineas.push(`¿Es estado de aceptación? ${resultado.esAceptado ? 'SÍ ✓' : 'NO ✗'}`);
  lineas.push(`¿Expresión válida? ${resultado.esAceptado ? 'SÍ ✓' : 'NO ✗'}`);
  
  if (resultado.pasoError) {
    lineas.push(`\nERROR en el paso ${resultado.pasoError}: Transición no válida`);
  }
  
  return lineas.join('\n');
}

// Función para formatear el recorrido en formato más visual (HTML-friendly)
export function formatearPasosTransicionHTML(resultado: ResultadoValidacion): string {
  const lineas: string[] = [];
  
  lineas.push(`<div class="resultado-validacion">`);
  lineas.push(`  <h3>Validación de expresión: "${resultado.entrada}"</h3>`);
  const estadoInicial = resultado.pasos[0]?.desdeEstado || 'N/A';
  const visualizacionInicial = estadoInicial.includes(',') ? `{${estadoInicial}}` : `q${estadoInicial}`;
  lineas.push(`  <p><strong>Estado inicial:</strong> ${visualizacionInicial}</p>`);
  lineas.push(`  <table class="tabla-transicion">`);
  lineas.push(`    <thead>`);
  lineas.push(`      <tr><th>Paso</th><th>Transición</th><th>Estado</th></tr>`);
  lineas.push(`    </thead>`);
  lineas.push(`    <tbody>`);
  
  resultado.pasos.forEach((paso) => {
    const desdeEstado = paso.desdeEstado.includes(',') ? `{${paso.desdeEstado}}` : `q${paso.desdeEstado}`;
    const haciaEstado = paso.haciaEstado.includes(',') ? `{${paso.haciaEstado}}` : `q${paso.haciaEstado}`;
    const transicion = `${desdeEstado} →(${paso.simbolo})→ ${haciaEstado}`;
    const claseEstado = paso.esValido ? 'valido' : 'invalido';
    const iconoEstado = paso.esValido ? '✓' : '✗';
    
    lineas.push(`    <tr class="${claseEstado}">`);
    lineas.push(`      <td>${paso.numeroPaso}</td>`);
    lineas.push(`      <td>${transicion}</td>`);
    lineas.push(`      <td>${iconoEstado}</td>`);
    lineas.push(`    </tr>`);
  });
  
  lineas.push(`    </tbody>`);
  lineas.push(`  </table>`);
  
  const visualizacionEstadoFinal = resultado.estadoFinal.includes(',') ? `{${resultado.estadoFinal}}` : `q${resultado.estadoFinal}`;
  lineas.push(`  <div class="resultado-final ${resultado.esAceptado ? 'aceptado' : 'rechazado'}">`);
  lineas.push(`    <p><strong>Estado final:</strong> ${visualizacionEstadoFinal}</p>`);
  lineas.push(`    <p><strong>¿Es estado de aceptación?</strong> ${resultado.esAceptado ? 'SÍ ✓' : 'NO ✗'}</p>`);
  lineas.push(`    <p><strong>¿Expresión válida?</strong> ${resultado.esAceptado ? 'SÍ ✓' : 'NO ✗'}</p>`);
  lineas.push(`  </div>`);
  
  if (resultado.pasoError) {
    lineas.push(`  <div class="mensaje-error">`);
    lineas.push(`    <p><strong>ERROR en el paso ${resultado.pasoError}:</strong> Transición no válida</p>`);
    lineas.push(`  </div>`);
  }
  
  lineas.push(`</div>`);
  
  return lineas.join('\n');
}

// Función para obtener explicación detallada de cada paso
export function obtenerExplicacionPasoAPaso(resultado: ResultadoValidacion): string[] {
  const explicaciones: string[] = [];
  
  explicaciones.push(`Procesando expresión: "${resultado.entrada}"`);
  
  const estadoInicial = resultado.pasos[0]?.desdeEstado || 'N/A';
  const explicacionInicial = estadoInicial.includes(',') 
    ? `Comienza en conjunto de estados {${estadoInicial}}` 
    : `Comienza en estado inicial q${estadoInicial}`;
  explicaciones.push(explicacionInicial);
  
  resultado.pasos.forEach((paso) => {
    const explicacionDesde = paso.desdeEstado.includes(',') 
      ? `conjunto {${paso.desdeEstado}}` 
      : `q${paso.desdeEstado} (${obtenerExplicacionEstado(paso.desdeEstado)})`;
    
    const explicacionHacia = paso.haciaEstado.includes(',') 
      ? `conjunto {${paso.haciaEstado}}` 
      : `q${paso.haciaEstado} (${obtenerExplicacionEstado(paso.haciaEstado)})`;
    
    const explicacion = `Paso ${paso.numeroPaso}: En ${explicacionDesde}, ` +
                       `con símbolo '${paso.simbolo}' (${obtenerDescripcionSimbolo(mapearCaracterASimbolo(paso.simbolo))}) ` +
                       `→ transición a ${explicacionHacia}`;
    explicaciones.push(explicacion);
  });
  
  const explicacionFinal = resultado.estadoFinal.includes(',') 
    ? `Conjunto final de estados {${resultado.estadoFinal}}` 
    : `Estado final q${resultado.estadoFinal} (${obtenerExplicacionEstado(resultado.estadoFinal)})`;
  explicaciones.push(explicacionFinal);
  
  explicaciones.push(`Resultado: ${resultado.esAceptado ? 'EXPRESIÓN VÁLIDA' : 'EXPRESIÓN INVÁLIDA'}`);
  
  if (resultado.pasoError) {
    explicaciones.push(`ERROR: Transición no válida en el paso ${resultado.pasoError}`);
  }
  
  return explicaciones;
}

// Función auxiliar para mapear caracteres
function mapearCaracterASimbolo(caracter: string): string {
  if ('+-'.includes(caracter)) return '[+-]';
  if ('0123456789'.includes(caracter)) return '0-9';
  if ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(caracter)) return 'a-z';
  if ('*/'.includes(caracter)) return '[*/]';
  if ('()^=.'.includes(caracter)) return caracter;
  return 'INVALIDO';
}

// Función para mapear símbolos abstractos a descripciones legibles
export function obtenerDescripcionSimbolo(simbolo: string): string {
  const mapaSimbolos: Record<string, string> = {
    '[+-]': 'Signo + o -',
    '0-9': 'Dígito [0-9]',
    '.': 'Punto decimal',
    '^': 'Símbolo exponente',
    '-': 'Signo negativo',
    'a-z': 'Letra [a-zA-Z]',
    '(': 'Paréntesis izquierdo',
    ')': 'Paréntesis derecho',
    '[*/]': 'Operador * o /',
    '=': 'Signo igual',
    'ε': 'Transición épsilon'
  };
  
  return mapaSimbolos[simbolo] || simbolo;
}

export function obtenerExplicacionEstado(estado: string): string {
  const explicaciones: Record<string, string> = {
    '0': 'Estado inicial - esperando signo o término',
    '1': 'Después de signo inicial - esperando término',
    '2': 'Número completo detectado (estado de aceptación)',
    '3': 'Variable completa detectada (estado de aceptación)',
    '4': 'Paréntesis abierto - procesando contenido interno',
    '5': 'Después de signo en expresión principal',
    '6': 'Esperando dígitos decimales',
    '7': 'Después de símbolo exponente ^',
    '8': 'Después de operador - esperando término',
    '9': 'Después de igual - esperando término derecho',
    '10': 'Transición ε - procesamiento interno',
    '11': 'Paréntesis cerrado correctamente (estado de aceptación)',
    '12': 'Decimal completo (estado de aceptación)',
    '13': 'Después de signo negativo en exponente',
    '14': 'Exponente completo (estado de aceptación)',
    '15': 'Término en lado derecho de ecuación (estado de aceptación)',
    '16': 'Estado de aceptación final por ε-transición',
    '17': 'Estado de aceptación después de igual'
  };
  
  return explicaciones[estado] || `Estado q${estado}`;
}

// ==================== DEMOSTRACIÓN Y EJEMPLOS ====================

export function demostrarPasoAPaso() {
  const expresionesPrueba = [
    "2x+3=7",
    "x^2-5x+6=0",
    "3.14*y=z",
    "2^(x+1)=8",
    "expresion invalida!!"
  ];

  const afdCompleto = construirAFDDesdeTabla();
  const afdSimplificado = construirAFDSimplificado();

  console.log("=== DEMOSTRACIÓN DE RECORRIDO PASO A PASO ===\n");

  expresionesPrueba.forEach(expr => {
    console.log(`\n--- Validando: "${expr}" ---`);
    
    const resultado = simularAFDPasoAPaso(expr, afdCompleto, 'completo');
    const textoPasos = formatearPasosTransicion(resultado);
    console.log(textoPasos);
    
    const explicaciones = obtenerExplicacionPasoAPaso(resultado);
    console.log("\nExplicación detallada:");
    explicaciones.forEach(exp => console.log(`  ${exp}`));
    
    console.log("\n" + "=".repeat(50));
  });
}

// Función de utilidad para validar una expresión y mostrar resultados
export function validarExpresionConPasos(entrada: string, usarSimplificado: boolean = false): ResultadoValidacion {
  const afd = usarSimplificado ? construirAFDSimplificado() : construirAFDDesdeTabla();
  return simularAFDPasoAPaso(entrada, afd, usarSimplificado ? 'simplificado' : 'completo');
}

// Exportar todas las funciones necesarias
export {
  clausuraEpsilon,
  mover,
  conjuntoAString
};