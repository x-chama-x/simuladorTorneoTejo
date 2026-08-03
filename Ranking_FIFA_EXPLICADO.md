### 🧮 Ranking FIFA EXPLICADO (SISTEMA ANTI-INFLACIÓN)

Este documento detalla la metodología de cálculo del **Ranking FIFA Oficial** de la comunidad de Air Hockey (Tejo) "La Resistencia". Esta versión (V2) introduce un sistema de **Suma Cero** y un **Multiplicador Dinámico por Diferencia de Puntos (tipo ELO)** diseñado para controlar la inflación de puntos, evitar que el líder se vuelva inalcanzable de manera artificial y mantener la competitividad del ranking al rojo vivo.

---

#### 1. Ranking Inicial y Puntos Base (Tras el Primer Torneo)
Se utiliza el resultado final del primer torneo oficial como el punto de partida (base histórica). Los puntos asignados reflejan el rendimiento inicial de cada jugador:

| Posición | Jugador | Puntos Base |
| :---: | :--- | :---: |
| **1° Lugar** (Campeón) | Chama | 100.0 puntos |
| **2° Lugar** (Subcampeón) | Rafa | 80.0 puntos |
| **3° Lugar** (Tercer Puesto) | Tomy | 60.0 puntos |
| **4° Lugar** (Cuarto Puesto) | Marco | 50.0 puntos |
| **5° Lugar** (5° en Fase de Liga) | Facu | 40.0 puntos |
| **6° Lugar** (6° en Fase de Liga) | Santi | 30.0 puntos |
| **7° Lugar** (7° en Fase de Liga) | Hector | 20.0 puntos |

---

#### 2. Puntos Obtenidos por Partido: Sistema de Suma Cero (Zero-Sum)
Para evitar la inflación artificial donde se creaban más puntos de los que se perdían, el sistema actual se rige bajo el principio de **Suma Cero**:
*   **Puntos Perdidos por el Perdedor = Puntos Ganados por el Ganador**
*   Toda ganancia de un jugador proviene directamente del puntaje de su rival. Si le ganas a alguien, le "robas" sus puntos.
*   *Excepción de Seguridad:* Si la resta de puntos lleva al perdedor por debajo del límite de **5.0 puntos**, el perdedor se queda en 5.0 (no puede tener menos), pero el ganador **sí suma la totalidad** de los puntos calculados.

---

#### 3. Puntos Base por Tipo de Partido
La importancia del torneo determina la base de puntos que se disputan en el encuentro:

| Tipo de Partido | Puntos Base | Descripción |
| :--- | :---: | :--- |
| **Partido Amistoso** | **2.0 puntos** | Reducido drásticamente para evitar la acumulación excesiva en retos informales |
| **Fase de Liga o Grupos** | **20.0 puntos** | Partidos correspondientes a la fase regular de torneos oficiales |
| **Fase Final / Playoffs** | **30.0 puntos** | Partidos decisivos (Semifinal, Tercer Puesto y Final) |

---

#### 4. Multiplicador por Diferencia de Puntos (Tipo ELO)
Para reflejar con precisión el desafío de cada partido, se descartan los multiplicadores estáticos por rango y se introduce un **Multiplicador Dinámico por Diferencia de Puntos**. 

Calculamos la diferencia absoluta de puntos reales al momento de jugar:
$$\text{Diferencia (D)} = \text{Puntos del Jugador Fuerte} - \text{Puntos del Jugador Débil}$$

Luego de jugar el partido, se aplica el multiplicador correspondiente al ganador:

*   **Caso A: El jugador más fuerte gana (Resultado Esperado)**
    Se aplica un atenuador. A mayor brecha de puntos, menor será la recompensa para el líder, evitando que se dispare en la tabla frente a rivales fáciles.
    $$\text{Multiplicador} = \max(0.1, \; 1.0 - \frac{D}{200})$$
    *(El multiplicador mínimo garantizado es x0.1)*

*   **Caso B: El jugador más débil gana (Batacazo / Upset)**
    Se aplica un amplificador. Derrotar a un gigante otorga un premio masivo y castiga severamente al líder, inyectando un riesgo real y dinamismo en la cima.
    $$\text{Multiplicador} = 1.0 + \frac{D}{100}$$

---

#### 5. Protección contra Puntos Negativos (Efecto Suelo)
*   El puntaje mínimo para cualquier jugador es de **5.0 puntos**.
*   Bajo ninguna circunstancia un jugador puede descender de este piso, asegurando que todos tengan siempre un piso competitivo y motivacional.

---

#### 6. Manejo de Nuevos Jugadores
*   Los jugadores debutantes ingresan al sistema con **15.0 puntos iniciales**, posicionándose al final de la tabla de clasificación de forma neutral hasta disputar sus primeros partidos.

---

#### 7. Actualización del Ranking
Tras finalizar cada partido, el algoritmo realiza las siguientes operaciones:
1.  Busca los puntos actuales de ambos jugadores en el ranking.
2.  Determina la diferencia de puntos ($D$) e identifica quién es el favorito y quién es el menos favorecido.
3.  Calcula los puntos disputados multiplicando los **Puntos Base** de la fase por el **Multiplicador** correspondiente según quién ganó.
4.  Suma los puntos al ganador y se los resta al perdedor (aplicando el piso de 5.0 puntos).
5.  Reordena automáticamente la tabla general de posiciones de mayor a menor.

---

#### 8. Ejemplos de Cálculo Prácticos

##### 💡 Ejemplo 1: Partido Amistoso (Base = 2.0 pts)
**Rafa (80.0 pts - Favorito) vs Tomy (60.0 pts) | Diferencia (D) = 20.0**

*   **Si gana Rafa (Favorito):**
    *   Multiplicador = $1.0 - (20 / 200) = 0.90$
    *   Puntos en juego = $2.0 \times 0.90 = 1.8 \text{ pts}$
    *   *Resultados:* **Rafa sube a 81.8 pts** y **Tomy baja a 58.2 pts**.

*   **Si gana Tomy (Upset / Batacazo):**
    *   Multiplicador = $1.0 + (20 / 100) = 1.20$
    *   Puntos en juego = $2.0 \times 1.20 = 2.4 \text{ pts}$
    *   *Resultados:* **Tomy sube a 62.4 pts** y **Rafa baja a 77.6 pts**.

---

##### 💡 Ejemplo 2: Partido de Fase de Liga (Base = 20.0 pts)
**Marco (50.0 pts) vs Chama (100.0 pts - Favorito) | Diferencia (D) = 50.0**

*   **Si gana Chama (Favorito):**
    *   Multiplicador = $1.0 - (50 / 200) = 0.75$
    *   Puntos en juego = $20.0 \times 0.75 = 15.0 \text{ pts}$
    *   *Resultados:* **Chama sube a 115.0 pts** y **Marco baja a 35.0 pts**.

*   **Si gana Marco (Upset / Batacazo):**
    *   Multiplicador = $1.0 + (50 / 100) = 1.50$
    *   Puntos en juego = $20.0 \times 1.50 = 30.0 \text{ pts}$
    *   *Resultados:* **Marco sube a 80.0 pts** y **Chama baja a 70.0 pts**.
