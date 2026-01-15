const jugadoresBase = [
    { nombre: 'Chama', ranking: 198, winRate: 0.69, promedioGoles: 6.5 },
    { nombre: 'Facu', ranking: 126, winRate: 0.50, promedioGoles: 5.8 },
    { nombre: 'Tomy', ranking: 118, winRate: 0.63, promedioGoles: 6.2 },
    { nombre: 'Marco', ranking: 76, winRate: 0.60, promedioGoles: 6.2 },
    { nombre: 'Lucas', ranking: 50, winRate: 1.00, promedioGoles: 6.0 },
    { nombre: 'Rafa', ranking: 35, winRate: 0.50, promedioGoles: 5.9 },
    { nombre: 'Pedro', ranking: 21, winRate: 0.50, promedioGoles: 5.5 },
    { nombre: 'Hector', ranking: 20, winRate: 0.17, promedioGoles: 4.7 }
];

const nuevosJugadores = [
    { nombre: 'Mateo', ranking: 17, winRate: 0.50, promedioGoles: 5.5 },
    { nombre: 'Santi', ranking: 5, winRate: 0.25, promedioGoles: 4.7 },
    { nombre: 'Kovic', ranking: 5, winRate: 0.00, promedioGoles: 4.5 }
];

// Agrego la lista combinada de jugadores disponibles y una variable global para la selección
const jugadoresDisponibles = [...jugadoresBase, ...nuevosJugadores];
window.jugadoresSeleccionadosGlobal = null; // al inicio NINGUNO seleccionado (según requerimiento)
// Bandera para detectar la primera carga de la página
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

