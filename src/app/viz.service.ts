import { Injectable } from '@angular/core';
import { AFN } from './thompson';
import { AFD } from './subset';

@Injectable({ providedIn: 'root' })
export class ServicioViz {
  constructor() {}

  private escaparEtiqueta(s: string): string {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  afnADot(afn: AFN): string {
    const partes: string[] = [];
    partes.push('digraph AFN {');
    partes.push('  rankdir=LR;');
    partes.push('  concentrate=true;');
    partes.push('  node [shape=circle, style="filled", fillcolor="#f8fafc", fontname="Segoe UI", fontsize=11, penwidth=1.5];');
    partes.push('  edge [fontname="Segoe UI", fontsize=10, penwidth=1.2];');
    partes.push('  graph [bgcolor="transparent"];');

    // Estados de aceptación con estilo moderno
    const finales = Array.from(afn.acepta).map(s => `"n${s}"`).join(' ');
    if (finales) {
      partes.push(`  node [shape=doublecircle, style="filled", fillcolor="#dcfce7", color="#16a34a"]; ${finales};`);
    }
    
    // Resetear estilo para otros nodos
    partes.push('  node [shape=circle, style="filled", fillcolor="#f8fafc", color="#3b82f6"];');

    // Nodos con labels mejorados
    for (const s of afn.estados) {
      const etiqueta = this.obtenerEtiquetaEstado(s);
      partes.push(`  "n${s}" [label="${etiqueta}", tooltip="Estado ${s}"];`);
    }

    // Transiciones con colores modernos
    for (const t of afn.trans) {
      const lab = t.simbolo === 'ε' ? 'ε' : this.escaparEtiqueta(String(t.simbolo));
      const color = this.obtenerColorTransicion(t.simbolo);
      const estilo = t.simbolo === 'ε' ? 'dashed' : 'solid';
      partes.push(`  "n${t.desde}" -> "n${t.hacia}" [label="${lab}", color="${color}", style="${estilo}", fontcolor="${color}"];`);
    }

    // Estado inicial con estilo moderno
    partes.push(`  inicio [shape=point, width=0.1, color="#3b82f6"];`);
    partes.push(`  inicio -> "n${afn.inicio}" [color="#3b82f6", penwidth=2, arrowsize=0.8];`);
    partes.push('}');
    return partes.join('\n');
  }

  afdADot(afd: AFD): string {
    const partes: string[] = [];
    partes.push('digraph AFD {');
    partes.push('  rankdir=LR;');
    partes.push('  node [shape=circle, style="filled", fillcolor="#f8fafc", fontname="Segoe UI", fontsize=11, penwidth=1.5, color="#3b82f6"];');
    partes.push('  edge [fontname="Segoe UI", fontsize=10, penwidth=1.2];');
    partes.push('  graph [bgcolor="transparent"];');

    // Estados de aceptación
    const finales = Array.from(afd.acepta).map(s => `"${s}"`).join(' ');
    if (finales) {
      partes.push(`  node [shape=doublecircle, style="filled", fillcolor="#dcfce7", color="#16a34a"]; ${finales};`);
    }
    
    // Resetear estilo para otros nodos
    partes.push('  node [shape=circle, style="filled", fillcolor="#f8fafc", color="#3b82f6"];');

    // Transiciones con colores modernos
    for (const s of afd.estados) {
      const m = afd.trans.get(s);
      if (!m) continue;
      
      for (const [a, t] of m) {
        const etiqueta = this.escaparEtiqueta(String(a));
        const color = this.obtenerColorTransicion(a);
        partes.push(`  "${s}" -> "${t}" [label="${etiqueta}", color="${color}", fontcolor="${color}"];`);
      }
    }

    // Estado inicial
    partes.push(`  inicio [shape=point, width=0.1, color="#3b82f6"];`);
    partes.push(`  inicio -> "${afd.inicio}" [color="#3b82f6", penwidth=2, arrowsize=0.8];`);
    partes.push('}');
    return partes.join('\n');
  }

  private obtenerEtiquetaEstado(estado: number): string {
    // Labels más descriptivos para estados
    return `${estado}`;
  }

  private obtenerColorTransicion(simbolo: string): string {
    const mapaColores: Record<string, string> = {
      'ε': '#6b7280',
      'NUMERO': '#ef4444',
      'VARIABLE': '#3b82f6', 
      'OPERADOR_+': '#10b981',
      'OPERADOR_-': '#10b981',
      'OPERADOR_*': '#f59e0b',
      'OPERADOR_/': '#f59e0b',
      'OPERADOR_=': '#8b5cf6',
      'EXPONENTE': '#ec4899',
      'PARENTESIS_I': '#6366f1',
      'PARENTESIS_D': '#6366f1',
      'FRAC': '#84cc16',
      'TERM': '#06b6d4',
      'OP': '#f97316',
      '[+-]': '#14b8a6',
      '=': '#8b5cf6'
    };
    
    return mapaColores[simbolo] || '#6b7280';
  }

  // import dinámico y nueva instancia por render
  async renderizarDot(dot: string): Promise<string> {
    try {
      const VizModule = await import('viz.js');
      const { Module, render } = await import('viz.js/full.render.js');
      const Viz = (VizModule as any).default || VizModule;
      const viz = new Viz({ Module, render });
      const svg = await viz.renderString(dot);
      return this.modernizarEstilosSvg(svg as string);
    } catch (err) {
      console.error('Error renderizado Viz:', err);
      throw err;
    }
  }

  private modernizarEstilosSvg(svg: string): string {
    // Aplicar estilos modernos al SVG generado
    return svg
      .replace(/font-family="[^"]*"/g, 'font-family="Segoe UI, system-ui, sans-serif"')
      .replace(/font-size="14pt"/g, 'font-size="11px"')
      .replace(/fill="white"/g, 'fill="#f8fafc"')
      .replace(/stroke="black"/g, 'stroke="#1f2937"')
      .replace(/<svg /, '<svg style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 12px;" ');
  }
}