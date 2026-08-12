// =====================================================
// CARGAR PARTIDO (desde el celular)
// =====================================================
// Formulario para cargar el resultado de un partido jugado
// (amistoso o de torneo) y commitearlo directo a
// enfrentamientos_directos.txt vía api/cargar-partido.js.
//
// Reglas automáticas:
// - El select de Torneo solo muestra los que están en curso (los
//   finalizados ni siquiera aparecen ahí, para no confundir).
// - Torneos en curso cuya fase de Liga/Grupos ya está completa
//   (round-robin completo, detectado solo con los partidos
//   cargados): el select de Fase se limita a fases de playoff.
// - Si se crea un torneo nuevo, el nombre tiene que seguir el
//   formato "Primer/Segundo/Tercer/... torneo de hockey de mesa"
//   (se sugiere solo el próximo nombre correcto).
//
// Además incluye un panel de "Verificación de Clasificación"
// (solo para torneos en curso, no amistosos): indicando cuántos
// jugadores tiene una fase y cuántos clasifican, calcula la tabla
// apenas se completan todos los partidos de esa fase.
// =====================================================

const FASES_GRUPO_REGEX = /^Fase de (Liga|Grupos)/i;

const ORDINALES = [
    'Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto',
    'Séptimo', 'Octavo', 'Noveno', 'Décimo', 'Undécimo', 'Duodécimo'
];

const FASES_PLAYOFF = [
    'Repechaje 2dos Puestos',
    'Repechaje 3ros Puestos',
    'Partido Eliminatorio',
    'Semifinal',
    'Tercer Puesto',
    'Final'
];

const FASES_GRUPO_Y_PLAYOFF = [
    'Fase de Liga',
    'Fase de Grupos (A)',
    'Fase de Grupos (B)',
    'Fase de Grupos (C)',
    ...FASES_PLAYOFF
];

const NUEVO_VALUE = '__nuevo__';
const LS_PREFIX = 'cargarPartido_faseConfig_';

let matches = []; // partidos parseados desde el .txt (+ los que se van cargando en esta sesión)
let jugadores = []; // [{nombre, ranking}]

document.addEventListener('DOMContentLoaded', async () => {
    await inicializar();
    configurarEventos();
});

// ---------- Carga inicial ----------

async function inicializar() {
    try {
        const [texto, ranking] = await Promise.all([
            fetch('enfrentamientos_directos.txt').then(r => r.text()),
            (typeof cargarRankingCalculado === 'function') ? cargarRankingCalculado() : Promise.resolve([])
        ]);
        matches = parsearMatches(texto);
        jugadores = ranking;
    } catch (err) {
        console.error('Error cargando datos iniciales:', err);
        mostrarBanner('form-feedback', 'No se pudo leer enfrentamientos_directos.txt. Podés cargar el partido igual, pero no vamos a poder verificar clasificación.', 'warn');
    }

    poblarSelectJugador('jugador1');
    poblarSelectJugador('jugador2');
    poblarSelectTorneo();
    poblarSelectTorneoCheck();

    // Si hay un torneo en curso (sin Final cargada todavía), lo dejamos preseleccionado:
    // es lo más probable que se necesite seguir cargando (ej. semis/final pendientes).
    const torneoEnCurso = torneoEnCursoMasReciente();
    if (torneoEnCurso) {
        const torneoSel = document.getElementById('torneo');
        const checkTorneoSel = document.getElementById('check-torneo');
        if (torneoSel) torneoSel.value = torneoEnCurso;
        if (checkTorneoSel) checkTorneoSel.value = torneoEnCurso;
    }

    actualizarEstadoFormulario();
    actualizarFasesDisponibles();

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) fechaInput.valueAsDate = new Date();

    document.getElementById('goles1').value = '0';
    document.getElementById('goles2').value = '0';
}

// Convierte "D/M/YYYY" en un número comparable (para ordenar por fecha).
function fechaClave(fechaStr) {
    const partes = String(fechaStr).split('/').map(p => parseInt(p.trim(), 10));
    if (partes.length === 3 && partes.every(p => !isNaN(p))) {
        const [dia, mes, anio] = partes;
        return anio * 10000 + mes * 100 + dia;
    }
    return 0;
}

