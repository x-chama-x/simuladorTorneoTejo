const jugadoresBase = [
    { nombre: 'Chama', ranking: 100, winRate: 0.69, promedioGoles: 6.5 },
    { nombre: 'Rafa', ranking: 80, winRate: 0.50, promedioGoles: 5.9 },
    { nombre: 'Tomy', ranking: 60, winRate: 0.63, promedioGoles: 6.2 },
    { nombre: 'Marco', ranking: 50, winRate: 0.60, promedioGoles: 6.2 },
    { nombre: 'Facu', ranking: 40, winRate: 0.50, promedioGoles: 5.8 },
    { nombre: 'Santi', ranking: 30, winRate: 0.25, promedioGoles: 4.7 },
    { nombre: 'Hector', ranking: 20, winRate: 0.17, promedioGoles: 4.7 }
];

const nuevosJugadores = [
    { nombre: 'Mateo', ranking: 15, winRate: 0.50, promedioGoles: 5.5 },
    { nombre: 'Kovic', ranking: 15, winRate: 0.00, promedioGoles: 4.5 },
    { nombre: 'Lucas', ranking: 15, winRate: 1.00, promedioGoles: 6.0 }
];

// Agrego la lista combinada de jugadores disponibles y una variable global para la selección
const jugadoresDisponibles = [...jugadoresBase, ...nuevosJugadores];
window.jugadoresSeleccionadosGlobal = null;
// Bandera para detectar la primera carga de la página: evitar seleccionar jugadores automáticamente al abrir
window._paginaCargada = false;

// --- Helper: Fisher-Yates shuffle y selección aleatoria ---
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function elegirAleatorioNombres(cantidad) {
    // Retorna un array de 'cantidad' nombres únicos escogidos aleatoriamente
    const nombres = jugadoresDisponibles.map(j => j.nombre);
    const mezclados = shuffleArray(nombres);
    return mezclados.slice(0, cantidad);
}

function simularPartido(jugador1, jugador2) {
    const rankDiff = jugador1.ranking - jugador2.ranking;
    const prob1 = 0.5 + (rankDiff / 200);

    const winRateAdj = (jugador1.winRate - jugador2.winRate) * 0.3;
    const probFinal = Math.max(0.2, Math.min(0.8, prob1 + winRateAdj));

    const gana1 = Math.random() < probFinal;

    let goles1, goles2;

    if (gana1) {
        goles1 = 7;
        const diff = Math.floor(Math.random() * 4) + 1;
        goles2 = Math.max(0, 7 - diff);
    } else {
        goles2 = 7;
        const diff = Math.floor(Math.random() * 4) + 1;
        goles1 = Math.max(0, 7 - diff);
    }

    return {
        ganador: gana1 ? jugador1.nombre : jugador2.nombre,
        goles1: goles1,
        goles2: goles2,
        resultado: `${goles1}${goles2}`
    };
}

