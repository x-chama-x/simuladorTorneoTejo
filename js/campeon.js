// =====================================================
// PESO DE BICAMPEONATO (CAMPEÓN DEFENSOR)  ·  v3.0
// =====================================================
// Módulo compartido por el simulador y el creador de torneo.
//
// Idea: al último campeón del torneo (detectado leyendo el historial de
// partidos) se le ajusta la fuerza en cada partido, tomando como referencia
// el fenómeno mundialista del bicampeonato.
//
// CALIBRACIÓN
// -----------
// En un mundial de 32 equipos el reparto "justo" da 1/32 = 3,125% de repetir
// título; el campeón defensor lo logra ~10% de las veces. Ese salto, medido
// en CUOTA (odds), es independiente del tamaño del campo:
//
//     M = odds(0,10) / odds(1/32) = (0,1/0,9) / ((1/32)/(31/32)) ≈ 3,44
//
// M es el multiplicador de cuota que el campeón debe realizar sobre TODO el
// torneo. No se fuerza el 10% sobre el resultado: se fuerza el multiplicador.
// La probabilidad final SURGE de la cadena de probabilidades condicionales de
// cada etapa del formato elegido.
//
// DESCOMPOSICIÓN CONDICIONAL POR ETAPA
// ------------------------------------
//     P(bicampeón) = P(supera fase inicial)
//                  · P(gana repechaje | no ganó su grupo)   [sólo 9 jugadores]
//                  · P(gana semi | clasificó)
//                  · P(gana final | finalista)
//
// El peso se reparte entre esas etapas con un peso de importancia w_e
// (la presión crece hacia la final) y se divide por la cantidad de partidos
// n_e que el campeón juega en esa etapa:
//
//     λ_e = k · ln(M) · (w_e / Σw) / n_e        [puntos de fuerza por partido]
//
// Dividir por n_e es clave: el ajuste se aplica en CADA partido, así que sin
// esa división una liga de 7 (6 partidos) recibiría 6 veces el peso previsto
// para "una etapa" y la descomposición condicional se rompería.
//
// Sumando el corrimiento de log-cuota de todo el camino:
//     Σ_e n_e · (λ_e / k) = ln(M)   →   multiplicador realizado ≈ M  ✔
//
// MODO
// ----
//   'maldicion' (default) el campeón RESTA fuerza → repetir es más difícil (×1/M)
//   'pedigri'             el campeón SUMA fuerza  → repetir es más probable (×M)
//
// El default es la MALDICIÓN DEL CAMPEÓN: sólo ~10% de los campeones mundialistas
// repiten título, y varios se van en fase de grupos (Francia 2002, Italia 2010,
// España 2014, Alemania 2018). La presión y el desgaste le juegan en contra, y esa
// presión crece etapa a etapa (ver pesosEtapa). El signo lo aplica
// bonusFuerzaCampeon(); el resto del cálculo es idéntico en los dos modos.
//
// Cambios v3.0 respecto de v2.0:
//   - Corregida la magnitud del castigo: v2 realizaba ×0,54 en vez del ×1/3,44 buscado.
//   - Corregida la normalización: los factores {1.0,1.2,1.5} realizaban M^1,233.
//   - Corregido el conteo de partidos por etapa (antes el peso se aplicaba N veces).
//   - Rutas de etapas por formato (7/8/9/10), incluida la etapa 'repechaje' de 9.
//   - Refinamiento numérico del λ, cacheado por (formato+roster+campeón).
// =====================================================