// Un torneo se considera "en curso" si todavía no tiene un partido de fase "Final" cargado.
function torneosEnCurso() {
    const torneos = [...new Set(matches.map(m => m.torneo))].filter(t => t !== 'Amistoso');
    const finalizados = new Set(matches.filter(m => m.fase === 'Final').map(m => m.torneo));
    return torneos.filter(t => !finalizados.has(t));
}

function torneosEnCursoOrdenados() {
    return torneosEnCurso().sort((a, b) => ultimaFecha(b) - ultimaFecha(a));
}

function ultimaFecha(torneo) {
    return Math.max(...matches.filter(m => m.torneo === torneo).map(m => fechaClave(m.fecha)), 0);
}

// El torneo en curso con el partido más reciente (el que probablemente siga faltando cargar).
function torneoEnCursoMasReciente() {
    const enCurso = torneosEnCursoOrdenados();
    return enCurso.length > 0 ? enCurso[0] : null;
}

// ---------- Formato de nombre para torneos nuevos ----------

// Todos los torneos "oficiales" alguna vez cargados (en curso o ya finalizados), sin Amistoso.
function torneosOficiales() {
    return [...new Set(matches.map(m => m.torneo))].filter(t => t !== 'Amistoso');
}

// Según cuántos torneos oficiales existen, calcula el nombre correcto del próximo
// (Primer, Segundo, Tercer... torneo de hockey de mesa).
function nombreSugeridoProximoTorneo() {
    const cantidad = torneosOficiales().length;
    const ordinal = ORDINALES[cantidad] || `${cantidad + 1}°`;
    return `${ordinal} torneo de hockey de mesa`;
}

function validarNombreNuevoTorneo(nombre) {
    return nombre.trim().toLowerCase() === nombreSugeridoProximoTorneo().toLowerCase();
}

function parsearMatches(texto) {
    return texto.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => l.split(',').map(p => p.trim()))
        .filter(p => p.length >= 7)
        .map(p => ({ j1: p[0], j2: p[1], resJ1: p[2], marcador: p[3], torneo: p[4], fecha: p[5], fase: p[6] }));
}

// ---------- Detección de estado del torneo ----------

// Fases de tipo Liga/Grupos que ya tienen al menos un partido cargado para ese torneo.
function fasesDeGrupoUsadas(torneo) {
    return [...new Set(matches.filter(m => m.torneo === torneo && FASES_GRUPO_REGEX.test(m.fase)).map(m => m.fase))];
}

// Una fase está "completa" si, con los jugadores que aparecieron en sus partidos,
// ya se jugó el todos-contra-todos (mismo criterio que el panel de clasificación,
// pero acá se infiere solo, sin pedir la cantidad de jugadores a mano).
function faseCompleta(torneo, fase) {
    const partidos = matches.filter(m => m.torneo === torneo && m.fase === fase);
    const jugadoresFase = new Set();
    partidos.forEach(m => { jugadoresFase.add(m.j1); jugadoresFase.add(m.j2); });
    const n = jugadoresFase.size;
    if (n < 2) return false;
    const esperados = (n * (n - 1)) / 2;
    return partidos.length >= esperados;
}

// La fase de grupos/liga de un torneo se considera terminada cuando hay al menos
// una fase de ese tipo cargada y todas las que se usaron están completas.
function faseDeGruposCompleta(torneo) {
    const fasesGrupo = fasesDeGrupoUsadas(torneo);
    if (fasesGrupo.length === 0) return false;
    return fasesGrupo.every(f => faseCompleta(torneo, f));
}

// ---------- Formato del torneo (según cantidad de jugadores) y partidos de playoff que faltan ----------

// Cantidad de jugadores distintos que jugaron la fase de liga/grupos: define el formato del torneo.
function jugadoresDeFaseGrupo(torneo) {
    const jugadoresFase = new Set();
    matches.filter(m => m.torneo === torneo && FASES_GRUPO_REGEX.test(m.fase))
        .forEach(m => { jugadoresFase.add(m.j1); jugadoresFase.add(m.j2); });
    return jugadoresFase.size;
}

