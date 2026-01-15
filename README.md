# 🏒 Simulador de Torneo Air Hockey

Simulador web para torneos de la RESISTENCIA (amigos de x_chama_x) de Air Hockey (Tejo) que permite simular competencias entre jugadores con diferentes formatos de torneo y análisis estadístico mediante simulaciones Monte Carlo.

## 🎮 Características

### Simulador de Torneo Individual
- Simula un torneo completo con resultados partido a partido
- Muestra fase de grupos, playoffs, semifinales, tercer puesto y final
- Visualización detallada de cada partido con marcadores

### Simulador Monte Carlo
- Ejecuta entre 1,000 y 10,000 simulaciones de torneos
- Calcula probabilidades de cada jugador de:
  - 🏆 Ser campeón
  - 🥈 Ser subcampeón
  - 🥉 Quedar tercero
  - 4️⃣ Quedar cuarto
  - ❌ No clasificar a playoffs
- Muestra estadísticas agregadas y porcentajes

## 📊 Formatos de Torneo Soportados

| Jugadores | Formato | Partidos (Grupos) | Clasifican |
|-----------|---------|-------------------|------------|
| 7 | Liga (Round Robin) | 21 | Top 4 |
| 8 | 2 grupos de 4 | 12 | 2 por grupo |
| 9 | 3 grupos de 3 | 9 | 1° de cada grupo + mejor 2° |
| 10 | 2 grupos de 5 | 20 | 2 por grupo |

Todos los formatos incluyen playoffs: **Semifinales + Tercer Puesto + Final**

## 🎯 Sistema de Simulación

La simulación de partidos tiene en cuenta:

1. **Ranking FIFA**: Puntos acumulados de cada jugador
2. **Win Rate**: Porcentaje histórico de victorias
3. **Promedio de Goles**: Influye en la diferencia de goles de cada partido

### Fórmula de Probabilidad
```
Probabilidad = 0.5 + (diferenciaRanking / 200) + (diferenciaWinRate * 0.3)
```
- Limitada entre 20% y 80% para mantener partidos competitivos
- La diferencia de goles es influenciada por el promedio de goles de cada jugador

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
├── formatos.md         # Documentación de formatos
├── README.md           # Este archivo
├── css/
│   ├── styles.css      # Estilos principales
│   └── montecarlo.css  # Estilos específicos Monte Carlo
└── js/
    ├── simulador.js    # Lógica principal de simulación
    └── montecarlo.js   # Lógica de simulaciones múltiples
```

## 🚀 Uso

1. Abrir `index.html` en un navegador para el simulador individual
2. Abrir `montecarlo.html` para el análisis probabilístico
3. Seleccionar el formato de torneo (cantidad de jugadores)
4. Elegir los jugadores participantes
5. Hacer clic en "Simular Torneo" o "Iniciar Simulación Monte Carlo"

## 🛠️ Tecnologías

- HTML5
- CSS3
- JavaScript (Vanilla)

---

*Desarrollado por x_chama_x* 🏒
