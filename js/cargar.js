// =====================================================
// CARGAR PARTIDO (desde el celular)
// =====================================================
// Formulario para cargar el resultado de un partido jugado
// (amistoso o de torneo) y commitearlo directo a
// enfrentamientos_directos.txt vía api/cargar-partido.js.
//
// Además incluye un panel de "Verificación de Clasificación":
// cuando se completan todos los partidos de una fase de Liga /
// Grupos / Repechaje, calcula la tabla y te dice quiénes pasan.
// =====================================================

const FASES_SUGERIDAS = [
    'Fase de Liga',
    'Fase de Grupos (A)',
    'Fase de Grupos (B)',
    'Fase de Grupos (C)',
    'Repechaje 2dos Puestos',
    'Repechaje 3ros Puestos',
    'Partido Eliminatorio',
    'Semifinal',
    'Tercer Puesto',
    'Final',
    'Amistoso'
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
    poblarSelectTorneo('torneo');
    poblarSelectTorneo('check-torneo');
    poblarSelectFase('fase');

    // Si hay un torneo en curso (sin Final cargada todavía), lo dejamos preseleccionado
    // en los dos selects: es lo más probable que se necesite cargar (ej. semis/final pendientes).
    const torneoEnCurso = torneoEnCursoMasReciente();
    if (torneoEnCurso) {
        const torneoSel = document.getElementById('torneo');
        const checkTorneoSel = document.getElementById('check-torneo');
        if (torneoSel) torneoSel.value = torneoEnCurso;
        if (checkTorneoSel) checkTorneoSel.value = torneoEnCurso;
    }

    actualizarFasesDisponibles();

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) fechaInput.valueAsDate = new Date();
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

// El torneo en curso con el partido más reciente (el que probablemente siga faltando cargar).
function torneoEnCursoMasReciente() {
    const enCurso = torneosEnCurso();
    if (enCurso.length === 0) return null;
    return enCurso
        .map(t => ({ t, ultima: Math.max(...matches.filter(m => m.torneo === t).map(m => fechaClave(m.fecha))) }))
        .sort((a, b) => b.ultima - a.ultima)[0].t;
}

function parsearMatches(texto) {
    return texto.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => l.split(',').map(p => p.trim()))
        .filter(p => p.length >= 7)
        .map(p => ({ j1: p[0], j2: p[1], resJ1: p[2], marcador: p[3], torneo: p[4], fecha: p[5], fase: p[6] }));
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

function poblarSelectTorneo(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;

    const enCursoSet = new Set(torneosEnCurso());
    const todos = [...new Set(matches.map(m => m.torneo))].filter(t => t !== 'Amistoso');
    const enCurso = todos.filter(t => enCursoSet.has(t))
        .sort((a, b) => Math.max(...matches.filter(m => m.torneo === b).map(m => fechaClave(m.fecha))) -
                        Math.max(...matches.filter(m => m.torneo === a).map(m => fechaClave(m.fecha))));
    const finalizados = todos.filter(t => !enCursoSet.has(t)).sort();

    let html = '<option value="Amistoso">Amistoso</option>';
    if (enCurso.length > 0) {
        html += '<optgroup label="🔴 En curso (faltan playoffs)">' +
            enCurso.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('') +
            '</optgroup>';
    }
    if (finalizados.length > 0) {
        html += '<optgroup label="✅ Finalizados">' +
            finalizados.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('') +
            '</optgroup>';
    }
    html += `<option value="${NUEVO_VALUE}">+ Nuevo torneo…</option>`;
    sel.innerHTML = html;
}

function poblarSelectFase(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = FASES_SUGERIDAS.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('') +
        `<option value="${NUEVO_VALUE}">+ Otra fase…</option>`;
}

// Actualiza el dropdown de fases del panel "Verificar Clasificación"
// según qué fases ya tienen partidos cargados para el torneo elegido.
function actualizarFasesDisponibles() {
    const torneoSel = document.getElementById('check-torneo');
    const faseSel = document.getElementById('check-fase');
    if (!torneoSel || !faseSel) return;

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
    document.getElementById('torneo')?.addEventListener('change', e => toggleNuevo(e.target, 'torneo-nuevo'));
    document.getElementById('fase')?.addEventListener('change', e => toggleNuevo(e.target, 'fase-nuevo'));

    document.getElementById('form-cargar')?.addEventListener('submit', onSubmitPartido);

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

        // Reset parcial: mantiene torneo/fase/fecha para cargar varios partidos seguidos
        poblarSelectJugador('jugador1');
        poblarSelectJugador('jugador2');
        document.getElementById('jugador1').value = '';
        document.getElementById('jugador2').value = '';
        document.getElementById('goles1').value = '';
        document.getElementById('goles2').value = '';
        poblarSelectTorneo('torneo');
        document.getElementById('torneo').value = [...document.getElementById('torneo').options].some(o => o.value === torneo) ? torneo : 'Amistoso';
        poblarSelectTorneo('check-torneo');
        document.getElementById('check-torneo').value = torneo;
        actualizarFasesDisponibles();
        document.getElementById('check-fase').value = fase;

        // Si ya hay una config guardada (o se acaba de calcular) para este torneo+fase, re-chequea solo
        intentarAutoVerificacion(torneo, fase);
    } catch (err) {
        console.error(err);
        mostrarBanner('form-feedback', `❌ No se pudo cargar: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Cargar Partido';
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