// Qué fases de playoff corresponden según el formato, y cuántos partidos tiene cada una.
// Solo el formato de 9 jugadores (3 grupos de 3) usa repechajes y partido eliminatorio;
// el resto de los formatos (6, 7, 8, 10...) van directo a semis + tercer puesto + final.
function fasesPlayoffEsperadas(torneo) {
    const n = jugadoresDeFaseGrupo(torneo);
    if (n === 9) {
        return [
            { fase: 'Repechaje 2dos Puestos', esperados: 3 },
            { fase: 'Repechaje 3ros Puestos', esperados: 3 },
            { fase: 'Partido Eliminatorio', esperados: 1 },
            { fase: 'Semifinal', esperados: 2 },
            { fase: 'Tercer Puesto', esperados: 1 },
            { fase: 'Final', esperados: 1 }
        ];
    }
    return [
        { fase: 'Semifinal', esperados: 2 },
        { fase: 'Tercer Puesto', esperados: 1 },
        { fase: 'Final', esperados: 1 }
    ];
}

// Para un torneo con la fase de liga/grupos completa, qué partidos de playoff siguen faltando.
function partidosPlayoffFaltantes(torneo) {
    return fasesPlayoffEsperadas(torneo)
        .map(({ fase, esperados }) => {
            const cargados = matches.filter(m => m.torneo === torneo && m.fase === fase).length;
            return { fase, esperados, cargados, faltan: Math.max(0, esperados - cargados) };
        })
        .filter(f => f.faltan > 0);
}

// Jugadores que ya clasificaron a playoffs, para mostrarlos como referencia en el aviso.
// (Para el formato de 9 jugadores solo se muestran los 1° de cada grupo, que son los únicos
// que clasifican directo apenas termina la fase de grupos; 2dos y 3eros dependen del repechaje.)
function clasificadosPlayoff(torneo) {
    const fasesGrupo = fasesDeGrupoUsadas(torneo).sort();
    const n = jugadoresDeFaseGrupo(torneo);

    if (fasesGrupo.length === 1) {
        // Liga única: clasifican los primeros 4.
        const tabla = calcularTabla(matches.filter(m => m.torneo === torneo && m.fase === fasesGrupo[0]));
        return tabla.slice(0, 4).map(s => s.nombre);
    }

    if (n === 9) {
        // 3 grupos de 3: solo el 1° de cada grupo clasifica directo.
        return fasesGrupo.map(f => {
            const tabla = calcularTabla(matches.filter(m => m.torneo === torneo && m.fase === f));
            return tabla[0]?.nombre;
        }).filter(Boolean);
    }

    // 2 grupos (8 o 10 jugadores): clasifican los primeros 2 de cada grupo.
    const clasificados = [];
    fasesGrupo.forEach(f => {
        const tabla = calcularTabla(matches.filter(m => m.torneo === torneo && m.fase === f));
        clasificados.push(...tabla.slice(0, 2).map(s => s.nombre));
    });
    return clasificados;
}

// Estados posibles: 'nuevo' | 'amistoso' | 'en-curso-grupos' | 'en-curso-playoffs'
// (Los torneos finalizados ni siquiera son seleccionables desde el select de Torneo,
// así que ese estado ya no hace falta acá.)
function estadoTorneo(torneo) {
    if (!torneo || torneo === NUEVO_VALUE) return 'nuevo';
    if (torneo === 'Amistoso') return 'amistoso';
    return faseDeGruposCompleta(torneo) ? 'en-curso-playoffs' : 'en-curso-grupos';
}

// ---------- Poblar selects ----------

function poblarSelectJugador(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const actuales = jugadores.map(j => j.nombre).sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">Elegir jugador…</option>' +
        actuales.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('') +
        `<option value="${NUEVO_VALUE}">+ Nuevo jugador…</option>`;
}

