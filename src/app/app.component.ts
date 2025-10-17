import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { tokenizar } from './lexer';
import { construirAFNDesdeSecuencia, reiniciarContadorEstado } from './thompson';
import { construccionSubconjuntos } from './subset';
import { minimizarAFD } from './minimize';
import { ServicioViz } from './viz.service';
import { 
  esExpresionValida, 
  construirAFNDesdeRegexValidacion, 
  construirAFDDesdeTabla, 
  construirAFDSimplificado,
  simularAFDPasoAPaso,
  ResultadoValidacion,
  obtenerExplicacionPasoAPaso,
  obtenerDescripcionSimbolo,
  obtenerExplicacionEstado,
  simularAFNPasoAPaso
} from './expresionRegular';

type NivelRegistro = 'info' | 'exito' | 'error' | 'advertencia' | 'tokens' | 'ruta-afn';
interface ItemRegistro {
  nivel: NivelRegistro;
  texto?: string;
  tokens?: { lexema: string; tipo: string }[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  expresion = '3x^2 + 2x + 1';

  tokens: any[] = [];
  svgAFN: SafeHtml | string = '';
  svgAFD: SafeHtml | string = '';
  svgAFDMin: SafeHtml | string = '';

  registros: ItemRegistro[] = [];
  procesando = false;
  esExpresionValida = false;

  // Propiedades para modales
  mostrarModalAutomataRegex = false;
  mostrarModalDetalleAnalisis = false;
  mostrarModalAFN = false;
  mostrarModalAFD = false;
  mostrarModalAFDMin = false;
  
  // SVG para modales de expresión regular
  svgModalAFN: SafeHtml | string = '';
  svgModalAFD: SafeHtml | string = '';
  svgModalAFDMin: SafeHtml | string = '';
  
  // SVG para modales individuales
  svgAFNIndividual: SafeHtml | string = '';
  svgAFDIndividual: SafeHtml | string = '';
  svgAFDMinIndividual: SafeHtml | string = '';

  // pestanas activas
  pestanaActivaRegex: 'afn' | 'afd' | 'afdMin' = 'afn';

  // Propiedades para el recorrido del AFN
  mostrarRutaAutomata = false;
  resultadoRutaAutomata: ResultadoValidacion | null = null;
  mostrarModalRutaAutomata = false;

  // Propiedades para recorridos
  resultadoRutaAFN: ResultadoValidacion | null = null;

  constructor(
    private servicioViz: ServicioViz,
    private sanitizador: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  // ---------------- Helpers de logging ----------------
  private agregarRegistro(texto: string, nivel: 'info' | 'exito' | 'error' | 'advertencia' | 'ruta-afn' = 'info') {
    this.registros.push({ texto, nivel });
    this.cdr.detectChanges();
  }

  private agregarRegistroTokens(tokens: { lexema: string; tipo: string }[]) {
    this.registros.push({ nivel: 'tokens', tokens });
    this.cdr.detectChanges();
  }

  mostrarTipoToken(t: string): string {
    const mapa: Record<string, string> = {
      'NUMERO': 'Número',
      'VARIABLE': 'Variable',
      'OPERADOR_+': 'Operador +',
      'OPERADOR_-': 'Operador -',
      'OPERADOR_*': 'Operador *',
      'OPERADOR_/': 'Operador /',
      'OPERADOR_=': 'Operador =',
      'EXPONENTE': 'Exponente',
      'PARENTESIS_I': 'Paréntesis Izq',
      'PARENTESIS_D': 'Paréntesis Der',
      'FRAC': 'Fracción',
      'WS': 'Espacio',
      'DESCONOCIDO': 'Desconocido'
    };
    return mapa[t] ?? t;
  }

  obtenerClaseTipoToken(tipoToken: string): string {
    const mapaTipos: Record<string, string> = {
      'NUMERO': 'numero',
      'FRAC': 'frac',
      'VARIABLE': 'variable',
      'OPERADOR_+': 'operador',
      'OPERADOR_-': 'operador',
      'OPERADOR_*': 'operador',
      'OPERADOR_/': 'operador',
      'OPERADOR_=': 'operador',
      'EXPONENTE': 'exponente',
      'PARENTESIS_I': 'parentesis',
      'PARENTESIS_D': 'parentesis',
      'DESCONOCIDO': 'desconocido'
    };
    return mapaTipos[tipoToken] || 'desconocido';
  }

  // Métodos para cálculos en el template
  obtenerCantidadTokensValidos(): number {
    return this.tokens.filter(t => t.tipo !== 'WS' && t.tipo !== 'DESCONOCIDO').length;
  }

  obtenerCantidadTokensDesconocidos(): number {
    return this.tokens.filter(t => t.tipo === 'DESCONOCIDO').length;
  }

  obtenerCantidadTotalTokens(): number {
    return this.tokens.length;
  }

  obtenerCantidadTokensNoEspacio(): number {
    return this.tokens.filter(t => t.tipo !== 'WS').length;
  }

  // ---------------- Analizar la expresión de usuario ----------------
  async analizar() {
    if (this.procesando) return;
    this.procesando = true;

    this.reiniciarEstadoUI();

    try {
      const entrada = (this.expresion ?? '').trim();
      this.agregarRegistro(`Entrada: "${entrada}"`, 'info');

      if (!entrada) {
        this.agregarRegistro('La entrada está vacía. Ingrese una expresión.', 'advertencia');
        return;
      }

      // Validación
      await this.validarExpresion(entrada);
      
      // Tokenización
      this.tokens = tokenizar(entrada);
      const tokensVisibles = this.tokens.filter(t => t.tipo !== 'WS' && t.tipo !== 'DESCONOCIDO');
      
      if (tokensVisibles.length) {
        const listaTokens = tokensVisibles.map(t => ({ 
          lexema: t.lexema, 
          tipo: this.mostrarTipoToken(t.tipo) 
        }));
        this.agregarRegistroTokens(listaTokens);
      } else {
        this.agregarRegistro('No hay tokens visibles para mostrar.', 'info');
      }

      // Verificar tokens desconocidos
      const desconocidos = this.tokens.filter(t => t.tipo === 'DESCONOCIDO');
      if (desconocidos.length) {
        this.agregarRegistro(`Se encontraron ${desconocidos.length} token(s) desconocido(s)`, 'advertencia');
      }

      await this.generarRutasAutomata(entrada);

      // Solo construir autómatas si la expresión es válida
      if (this.esExpresionValida) {
        await this.construirYRenderizarAutomataDesdeExpresion();
      } else {
        this.agregarRegistro('La expresión no es válida. No se generarán autómatas visuales.', 'advertencia');
      }


    } catch (err) {
      console.error('Error en análisis:', err);
      this.agregarRegistro('Error durante el análisis: ' + this.obtenerMensajeError(err), 'error');
    } finally {
      this.procesando = false;
      this.cdr.detectChanges();
    }
  }

  // ------------- Métodos auxiliares refactorizados -------------
  private reiniciarEstadoUI() {
    this.registros = [];
    this.tokens = [];
    this.svgAFN = '';
    this.svgAFD = '';
    this.svgAFDMin = '';
    this.esExpresionValida = false;
    this.mostrarRutaAutomata = false;
    this.resultadoRutaAutomata = null;
    this.resultadoRutaAFN = null;
    this.cdr.detectChanges();
  }

  private async validarExpresion(entrada: string) {
    try {
      const esValida = esExpresionValida(entrada);
      this.esExpresionValida = esValida;
      this.agregarRegistro(
        esValida ? '✓ Expresión válida' : '✗ Expresión inválida', 
        esValida ? 'exito' : 'error'
      );
    } catch (err) {
      console.error('Error en validación:', err);
      this.agregarRegistro('Advertencia: fallo en validación. Continuando con análisis...', 'advertencia');
    }
  }

  // Construir autómatas desde la expresión ingresada
  private async construirYRenderizarAutomataDesdeExpresion() {
    const secuencia = this.tokens
      .filter(t => t.tipo !== 'WS' && t.tipo !== 'DESCONOCIDO')
      .map(t => t.lexema);
    
    if (secuencia.length === 0) {
      this.agregarRegistro('No hay tokens válidos para construir autómatas', 'advertencia');
      return;
    }

    try {
      reiniciarContadorEstado();
    } catch (err) {
      console.warn('reiniciarContadorEstado no disponible:', err);
    }

    const afn = construirAFNDesdeSecuencia(secuencia);

    // Render AFN para paneles
    await this.renderizarSeguro(
      () => this.renderizarAFN(afn),
      'Error al renderizar AFN'
    );

    // AFD y Minimizado SOLO para visualización
    try {
      const afd = construccionSubconjuntos(afn);
      await this.renderizarSeguro(
        () => this.renderizarAFD(afd),
        'Error al renderizar AFD'
      );
      await this.renderizarSeguro(
        () => this.renderizarAFDMinimizado(afd),
        'Error al minimizar AFD'
      );
    } catch (err) {
      console.error('Error en construcción AFD:', err);
      this.agregarRegistro('Error al construir AFD para visualización: ' + this.obtenerMensajeError(err), 'error');
    }
  }

  private async renderizarAFN(afn: any): Promise<void> {
    const dotN = this.servicioViz.afnADot(afn);
    const svgN = await this.servicioViz.renderizarDot(dotN);
    this.svgAFN = this.sanitizador.bypassSecurityTrustHtml(svgN);
  }

  private async renderizarAFD(afd: any): Promise<void> {
    const dotD = this.servicioViz.afdADot(afd);
    const svgD = await this.servicioViz.renderizarDot(dotD);
    this.svgAFD = this.sanitizador.bypassSecurityTrustHtml(svgD);
  }

  private async renderizarAFDMinimizado(afd: any): Promise<void> {
    const min = minimizarAFD(afd);
    const dotM = this.servicioViz.afdADot(min);
    const svgM = await this.servicioViz.renderizarDot(dotM);
    this.svgAFDMin = this.sanitizador.bypassSecurityTrustHtml(svgM);
  }

  private async renderizarSeguro(funcionRender: () => Promise<void>, mensajeError: string): Promise<void> {
    try {
      await funcionRender();
    } catch (err) {
      console.error(mensajeError, err);
      this.agregarRegistro(`${mensajeError}: ${this.obtenerMensajeError(err)}`, 'error');
      throw err;
    }
  }

  private obtenerMensajeError(err: any): string {
    return (err as any)?.message || String(err);
  }

  // ------------- Generar autómatas de expresión regular -------------
  async dibujarAutomataEnModal() {
    if (this.procesando) return;
    this.procesando = true;

    this.reiniciarEstadoModal();

    try {
      // Renderizar todos los autómatas para visualización
      await this.renderizarAFNRegex();
      await this.renderizarAFDRegex();
      await this.renderizarAFDMinimizadoRegex();

      // Abrir el modal automáticamente
      this.abrirModalAutomataRegex();

    } catch (err) {
      console.error('Error generando autómatas:', err);
    } finally {
      this.procesando = false;
      this.cdr.detectChanges();
    }
  }

  private async renderizarAFNRegex() {
    const afn = construirAFNDesdeRegexValidacion();
    const dotN = this.servicioViz.afnADot(afn);
    const svgN = await this.servicioViz.renderizarDot(dotN);
    this.svgModalAFN = this.sanitizador.bypassSecurityTrustHtml(svgN);
  }

  private async renderizarAFDRegex() {
    const afd = construirAFDDesdeTabla();
    const dotD = this.servicioViz.afdADot(afd);
    const svgD = await this.servicioViz.renderizarDot(dotD);
    this.svgModalAFD = this.sanitizador.bypassSecurityTrustHtml(svgD);
  }

  private async renderizarAFDMinimizadoRegex() {
    const afdSimplificado = construirAFDSimplificado();
    const dotM = this.servicioViz.afdADot(afdSimplificado);
    const svgM = await this.servicioViz.renderizarDot(dotM);
    this.svgModalAFDMin = this.sanitizador.bypassSecurityTrustHtml(svgM);
  }

  private reiniciarEstadoModal() {
    this.svgModalAFN = '';
    this.svgModalAFD = '';
    this.svgModalAFDMin = '';
  }

  // ------------- Métodos para modales individuales de autómatas -------------
  async abrirModalAFN() {
    if (!this.svgAFN) return;
    
    this.mostrarModalAFN = true;
    this.svgAFNIndividual = this.svgAFN;
  }

  async abrirModalAFD() {
    if (!this.svgAFD) return;
    
    this.mostrarModalAFD = true;
    this.svgAFDIndividual = this.svgAFD;
  }

  async abrirModalAFDMin() {
    if (!this.svgAFDMin) return;
    
    this.mostrarModalAFDMin = true;
    this.svgAFDMinIndividual = this.svgAFDMin;
  }

  cerrarModalAFN() {
    this.mostrarModalAFN = false;
  }

  cerrarModalAFD() {
    this.mostrarModalAFD = false;
  }

  cerrarModalAFDMin() {
    this.mostrarModalAFDMin = false;
  }

  // ------------- Métodos para modales de análisis -------------
  abrirModalDetalleAnalisis() {
    this.mostrarModalDetalleAnalisis = true;
  }

  cerrarModalDetalleAnalisis() {
    this.mostrarModalDetalleAnalisis = false;
  }

  // ------------- Métodos para abrir modales -------------
  abrirModalAutomataRegex() {
    this.mostrarModalAutomataRegex = true;
    this.pestanaActivaRegex = 'afn';
  }

  // ------------- Métodos para cerrar modales -------------
  cerrarModalAutomataRegex() {
    this.mostrarModalAutomataRegex = false;
  }

  // ------------- Cambiar pestanas -------------
  establecerpestanaActivaRegex(pestana: 'afn' | 'afd' | 'afdMin') {
    this.pestanaActivaRegex = pestana;
  }

  // ==================== MÉTODOS MEJORADOS PARA RECORRIDOS (SOLO AFN) ====================

  // Generar recorrido del AFN de validación
  private async generarRutasAutomata(entrada: string) {
    try {
      this.mostrarRutaAutomata = true;
      
      // Usar el AFN de validación para el recorrido
      const afn = construirAFNDesdeRegexValidacion();
      this.resultadoRutaAFN = simularAFNPasoAPaso(entrada, afn);
      
      // Mostrar recorrido AFN en una línea en el detalle
      const lineaRutaAFN = this.formatearRutaEnUnaLinea(this.resultadoRutaAFN);


      // 🎯 CAMBIO: Mostrar mensaje según si es válido o no
      if (this.resultadoRutaAFN.esAceptado) {
        this.agregarRegistro(lineaRutaAFN, 'ruta-afn');
        this.agregarRegistro('✓ El AFN acepta la expresión', 'exito');
      } else {
        this.agregarRegistro(lineaRutaAFN, 'ruta-afn');
        this.agregarRegistro('✗ El AFN NO acepta la expresión', 'error');
        
        // 🎯 Información adicional sobre por qué falló
        if (this.resultadoRutaAFN.pasos.length > 0) {
          const ultimoPaso = this.resultadoRutaAFN.pasos[this.resultadoRutaAFN.pasos.length - 1];
          if (!ultimoPaso.esValido) {
            this.agregarRegistro(`Error en el paso ${ultimoPaso.numeroPaso}: transición no válida desde '${ultimoPaso.desdeEstado}' con símbolo '${ultimoPaso.simbolo}'`, 'error');
          }
        }
      }
      
      // Usar el resultado AFN para el panel de recorrido
      this.resultadoRutaAutomata = this.resultadoRutaAFN;
      
      
    } catch (err) {
      console.error('Error generando recorrido:', err);
      this.agregarRegistro('Error al generar recorrido: ' + this.obtenerMensajeError(err), 'error');
      this.mostrarRutaAutomata = false;
    }
  }

  // Formatear recorrido en una sola línea (para uso en template)
  formatearRutaEnUnaLinea(resultado: ResultadoValidacion | null): string {
    if (!resultado) return '';
    
    const partesRuta: string[] = [];
    
    for (const paso of resultado.pasos) {
      // 🎯 CAMBIO: Usar paso.desdeEstado y paso.haciaEstado directamente
      const desdeEstado = paso.desdeEstado;
      const haciaEstado = paso.haciaEstado;
      
      if (paso.esValido) {
        partesRuta.push(`${desdeEstado}→(${paso.simbolo})→${haciaEstado}`);
      } else {
        partesRuta.push(`${desdeEstado}→(${paso.simbolo})→ERROR`);
      }
    }
    
    // Agregar estado final si es diferente del último paso
    if (resultado.pasos.length > 0) {
      const ultimoPaso = resultado.pasos[resultado.pasos.length - 1];
      if (ultimoPaso.esValido && ultimoPaso.haciaEstado !== resultado.estadoFinal) {
        partesRuta.push(`→${resultado.estadoFinal}`);
      }
    }
    
    return partesRuta.join(' ');
  }

  // Métodos para el modal del recorrido
  abrirModalRutaAutomata() {
    this.mostrarModalRutaAutomata = true;
  }

  cerrarModalRutaAutomata() {
    this.mostrarModalRutaAutomata = false;
  }

  // Método para obtener explicaciones detalladas
  obtenerExplicacionesPasos(): string[] {
    if (!this.resultadoRutaAutomata) return [];
    return obtenerExplicacionPasoAPaso(this.resultadoRutaAutomata);
  }

  // Función auxiliar para mapear caracteres a símbolos del AFN
  mapearCaracterASimbolo(caracter: string): string {
    if ('+-'.includes(caracter)) return '[+-]';
    if ('0123456789'.includes(caracter)) return '0-9';
    if ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(caracter)) return 'a-z';
    if ('*/'.includes(caracter)) return '[*/]';
    if ('()^=.'.includes(caracter)) return caracter;
    return 'INVALIDO';
  }

  // Métodos auxiliares para usar las funciones del módulo de expresión regular
  obtenerDescripcionSimbolo(simbolo: string): string {
    return obtenerDescripcionSimbolo(simbolo);
  }

  obtenerExplicacionEstado(estado: string): string {
    return obtenerExplicacionEstado(estado);
  }

  // Función auxiliar para normalizar input
  private normalizarEntrada(s: string): string {
    if (typeof s !== 'string') s = String(s ?? '');
    const limpiado = s.replace(/[\u00A0\u2007\u202F]/g, ' ');
    return limpiado.replace(/\s+/g, '').trim();
  }
}