# 🏒 Simulador de Torneo Air Hockey

Simulador web para torneos de la RESISTENCIA (amigos de x_chama_x) de Air Hockey (Tejo) que permite simular competencias entre jugadores con diferentes formatos de torneo y análisis estadístico mediante simulaciones Monte Carlo.
Link: https://x-chama-x.github.io/simuladorTorneoTejo/index.html

## 🎮 Características

### Simulador de Torneo Individual
- Simula un torneo completo con resultados partido a partido
- Muestra fase de grupos, playoffs, semifinales, tercer puesto y final
- Visualización detallada de cada partido con marcadores
- **Armado manual de grupos**: Permite elegir qué jugadores van a cada grupo

### Simulador Monte Carlo
- Ejecuta entre 1,000 y 10,000 simulaciones de torneos
- Calcula probabilidades de cada jugador de:
  - 🏆 Ser campeón
  - 🥈 Ser subcampeón
  - 🥉 Quedar tercero
  - 4️⃣ Quedar cuarto
  - ✅ Clasificar a playoffs
  - ❌ No clasificar a playoffs
- Muestra estadísticas agregadas y porcentajes
- **Análisis por grupo**: Permite simular con grupos configurados manualmente para ver cómo afecta un "grupo de la muerte" a las probabilidades

## 📊 Formatos de Torneo Soportados

| Jugadores | Formato | Partidos Total | Clasifican |
|-----------|---------|----------------|------------|
| 7 | Liga (Round Robin) | 25 | Top 4 |
| 8 | 2 grupos de 4 | 16 | 2 por grupo |
| 9 | 3 grupos de 3 + Repechajes | 20 | 1° de grupos + ganador eliminatorio |
| 10 | 2 grupos de 5 | 24 | 2 por grupo |

### Formato especial de 9 jugadores:
1. **Fase de grupos**: 3 grupos de 3 (9 partidos)
2. **Repechaje 2° puestos**: Mini-liga entre los 3 segundos (3 partidos) → Solo el 1° avanza
3. **Repechaje 3° puestos**: Mini-liga entre los 3 terceros (3 partidos) → Solo el 1° avanza
4. **Partido eliminatorio**: 1° rep. segundos vs 1° rep. terceros (1 partido) → Ganador clasifica
5. **Playoffs**: Semifinales + 3er puesto + Final (4 partidos)

## ✋ Armado Manual de Grupos

En los formatos de 8, 9 y 10 jugadores, se puede elegir entre:

- **🎲 Sorteo Aleatorio**: Los grupos se arman de forma random (comportamiento clásico)
- **✋ Armado Manual**: El usuario elige qué jugadores van a cada grupo

### Uso:
1. Seleccionar los jugadores participantes
2. Cambiar el selector "Armado" a "✋ Armado Manual"
3. Asignar cada jugador a un grupo usando los selectores
4. Hacer clic en "✅ Confirmar Grupos"
5. Simular el torneo

### En Monte Carlo:
Cuando se usa armado manual en Monte Carlo, los grupos se mantienen **fijos** durante todas las simulaciones. Esto permite analizar escenarios como:
- ¿Qué probabilidad tiene un jugador si le toca un "grupo de la muerte"?
- ¿Cómo cambian las probabilidades en un grupo fácil vs uno difícil?

## 🎯 Sistema de Simulación

La simulación de partidos tiene en cuenta:

1. **Ranking FIFA**: Puntos acumulados de cada jugador
2. **Win Rate**: Porcentaje histórico de victorias
3. **Promedio de Goles**: Influye en la diferencia de goles de cada partido

### Fórmula de Probabilidad

```
probBase = 0.5 + (diferenciaRanking / 150)
ajusteWinRate = (winRate1 - winRate2) * 0.4
probabilidadFinal = probBase + ajusteWinRate
```

**Límites:** 10% - 90%

#### Ejemplo de cálculo:
**Chama (198 pts, 73.68% WR) vs Kovic (5 pts, 0% WR):**
```
probBase = 0.5 + (198-5)/150 = 0.5 + 1.29 = 1.79
ajusteWinRate = (0.7368 - 0.00) * 0.4 = 0.29
probabilidadFinal = 1.79 + 0.29 = 2.08 → limitado a 90%
```
Chama tiene **90%** de probabilidad de ganar.