// Solo muestra torneos en curso (los finalizados no aparecen: no hay nada más para cargarles).
function poblarSelectTorneo() {
    const sel = document.getElementById('torneo');
    if (!sel) return;

    const enCurso = torneosEnCursoOrdenados();

    let html = '<option value="Amistoso">Amistoso</option>' +
        enCurso.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('') +
        `<option value="${NUEVO_VALUE}">+ Nuevo torneo…</option>`;
    sel.innerHTML = html;
}

// Select de "Verificar Clasificación": solo torneos en curso (nunca Amistoso ni finalizados).
function poblarSelectTorneoCheck() {
    const sel = document.getElementById('check-torneo');
    const panel = document.getElementById('check-panel-body');
    const vacio = document.getElementById('check-empty');
    if (!sel) return;

    const enCurso = torneosEnCursoOrdenados();

    if (enCurso.length === 0) {
        sel.innerHTML = '';
        if (panel) panel.style.display = 'none';
        if (vacio) vacio.style.display = 'block';
        return;
    }

    if (panel) panel.style.display = '';
    if (vacio) vacio.style.display = 'none';
    sel.innerHTML = enCurso.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
}

// Reconstruye el select de Fase (form principal) y habilita/deshabilita el
// formulario entero según el estado del torneo elegido.
function actualizarEstadoFormulario() {
    const torneoSel = document.getElementById('torneo');
    const torneo = torneoSel.value;
    const estado = estadoTorneo(torneo);

    const faseSel = document.getElementById('fase');
    const faseNuevoInput = document.getElementById('fase-nuevo');
    const statusCont = document.getElementById('torneo-status');
    const camposFormulario = ['jugador1', 'jugador2', 'goles1', 'goles2', 'fecha', 'fase'];
    const btnCargar = document.getElementById('btn-cargar');

    // Reset: todo habilitado salvo que el estado diga lo contrario
    camposFormulario.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });
    document.querySelectorAll('.stepper-btn').forEach(b => b.disabled = false);
    if (btnCargar) btnCargar.disabled = false;
    faseNuevoInput.style.display = 'none';

    let faseOptions = [];
    let bannerHtml = '';

    if (estado === 'amistoso') {
        faseOptions = ['Amistoso'];
    } else if (estado === 'en-curso-playoffs') {
        const faltantes = partidosPlayoffFaltantes(torneo);
        faseOptions = faltantes.length > 0 ? faltantes.map(f => f.fase) : FASES_PLAYOFF;

        const n = jugadoresDeFaseGrupo(torneo);
        const clasificados = clasificadosPlayoff(torneo);
        const detalleFaltantes = faltantes.map(f => `${f.fase} (${f.faltan})`).join(', ') || '¡ya está todo cargado!';
        const clasificadosTexto = clasificados.length > 0 ? ` Clasificados: <strong>${clasificados.map(escapeHtml).join(', ')}</strong>.` : '';

        bannerHtml = `<div class="check-banner check-banner-info">🏁 Liga/Grupos completa (${n} jugadores${n === 9 ? ', con repechaje' : ''}).${clasificadosTexto} Falta cargar: <strong>${detalleFaltantes}</strong></div>`;
    } else {
        // 'en-curso-grupos' o 'nuevo'
        faseOptions = FASES_GRUPO_Y_PLAYOFF;
    }

    faseSel.innerHTML = faseOptions.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('') +
        (estado !== 'amistoso' ? `<option value="${NUEVO_VALUE}">+ Otra fase…</option>` : '');

    statusCont.innerHTML = bannerHtml;
}

// Actualiza el dropdown de fases del panel "Verificar Clasificación"
// según qué fases ya tienen partidos cargados para el torneo elegido.
function actualizarFasesDisponibles() {
    const torneoSel = document.getElementById('check-torneo');
    const faseSel = document.getElementById('check-fase');
    if (!torneoSel || !faseSel || !torneoSel.value) return;

    const torneo = torneoSel.value;
    const fases = [...new Set(matches.filter(m => m.torneo === torneo).map(m => m.fase))].sort();

    if (fases.length === 0) {
        faseSel.innerHTML = '<option value="">(sin partidos cargados todavía)</option>';
        return;
    }
    faseSel.innerHTML = fases.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    cargarConfigGuardada();
}

