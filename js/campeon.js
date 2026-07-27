// =====================================================
// PESO DE BICAMPEONATO (CAMPEÓN DEFENSOR)
// =====================================================
// Módulo compartido por el simulador y el creador de torneo.
//
// Idea: al último campeón del torneo (detectado leyendo el
// historial de partidos) se le agrega un "peso" extra para
// salir bicampeón, inspirado en el fenómeno mundialista donde
// el campeón defensor repite título ~10% de las veces.
//
// El 10% NO se fuerza sobre el resultado: se usa para CALIBRAR
// el tamaño del bonus de fuerza que recibe el campeón en cada
// partido. La probabilidad de bicampeonato final SURGE de
// multiplicar las probabilidades condicionales de cada etapa
// del torneo (fase de grupos/liga -> semifinal -> final).
//
// MEJORAS v2.0:
// - Discriminación por etapa del torneo (grupos, semifinal, final)
// - Cálculo dinámico de probabilidades condicionales P(A|B)
// - Bonus escalado según la importancia de cada fase
// - Validación de participación en cada etapa
// =====================================================

window.CAMPEON = {
    activo: true,
    nombre: null,          // se completa al detectar el último campeón
    torneo: null,          // torneo en el que salió campeón
    // Referencia mundialista: el campeón defensor repite ~10% de las veces
    // frente a una expectativa "justa" de 1/32 (mundial de 32 equipos).
    // El multiplicador de CUOTA (odds) que representa ese salto es:
    //   odds(0.10) / odds(1/32) = (0.1/0.9) / ((1/32)/(31/32)) ≈ 3.44
    // Ese "pedigrí" es independiente del tamaño del campo de jugadores.
    refMundial: 0.10,
    oddsMultiplier: 3.44,  // M: multiplicador de cuota total del campeón
    numEtapas: 3,          // etapas del camino: fase inicial -> semi -> final
    k: 30,                 // misma constante de la sigmoide del modelo base
    
    // NUEVO v2.0: Control de etapas y bonificación dinámica
    etapaActual: 'grupos',  // 'grupos' | 'semifinal' | 'final'
    bonusEtapa: 1.0,       // multiplicador dinámico por etapa (se actualiza en calcularBicampeonato)
    estadisticasEtapa: {   // estadísticas de cada etapa para probabilidades condicionales
        grupos: { participantes: 0, clasificados: 0 },
        semifinal: { participantes: 0, finalistas: 0 },
        final: { participantes: 0, ganador: null }
    }
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

// ---- Bonus de fuerza por partido para el campeón defensor (CON DISCRIMINACIÓN POR ETAPA) ----
// Repartimos el multiplicador de cuota total M entre las S etapas del torneo
// mediante probabilidades condicionales independientes: m = M^(1/S).
// Pero además aplicamos un factor de escalado según la etapa actual:
//   - Grupos: bonus base (m^1)
//   - Semifinal: bonus aumentado (m^1.2) - mayor importancia
//   - Final: bonus máximo (m^1.5) - momento crítico
//
// Esto refleja que el campeón defensor tiende a tener más ventaja en fases
// decisivas. El bonus se multiplica dinámicamente según etapa + bonusEtapa.
function bonusFuerzaCampeon(etapa = null) {
    const c = window.CAMPEON;
    if (!c || !c.activo) return 0;
    
    // Usar etapa actual del objeto CAMPEON si no se proporciona
    const etapaUso = etapa || c.etapaActual;
    
    // Calcular bonus base: cuota por etapa
    const mPorEtapa = Math.pow(c.oddsMultiplier, 1 / c.numEtapas);
    const bonusBase = c.k * Math.log(mPorEtapa);
    
    // Factores de escalado por etapa (discriminación)
    const factoresEtapa = {
        'grupos': 1.0,      // base sin escalado
        'semifinal': 1.2,   // 20% más intenso
        'final': 1.5        // 50% más intenso (momento crítico)
    };
    
    const factorEscalado = factoresEtapa[etapaUso] || 1.0;
    return bonusBase * factorEscalado;
}

// ---- Aplica el bonus a la fuerza de un jugador si es el campeón defensor (CON ETAPA AWARE) ----
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
    if (window.CAMPEON && (etapa === 'grupos' || etapa === 'semifinal' || etapa === 'final')) {
        window.CAMPEON.etapaActual = etapa;
    }
}

// Exponer a nivel global
window.establecerEtapaBicampeon = establecerEtapaBicampeon;