**Tomy (118 pts, 69.23% WR) vs Facu (126 pts, 61.54% WR):**
```
probBase = 0.5 + (118-126)/150 = 0.5 - 0.053 = 0.447
ajusteWinRate = (0.6923 - 0.6154) * 0.4 = 0.031
probabilidadFinal = 0.447 + 0.031 = 0.478 → 47.8%
```
Tomy tiene **47.8%** de probabilidad de ganar (partido muy parejo).

#### ¿Por qué los límites de 10%-90%?
- Mantiene algo de **variabilidad** (los upsets son posibles)
- Pero **castiga mucho** estar en un grupo difícil
- Un jugador débil vs uno top tiene solo 10% de ganar
- Esto hace que el "grupo de la muerte" tenga un impacto real en las probabilidades de clasificar

## 🏆 Ranking FIFA Actual

| Pos | Jugador | Puntos |
|-----|---------|--------|
| 1° 🥇 | Chama | 198 |
| 2° 🥈 | Facu | 126 |
| 3° 🥉 | Tomy | 118 |
| 4° | Marco | 76 |
| 5° | Lucas | 50 |
| 6° | Rafa | 35 |
| 7° | Pedro | 21 |
| 8° | Hector | 20 |
| 9° | Mateo | 17 |
| 10° | Santi | 5 |
| 11° | Kovic | 5 |

## 📁 Estructura del Proyecto

```
simuladorTorneoTejo/
├── index.html          # Simulador de torneo individual
├── montecarlo.html     # Simulador Monte Carlo
├── ranking.txt         # Archivo con el ranking FIFA (editable)
├── formatos.md         # Documentación de formatos
├── README.md           # Este archivo
├── css/
│   ├── styles.css      # Estilos principales
│   └── montecarlo.css  # Estilos específicos Monte Carlo
└── js/
    ├── simulador.js    # Lógica principal de simulación
    └── montecarlo.js   # Lógica de simulaciones múltiples
```

## 📝 Configuración de Jugadores (ranking.txt)

El ranking de jugadores se carga desde el archivo `ranking.txt` ubicado en la raíz del proyecto. Este archivo permite actualizar fácilmente los jugadores sin modificar el código.

### Formato del archivo:
```
# Comentarios empiezan con #
nombre,ranking,winRate,promedioGoles
```

### Ejemplo:
```
# RANKING FIFA - Simulador Torneo Tejo
Chama,198,0.7368,6.47
Facu,126,0.6154,5.92
Tomy,118,0.6923,6.54
```

### Campos:
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| nombre | Nombre del jugador | Chama |
| ranking | Puntos FIFA acumulados | 198 |
| winRate | Porcentaje de victorias (0-1) | 0.7368 |
| promedioGoles | Promedio de goles por partido | 6.47 |

**Nota:** Los primeros 8 jugadores del archivo se consideran "jugadores base" y los restantes "nuevos jugadores".

## 🚀 Uso

1. **Importante:** Debido a que el proyecto carga el ranking desde un archivo externo, debe ejecutarse desde un servidor web:
   - **Opción 1 (Live Server):** Si usas VS Code, instala la extensión "Live Server" y haz clic derecho en `index.html` → "Open with Live Server"
   - **Opción 2 (Python):** Ejecuta `python -m http.server 8000` en la carpeta del proyecto y abre `http://localhost:8000`
   - **Opción 3 (Node.js):** Usa `npx serve` o `npx http-server`
   - **Opción 4 (GitHub Pages):** El proyecto funciona directamente en GitHub Pages

2. Seleccionar el formato de torneo (cantidad de jugadores)
3. Elegir los jugadores participantes
4. (Opcional) Cambiar a "Armado Manual" y configurar los grupos
5. Hacer clic en "Simular Torneo" o "Iniciar Simulación Monte Carlo"

### Para actualizar el ranking:
1. Editar el archivo `ranking.txt` con los nuevos datos
2. Recargar la página del simulador

## 🛠️ Tecnologías

- HTML5
- CSS3
- JavaScript (Vanilla)

---

*Desarrollado por x_chama_x* 

## 📋 Próximos Features
- Agregar página de versus entre dos jugadores, con su historial de partidos y probabilidad de ganar.