function simularGrupo(jugadoresGrupo, nombreGrupo, matchNumberInicial) {
    const estadisticas = {};
    const partidos = [];
    let matchNumber = matchNumberInicial;

    jugadoresGrupo.forEach(j => {
        estadisticas[j.nombre] = {
            pj: 0, pg: 0, pp: 0, gf: 0, gc: 0, pts: 0, grupo: nombreGrupo
        };
    });

    for (let i = 0; i < jugadoresGrupo.length; i++) {
        for (let j = i + 1; j < jugadoresGrupo.length; j++) {
            const esAzul = Math.random() < 0.5;
            const resultado = simularPartido(jugadoresGrupo[i], jugadoresGrupo[j]);

            partidos.push({
                numero: matchNumber++,
                azul: esAzul ? jugadoresGrupo[i].nombre : jugadoresGrupo[j].nombre,
                rojo: esAzul ? jugadoresGrupo[j].nombre : jugadoresGrupo[i].nombre,
                golesAzul: esAzul ? resultado.goles1 : resultado.goles2,
                golesRojo: esAzul ? resultado.goles2 : resultado.goles1,
                ganador: resultado.ganador,
                grupo: nombreGrupo
            });

            estadisticas[jugadoresGrupo[i].nombre].pj++;
            estadisticas[jugadoresGrupo[j].nombre].pj++;
            estadisticas[jugadoresGrupo[i].nombre].gf += resultado.goles1;
            estadisticas[jugadoresGrupo[i].nombre].gc += resultado.goles2;
            estadisticas[jugadoresGrupo[j].nombre].gf += resultado.goles2;
            estadisticas[jugadoresGrupo[j].nombre].gc += resultado.goles1;

            if (resultado.ganador === jugadoresGrupo[i].nombre) {
                estadisticas[jugadoresGrupo[i].nombre].pg++;
                estadisticas[jugadoresGrupo[j].nombre].pp++;
                estadisticas[jugadoresGrupo[i].nombre].pts += resultado.goles1;
                estadisticas[jugadoresGrupo[j].nombre].pts += resultado.goles2;
            } else {
                estadisticas[jugadoresGrupo[j].nombre].pg++;
                estadisticas[jugadoresGrupo[i].nombre].pp++;
                estadisticas[jugadoresGrupo[j].nombre].pts += resultado.goles2;
                estadisticas[jugadoresGrupo[i].nombre].pts += resultado.goles1;
            }
        }
    }

    const rankingGrupo = Object.entries(estadisticas)
        .sort((a, b) => b[1].pts - a[1].pts || b[1].pg - a[1].pg || (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc))
        .map((entry, index) => ({ pos: index + 1, nombre: entry[0], ...entry[1] }));

    return { partidos, rankingGrupo, matchNumber };
}

