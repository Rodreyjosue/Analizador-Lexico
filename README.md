# 🔬 Analizador Léxico y Visualizador de Autómatas

Una aplicación web moderna desarrollada en Angular para el análisis léxico de expresiones algebraicas y visualización interactiva de autómatas finitos.

![Angular](https://img.shields.io/badge/Angular-17-DD0031?style=for-the-badge&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=for-the-badge&logo=bootstrap)

## ✨ Características Principales

### 🎯 Análisis Léxico Avanzado
- **Tokenización** de expresiones algebraicas complejas
- **Validación sintáctica** con expresiones regulares
- **Identificación** de números, variables, operadores, paréntesis, exponentes
- **Detección de errores** con posiciones específicas

### 🤖 Generación de Autómatas
- **AFN (Autómata Finito No Determinista)** - Construcción por Thompson
- **AFD (Autómata Finito Determinista)** - Conversión por subconjuntos
- **AFD Minimizado** - Optimización por partición de estados
- **Visualización interactiva** con Graphviz

### 🎨 Interfaz Moderna
- **Diseño responsive** para desktop, tablet y móvil
- **Modales interactivos** para visualización detallada
- **Animaciones suaves** y feedback visual
- **Tema oscuro/claro** compatible

### 🔍 Simulación Paso a Paso
- **Recorrido detallado** por los autómatas
- **Explicaciones en lenguaje natural** de cada transición
- **Validación en tiempo real** de expresiones
- **Métricas y estadísticas** del análisis

## 🚀 Instalación y Uso

### Prerrequisitos
- Node.js 18+ 
- npm 9+

### Instalación
```
# Clonar el repositorio
git clone https://github.com/tu-usuario/analizador-lexico-automatas.git

# Entrar al directorio
cd analizador-lexico-automatas

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
ng serve

# Abrir en el navegador
# http://localhost:4200
```

###📖 Guía Rápida de Uso
1. 🎯 Análisis de Expresiones
Ingresa una expresión algebraica en el campo de texto

Haz clic en "Analizar Expresión"

Explora los resultados en los paneles

Ejemplos válidos:

```bash
3x^2 + 2x + 1
2*(x+3) = 7
(a+b)^2
3.14 * r^2
y = mx + b
```

2. 🔍 Panel de Detalles
Tokens identificados: Lista con tipo y valor

Validación: Estado de la expresión (válida/inválida)

Recorrido AFN: Secuencia de estados visitados

Métricas: Estadísticas del procesamiento

3. 🤖 Visualización de Autómatas
AFN: Autómata original con transiciones ε

AFD: Conversión determinista por subconjuntos

AFD Minimizado: Versión optimizada

Interacción:

✅ Clic en títulos: Abre modal con vista ampliada

✅ Hover: Información adicional sobre estados

✅ Zoom: Navegación en modales grandes

4. 🛠️ Autómatas Predefinidos
Botón "Generar Autómata Regex"

AFN de 18 estados para validación general

AFD de 16 estados por construcción de subconjuntos

AFD Minimizado de 12 estados optimizado

5. 🔬 Recorrido Paso a Paso
Analiza una expresión válida

Haz clic en la línea de recorrido AFN en el detalle

Explora cada transición con explicaciones detalladas

🏗️ Arquitectura del Proyecto
text
src/app/
├── app.component.ts          # Componente principal y lógica de UI
├── app.component.html        # Template de la interfaz
├── app.component.scss        # Estilos modernos y responsivos
├── lexer.ts                 # Analizador léxico y tokenización
├── thompson.ts              # Construcción de AFN (Thompson)
├── subset.ts                # Conversión AFN a AFD (Subconjuntos)
├── minimize.ts              # Minimización de AFD
├── expresionRegular.ts      # Validación y autómatas predefinidos
├── parser.ts                # Parser para notación postfija
└── viz.service.ts           # Servicio de visualización Graphviz
🔧 Tecnologías Utilizadas
Frontend: Angular 17, TypeScript, Bootstrap 5

Visualización: Graphviz, Viz.js

Estilos: SCSS, CSS Grid, Flexbox

Iconos: Font Awesome 6

Build Tools: Angular CLI

📚 Ejemplos de Expresiones
✅ Expresiones Válidas

```bash
// Operaciones básicas
2 + 3
x - 5
3 * y
a / b


// Expresiones con variables
2x + 3y
a^2 + b^2
3.14 * r^2

// Ecuaciones
2x + 3 = 7
y = mx + b
(a+b)^2 = a^2 + 2ab + b^2

// Expresiones complejas
2*(x+3) - 4/(y-1)
3x^2 - 2x + 5 = 0
```

❌ Expresiones No Válidas
```bash
2x + + 3          // Operador duplicado
3 * * x           // Operador duplicado
x y               // Variables consecutivas sin operador
2(3+4)            // Número seguido de paréntesis sin operador
```
🎨 Personalización

👨‍💻 Autor
Tu Byron Josue Rodriguez Reyes

GitHub: @ByronRodrigeuz