window.CAMPEON = {
    activo: true,
    nombre: null,          // se completa al detectar el último campeón
    torneo: null,          // torneo en el que salió campeón

    // --- Calibración ---
    refMundial: 0.10,      // el campeón defensor repite ~10% de las veces
    campoMundial: 32,      // frente a un reparto justo de 1/32
    // M: multiplicador de cuota sobre TODO el torneo. 3.44 es la cifra real
    // mundialista, pero para un roster donde el campeón domina claramente al
    // resto (ranking/winRate muy por delante) ese castigo no alcanza a
    // quitarle el favoritismo. Se sube a 8 a pedido: maldición más dramática
    // que la real, ya no una réplica fiel de las estadísticas de Mundiales.
    oddsMultiplier: 8,
    k: 30,                 // misma constante de la sigmoide del modelo base

    // 'maldicion' → el peso PERJUDICA al campeón (default) | 'pedigri' → lo favorece
    modo: 'maldicion',

    // --- Contexto de la simulación en curso ---
    formato: 8,            // 7 | 8 | 9 | 10
    etapaActual: 'grupos', // 'grupos' | 'liga' | 'repechaje' | 'semifinal' | 'final'

    // Corrección multiplicativa de λ que deja el M realizado sobre el objetivo.
    // 1 = usar la forma cerrada tal cual. La ajusta calibrarPesoCampeon().
    factorCalibracion: 1,

    // Peso de importancia de cada etapa. Concentrado en semifinal/final para
    // que el campeón defensor llegue lejos con normalidad (grupos/liga/
    // repechaje casi sin castigo) y sea ahí, en el tramo final, donde la
    // maldición le pega más fuerte.
    pesosEtapa: {
        liga: 0.3,
        grupos: 0.3,
        repechaje: 0.5,
        semifinal: 2.2,
        final: 3.0
    }
};

// ---- Ruta de etapas de cada formato ----
// n = partidos que juega el campeón en esa etapa.
//   7  liga de 7 → 6 partidos de round-robin
//   8  grupo de 4 → 3 partidos
//   9  grupo de 3 → 2 partidos; repechaje = mini-liga (2) + pre-playoff (1) = 3
//  10  grupo de 5 → 4 partidos
window.CAMPEON.rutaFormato = {
    7:  [{ etapa: 'liga',   n: 6, label: 'Liga (Top 4)' },
         { etapa: 'semifinal', n: 1, label: 'Semifinal' },
         { etapa: 'final',     n: 1, label: 'Final' }],

    8:  [{ etapa: 'grupos', n: 3, label: 'Fase de grupos' },
         { etapa: 'semifinal', n: 1, label: 'Semifinal' },
         { etapa: 'final',     n: 1, label: 'Final' }],

    9:  [{ etapa: 'grupos', n: 2, label: 'Fase de grupos' },
         { etapa: 'repechaje', n: 3, label: 'Repechaje + Pre-Playoff', condicional: true },
         { etapa: 'semifinal', n: 1, label: 'Semifinal' },
         { etapa: 'final',     n: 1, label: 'Final' }],

    10: [{ etapa: 'grupos', n: 4, label: 'Fase de grupos' },
         { etapa: 'semifinal', n: 1, label: 'Semifinal' },
         { etapa: 'final',     n: 1, label: 'Final' }]
};

// ---- Detectar el último campeón leyendo enfrentamientos_directos.txt ----
// El campeón es el ganador de la última línea cuya fase sea "Final".
async function detectarUltimoCampeon() {
    try {
        const resp = await fetch('enfrentamientos_directos.txt');
        if (!resp.ok) throw new Error('No se pudo cargar enfrentamientos_directos.txt');
        const texto = await resp.text();
        const lineas = texto.split('\n');

        let campeon = null;
        let torneo = null;

        for (const linea of lineas) {
            const t = linea.trim();
            if (!t || t.startsWith('#') || t.startsWith('=')) continue;

            const p = t.split(',');
            if (p.length >= 7) {
                const fase = (p[6] || '').trim().toLowerCase();
                // Sólo la final del torneo (no "tercer puesto" ni "semifinal")
                if (fase === 'final') {
                    const j1 = p[0].trim();
                    const j2 = p[1].trim();
                    const res = p[2].trim();
                    const ganador = res === 'G' ? j1 : (res === 'P' ? j2 : null);
                    if (ganador) {
                        campeon = ganador;
                        torneo = (p[4] || '').trim();
                    }
                }
            }
        }

        window.CAMPEON.nombre = campeon;
        window.CAMPEON.torneo = torneo;
        console.log('👑 Último campeón detectado:', campeon, '(' + torneo + ')');
        return campeon;
    } catch (e) {
        console.error('No se pudo detectar el último campeón:', e);
        return null;
    }
}