function simularTorneo() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    let jugadores = [...jugadoresBase];

    const jugadoresNecesarios = numJugadores - jugadoresBase.length;
    for (let i = 0; i < jugadoresNecesarios; i++) {
        jugadores.push(nuevosJugadores[i]);
    }

    // Mezclar jugadores para distribuirlos aleatoriamente en grupos
    jugadores = jugadores.sort(() => Math.random() - 0.5);

    let html = '';
    let clasificados = [];

    if (numJugadores === 7) {
        // Formato Liga: Todos contra todos
        html += '<div class="phase-title">📋 FASE DE LIGA - TODOS CONTRA TODOS</div>';

        const { partidos, rankingGrupo } = simularGrupo(jugadores, 'Liga', 1);

        html += '<div class="matches-grid">';
        partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<div class="phase-title">📊 TABLA DE POSICIONES</div>';
        html += '<div class="standings"><table>';
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>DIF</th><th>Pts</th></tr>';

        rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 4 ? 'style="background: #e8f5e9;"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td>${r.gf - r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div>';

        clasificados = rankingGrupo.slice(0, 4);

    } else if (numJugadores === 8) {
        // 2 grupos de 4
        html += '<div class="phase-title">📋 FASE DE GRUPOS - 2 GRUPOS DE 4</div>';

        const grupoA = jugadores.slice(0, 4);
        const grupoB = jugadores.slice(4, 8);

        const resultadoA = simularGrupo(grupoA, 'A', 1);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber);

        // Mostrar partidos por grupo
        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO A</h3>';
        html += '<div class="matches-grid">';
        resultadoA.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔶 GRUPO B</h3>';
        html += '<div class="matches-grid">';
        resultadoB.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        // Tablas de posiciones
        html += '<div class="phase-title">📊 TABLAS DE POSICIONES</div>';
        // Uso una clase en lugar de estilos inline para poder controlar el responsive desde CSS
        html += '<div class="group-tables">';

        // Tabla Grupo A
        // Envolvemos el encabezado y la tabla en .standings-inner para que el header azul cubra todo el ancho desplazable
        html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo A</h4><table>`;
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        resultadoA.rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 2 ? 'style="background: #e8f5e9;"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div></div>';

        // Tabla Grupo B
        html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo B</h4><table>`;
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        resultadoB.rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 2 ? 'style="background: #e8f5e9;"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div></div>';
        html += '</div>';

        // Los 2 primeros de cada grupo clasifican
        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];

    } else if (numJugadores === 9) {
        // 3 grupos de 3
        html += '<div class="phase-title">📋 FASE DE GRUPOS - 3 GRUPOS DE 3</div>';

        const grupoA = jugadores.slice(0, 3);
        const grupoB = jugadores.slice(3, 6);
        const grupoC = jugadores.slice(6, 9);

        const resultadoA = simularGrupo(grupoA, 'A', 1);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber);
        const resultadoC = simularGrupo(grupoC, 'C', resultadoB.matchNumber);

        // Mostrar partidos
        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO A</h3>';
        html += '<div class="matches-grid">';
        resultadoA.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔶 GRUPO B</h3>';
        html += '<div class="matches-grid">';
        resultadoB.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO C</h3>';
        html += '<div class="matches-grid">';
        resultadoC.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        // Tablas
        html += '<div class="phase-title">📊 TABLAS DE POSICIONES</div>';
        html += '<div class="group-tables">';

        [resultadoA, resultadoB, resultadoC].forEach((resultado, idx) => {
            const nombreGrupo = ['A', 'B', 'C'][idx];
            // Tabla Grupo X
            // Añado un estilo inline como fallback para asegurar que el encabezado siempre tenga fondo azul
            html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo ${nombreGrupo}</h4><table>`;
            html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
            resultado.rankingGrupo.forEach(r => {
                const clasificaClass = r.pos === 1 ? 'style="background: #e8f5e9;"' : '';
                html += `<tr ${clasificaClass}>
                    <td class="position">${r.pos}°</td>
                    <td><strong>${r.nombre}</strong></td>
                    <td>${r.pj}</td>
                    <td>${r.pg}</td>
                    <td>${r.pp}</td>
                    <td>${r.gf}</td>
                    <td>${r.gc}</td>
                    <td><strong>${r.pts}</strong></td>
                </tr>`;
            });
            html += '</table></div></div>';
        });
        html += '</div>';

        // Clasifican los 3 primeros + mejor segundo
        const primeros = [
            resultadoA.rankingGrupo[0],
            resultadoB.rankingGrupo[0],
            resultadoC.rankingGrupo[0]
        ];

        const segundos = [
            resultadoA.rankingGrupo[1],
            resultadoB.rankingGrupo[1],
            resultadoC.rankingGrupo[1]
        ].sort((a, b) => b.pts - a.pts || b.pg - a.pg || (b.gf - b.gc) - (a.gf - a.gc));

        const mejorSegundo = segundos[0];

        html += '<div class="phase-title">✅ CLASIFICADOS A PLAYOFFS</div>';
        html += '<div class="standings"><table>';
        html += '<tr><th>Clasificación</th><th>Jugador</th><th>Grupo</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';

        primeros.forEach((r) => {
            html += `<tr style="background: #e8f5e9;">
                <td><strong>1° Grupo ${r.grupo}</strong></td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.grupo}</td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });

        html += `<tr style="background: #fff9c4;">
            <td><strong>Mejor 2°</strong></td>
            <td><strong>${mejorSegundo.nombre}</strong></td>
            <td>${mejorSegundo.grupo}</td>
            <td>${mejorSegundo.pj}</td>
            <td>${mejorSegundo.pg}</td>
            <td>${mejorSegundo.pp}</td>
            <td>${mejorSegundo.gf}</td>
            <td>${mejorSegundo.gc}</td>
            <td><strong>${mejorSegundo.pts}</strong></td>
        </tr>`;
        html += '</table></div>';

        clasificados = [...primeros, mejorSegundo];

    } else if (numJugadores === 10) {
        // 2 grupos de 5
        html += '<div class="phase-title">📋 FASE DE GRUPOS - 2 GRUPOS DE 5</div>';

        const grupoA = jugadores.slice(0, 5);
        const grupoB = jugadores.slice(5, 10);

        const resultadoA = simularGrupo(grupoA, 'A', 1);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber);

        // Mostrar partidos
        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO A</h3>';
        html += '<div class="matches-grid">';
        resultadoA.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔶 GRUPO B</h3>';
        html += '<div class="matches-grid">';
        resultadoB.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        // Tablas
        html += '<div class="phase-title">📊 TABLAS DE POSICIONES</div>';
        html += '<div class="group-tables">';

        // Tabla Grupo A
        html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo A</h4><table>`;
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        resultadoA.rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 2 ? 'style="background: #e8f5e9;"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div></div>';

        // Tabla Grupo B
        html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo B</h4><table>`;
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        resultadoB.rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 2 ? 'style="background: #e8f5e9;"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div></div>';
        html += '</div>';

        // Los 2 primeros de cada grupo clasifican
        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];
    }

    // Fase Final (Playoffs) - común para todos los formatos
    html += '<div class="phase-title">🏆 FASE FINAL - PLAYOFFS</div>';

    // Semifinales (sorteo aleatorio de clasificados)
    const semifinalistas = [...clasificados].sort(() => Math.random() - 0.5);

    const sf1Jugador1 = jugadores.find(j => j.nombre === semifinalistas[0].nombre);
    const sf1Jugador2 = jugadores.find(j => j.nombre === semifinalistas[1].nombre);
    const sf2Jugador1 = jugadores.find(j => j.nombre === semifinalistas[2].nombre);
    const sf2Jugador2 = jugadores.find(j => j.nombre === semifinalistas[3].nombre);

    const sf1 = simularPartido(sf1Jugador1, sf1Jugador2);
    const sf2 = simularPartido(sf2Jugador1, sf2Jugador2);

    html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">⚔️ SEMIFINALES</h3>';
    // Añadimos una clase específica para centrar solo las semifinales
    html += '<div class="matches-grid semifinals-grid">';
    html += `
        <div class="match-card">
            <div class="match-number">Semifinal 1</div>
            <div class="match-players">
                <div class="player blue">${semifinalistas[0].nombre}</div>
                <div class="vs">VS</div>
                <div class="player red">${semifinalistas[1].nombre}</div>
            </div>
            <div class="score">${sf1.goles1} - ${sf1.goles2}</div>
            <div class="winner-badge">🏆 ${sf1.ganador}</div>
        </div>
        <div class="match-card">
            <div class="match-number">Semifinal 2</div>
            <div class="match-players">
                <div class="player blue">${semifinalistas[2].nombre}</div>
                <div class="vs">VS</div>
                <div class="player red">${semifinalistas[3].nombre}</div>
            </div>
            <div class="score">${sf2.goles1} - ${sf2.goles2}</div>
            <div class="winner-badge">🏆 ${sf2.ganador}</div>
        </div>
    `;
    html += '</div>';

    // Tercer Puesto y Final
    const perdedorSF1 = sf1.ganador === semifinalistas[0].nombre ? semifinalistas[1].nombre : semifinalistas[0].nombre;
    const perdedorSF2 = sf2.ganador === semifinalistas[2].nombre ? semifinalistas[3].nombre : semifinalistas[2].nombre;

    const tercerPuestoJ1 = jugadores.find(j => j.nombre === perdedorSF1);
    const tercerPuestoJ2 = jugadores.find(j => j.nombre === perdedorSF2);
    const tercerPuesto = simularPartido(tercerPuestoJ1, tercerPuestoJ2);

    const finalistaJ1 = jugadores.find(j => j.nombre === sf1.ganador);
    const finalistaJ2 = jugadores.find(j => j.nombre === sf2.ganador);
    const final = simularPartido(finalistaJ1, finalistaJ2);

    html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🥉 TERCER PUESTO</h3>';
    html += '<div class="matches-grid" style="max-width: 400px; margin: 0 auto;">';
    html += `
        <div class="match-card">
            <div class="match-players">
                <div class="player blue">${perdedorSF1}</div>
                <div class="vs">VS</div>
                <div class="player red">${perdedorSF2}</div>
            </div>
            <div class="score">${tercerPuesto.goles1} - ${tercerPuesto.goles2}</div>
            <div class="winner-badge">🥉 ${tercerPuesto.ganador}</div>
        </div>
    `;
    html += '</div>';

    html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">👑 FINAL</h3>';
    html += '<div class="matches-grid" style="max-width: 400px; margin: 0 auto;">';
    html += `
        <div class="match-card">
            <div class="match-players">
                <div class="player blue">${sf1.ganador}</div>
                <div class="vs">VS</div>
                <div class="player red">${sf2.ganador}</div>
            </div>
            <div class="score">${final.goles1} - ${final.goles2}</div>
            <div class="winner-badge">👑 CAMPEÓN: ${final.ganador}</div>
        </div>
    `;
    html += '</div>';

    // Podio
    const cuarto = tercerPuesto.ganador === perdedorSF1 ? perdedorSF2 : perdedorSF1;
    const subcampeon = final.ganador === sf1.ganador ? sf2.ganador : sf1.ganador;

    html += '<div class="phase-title">🏆 PODIO FINAL</div>';
    html += '<div class="podium">';
    html += `
        <div class="podium-place second">
            <div class="medal">🥈</div>
            <div class="place-name">SUBCAMPEÓN</div>
            <div class="place-player">${subcampeon}</div>
        </div>
        <div class="podium-place first">
            <div class="medal">🥇</div>
            <div class="place-name">CAMPEÓN</div>
            <div class="place-player">${final.ganador}</div>
        </div>
        <div class="podium-place third">
            <div class="medal">🥉</div>
            <div class="place-name">TERCER PUESTO</div>
            <div class="place-player">${tercerPuesto.ganador}</div>
        </div>
    `;
    html += '</div>';

    html += `<div style="text-align: center; margin-top: 20px; color: #666;">
        <strong>4° Puesto:</strong> ${cuarto}
    </div>`;

    document.getElementById('resultado').innerHTML = html;
}