// ---------- Eventos ----------

function configurarEventos() {
    document.getElementById('jugador1')?.addEventListener('change', e => toggleNuevo(e.target, 'jugador1-nuevo'));
    document.getElementById('jugador2')?.addEventListener('change', e => toggleNuevo(e.target, 'jugador2-nuevo'));
    document.getElementById('torneo')?.addEventListener('change', e => {
        toggleNuevo(e.target, 'torneo-nuevo');
        if (e.target.value === NUEVO_VALUE) {
            const input = document.getElementById('torneo-nuevo');
            // Se sugiere directamente el nombre que corresponde por formato (Primer, Segundo, Tercer...).
            input.value = nombreSugeridoProximoTorneo();
        }
        actualizarEstadoFormulario();
    });
    document.getElementById('fase')?.addEventListener('change', e => toggleNuevo(e.target, 'fase-nuevo'));

    document.getElementById('form-cargar')?.addEventListener('submit', onSubmitPartido);

    document.querySelectorAll('.stepper-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (!target) return;
            const delta = parseInt(btn.dataset.delta, 10);
            const nuevoValor = Math.max(0, (parseInt(target.value, 10) || 0) + delta);
            target.value = nuevoValor;
        });
    });

    document.getElementById('check-torneo')?.addEventListener('change', actualizarFasesDisponibles);
    document.getElementById('check-fase')?.addEventListener('change', cargarConfigGuardada);
    document.getElementById('btn-calcular')?.addEventListener('click', onCalcularClasificacion);
}

function toggleNuevo(selectEl, inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const esNuevo = selectEl.value === NUEVO_VALUE;
    input.style.display = esNuevo ? 'block' : 'none';
    if (esNuevo) input.focus();
}

// ---------- Envío del formulario ----------