// ---- Ruta de etapas del formato en curso ----
function rutaEtapas(formato) {
    const c = window.CAMPEON;
    return c.rutaFormato[formato] || c.rutaFormato[8];
}

// ---- Establecer el formato del torneo que se está simulando ----
// Cambiar de formato invalida la calibración numérica previa.
function establecerFormatoBicampeon(formato) {
    const c = window.CAMPEON;
    const f = parseInt(formato);
    if (!c || !c.rutaFormato[f]) return;
    if (c.formato !== f) {
        c.formato = f;
        c.factorCalibracion = 1;
    }
}

// ---- Peso de fuerza por partido para el campeón, en la etapa indicada ----
// λ_e = k · ln(M) · (w_e / Σw) / n_e     · factorCalibracion
//
// Devuelve SIEMPRE la magnitud con signo ya aplicado según el modo:
//   'pedigri'   → positivo (suma fuerza)
//   'maldicion' → negativo (resta fuerza)
function bonusFuerzaCampeon(etapa = null, formato = null) {
    const c = window.CAMPEON;
    if (!c || !c.activo) return 0;

    const fmt = formato != null ? parseInt(formato) : c.formato;
    const ruta = rutaEtapas(fmt);
    const etapaUso = etapa || c.etapaActual;

    const paso = ruta.find(p => p.etapa === etapaUso);
    if (!paso) return 0; // etapa que no pertenece a este formato (ej. repechaje en 8)

    const sumaPesos = ruta.reduce((acc, p) => acc + (c.pesosEtapa[p.etapa] || 1), 0);
    const wRel = (c.pesosEtapa[etapaUso] || 1) / sumaPesos;

    // Corrimiento de log-cuota que le toca a esta etapa, repartido entre sus n partidos
    const lambda = c.k * Math.log(c.oddsMultiplier) * wRel / Math.max(1, paso.n);

    const signo = c.modo === 'maldicion' ? -1 : 1;
    return signo * lambda * c.factorCalibracion;
}

// ---- Aplica el peso a la fuerza de un jugador si es el campeón defensor ----
function ajustarFuerzaPorCampeon(fuerza, nombre, etapa = null) {
    const c = window.CAMPEON;
    if (c && c.activo && c.nombre && nombre === c.nombre) {
        return fuerza + bonusFuerzaCampeon(etapa);
    }
    return fuerza;
}