// Mostrar solo el formato al cargar y actualizar al cambiar selección
function mostrarFormato() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    let html = '<div class="phase-title">📋 FORMATO DEL TORNEO</div>';

    if (numJugadores === 7) {
        html += `
            <h3>Liga (Round Robin) — 7 Jugadores</h3>
            <p>Estructura: Todos contra todos, cada jugador enfrenta a los demás una vez.</p>
            <ul>
                <li>Partidos totales (fase): 21</li>
                <li>Clasificación: Los 4 primeros avanzan a playoff (semifinales + final + 3° puesto)</li>
                <li>Formato final: Semifinales, tercer puesto y final</li>
            </ul>
            <p>Notas: Ideal para medir resultados de forma completa entre todos los participantes.</p>
        `;
    } else if (numJugadores === 8) {
        html += `
            <h3>Grupos (2 grupos de 4) — 8 Jugadores</h3>
            <p>Estructura: 2 grupos (A y B) de 4 jugadores; todos contra todos dentro de cada grupo.</p>
            <ul>
                <li>Partidos totales (fase de grupos): 12</li>
                <li>Clasificación: Los 2 primeros de cada grupo avanzan a playoffs (4 clasificados)</li>
                <li>Formato final: Semifinales, tercer puesto y final</li>
            </ul>
            <p>Notas: Menos partidos que una liga completa, permite fases más rápidas y balanceadas por sorteo o siembra.</p>
        `;
    } else if (numJugadores === 9) {
        html += `
            <h3>Grupos (3 grupos de 3) — 9 Jugadores</h3>
            <p>Estructura: 3 grupos (A, B, C) de 3 jugadores; todos contra todos dentro del grupo.</p>
            <ul>
                <li>Partidos totales (fase de grupos): 9</li>
                <li>Clasificación: El 1° de cada grupo + el mejor 2° (total 4) avanzan a playoffs</li>
                <li>Formato final: Semifinales, tercer puesto y final</li>
            </ul>
            <p>Notas: Requiere criterio de desempate para comparar segundos; es compacto y económico en tiempo.</p>
        `;
    } else if (numJugadores === 10) {
        html += `
            <h3>Grupos (2 grupos de 5) — 10 Jugadores</h3>
            <p>Estructura: 2 grupos (A y B) de 5 jugadores; todos contra todos dentro de cada grupo.</p>
            <ul>
                <li>Partidos totales (fase de grupos): 20</li>
                <li>Clasificación: Los 2 primeros de cada grupo avanzan a playoffs (4 clasificados)</li>
                <li>Formato final: Semifinales, tercer puesto y final</li>
            </ul>
            <p>Notas: Requiere más tiempo; se usa cuando hay gran cantidad de participantes y se desea más competencia por grupo.</p>
        `;
    } else {
        html += '<p>Selecciona el número de jugadores y presiona "Simular Torneo" para ejecutar la simulación.</p>';
    }

    // Mostrar también la sección de selección de jugadores (si existe) debajo del formato
    const resultado = document.getElementById('resultado');
    if (resultado) resultado.innerHTML = html;

    // Además, actualizar el selector de jugadores (si aplica)
    const numSelect = document.getElementById('numPlayers');
    if (numSelect) renderPlayerSelection(parseInt(numSelect.value));

    // Actualizar estado del botón simular según la selección/toggle
    updateSimularButtonState();
}