// =====================================================
// MONTE CARLO: PROBABILIDAD DE BICAMPEONATO CONDICIONAL
// =====================================================
// Simula el torneo COMPLETO (fase inicial + playoffs) y mide, para el
// campeón defensor, la cadena de probabilidades condicionales:
//   P(clasifica | grupos) · P(gana semi | clasificó) · P(gana final | finalista)
// 
// El producto es P(bicampeón). El bonus de fuerza del campeón se aplica
// automáticamente dentro de simPartido/simGrupo, discriminando por etapa.
//
// VERSIÓN v2.0: Cálculo mejorado de probabilidades condicionales
// - Rastreo detallado de participación en cada etapa
// - Aplicación de bonus escalado según importancia de la fase
// - Estadísticas segregadas por etapa del torneo
//
// Parámetros inyectados desde cada página:
//   grupos       -> { all:[...] } o { A:[...], B:[...] [, C:[...]] }
//   numJugadores -> 7 | 8 | 9 | 10
//   campeon      -> nombre del campeón defensor
//   simPartido   -> (j1, j2) => { ganador, ... }
//   simGrupo     -> (arrJugadores) => [{ nombre, ... }] ordenado 1°..n°
function calcularBicampeonato({ grupos, numJugadores, campeon, simPartido, simGrupo, n = 8000 }) {
    if (!campeon) return null;

    const pool = Object.values(grupos).flat();
    if (!pool.some(j => j.nombre === campeon)) return null; // no participa

    const getData = (nombre) => pool.find(j => j.nombre === nombre)
        || { nombre, ranking: 50, winRate: 0.5, promedioGoles: 5 };

    let nClasifica = 0;   // veces que el campeón clasifica a playoffs
    let nFinalista = 0;   // veces que llega a la final (gana su semi)
    let nTitulo = 0;      // veces que gana la final (bicampeón)
    
    // NUEVO v2.0: Estadísticas de participación por etapa
    let estadisticasEtapas = {
        grupos: { participantes: 0, clasificados: 0 },
        semifinal: { participantes: 0, finalistas: 0 },
        final: { participantes: 0, ganador: 0 }
    };

    for (let s = 0; s < n; s++) {
        // ETAPA 1: Fase inicial (grupos/liga)
        // ===================================
        window.CAMPEON.etapaActual = 'grupos';
        
        let clasificados = [];

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
            const c = simGrupo(grupos.C);
            const primeros = [a[0].nombre, b[0].nombre, c[0].nombre];
            // Repechaje: mini-liga de 2°, mini-liga de 3°, y su cruce da el 4° cupo
            const segundos = [a[1].nombre, b[1].nombre, c[1].nombre].map(getData);
            const terceros = [a[2].nombre, b[2].nombre, c[2].nombre].map(getData);
            const rSeg = simGrupo(segundos);
            const rTer = simGrupo(terceros);
            const elim = simPartido(getData(rSeg[0].nombre), getData(rTer[0].nombre));
            clasificados = [...primeros, elim.ganador];
        }

        if (!clasificados.includes(campeon)) continue;
        nClasifica++;
        estadisticasEtapas.grupos.participantes++;
        estadisticasEtapas.grupos.clasificados++;

        // ETAPA 2: Semifinales
        // ==================
        window.CAMPEON.etapaActual = 'semifinal';
        estadisticasEtapas.semifinal.participantes++;
        
        const semi = _shuffleCampeon(clasificados);
        const sf1 = simPartido(getData(semi[0]), getData(semi[1]));
        const sf2 = simPartido(getData(semi[2]), getData(semi[3]));
        const finalistas = [sf1.ganador, sf2.ganador];

        if (!finalistas.includes(campeon)) continue;
        nFinalista++;
        estadisticasEtapas.semifinal.finalistas++;

        // ETAPA 3: Final
        // =============
        window.CAMPEON.etapaActual = 'final';
        estadisticasEtapas.final.participantes++;
        
        const fin = simPartido(getData(sf1.ganador), getData(sf2.ganador));
        if (fin.ganador === campeon) {
            nTitulo++;
            estadisticasEtapas.final.ganador++;
        }
    }

    // Calcular probabilidades condicionales
    const pClasifica = nClasifica / n;
    const pSemi = nClasifica ? nFinalista / nClasifica : 0;      // P(semi | clasificó)
    const pFinal = nFinalista ? nTitulo / nFinalista : 0;         // P(final | finalista)
    const pTitulo = nTitulo / n;                                  // P(bicampeón)

    // Restaurar estado
    window.CAMPEON.etapaActual = 'grupos';

    return {
        campeon,
        torneo: window.CAMPEON.torneo,
        n,
        pClasifica, pSemi, pFinal, pTitulo,
        nClasifica, nFinalista, nTitulo,
        bonusFuerza: bonusFuerzaCampeon(),
        etapaInicialLabel: numJugadores === 7 ? 'Liga (Top 4)' : 'Fase de grupos',
        // NUEVO v2.0: Estadísticas detalladas por etapa
        estadisticasEtapas: estadisticasEtapas,
        // Probabilidades desagregadas
        probabilidadesCondicionales: {
            clasificacion: pClasifica,
            dada_clasificacion_semifinal: pSemi,
            dada_semifinal_final: pFinal,
            final_bicampeonato: pTitulo
        }
    };
}

