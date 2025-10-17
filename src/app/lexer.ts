export type TipoToken =
  | 'NUMERO'
  | 'VARIABLE'
  | 'OPERADOR_+'
  | 'OPERADOR_-'
  | 'OPERADOR_*'
  | 'OPERADOR_/'
  | 'OPERADOR_=' 
  | 'EXPONENTE'
  | 'PARENTESIS_I'
  | 'PARENTESIS_D'
  | 'FRAC'
  | 'DESCONOCIDO'
  | 'WS';

export interface Token {
  tipo: TipoToken;
  lexema: string;
  pos: number; 
}

// ORDEN CRÍTICO: de más específico a más general
const ExpresionesRegulares: { tipo: TipoToken; re: RegExp }[] = [
  // Espacios primero (para ignorar rápido)
  { tipo: 'WS', re: /^\s+/ },
  
  // Fracciones antes que números simples
  { tipo: 'FRAC', re: /^\d+\/\d+/ },
  
  // Números (enteros y decimales)
  { tipo: 'NUMERO', re: /^\d+(?:\.\d+)?/ },
  
  // Variables
  { tipo: 'VARIABLE', re: /^[a-zA-Z_]\w*/ },
  
  // Operadores y símbolos (caracteres individuales)
  { tipo: 'EXPONENTE', re: /^\^/ },
  { tipo: 'OPERADOR_*', re: /^\*/ },
  { tipo: 'OPERADOR_/', re: /^\// },
  { tipo: 'OPERADOR_+', re: /^\+/ },
  { tipo: 'OPERADOR_=', re: /^=/ },
  { tipo: 'PARENTESIS_I', re: /^\(/ },
  { tipo: 'PARENTESIS_D', re: /^\)/ },
  
  // RESTA debe ir ÚLTIMO para evitar conflicto con números negativos
  { tipo: 'OPERADOR_-', re: /^-/ },
];

export function tokenizar(entrada: string): Token[] {
  const tokens: Token[] = [];
  let posicion = 0;
  
  while (posicion < entrada.length) {
    const subcadena = entrada.slice(posicion);
    let coincidenciaEncontrada = false;
    
    for (const { tipo, re } of ExpresionesRegulares) {
      const resultado = re.exec(subcadena);
      
      if (resultado) {
        coincidenciaEncontrada = true;
        const lexema = resultado[0];
        
        // Ignorar espacios en blanco pero avanzar posición
        if (tipo !== 'WS') {
          tokens.push({ 
            tipo, 
            lexema: lexema, 
            pos: posicion 
          });
        }
        
        posicion += lexema.length;
        break;
      }
    }
    
    if (!coincidenciaEncontrada) {
      // Caracter desconocido - avanzar solo 1 posición
      tokens.push({ 
        tipo: 'DESCONOCIDO', 
        lexema: entrada[posicion], 
        pos: posicion 
      });
      posicion++;
    }
  }
  
  return tokens;
}