// Render y lógica para selección de jugadores (UI debajo del select)
function renderPlayerSelection(numJugadores) {
    const container = document.getElementById('playerSelection');
    if (!container) return;

    // Si formato 10 jugadores usamos todos y no mostramos selección
    if (numJugadores === 10) {
        container.innerHTML = '<p>Se usarán todos los jugadores disponibles (10).</p>';
        window.jugadoresSeleccionadosGlobal = null;
        updateSimularButtonState();
        return;
    }

    const needed = numJugadores;
    let html = `<p>Seleccioná exactamente ${needed} jugadores:</p><div class="player-list">`;
    jugadoresDisponibles.forEach(j => {
        html += `<label style="display:inline-block; width:200px; margin:4px;"><input type="checkbox" class="player-checkbox" data-nombre="${j.nombre}" /> ${j.nombre}</label>`;
    });
    html += '</div>';

    // Cartel de advertencia si no se llega a la cantidad requerida
    html += '<p id="selectionWarning" style="color:#c0392b; font-weight:600; display:none; margin-top:8px;"></p>';

    container.innerHTML = html;

    const checkboxes = Array.from(container.querySelectorAll('.player-checkbox'));
    checkboxes.forEach(cb => cb.addEventListener('change', () => {
        const checked = checkboxes.filter(c => c.checked);
        if (checked.length > needed) {
            cb.checked = false;
            alert(`Sólo podés seleccionar ${needed} jugadores.`);
            return;
        }
        // actualizar global cuando coincida la cantidad
        if (checked.length === needed) {
            window.jugadoresSeleccionadosGlobal = checked.map(c => c.getAttribute('data-nombre'));
        } else {
            window.jugadoresSeleccionadosGlobal = null;
        }
        // actualizar estado del botón simular tras cambio manual
        updateSimularButtonState();
    }));

    // Antes: uso de toggle para activar/desactivar la selección automática.
    // Ahora: la selección automática es la conducta por defecto.
    // No aplicar selección automática en la primera carga de la página
    if (window._paginaCargada && !window.jugadoresSeleccionadosGlobal) {
        const seleccionAuto = elegirAleatorioNombres(needed);
        window.jugadoresSeleccionadosGlobal = seleccionAuto.slice();
        // marcar checkboxes correspondientes
        checkboxes.forEach(cb => {
            const nombre = cb.getAttribute('data-nombre');
            cb.checked = seleccionAuto.includes(nombre);
        });
        console.info('Selección automática aplicada:', seleccionAuto);
    } else {
        // sin indicador visual
    }

    // Actualizar estado del botón simular al terminar de renderizar
    updateSimularButtonState();
}