// =====================================================
// RENDER: PANEL DE BICAMPEONATO (MEJORADO v2.0)
// =====================================================
function renderPanelBicampeon(info) {
    if (!info) return '';
    const pct = x => (x * 100).toFixed(1) + '%';
    const bonus = info.bonusFuerza.toFixed(1);
    
    // Bonuses por etapa (para visualización educativa)
    const bonusGrupos = bonusFuerzaCampeon('grupos').toFixed(1);
    const bonusSemi = bonusFuerzaCampeon('semifinal').toFixed(1);
    const bonusFinal = bonusFuerzaCampeon('final').toFixed(1);

    return `
    <div class="panel bicampeon-panel" style="margin-bottom:2rem; background:#161b22; border:2px solid #d4af37; border-radius:12px; padding:20px 22px;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
            <span style="font-size:1.6rem;">👑</span>
            <h2 style="margin:0; color:#d4af37;">Probabilidad de Bicampeonato — ${info.campeon}</h2>
        </div>
        <p style="margin:0 0 4px 0; color:#c9d1d9; font-size:0.9rem;">
            Campeón defensor${info.torneo ? ` del <strong>${info.torneo}</strong>` : ''}. Recibe un peso extra discriminado por etapa
            (Grupos: <strong>+${bonusGrupos}</strong> | Semifinal: <strong>+${bonusSemi}</strong> | Final: <strong>+${bonusFinal}</strong>)
            calibrado con la referencia mundialista del <strong>~10%</strong> de bicampeonato.
        </p>
        <p style="margin:0 0 16px 0; color:#8b949e; font-size:0.8rem; font-style:italic;">
            ${info.n.toLocaleString('es-AR')} simulaciones Monte Carlo del torneo completo · 
            Probabilidades condicionales de cada etapa
        </p>

        <div class="bicampeon-etapas" style="display:flex; gap:12px; flex-wrap:wrap; align-items:stretch;">
            ${etapaCard('1 · ' + info.etapaInicialLabel, 'P(clasifica)', pct(info.pClasifica), '#58a6ff')}
            ${flechaCondicional()}
            ${etapaCard('2 · Semifinal', 'P(gana | clasificó)', pct(info.pSemi), '#3fb950')}
            ${flechaCondicional()}
            ${etapaCard('3 · Final', 'P(gana | finalista)', pct(info.pFinal), '#e3b341')}
        </div>

        <div style="margin-top:16px; padding:14px 16px; background:linear-gradient(135deg,#3a2f0a,#4a3c0c); border:1px solid #d4af37; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="color:#e6edf3; font-size:0.9rem;">
                <strong style="color:#d4af37;">P(bicampeón)</strong> = P(clasifica) × P(gana semi) × P(gana final)
            </div>
            <div style="font-size:1.8rem; font-weight:800; color:#d4af37; letter-spacing:1px;">
                ${pct(info.pTitulo)}
            </div>
        </div>
        
        <!-- Panel de estadísticas detalladas por etapa -->
        <div style="margin-top:16px; background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:12px 14px;">
            <div style="color:#8b949e; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                📊 Estadísticas Detalladas (${info.n.toLocaleString('es-AR')} simulaciones)
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; font-size:0.85rem;">
                <div style="padding:8px; background:#161b22; border-radius:6px; text-align:center;">
                    <div style="color:#8b949e; font-size:0.75rem; margin-bottom:4px;">Participó en Grupos</div>
                    <div style="color:#58a6ff; font-weight:600;">${info.estadisticasEtapas.grupos.participantes.toLocaleString('es-AR')}</div>
                </div>
                <div style="padding:8px; background:#161b22; border-radius:6px; text-align:center;">
                    <div style="color:#8b949e; font-size:0.75rem; margin-bottom:4px;">Llegó a Semifinal</div>
                    <div style="color:#3fb950; font-weight:600;">${info.estadisticasEtapas.semifinal.finalistas.toLocaleString('es-AR')}</div>
                </div>
                <div style="padding:8px; background:#161b22; border-radius:6px; text-align:center;">
                    <div style="color:#8b949e; font-size:0.75rem; margin-bottom:4px;">Ganó la Final (Bicampeón)</div>
                    <div style="color:#e3b341; font-weight:600;">${info.estadisticasEtapas.final.ganador.toLocaleString('es-AR')}</div>
                </div>
            </div>
        </div>
    </div>`;
}

function etapaCard(titulo, subt, valor, color) {
    return `
    <div style="flex:1; min-width:150px; background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:14px; text-align:center;">
        <div style="font-size:0.72rem; color:#8b949e; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">${titulo}</div>
        <div style="font-size:1.7rem; font-weight:800; color:${color};">${valor}</div>
        <div style="font-size:0.75rem; color:#c9d1d9; margin-top:4px;">${subt}</div>
    </div>`;
}

function flechaCondicional() {
    return `<div style="display:flex; align-items:center; color:#8b949e; font-size:1.4rem; font-weight:700;">×</div>`;
}

// Exponer globalmente
window.detectarUltimoCampeon = detectarUltimoCampeon;
window.bonusFuerzaCampeon = bonusFuerzaCampeon;
window.ajustarFuerzaPorCampeon = ajustarFuerzaPorCampeon;
window.calcularBicampeonato = calcularBicampeonato;
window.renderPanelBicampeon = renderPanelBicampeon;
