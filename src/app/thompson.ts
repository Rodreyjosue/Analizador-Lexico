export interface Transicion {
  desde: number;
  hacia: number;
  simbolo: string;
}

export interface AFN {
  inicio: number;
  acepta: Set<number>;
  estados: Set<number>;
  trans: Transicion[];
}

// Mapa para llevar registro de los símbolos asociados a estados (útil para visualización)
export const mapaSimbolosEstado = new Map<number, string>();

// Contador global de estados
let contadorEstado = 0;

export function reiniciarContadorEstado(): void {
  contadorEstado = 0;
  mapaSimbolosEstado.clear();
}

function nuevoEstado(simbolo?: string): number {
  const estado = contadorEstado++;
  if (simbolo) {
    mapaSimbolosEstado.set(estado, simbolo);
  }
  return estado;
}

// Construcción básica de Thompson

export function construirAFNSimbolo(simbolo: string): AFN {
  const inicio = nuevoEstado();
  const acepta = nuevoEstado(simbolo);
  
  const trans: Transicion[] = [
    { desde: inicio, hacia: acepta, simbolo }
  ];
  
  return {
    inicio,
    acepta: new Set([acepta]),
    estados: new Set([inicio, acepta]),
    trans
  };
}

export function construirAFNEpsilon(): AFN {
  const inicio = nuevoEstado();
  const acepta = nuevoEstado();
  
  const trans: Transicion[] = [
    { desde: inicio, hacia: acepta, simbolo: 'ε' }
  ];
  
  return {
    inicio,
    acepta: new Set([acepta]),
    estados: new Set([inicio, acepta]),
    trans
  };
}

export function construirAFNConcatenacion(primero: AFN, segundo: AFN): AFN {
  // Conectar los estados de aceptación del primero con el inicio del segundo mediante épsilon
  const transiciones: Transicion[] = [
    ...primero.trans,
    ...segundo.trans
  ];
  
  // Conectar cada estado de aceptación del primer AFN al inicio del segundo
  for (const estadoAcepta of primero.acepta) {
    transiciones.push({ desde: estadoAcepta, hacia: segundo.inicio, simbolo: 'ε' });
  }
  
  const estados = new Set<number>([...primero.estados, ...segundo.estados]);
  
  return {
    inicio: primero.inicio,
    acepta: new Set(segundo.acepta),
    estados,
    trans: transiciones
  };
}

export function construirAFNAlternacion(primero: AFN, segundo: AFN): AFN {
  const inicio = nuevoEstado();
  const acepta = nuevoEstado();
  
  const transiciones: Transicion[] = [
    ...primero.trans,
    ...segundo.trans,
    { desde: inicio, hacia: primero.inicio, simbolo: 'ε' },
    { desde: inicio, hacia: segundo.inicio, simbolo: 'ε' }
  ];
  
  // Conectar estados de aceptación de ambos AFNs al nuevo estado de aceptación
  for (const estadoAcepta of primero.acepta) {
    transiciones.push({ desde: estadoAcepta, hacia: acepta, simbolo: 'ε' });
  }
  for (const estadoAcepta of segundo.acepta) {
    transiciones.push({ desde: estadoAcepta, hacia: acepta, simbolo: 'ε' });
  }
  
  const estados = new Set<number>([inicio, acepta, ...primero.estados, ...segundo.estados]);
  
  return {
    inicio,
    acepta: new Set([acepta]),
    estados,
    trans: transiciones
  };
}

export function construirAFNCeroOMas(afn: AFN): AFN {
  const inicio = nuevoEstado();
  const acepta = nuevoEstado();
  
  const transiciones: Transicion[] = [...afn.trans];
  
  // ε-transiciones para la repetición
  transiciones.push(
    { desde: inicio, hacia: afn.inicio, simbolo: 'ε' },
    { desde: inicio, hacia: acepta, simbolo: 'ε' }
  );
  
  // Conectar estados de aceptación al inicio (para repetición) y al nuevo aceptar
  for (const estadoAcepta of afn.acepta) {
    transiciones.push(
      { desde: estadoAcepta, hacia: afn.inicio, simbolo: 'ε' },
      { desde: estadoAcepta, hacia: acepta, simbolo: 'ε' }
    );
  }
  
  const estados = new Set<number>([inicio, acepta, ...afn.estados]);
  
  return {
    inicio,
    acepta: new Set([acepta]),
    estados,
    trans: transiciones
  };
}

export function construirAFNUnoOMas(afn: AFN): AFN {
  // a+ es equivalente a a·a*
  const parteAsterisco = construirAFNCeroOMas(afn);
  return construirAFNConcatenacion(afn, parteAsterisco);
}

export function construirAFNCeroOUno(afn: AFN): AFN {
  // a? es equivalente a (a|ε)
  const afnEpsilon = construirAFNEpsilon();
  return construirAFNAlternacion(afn, afnEpsilon);
}

// Función principal para construir AFN desde una secuencia de tokens
export function construirAFNDesdeSecuencia(tokens: string[]): AFN {
  if (tokens.length === 0) {
    return construirAFNEpsilon();
  }
  
  reiniciarContadorEstado();
  
  // Construir AFNs individuales para cada token
  const afnsSimbolo = tokens.map(token => construirAFNSimbolo(token));
  
  // Concatenar todos los AFNs
  let resultadoAFN = afnsSimbolo[0];
  for (let i = 1; i < afnsSimbolo.length; i++) {
    resultadoAFN = construirAFNConcatenacion(resultadoAFN, afnsSimbolo[i]);
  }
  
  return resultadoAFN;
}

// Función para construir AFN desde una expresión regular (implementación básica)
export function construirAFNDesdeRegex(regex: string): AFN {
  reiniciarContadorEstado();
  
  // Esta es una implementación simplificada - en producción usarías un parser proper
  const tokens: string[] = [];
  let i = 0;
  
  while (i < regex.length) {
    const caracter = regex[i];
    
    if (caracter === '\\') {
      // Carácter escapado
      if (i + 1 < regex.length) {
        tokens.push(regex[i + 1]);
        i += 2;
      } else {
        tokens.push(caracter);
        i++;
      }
    } else if ('*+?|()'.includes(caracter)) {
      // Operadores de regex - manejo básico
      tokens.push(caracter);
      i++;
    } else {
      tokens.push(caracter);
      i++;
    }
  }
  
  // Para esta implementación simplificada, tratamos cada carácter como un símbolo concatenado
  const afnsSimbolo = tokens.map(token => construirAFNSimbolo(token));
  
  if (afnsSimbolo.length === 0) {
    return construirAFNEpsilon();
  }
  
  let resultadoAFN = afnsSimbolo[0];
  for (let i = 1; i < afnsSimbolo.length; i++) {
    resultadoAFN = construirAFNConcatenacion(resultadoAFN, afnsSimbolo[i]);
  }
  
  return resultadoAFN;
}

// Función auxiliar para debugging
export function imprimirAFN(afn: AFN): void {
  console.log('AFN:');
  console.log(`Inicio: ${afn.inicio}`);
  console.log(`Estados de Aceptación: ${Array.from(afn.acepta).join(', ')}`);
  console.log('Transiciones:');
  afn.trans.forEach(t => {
    console.log(`  ${t.desde} --${t.simbolo}--> ${t.hacia}`);
  });
}