function obtenerJugadoresSeleccionadosPorNombre(numJugadores) {
    if (numJugadores === 10) {
        return jugadoresDisponibles.slice(0, 10);
    }

    // Ahora: siempre permitimos selección automática por defecto si no hay selección manual
    if (!window.jugadoresSeleccionadosGlobal || window.jugadoresSeleccionadosGlobal.length !== numJugadores) {
        const auto = elegirAleatorioNombres(numJugadores);
        window.jugadoresSeleccionadosGlobal = auto.slice();
        console.info('Selección automática (obtener):', auto);
    }
    return window.jugadoresSeleccionadosGlobal.map(nombre => jugadoresDisponibles.find(j => j.nombre === nombre)).filter(Boolean);
}

// --- Nuevo: controlar estado del botón 'Simular' ---
function updateSimularButtonState() {
    const simBtnEl = document.getElementById('simularBtn');
    const numSelectEl = document.getElementById('numPlayers');
    if (!simBtnEl || !numSelectEl) return;

    const num = parseInt(numSelectEl.value);

    // Caso especial: 10 jugadores -> siempre permitido (no hay selección manual que hacer)
    const warningEl = document.getElementById('selectionWarning');
    if (num === 10) {
        simBtnEl.disabled = false;
        if (warningEl) warningEl.style.display = 'none';
        return;
    }

    // Contar checkboxes marcados en el DOM (si existe el contenedor)
    const container = document.getElementById('playerSelection');
    let selectedCount = 0;
    if (container) {
        selectedCount = container.querySelectorAll('.player-checkbox:checked').length;
    } else if (window.jugadoresSeleccionadosGlobal) {
        // Fallback: usar la selección global
        selectedCount = window.jugadoresSeleccionadosGlobal.length;
    }

    // Habilitar sólo si la cantidad marcada coincide con la requerida
    simBtnEl.disabled = selectedCount !== num;

    // Mostrar cartel si hay menos seleccionados que los requeridos
    if (warningEl) {
        if (selectedCount < num) {
            const faltan = num - selectedCount;
            warningEl.textContent = `Faltan ${faltan} jugador${faltan === 1 ? '' : 'es'} para completar ${num}.`;
            warningEl.style.display = 'block';
        } else if (selectedCount > num) {
            warningEl.textContent = `Seleccioná sólo ${num} jugadores.`;
            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
        }
    }
}