// ---- Fisher-Yates local (para no depender de globals de cada página) ----
function _shuffleCampeon(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ---- Helper: Establecer etapa actual para el contexto de bicampeonato ----
function establecerEtapaBicampeon(etapa) {
    // 'ninguna' es una etapa neutral: no pertenece a ningún formato, por lo
    // que bonusFuerzaCampeon() devuelve 0 (partidos no campeonables, ej. 3er puesto).
    const validas = ['grupos', 'liga', 'repechaje', 'semifinal', 'final', 'ninguna'];
    if (window.CAMPEON && validas.includes(etapa)) {
        window.CAMPEON.etapaActual = etapa;
    }
}

// ---- Utilidades de cuota ----
const _odds = p => (p <= 0 ? 0 : p >= 1 ? Infinity : p / (1 - p));

// =====================================================
// SIMULACIÓN DEL TORNEO COMPLETO PARA EL CAMPEÓN
// =====================================================
// Recorre el formato marcando la etapa en cada tramo, y devuelve en qué punto
// del camino quedó el campeón. Es el núcleo tanto de la calibración numérica
// como del panel de probabilidades condicionales.
//
// Parámetros inyectados desde cada página:
//   grupos       -> { all:[...] } o { A:[...], B:[...] [, C:[...]] }
//   simPartido   -> (j1, j2) => { ganador, ... }
//   simGrupo     -> (arrJugadores) => [{ nombre, ... }] ordenado 1°..n°
function _simularCaminoCampeon({ grupos, numJugadores, campeon, simPartido, simGrupo, getData }) {
    const c = window.CAMPEON;

    // ETAPA 1: fase inicial
    c.etapaActual = numJugadores === 7 ? 'liga' : 'grupos';

    let clasificados = [];
    let pasoPorRepechaje = false;
    let superoRepechaje = null; // true/false sólo si transitó el repechaje

    if (numJugadores === 7) {
        const r = simGrupo(grupos.all);
        clasificados = r.slice(0, 4).map(x => x.nombre);

    } else if (numJugadores === 8 || numJugadores === 10) {
        const a = simGrupo(grupos.A);
        const b = simGrupo(grupos.B);
        clasificados = [a[0].nombre, a[1].nombre, b[0].nombre, b[1].nombre];

    } else if (numJugadores === 9) {
        const a = simGrupo(grupos.A);
        const b = simGrupo(grupos.B);
        const cc = simGrupo(grupos.C);
        const primeros = [a[0].nombre, b[0].nombre, cc[0].nombre];

        // El campeón pasa por el repechaje sólo si no ganó su grupo
        pasoPorRepechaje = !primeros.includes(campeon);

        // ETAPA 2 (condicional): mini-ligas de 2° y 3° + partido eliminatorio
        c.etapaActual = 'repechaje';

        const segundos = [a[1].nombre, b[1].nombre, cc[1].nombre].map(getData);
        const terceros = [a[2].nombre, b[2].nombre, cc[2].nombre].map(getData);
        const rSeg = simGrupo(segundos);
        const rTer = simGrupo(terceros);
        const elim = simPartido(getData(rSeg[0].nombre), getData(rTer[0].nombre));
        clasificados = [...primeros, elim.ganador];

        if (pasoPorRepechaje) superoRepechaje = (elim.ganador === campeon);
    }

    if (!clasificados.includes(campeon)) {
        return { clasifico: false, pasoPorRepechaje, superoRepechaje, finalista: false, campeonNuevo: false };
    }

    // ETAPA 3: semifinales
    c.etapaActual = 'semifinal';
    const semi = _shuffleCampeon(clasificados);
    const sf1 = simPartido(getData(semi[0]), getData(semi[1]));
    const sf2 = simPartido(getData(semi[2]), getData(semi[3]));
    const finalistas = [sf1.ganador, sf2.ganador];

    if (!finalistas.includes(campeon)) {
        return { clasifico: true, pasoPorRepechaje, superoRepechaje, finalista: false, campeonNuevo: false };
    }

    // ETAPA 4: final
    c.etapaActual = 'final';
    const fin = simPartido(getData(sf1.ganador), getData(sf2.ganador));

    return {
        clasifico: true,
        pasoPorRepechaje,
        superoRepechaje,
        finalista: true,
        campeonNuevo: fin.ganador === campeon
    };
}

// ---- Mide P(bicampeón) con el factorCalibracion actual ----
function _medirPTitulo(cfg, n) {
    let t = 0;
    for (let i = 0; i < n; i++) {
        if (_simularCaminoCampeon(cfg).campeonNuevo) t++;
    }
    return t / n;
}

// =====================================================
// CALIBRACIÓN NUMÉRICA DEL PESO
// =====================================================
// La forma cerrada de λ_e es exacta cuando cada etapa es un único partido,
// pero aproximada en round-robin: clasificar no es el producto de ganar cada
// partido. Este paso mide el multiplicador de cuota REALIZADO y corrige λ con
// un ajuste secante en escala log-cuota, hasta que el realizado ≈ M.
//
// Se ejecuta UNA vez por (formato + roster + campeón + modo) y se cachea, así
// no se paga en cada simulación.
function calibrarPesoCampeon({ grupos, numJugadores, campeon, simPartido, simGrupo, n = 1500, maxIter = 4, tolerancia = 0.12 }) {
    const c = window.CAMPEON;
    if (!c || !c.activo || !campeon) return null;

    const pool = Object.values(grupos).flat();
    if (!pool.some(j => j.nombre === campeon)) return null; // el campeón no participa

    const getData = (nombre) => pool.find(j => j.nombre === nombre)
        || { nombre, ranking: 50, winRate: 0.5, promedioGoles: 5 };
    const cfg = { grupos, numJugadores, campeon, simPartido, simGrupo, getData };

    const clave = _claveCache(grupos, numJugadores, campeon);
    const cacheado = _leerCache(clave);
    if (cacheado != null) {
        c.factorCalibracion = cacheado;
        return { factor: cacheado, desdeCache: true };
    }

    const factorPrevio = c.factorCalibracion;

    // Baseline: sin peso
    c.factorCalibracion = 0;
    const pBase = _medirPTitulo(cfg, n);

    // Objetivo: la cuota base multiplicada por M (o dividida, en modo maldición)
    const oddsBase = _odds(pBase);
    if (!isFinite(oddsBase) || oddsBase <= 0) {
        // El campeón nunca gana o gana siempre: no hay margen para calibrar
        c.factorCalibracion = factorPrevio;
        return { factor: factorPrevio, degenerado: true, pBase };
    }
    const oddsObjetivo = c.modo === 'maldicion' ? oddsBase / c.oddsMultiplier : oddsBase * c.oddsMultiplier;
    const lnObjetivo = Math.log(oddsObjetivo / oddsBase); // = ±ln(M)

    // Ajuste secante sobre el factor. f=1 es la estimación de forma cerrada.
    let f = 1;
    let mejorF = 1, mejorErr = Infinity;

    for (let iter = 0; iter < maxIter; iter++) {
        c.factorCalibracion = f;
        const p = _medirPTitulo(cfg, n);
        const o = _odds(p);

        if (!isFinite(o) || o <= 0) break;

        const lnLogrado = Math.log(o / oddsBase);
        const err = Math.abs(lnLogrado - lnObjetivo);
        if (err < mejorErr) { mejorErr = err; mejorF = f; }

        // Convergió dentro de la tolerancia (en log-cuota)
        if (err <= Math.abs(lnObjetivo) * tolerancia) break;

        // El corrimiento de log-cuota es ~lineal en f: escalar directamente
        if (Math.abs(lnLogrado) < 1e-6) break;
        const siguiente = f * (lnObjetivo / lnLogrado);

        // Clamp a un rango sano para que un formato degenerado no dispare el peso
        f = Math.max(0.2, Math.min(6, siguiente));
        if (!isFinite(f)) { f = mejorF; break; }
    }

    c.factorCalibracion = mejorF;
    _guardarCache(clave, mejorF);

    console.log(`👑 Peso de bicampeonato calibrado (formato ${numJugadores}, modo ${c.modo}): factor ×${mejorF.toFixed(3)} · P base ${(pBase * 100).toFixed(1)}%`);

    return { factor: mejorF, pBase, desdeCache: false };
}

// ---- Calibrar ANTES de simular ----
// calcularBicampeonato() calibra, pero solo se usa para el panel informativo
// DESPUÉS de que el torneo (o los 10K Monte Carlo) ya se jugaron, por lo que
// esas simulaciones corren con factorCalibracion sin calibrar (=1, la
// estimación de forma cerrada) en vez del valor ajustado a la cuota objetivo.
// Esta función se llama desde el propio flujo de simulación, antes del
// primer partido, para que el peso ya esté calibrado cuando importa.
function calibrarSiCorresponde(grupos, numJugadores, simPartido, simGrupo) {
    const c = window.CAMPEON;
    if (!c || !c.activo || !c.nombre || !grupos) return null;
    return calibrarPesoCampeon({ grupos, numJugadores, campeon: c.nombre, simPartido, simGrupo });
}

// ---- Caché de calibración (por sesión) ----
function _claveCache(grupos, numJugadores, campeon) {
    const c = window.CAMPEON;
    const roster = Object.values(grupos).flat().map(j => j.nombre).sort().join('|');
    return `bicampeon:v3:${c.modo}:${c.oddsMultiplier}:${numJugadores}:${campeon}:${roster}`;
}

function _leerCache(clave) {
    try {
        const v = window.sessionStorage && window.sessionStorage.getItem(clave);
        const n = v == null ? NaN : parseFloat(v);
        return isFinite(n) ? n : null;
    } catch (e) {
        return null; // sessionStorage no disponible (file://, modo privado, headless)
    }
}

function _guardarCache(clave, valor) {
    try {
        if (window.sessionStorage) window.sessionStorage.setItem(clave, String(valor));
    } catch (e) {
        /* sin caché: se recalcula, no es crítico */
    }
}

// =====================================================
// MONTE CARLO: CADENA DE PROBABILIDADES CONDICIONALES
// =====================================================
// Simula el torneo COMPLETO y mide, para el campeón defensor, la cadena
// condicional de cada etapa del FORMATO ELEGIDO:
//
//   7/8/10: P(clasifica) · P(gana semi | clasificó) · P(gana final | finalista)
//   9:      P(clasifica) · P(supera repechaje | lo jugó) · P(semi | ...) · P(final | ...)
//
// El producto de la cadena es P(bicampeón). El peso se aplica automáticamente
// dentro de simPartido/simGrupo, discriminado por etapa.
function calcularBicampeonato({ grupos, numJugadores, campeon, simPartido, simGrupo, n = 8000, calibrar = true }) {
    const c = window.CAMPEON;
    if (!campeon) return null;

    const pool = Object.values(grupos).flat();
    if (!pool.some(j => j.nombre === campeon)) return null; // no participa

    const getData = (nombre) => pool.find(j => j.nombre === nombre)
        || { nombre, ranking: 50, winRate: 0.5, promedioGoles: 5 };

    establecerFormatoBicampeon(numJugadores);

    // Calibrar el peso para este formato/roster antes de medir
    if (calibrar) {
        calibrarPesoCampeon({ grupos, numJugadores, campeon, simPartido, simGrupo });
    }

    const cfg = { grupos, numJugadores, campeon, simPartido, simGrupo, getData };

    let nClasifica = 0;      // clasifica a playoffs
    let nFinalista = 0;      // gana su semi
    let nTitulo = 0;         // gana la final (bicampeón)
    let nRepechajeJugado = 0;
    let nRepechajeSuperado = 0;

    for (let s = 0; s < n; s++) {
        const r = _simularCaminoCampeon(cfg);
        if (r.pasoPorRepechaje) {
            nRepechajeJugado++;
            if (r.superoRepechaje) nRepechajeSuperado++;
        }
        if (!r.clasifico) continue;
        nClasifica++;
        if (!r.finalista) continue;
        nFinalista++;
        if (r.campeonNuevo) nTitulo++;
    }

    // Probabilidades condicionales
    const pClasifica = nClasifica / n;
    const pRepechaje = nRepechajeJugado ? nRepechajeSuperado / nRepechajeJugado : null;
    const pSemi = nClasifica ? nFinalista / nClasifica : 0;
    const pFinal = nFinalista ? nTitulo / nFinalista : 0;
    const pTitulo = nTitulo / n;

    // Multiplicador de cuota realizado frente al escenario sin peso
    const factorActual = c.factorCalibracion;
    c.factorCalibracion = 0;
    const pSinPeso = _medirPTitulo(cfg, Math.min(n, 4000));
    c.factorCalibracion = factorActual;

    const oddsCon = _odds(pTitulo), oddsSin = _odds(pSinPeso);
    const mRealizado = (oddsSin > 0 && isFinite(oddsCon)) ? oddsCon / oddsSin : null;

    // Restaurar estado
    c.etapaActual = numJugadores === 7 ? 'liga' : 'grupos';

    // Cadena de etapas para el panel, según el formato
    const ruta = rutaEtapas(numJugadores);
    const valores = {
        liga: { p: pClasifica, sub: 'P(clasifica)' },
        grupos: { p: pClasifica, sub: 'P(clasifica)' },
        repechaje: { p: pRepechaje, sub: 'P(supera | lo jugó)' },
        semifinal: { p: pSemi, sub: 'P(gana | clasificó)' },
        final: { p: pFinal, sub: 'P(gana | finalista)' }
    };
    const colores = { liga: '#58a6ff', grupos: '#58a6ff', repechaje: '#a371f7', semifinal: '#3fb950', final: '#e3b341' };

    const etapas = ruta.map((paso, i) => ({
        orden: i + 1,
        etapa: paso.etapa,
        label: paso.label,
        partidos: paso.n,
        condicional: !!paso.condicional,
        lambda: bonusFuerzaCampeon(paso.etapa, numJugadores),
        p: valores[paso.etapa] ? valores[paso.etapa].p : null,
        sub: valores[paso.etapa] ? valores[paso.etapa].sub : '',
        color: colores[paso.etapa] || '#8b949e'
    }));

    return {
        campeon,
        torneo: c.torneo,
        modo: c.modo,
        n,
        numJugadores,
        etapas,
        pClasifica, pRepechaje, pSemi, pFinal, pTitulo,
        nClasifica, nFinalista, nTitulo, nRepechajeJugado, nRepechajeSuperado,
        pSinPeso,
        mRealizado,
        mObjetivo: c.modo === 'maldicion' ? 1 / c.oddsMultiplier : c.oddsMultiplier,
        factorCalibracion: c.factorCalibracion,
        etapaInicialLabel: ruta[0].label
    };
}

// =====================================================
// RENDER: PANEL DE BICAMPEONATO
// =====================================================
function renderPanelBicampeon(info) {
    if (!info) return '';
    const pct = x => (x == null ? '—' : (x * 100).toFixed(1) + '%');

    const esPedigri = info.modo !== 'maldicion';
    const signo = esPedigri ? '+' : '−';
    const titulo = esPedigri ? 'Probabilidad de Bicampeonato' : 'Maldición del Campeón';

    // Tarjetas + separadores "×" entre etapas
    const tarjetas = info.etapas.map(e => etapaCard(
        `${e.orden} · ${e.label}`,
        e.sub,
        pct(e.p),
        e.color,
        `${signo}${Math.abs(e.lambda).toFixed(1)} por partido · ${e.partidos} ${e.partidos === 1 ? 'partido' : 'partidos'}`
    )).join(flechaCondicional());

    const formula = info.etapas.map(e => e.sub.replace(/^P\(/, '').replace(/\)$/, '')).join(' × ');

    const deltaPP = ((info.pTitulo - info.pSinPeso) * 100);
    const deltaTxt = (deltaPP >= 0 ? '+' : '') + deltaPP.toFixed(1) + ' pp';

    return `
    <div class="panel bicampeon-panel" style="margin-bottom:2rem; background:#161b22; border:2px solid #d4af37; border-radius:12px; padding:20px 22px;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
            <span style="font-size:1.6rem;">👑</span>
            <h2 style="margin:0; color:#d4af37;">${titulo} — ${info.campeon}</h2>
        </div>
        <p style="margin:0 0 4px 0; color:#c9d1d9; font-size:0.9rem;">
            Campeón defensor${info.torneo ? ` del <strong>${info.torneo}</strong>` : ''}.
            El peso se reparte entre las <strong>${info.etapas.length} etapas del formato de ${info.numJugadores} jugadores</strong>,
            calibrado con la referencia mundialista del <strong>~10%</strong>
            (multiplicador de cuota objetivo <strong>×${info.mObjetivo.toFixed(2)}</strong>).
        </p>
        <p style="margin:0 0 16px 0; color:#8b949e; font-size:0.8rem; font-style:italic;">
            ${info.n.toLocaleString('es-AR')} simulaciones Monte Carlo del torneo completo ·
            Probabilidades condicionales encadenadas por etapa
        </p>

        <div class="bicampeon-etapas" style="display:flex; gap:12px; flex-wrap:wrap; align-items:stretch;">
            ${tarjetas}
        </div>

        <div style="margin-top:16px; padding:14px 16px; background:linear-gradient(135deg,#3a2f0a,#4a3c0c); border:1px solid #d4af37; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="color:#e6edf3; font-size:0.9rem;">
                <strong style="color:#d4af37;">P(bicampeón)</strong> = ${formula}
            </div>
            <div style="font-size:1.8rem; font-weight:800; color:#d4af37; letter-spacing:1px;">
                ${pct(info.pTitulo)}
            </div>
        </div>

        <div style="margin-top:16px; background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:12px 14px;">
            <div style="color:#8b949e; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                📊 Efecto del peso (${info.n.toLocaleString('es-AR')} simulaciones)
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:10px; font-size:0.85rem;">
                ${miniStat('Sin el peso', pct(info.pSinPeso), '#8b949e')}
                ${miniStat('Con el peso', pct(info.pTitulo), '#d4af37')}
                ${miniStat('Diferencia', deltaTxt, deltaPP >= 0 ? '#3fb950' : '#f85149')}
                ${miniStat('Cuota realizada', info.mRealizado ? '×' + info.mRealizado.toFixed(2) : '—', '#58a6ff')}
                ${miniStat('Cuota objetivo', '×' + info.mObjetivo.toFixed(2), '#58a6ff')}
            </div>
        </div>
    </div>`;
}

function etapaCard(titulo, subt, valor, color, pie) {
    return `
    <div style="flex:1; min-width:150px; background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:14px; text-align:center;">
        <div style="font-size:0.72rem; color:#8b949e; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">${titulo}</div>
        <div style="font-size:1.7rem; font-weight:800; color:${color};">${valor}</div>
        <div style="font-size:0.75rem; color:#c9d1d9; margin-top:4px;">${subt}</div>
        ${pie ? `<div style="font-size:0.68rem; color:#8b949e; margin-top:6px; border-top:1px solid #21262d; padding-top:6px;">${pie}</div>` : ''}
    </div>`;
}

function miniStat(label, valor, color) {
    return `
    <div style="padding:8px; background:#161b22; border-radius:6px; text-align:center;">
        <div style="color:#8b949e; font-size:0.75rem; margin-bottom:4px;">${label}</div>
        <div style="color:${color}; font-weight:600;">${valor}</div>
    </div>`;
}

function flechaCondicional() {
    return `<div style="display:flex; align-items:center; color:#8b949e; font-size:1.4rem; font-weight:700;">×</div>`;
}

// Exponer globalmente
window.detectarUltimoCampeon = detectarUltimoCampeon;
window.bonusFuerzaCampeon = bonusFuerzaCampeon;
window.ajustarFuerzaPorCampeon = ajustarFuerzaPorCampeon;
window.establecerEtapaBicampeon = establecerEtapaBicampeon;
window.establecerFormatoBicampeon = establecerFormatoBicampeon;
window.calibrarPesoCampeon = calibrarPesoCampeon;
window.calibrarSiCorresponde = calibrarSiCorresponde;
window.calcularBicampeonato = calcularBicampeonato;
window.renderPanelBicampeon = renderPanelBicampeon;