function simularGrupo(jugadoresGrupo, nombreGrupo, matchNumberInicial, estadisticasGlobales = null) {
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

            // Actualizar estadísticas globales (goles en liga)
            if (estadisticasGlobales) {
                if (estadisticasGlobales[jugadoresGrupo[i].nombre]) {
                    estadisticasGlobales[jugadoresGrupo[i].nombre].golesLiga += resultado.goles1;
                    estadisticasGlobales[jugadoresGrupo[i].nombre].partidosJugados++;
                }
                if (estadisticasGlobales[jugadoresGrupo[j].nombre]) {
                    estadisticasGlobales[jugadoresGrupo[j].nombre].golesLiga += resultado.goles2;
                    estadisticasGlobales[jugadoresGrupo[j].nombre].partidosJugados++;
                }
            }

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

    // Inicializar estadísticas de jugadores para la tabla final
    const estadisticasJugadores = {};
    jugadores.forEach(j => {
        estadisticasJugadores[j.nombre] = {
            golesLiga: 0,
            golesFaseFinal: 0,
            partidosJugados: 0
        };
    });

    let html = '';
    let clasificados = [];

    if (numJugadores === 7) {
        // Formato Liga: Todos contra todos
        html += '<div class="phase-title">📋 FASE DE LIGA - TODOS CONTRA TODOS</div>';

        const { partidos, rankingGrupo } = simularGrupo(jugadores, 'Liga', 1, estadisticasJugadores);

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

        const resultadoA = simularGrupo(grupoA, 'A', 1, estadisticasJugadores);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber, estadisticasJugadores);

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

        const resultadoA = simularGrupo(grupoA, 'A', 1, estadisticasJugadores);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber, estadisticasJugadores);
        const resultadoC = simularGrupo(grupoC, 'C', resultadoB.matchNumber, estadisticasJugadores);

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
        ];

        // Nuevo comportamiento: los 3 mejores segundos juegan una mini-liga (3 partidos, todos contra todos)
        // y el primero de esa mini-tabla pasa a playoffs. Se muestra una tabla especial y los partidos.
        let mejorSegundo;
        // Construir objetos jugador completos (buscar en la lista 'jugadores')
        const candidatosSegundos = segundos.map(s => ({
            nombre: s.nombre,
            grupo: s.grupo,
            // buscamos el objeto completo en la lista mezclada 'jugadores' usada en esta simulación
            data: jugadores.find(j => j.nombre === s.nombre) || jugadoresDisponibles.find(j => j.nombre === s.nombre) || { nombre: s.nombre, ranking: 50, winRate: 0.5, promedioGoles: 5 }
        }));

        // Inicializar estadísticas de mini-liga
        const miniStats = {};
        candidatosSegundos.forEach(c => {
            miniStats[c.nombre] = { pj: 0, pg: 0, pp: 0, gf: 0, gc: 0, pts: 0, grupo: c.grupo };
        });

        // Simular los 3 partidos: (0 vs 1), (0 vs 2), (1 vs 2)
        const miniPartidos = [];
        for (let i = 0; i < candidatosSegundos.length; i++) {
            for (let j = i + 1; j < candidatosSegundos.length; j++) {
                const j1 = candidatosSegundos[i].data;
                const j2 = candidatosSegundos[j].data;
                const resultadoMini = simularPartido(j1, j2);

                miniPartidos.push({
                    azul: j1.nombre,
                    rojo: j2.nombre,
                    golesAzul: resultadoMini.goles1,
                    golesRojo: resultadoMini.goles2,
                    ganador: resultadoMini.ganador
                });

                // actualizar stats (mismo criterio que en simularGrupo: pts acumulados como goles)
                miniStats[j1.nombre].pj++;
                miniStats[j2.nombre].pj++;
                miniStats[j1.nombre].gf += resultadoMini.goles1;
                miniStats[j1.nombre].gc += resultadoMini.goles2;
                miniStats[j2.nombre].gf += resultadoMini.goles2;
                miniStats[j2.nombre].gc += resultadoMini.goles1;

                // Actualizar estadísticas globales (mini-liga cuenta como fase de liga)
                if (estadisticasJugadores[j1.nombre]) {
                    estadisticasJugadores[j1.nombre].golesLiga += resultadoMini.goles1;
                    estadisticasJugadores[j1.nombre].partidosJugados++;
                }
                if (estadisticasJugadores[j2.nombre]) {
                    estadisticasJugadores[j2.nombre].golesLiga += resultadoMini.goles2;
                    estadisticasJugadores[j2.nombre].partidosJugados++;
                }

                if (resultadoMini.ganador === j1.nombre) {
                    miniStats[j1.nombre].pg++;
                    miniStats[j2.nombre].pp++;
                    miniStats[j1.nombre].pts += resultadoMini.goles1;
                    miniStats[j2.nombre].pts += resultadoMini.goles2;
                } else {
                    miniStats[j2.nombre].pg++;
                    miniStats[j1.nombre].pp++;
                    miniStats[j2.nombre].pts += resultadoMini.goles2;
                    miniStats[j1.nombre].pts += resultadoMini.goles1;
                }
            }
        }

        // Generar ranking de la mini-liga
        const rankingMini = Object.entries(miniStats)
            .map(entry => ({ nombre: entry[0], ...entry[1] }))
            .sort((a, b) => b.pts - a.pts || b.pg - a.pg || (b.gf - b.gc) - (a.gf - a.gc));

        // Construir HTML de mini-liga (partidos + tabla)
        html += '<div class="phase-title">⚖️ MINI-LIGA ENTRE 2° (3 PARTIDOS)</div>';
        html += '<div class="matches-grid">';
        miniPartidos.forEach((p, idx) => {
            html += `
                <div class="match-card">
                    <div class="match-number">Desempate ${idx + 1}</div>
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

        html += '<div class="standings"><table>';
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        rankingMini.forEach((r, index) => {
            const highlight = index === 0 ? 'style="background: #fff9c4;"' : '';
            html += `<tr ${highlight}>
                <td class="position">${index + 1}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div>';

        // Determinar mejorSegundo a partir del rankingMini
        mejorSegundo = rankingMini[0];

        // Si hay empate absoluto en la mini-liga (mismo pts, pg y gd para el top), desempatar aleatoriamente
        if (rankingMini.length > 1) {
            const topPts = rankingMini[0].pts;
            const topPg = rankingMini[0].pg;
            const topGd = rankingMini[0].gf - rankingMini[0].gc;
            const empatadosTop = rankingMini.filter(r => r.pts === topPts && r.pg === topPg && (r.gf - r.gc) === topGd);
            if (empatadosTop.length > 1) {
                if (empatadosTop.length === 2) {
                    // Desempate por enfrentamiento directo dentro de la mini-liga
                    const a = empatadosTop[0].nombre;
                    const b = empatadosTop[1].nombre;
                    const partido = miniPartidos.find(p => (p.azul === a && p.rojo === b) || (p.azul === b && p.rojo === a));
                    if (partido) {
                        const ganadorHead = partido.ganador;
                        const elegido = rankingMini.find(r => r.nombre === ganadorHead) || empatadosTop.find(r => r.nombre === ganadorHead);
                        html += `<p style="color:#16a34a; font-weight:700;">Desempate por enfrentamiento directo: ${ganadorHead} venció a ${ganadorHead === a ? b : a} en la mini-liga; por lo tanto es el mejor 2°.</p>`;
                        mejorSegundo = elegido;
                    } else {
                        // Caso improbable: no se encontró el partido -> fallback aleatorio
                        const elegido = empatadosTop[Math.floor(Math.random() * empatadosTop.length)];
                        html += `<p style="color:#c0392b; font-weight:700;">Nota: Hubo empate absoluto entre ${empatadosTop.map(e=>e.nombre).join(', ')}. No se encontró el enfrentamiento directo; se eligió aleatoriamente a ${elegido.nombre} como mejor 2°.</p>`;
                        mejorSegundo = elegido;
                    }
                } else {
                    // Empate entre 3 o más -> mantener elección aleatoria
                    const elegido = empatadosTop[Math.floor(Math.random() * empatadosTop.length)];
                    html += `<p style="color:#c0392b; font-weight:700;">Nota: Hubo empate absoluto en la mini-liga entre ${empatadosTop.map(e=>e.nombre).join(', ')}. Se eligió aleatoriamente a ${elegido.nombre} como mejor 2°.</p>`;
                    mejorSegundo = elegido;
                }
            }
        }

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

        const resultadoA = simularGrupo(grupoA, 'A', 1, estadisticasJugadores);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber, estadisticasJugadores);

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

    // Actualizar estadísticas de fase final (semifinales)
    estadisticasJugadores[semifinalistas[0].nombre].golesFaseFinal += sf1.goles1;
    estadisticasJugadores[semifinalistas[0].nombre].partidosJugados++;
    estadisticasJugadores[semifinalistas[1].nombre].golesFaseFinal += sf1.goles2;
    estadisticasJugadores[semifinalistas[1].nombre].partidosJugados++;
    estadisticasJugadores[semifinalistas[2].nombre].golesFaseFinal += sf2.goles1;
    estadisticasJugadores[semifinalistas[2].nombre].partidosJugados++;
    estadisticasJugadores[semifinalistas[3].nombre].golesFaseFinal += sf2.goles2;
    estadisticasJugadores[semifinalistas[3].nombre].partidosJugados++;

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

    // Actualizar estadísticas de fase final (tercer puesto)
    estadisticasJugadores[perdedorSF1].golesFaseFinal += tercerPuesto.goles1;
    estadisticasJugadores[perdedorSF1].partidosJugados++;
    estadisticasJugadores[perdedorSF2].golesFaseFinal += tercerPuesto.goles2;
    estadisticasJugadores[perdedorSF2].partidosJugados++;

    const finalistaJ1 = jugadores.find(j => j.nombre === sf1.ganador);
    const finalistaJ2 = jugadores.find(j => j.nombre === sf2.ganador);
    const final = simularPartido(finalistaJ1, finalistaJ2);

    // Actualizar estadísticas de fase final (final)
    estadisticasJugadores[sf1.ganador].golesFaseFinal += final.goles1;
    estadisticasJugadores[sf1.ganador].partidosJugados++;
    estadisticasJugadores[sf2.ganador].golesFaseFinal += final.goles2;
    estadisticasJugadores[sf2.ganador].partidosJugados++;

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

    // Tabla de estadísticas
    html += '<div class="phase-title">📊 ESTADÍSTICAS DEL TORNEO</div>';
    html += '<div class="standings"><table>';
    html += '<tr><th>Jugador</th><th>Goles Liga</th><th>Goles Fase Final</th><th>Total Goles (TG)</th><th>Partidos (PJ)</th><th>Prom TG/PJ</th></tr>';

    // Convertir estadísticas a array y ordenar por promedio TG/PJ (descendente)
    const statsArray = Object.entries(estadisticasJugadores).map(([nombre, stats]) => ({
        nombre,
        golesLiga: stats.golesLiga,
        golesFaseFinal: stats.golesFaseFinal,
        totalGoles: stats.golesLiga + stats.golesFaseFinal,
        partidosJugados: stats.partidosJugados,
        promedio: stats.partidosJugados > 0 ? ((stats.golesLiga + stats.golesFaseFinal) / stats.partidosJugados) : 0,
        promedioStr: stats.partidosJugados > 0 ? ((stats.golesLiga + stats.golesFaseFinal) / stats.partidosJugados).toFixed(2) : '0.00'
    })).sort((a, b) => b.promedio - a.promedio || b.totalGoles - a.totalGoles);

    statsArray.forEach(stat => {
        html += `<tr>
            <td><strong>${stat.nombre}</strong></td>
            <td>${stat.golesLiga}</td>
            <td>${stat.golesFaseFinal}</td>
            <td><strong>${stat.totalGoles}</strong></td>
            <td>${stat.partidosJugados}</td>
            <td><strong>${stat.promedioStr}</strong></td>
        </tr>`;
    });

    html += '</table></div>';

    // Texto informativo sobre el goleador (maneja empates)
    const mejorPromedio = statsArray[0].promedio;
    const goleadores = statsArray.filter(stat => stat.promedio === mejorPromedio);

    html += `<div style="text-align: center; margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">`;

    if (goleadores.length === 1) {
        // Un solo goleador
        html += `<p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">
            ⚽ <strong style="color: #667eea;">${goleadores[0].nombre}</strong> es el goleador del torneo con un promedio de <strong style="color: #667eea;">${goleadores[0].promedioStr}</strong> goles por partido
        </p>`;
    } else {
        // Empate: múltiples goleadores
        const nombresGoleadores = goleadores.map(g => `<strong style="color: #667eea;">${g.nombre}</strong>`).join(', ').replace(/,([^,]*)$/, ' y$1');
        html += `<p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">
            ⚽ ${nombresGoleadores} son los goleadores del torneo con un promedio de <strong style="color: #667eea;">${goleadores[0].promedioStr}</strong> goles por partido
        </p>`;
    }

    html += `<p style="margin: 5px 0 0 0; font-size: 14px; color: #666; font-style: italic;">
            El goleador del torneo es el jugador con el mejor promedio de goles
        </p>
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
                <li>Clasificación: El 1° de cada grupo + el mejor 2° (total 4) avanzan a playoffs.</li>
                <li>Formato final: Semifinales, tercer puesto y final.</li>
            </ul>
            <p>Notas: Cuando haya que comparar los segundos de cada grupo, se juega una <strong>mini-liga</strong> entre los 3 segundos (3 partidos, todos contra todos). El primero de esa mini-liga se considera el "Mejor 2°" y avanza a playoffs.</p>
            <p>Reglas de la mini-liga:
                <ul>
                    <li>Orden: se clasifica por <strong>Pts</strong> (suma de goles obtenidos en la mini-liga), luego <strong>PG</strong> (partidos ganados) y luego <strong>GD</strong> (diferencia GF-GC).</li>
                    <li>Si hay empate absoluto por el primer puesto entre <strong>2 jugadores</strong>, se desempata por el <strong>enfrentamiento directo</strong> que ya se jugó en la mini-liga (el vencedor de ese partido pasa).</li>
                    <li>Si hay empate absoluto entre los <strong>3</strong> jugadores (o no se pudiera resolver por el enfrentamiento directo), se elige aleatoriamente y se mostrará una nota explicativa.</li>
                </ul>
            </p>
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

    // Agregar sección del ranking FIFA actual
    html += `
        <div class="phase-title" style="margin-top: 20px;">🏆 RANKING FIFA ACTUAL</div>
        <div class="standings" style="margin-bottom: 20px;">
            <table>
                <tr>
                    <th>Pos</th>
                    <th>Jugador</th>
                    <th>Puntos</th>
                </tr>
    `;

    // Ordenar jugadores por ranking (mayor a menor)
    const jugadoresOrdenados = [...jugadoresDisponibles].sort((a, b) => b.ranking - a.ranking);
    jugadoresOrdenados.forEach((j, index) => {
        const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        html += `
            <tr>
                <td class="position">${index + 1}° ${medalla}</td>
                <td><strong>${j.nombre}</strong></td>
                <td>${j.ranking} pts</td>
            </tr>
        `;
    });

    html += `
            </table>
        </div>
    `;

    // Mostrar también la sección de selección de jugadores (si existe) debajo del formato
    const resultado = document.getElementById('resultado');
    if (resultado) resultado.innerHTML = html;

    // Control explícito del contenedor de selección: mostrar para todos los formatos (incluyendo 10 jugadores)
    const container = document.getElementById('playerSelection');
    if (container) {
        container.style.display = '';
        container.removeAttribute('aria-hidden');
    }

    // Control del botón de selección aleatoria: siempre habilitado ahora que hay 11 jugadores
    const randomBtn = document.getElementById('randomSelectBtn');
    if (randomBtn) {
        randomBtn.disabled = false;
        randomBtn.style.opacity = '';
        randomBtn.title = 'Seleccionar jugadores aleatoriamente';
    }

    // Llamar a renderPlayerSelection para todos los formatos
    renderPlayerSelection(numJugadores);

    // Actualizar estado del botón simular según la selección
    updateSimularButtonState();
}

// Render y lógica para selección de jugadores (UI debajo del select)
function renderPlayerSelection(numJugadores) {
    const container = document.getElementById('playerSelection');
    if (!container) return;

    // Asegurar que el contenedor esté visible para todos los formatos
    container.style.display = '';

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
    checkboxes.forEach(cb => cb.addEventListener('change', (evt) => {
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

    // NO seleccionar automáticamente al renderizar (según el requerimiento)

    // Actualizar estado del botón simular al terminar de renderizar
    updateSimularButtonState();
}

function obtenerJugadoresSeleccionadosPorNombre(numJugadores) {

    // Si no hay selección manual, no auto-seleccionar aquí: devolver vacío para forzar validación externa
    if (!window.jugadoresSeleccionadosGlobal || window.jugadoresSeleccionadosGlobal.length !== numJugadores) {
        return [];
    }
    return window.jugadoresSeleccionadosGlobal.map(nombre => jugadoresDisponibles.find(j => j.nombre === nombre)).filter(Boolean);
}

// --- Nuevo: controlar estado del botón 'Simular' y el banner superior ---
function updateSimularButtonState() {
    const simBtnEl = document.getElementById('simularBtn'); // puede ser null si la página es solo Monte Carlo
    const mcBtnEl = document.getElementById('btnSimular');
    const numSelectEl = document.getElementById('numPlayers');
    const topWarn = document.getElementById('topSelectionWarning');
    if (!numSelectEl || !mcBtnEl) return; // sin selector de formato o sin botón Monte Carlo no hay nada que hacer

    const num = parseInt(numSelectEl.value);


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
    const habilitado = selectedCount === num;
    if (simBtnEl) simBtnEl.disabled = !habilitado;
    mcBtnEl.disabled = !habilitado;

    // Mostrar cartel superior si hay menos seleccionados que los requeridos
    if (topWarn) {
        if (selectedCount !== num) {
            topWarn.textContent = `Por favor seleccioná exactamente ${num} jugadores antes de simular.`;
            topWarn.style.display = 'block';
        } else {
            topWarn.style.display = 'none';
        }
    }
}

// Enlazar botón simular al DOM
const simBtn = document.getElementById('simularBtn');
if (simBtn) {
    simBtn.addEventListener('click', () => {
        const num = parseInt(document.getElementById('numPlayers').value);
        const seleccion = obtenerJugadoresSeleccionadosPorNombre(num);
        if (seleccion.length !== num) {
            alert(`Por favor seleccioná exactamente ${num} jugadores antes de simular.`);
            return;
        }
        // Llamamos a simularTorneo pero inyectando la selección temporalmente
        // Guardamos jugadoresBase original
        const originalBase = [...jugadoresBase];
        // Reemplazamos jugadoresBase por la selección
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
            for (let i = jugadoresBase.length; i < seleccionCompleta.length; i++) jugadoresBase.push(seleccionCompleta[i]);
        }

        // Ejecutar la simulación (usa la variable jugadoresBase modificada)
        simularTorneo();

        // Restaurar jugadoresBase original
        for (let i = 0; i < originalBase.length; i++) jugadoresBase[i] = originalBase[i];
        jugadoresBase.length = originalBase.length;
    });
}

// Añadir listener para el botón de selección aleatoria en UI
const randomSelectBtn = document.getElementById('randomSelectBtn');
if (randomSelectBtn) {
    randomSelectBtn.addEventListener('click', () => {
        const numSelectEl = document.getElementById('numPlayers');
        if (!numSelectEl) return;
        const num = parseInt(numSelectEl.value);

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
    const numSelect = document.getElementById('numPlayers');
    if (numSelect) {
        // Cuando cambie el formato, re-renderizamos el formato y la selección
        numSelect.addEventListener('change', mostrarFormato);
        // render inicial
        mostrarFormato();
        // marcar que la página ya cargo (para cualquier comportamiento futuro que lo necesite)
        window._paginaCargada = true;
    }
});