// Enlazar botón simular al DOM
const simBtn = document.getElementById('simularBtn');
if (simBtn) {
    simBtn.addEventListener('click', () => {
        const num = parseInt(document.getElementById('numPlayers').value);
        const seleccion = obtenerJugadoresSeleccionadosPorNombre(num);
        if (num !== 10 && seleccion.length !== num) {
            alert(`Por favor seleccioná exactamente ${num} jugadores antes de simular.`);
            return;
        }
        // Llamamos a simularTorneo pero inyectando la selección temporalmente
        // Guardamos jugadoresBase original
        const originalBase = [...jugadoresBase];
        // Reemplazamos jugadoresBase por la selección (si aplica)
        if (num !== 10) {
            // Si seleccionamos menos de base, completamos con nuevosJugadores
            let seleccionCompleta = [...seleccion];
            if (seleccionCompleta.length < num) {
                const faltan = num - seleccionCompleta.length;
                for (let i = 0; i < faltan; i++) {
                    if (nuevosJugadores[i]) seleccionCompleta.push(nuevosJugadores[i]);
                }
            }
            // reescribimos jugadoresBase temporalmente
            for (let i = 0; i < jugadoresBase.length; i++) {
                jugadoresBase[i] = seleccionCompleta[i] || jugadoresBase[i];
            }
            // Si hay más seleccionados que jugadoresBase originales, extendemos
            if (seleccionCompleta.length > jugadoresBase.length) {
                // push adicionales
                for (let i = jugadoresBase.length; i < seleccionCompleta.length; i++) jugadoresBase.push(seleccionCompleta[i]);
            }
        }

        // Ejecutar la simulación (usa la variable jugadoresBase modificada)
        simularTorneo();

        // Restaurar jugadoresBase original
        for (let i = 0; i < originalBase.length; i++) jugadoresBase[i] = originalBase[i];
        jugadoresBase.length = originalBase.length;
    });
}

// Añadir listener para el botón de selección aleatoria en UI (útil cuando el toggle está desactivado)
const randomSelectBtn = document.getElementById('randomSelectBtn');
if (randomSelectBtn) {
    randomSelectBtn.addEventListener('click', () => {
        const numSelectEl = document.getElementById('numPlayers');
        if (!numSelectEl) return;
        const num = parseInt(numSelectEl.value);
        if (num === 10) return; // no aplica

        // Generar selección aleatoria de nombres
        const seleccionAuto = elegirAleatorioNombres(num);
        window.jugadoresSeleccionadosGlobal = seleccionAuto.slice();

        // Marcar checkboxes si existen
        const container = document.getElementById('playerSelection');
        if (container) {
            const checkboxes = Array.from(container.querySelectorAll('.player-checkbox'));
            checkboxes.forEach(cb => {
                const nombre = cb.getAttribute('data-nombre');
                cb.checked = seleccionAuto.includes(nombre);
            });
        }

        // Actualizar estado y cerrar listener
        updateSimularButtonState();
        console.info('Selección manual vía botón aleatorio:', seleccionAuto);
    });
}

// Asegurarse de renderizar la selección inicial y mostrar el formato al cargar
document.addEventListener('DOMContentLoaded', () => {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    mostrarFormato();
    renderPlayerSelection(numJugadores);
});