async function onSubmitPartido(e) {
    e.preventDefault();

    const torneoSel = document.getElementById('torneo');
    const torneoEsNuevo = torneoSel.value === NUEVO_VALUE;

    const jugador1 = valorFinal('jugador1', 'jugador1-nuevo');
    const jugador2 = valorFinal('jugador2', 'jugador2-nuevo');
    const torneo = valorFinal('torneo', 'torneo-nuevo');
    const fase = valorFinal('fase', 'fase-nuevo');
    const fechaInput = document.getElementById('fecha');
    const g1 = parseInt(document.getElementById('goles1').value, 10);
    const g2 = parseInt(document.getElementById('goles2').value, 10);

    if (!jugador1 || !jugador2) return mostrarBanner('form-feedback', 'Elegí (o escribí) los dos jugadores.', 'error');
    if (jugador1.toLowerCase() === jugador2.toLowerCase()) return mostrarBanner('form-feedback', 'Los dos jugadores no pueden ser el mismo.', 'error');
    if (!torneo) return mostrarBanner('form-feedback', 'Elegí (o escribí) el torneo.', 'error');
    if (torneoEsNuevo && !validarNombreNuevoTorneo(torneo)) {
        return mostrarBanner('form-feedback', `El nombre de un torneo nuevo tiene que seguir el formato "${nombreSugeridoProximoTorneo()}".`, 'error');
    }
    if (!fase) return mostrarBanner('form-feedback', 'Elegí (o escribí) la fase.', 'error');
    if (!fechaInput.value) return mostrarBanner('form-feedback', 'Elegí la fecha.', 'error');
    if (isNaN(g1) || isNaN(g2)) return mostrarBanner('form-feedback', 'Completá el marcador.', 'error');
    if (g1 === g2) return mostrarBanner('form-feedback', 'No puede haber empate.', 'error');

    const fecha = formatearFechaDDMYYYY(fechaInput.value);
    const resultado = g1 > g2 ? 'G' : 'P';
    const marcador = `${g1}-${g2}`;

    const body = { jugador1, jugador2, resultado, marcador, torneo, fecha, fase };

    const btn = document.getElementById('btn-cargar');
    btn.disabled = true;
    btn.textContent = 'Cargando…';
    mostrarBanner('form-feedback', '', 'hide');

    try {
        const res = await fetch('/api/cargar-partido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error desconocido');

        // Reflejar el partido localmente al toque, sin esperar el redeploy
        matches.push({ j1: jugador1, j2: jugador2, resJ1: resultado, marcador, torneo, fecha, fase });
        if (!jugadores.some(j => j.nombre === jugador1)) jugadores.push({ nombre: jugador1 });
        if (!jugadores.some(j => j.nombre === jugador2)) jugadores.push({ nombre: jugador2 });

        mostrarBanner('form-feedback', `✅ Cargado: ${jugador1} ${marcador} ${jugador2} — ${torneo} (${fase})`, 'success');

        // Reset parcial: mantiene torneo/fecha para cargar varios partidos seguidos
        poblarSelectJugador('jugador1');
        poblarSelectJugador('jugador2');
        document.getElementById('jugador1').value = '';
        document.getElementById('jugador2').value = '';
        document.getElementById('goles1').value = '0';
        document.getElementById('goles2').value = '0';

        poblarSelectTorneo();
        document.getElementById('torneo').value = [...document.getElementById('torneo').options].some(o => o.value === torneo) ? torneo : 'Amistoso';
        actualizarEstadoFormulario();

        poblarSelectTorneoCheck();
        if ([...document.getElementById('check-torneo').options].some(o => o.value === torneo)) {
            document.getElementById('check-torneo').value = torneo;
            actualizarFasesDisponibles();
            if ([...document.getElementById('check-fase').options].some(o => o.value === fase)) {
                document.getElementById('check-fase').value = fase;
            }
        }

        // Si ya hay una config guardada para este torneo+fase, re-chequea solo
        intentarAutoVerificacion(torneo, fase);
    } catch (err) {
        console.error(err);
        mostrarBanner('form-feedback', `❌ No se pudo cargar: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '✅ Cargar Partido';
    }
}

function valorFinal(selectId, inputId) {
    const sel = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    if (!sel) return '';
    if (sel.value === NUEVO_VALUE) return (input?.value || '').trim();
    return sel.value.trim();
}

function formatearFechaDDMYYYY(valorInputDate) {
    // valorInputDate viene como "YYYY-MM-DD"
    const [anio, mes, dia] = valorInputDate.split('-').map(n => parseInt(n, 10));
    return `${dia}/${mes}/${anio}`;
}

// ---------- Verificación de clasificación ----------

function claveConfig(torneo, fase) {
    return `${LS_PREFIX}${torneo}__${fase}`;
}

function cargarConfigGuardada() {
    const torneo = document.getElementById('check-torneo')?.value;
    const fase = document.getElementById('check-fase')?.value;
    if (!torneo || !fase) return;
    const raw = localStorage.getItem(claveConfig(torneo, fase));
    if (!raw) return;
    try {
        const cfg = JSON.parse(raw);
        document.getElementById('check-n').value = cfg.n || '';
        document.getElementById('check-clasifican').value = cfg.clasifican || '';
    } catch { /* ignore */ }
}

function guardarConfig(torneo, fase, n, clasifican) {
    localStorage.setItem(claveConfig(torneo, fase), JSON.stringify({ n, clasifican }));
}

function onCalcularClasificacion() {
    const torneo = document.getElementById('check-torneo').value;
    const fase = document.getElementById('check-fase').value;
    const n = parseInt(document.getElementById('check-n').value, 10);
    const clasifican = parseInt(document.getElementById('check-clasifican').value, 10);

    if (!torneo || !fase) return mostrarBanner('check-feedback', 'Elegí torneo y fase.', 'error');
    if (isNaN(n) || n < 2) return mostrarBanner('check-feedback', 'Indicá cuántos jugadores tiene esta fase.', 'error');
    if (isNaN(clasifican) || clasifican < 1 || clasifican > n) return mostrarBanner('check-feedback', 'Indicá cuántos clasifican (entre 1 y la cantidad de jugadores).', 'error');

    guardarConfig(torneo, fase, n, clasifican);
    ejecutarVerificacion(torneo, fase, n, clasifican, true);
}

function intentarAutoVerificacion(torneo, fase) {
    const raw = localStorage.getItem(claveConfig(torneo, fase));
    if (!raw) return;
    try {
        const cfg = JSON.parse(raw);
        if (cfg.n && cfg.clasifican) ejecutarVerificacion(torneo, fase, cfg.n, cfg.clasifican, false);
    } catch { /* ignore */ }
}

// Misma lógica de posiciones que usa historial_torneos.js (goles a favor
// como puntos, desempate por diferencia de gol y luego goles a favor).
function calcularTabla(partidosFase) {
    const stats = {};
    partidosFase.forEach(m => {
        if (!stats[m.j1]) stats[m.j1] = { nombre: m.j1, pj: 0, pg: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
        if (!stats[m.j2]) stats[m.j2] = { nombre: m.j2, pj: 0, pg: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
        const [gf1, gf2] = m.marcador.split('-').map(Number);
        stats[m.j1].pj++; stats[m.j2].pj++;
        stats[m.j1].gf += gf1; stats[m.j1].gc += gf2;
        stats[m.j2].gf += gf2; stats[m.j2].gc += gf1;
        stats[m.j1].pts += gf1; stats[m.j2].pts += gf2;
        if (m.resJ1 === 'G') { stats[m.j1].pg++; stats[m.j2].pp++; }
        else { stats[m.j2].pg++; stats[m.j1].pp++; }
    });
    return Object.values(stats)
        .map(s => ({ ...s, dif: s.gf - s.gc }))
        .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf);
}

function ejecutarVerificacion(torneo, fase, n, clasifican, mostrarSiIncompleta) {
    const partidosFase = matches.filter(m => m.torneo === torneo && m.fase === fase);
    const esperados = (n * (n - 1)) / 2;
    const cont = document.getElementById('check-resultado');
    if (!cont) return;

    if (partidosFase.length < esperados) {
        if (mostrarSiIncompleta) {
            cont.innerHTML = `<div class="check-banner check-banner-info">Van ${partidosFase.length} de ${esperados} partidos de "${escapeHtml(fase)}". Faltan ${esperados - partidosFase.length} para poder calcular quién clasifica.</div>`;
        }
        return;
    }

    const tabla = calcularTabla(partidosFase);
    const clasificados = tabla.slice(0, clasifican);

    let html = `<div class="check-banner check-banner-success">🏆 ¡Fase completa! (${partidosFase.length}/${esperados} partidos) — Clasifican: <strong>${clasificados.map(c => escapeHtml(c.nombre)).join(', ')}</strong></div>`;
    html += '<div class="table-responsive"><table class="ranking-table">';
    html += '<thead><tr><th>#</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>DIF</th><th>PTS</th></tr></thead><tbody>';
    tabla.forEach((s, idx) => {
        html += `<tr ${idx < clasifican ? 'style="background: rgba(46, 160, 67, 0.15);"' : ''}>
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(s.nombre)}</strong></td>
            <td>${s.pj}</td>
            <td>${s.pg}</td>
            <td>${s.pp}</td>
            <td>${s.gf}</td>
            <td>${s.gc}</td>
            <td>${s.dif > 0 ? '+' : ''}${s.dif}</td>
            <td><strong>${s.pts}</strong></td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    cont.innerHTML = html;
}

// ---------- Utilidades ----------

function mostrarBanner(contId, mensaje, tipo) {
    const cont = document.getElementById(contId);
    if (!cont) return;
    if (tipo === 'hide' || !mensaje) { cont.innerHTML = ''; return; }
    const clase = tipo === 'success' ? 'check-banner-success' : (tipo === 'warn' ? 'check-banner-info' : 'check-banner-error');
    cont.innerHTML = `<div class="check-banner ${clase}">${escapeHtml(mensaje)}</div>`;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
