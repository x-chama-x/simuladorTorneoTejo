// Función para simular un torneo completo y devolver resultados
function simularTorneoCompleto(numJugadores) {
    let jugadores = [...jugadoresBase];

    const jugadoresNecesarios = numJugadores - jugadoresBase.length;
    for (let i = 0; i < jugadoresNecesarios; i++) {
        jugadores.push(nuevosJugadores[i]);
    }

    // Mezclar jugadores
    jugadores = jugadores.sort(() => Math.random() - 0.5);

    let clasificados = [];

    if (numJugadores === 7) {
        // Formato Liga
        const { rankingGrupo } = simularGrupo(jugadores, 'Liga', 1);
        clasificados = rankingGrupo.slice(0, 4);

    } else if (numJugadores === 8) {
        // 2 grupos de 4
        const grupoA = jugadores.slice(0, 4);
        const grupoB = jugadores.slice(4, 8);

        const resultadoA = simularGrupo(grupoA, 'A', 1);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber);

        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];

    } else if (numJugadores === 9) {
        // 3 grupos de 3
        const grupoA = jugadores.slice(0, 3);
        const grupoB = jugadores.slice(3, 6);
        const grupoC = jugadores.slice(6, 9);

        const resultadoA = simularGrupo(grupoA, 'A', 1);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber);
        const resultadoC = simularGrupo(grupoC, 'C', resultadoB.matchNumber);

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

        clasificados = [...primeros, segundos[0]];

    } else if (numJugadores === 10) {
        // 2 grupos de 5
        const grupoA = jugadores.slice(0, 5);
        const grupoB = jugadores.slice(5, 10);

        const resultadoA = simularGrupo(grupoA, 'A', 1);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber);

        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];
    }

    // Playoffs
    const semifinalistas = [...clasificados].sort(() => Math.random() - 0.5);

    const sf1Jugador1 = jugadores.find(j => j.nombre === semifinalistas[0].nombre);
    const sf1Jugador2 = jugadores.find(j => j.nombre === semifinalistas[1].nombre);
    const sf2Jugador1 = jugadores.find(j => j.nombre === semifinalistas[2].nombre);
    const sf2Jugador2 = jugadores.find(j => j.nombre === semifinalistas[3].nombre);

    const sf1 = simularPartido(sf1Jugador1, sf1Jugador2);
    const sf2 = simularPartido(sf2Jugador1, sf2Jugador2);

    const perdedorSF1 = sf1.ganador === semifinalistas[0].nombre ? semifinalistas[1].nombre : semifinalistas[0].nombre;
    const perdedorSF2 = sf2.ganador === semifinalistas[2].nombre ? semifinalistas[3].nombre : semifinalistas[2].nombre;

    const tercerPuestoJ1 = jugadores.find(j => j.nombre === perdedorSF1);
    const tercerPuestoJ2 = jugadores.find(j => j.nombre === perdedorSF2);
    const tercerPuesto = simularPartido(tercerPuestoJ1, tercerPuestoJ2);

    const finalistaJ1 = jugadores.find(j => j.nombre === sf1.ganador);
    const finalistaJ2 = jugadores.find(j => j.nombre === sf2.ganador);
    const final = simularPartido(finalistaJ1, finalistaJ2);

    const cuarto = tercerPuesto.ganador === perdedorSF1 ? perdedorSF2 : perdedorSF1;
    const subcampeon = final.ganador === sf1.ganador ? sf2.ganador : sf1.ganador;

    return {
        campeon: final.ganador,
        subcampeon: subcampeon,
        tercero: tercerPuesto.ganador,
        cuarto: cuarto,
        semifinalistas: semifinalistas.map(s => s.nombre)
    };
}

// Función principal Monte Carlo
async function simularMonteCarlo() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    const numSimulaciones = parseInt(document.getElementById('numSimulaciones').value);

    // Mostrar barra de progreso
    document.getElementById('progreso').style.display = 'block';
    document.getElementById('resultado').innerHTML = '';
    document.getElementById('btnSimular').disabled = true;

    // Inicializar contadores
    const estadisticas = {};
    const jugadoresParticipantes = [...jugadoresBase];
    const jugadoresNecesarios = numJugadores - jugadoresBase.length;
    for (let i = 0; i < jugadoresNecesarios; i++) {
        jugadoresParticipantes.push(nuevosJugadores[i]);
    }

    jugadoresParticipantes.forEach(j => {
        estadisticas[j.nombre] = {
            campeon: 0,
            subcampeon: 0,
            tercero: 0,
            cuarto: 0,
            semifinalista: 0,
            noClasifica: 0
        };
    });

    const batchSize = 100; // Procesar en lotes para actualizar UI
    let simulacionesCompletadas = 0;

    // Ejecutar simulaciones en batches
    for (let batch = 0; batch < numSimulaciones / batchSize; batch++) {
        // Simular batch
        for (let i = 0; i < batchSize; i++) {
            const resultado = simularTorneoCompleto(numJugadores);

            estadisticas[resultado.campeon].campeon++;
            estadisticas[resultado.subcampeon].subcampeon++;
            estadisticas[resultado.tercero].tercero++;
            estadisticas[resultado.cuarto].cuarto++;

            resultado.semifinalistas.forEach(nombre => {
                estadisticas[nombre].semifinalista++;
            });

            jugadoresParticipantes.forEach(j => {
                if (!resultado.semifinalistas.includes(j.nombre)) {
                    estadisticas[j.nombre].noClasifica++;
                }
            });

            simulacionesCompletadas++;
        }

        // Actualizar progreso
        const progreso = (simulacionesCompletadas / numSimulaciones) * 100;
        document.getElementById('progressBar').style.width = progreso + '%';
        document.getElementById('progressText').textContent = Math.round(progreso) + '%';

        // Permitir que el navegador actualice la UI
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Ocultar progreso
    document.getElementById('progreso').style.display = 'none';
    document.getElementById('btnSimular').disabled = false;

    // Mostrar resultados
    mostrarResultados(estadisticas, numSimulaciones, numJugadores);
}

function mostrarResultados(estadisticas, numSimulaciones, numJugadores) {
    let html = '';

    html += `<div class="phase-title">📊 RESULTADOS DE ${numSimulaciones.toLocaleString()} SIMULACIONES</div>`;
    html += `<div class="subtitle" style="text-align: center; margin-bottom: 30px;">Formato: ${getFormatoNombre(numJugadores)}</div>`;

    // Convertir a array y ordenar por probabilidad de campeonato
    const ranking = Object.entries(estadisticas)
        .map(([nombre, stats]) => ({
            nombre,
            ...stats,
            probCampeon: (stats.campeon / numSimulaciones) * 100,
            probSubcampeon: (stats.subcampeon / numSimulaciones) * 100,
            probTercero: (stats.tercero / numSimulaciones) * 100,
            probCuarto: (stats.cuarto / numSimulaciones) * 100,
            probSemi: (stats.semifinalista / numSimulaciones) * 100,
            probNoClasifica: (stats.noClasifica / numSimulaciones) * 100
        }))
        .sort((a, b) => b.probCampeon - a.probCampeon);

    // Gráfico de barras - Probabilidad de Campeonato
    html += '<div class="phase-title">🏆 PROBABILIDAD DE SER CAMPEÓN</div>';
    html += '<div class="chart-container">';

    ranking.forEach((j, index) => {
        const color = getColorByRank(index);
        html += `
            <div class="bar-item">
                <div class="bar-label">
                    <span class="rank-number">${index + 1}</span>
                    <span class="player-name">${j.nombre}</span>
                    <span class="percentage">${j.probCampeon.toFixed(2)}%</span>
                </div>
                <div class="bar-background">
                    <div class="bar-fill" style="width: ${j.probCampeon}%; background: ${color};"></div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    // Tabla detallada
    html += '<div class="phase-title">📋 ESTADÍSTICAS DETALLADAS</div>';
    html += '<div class="standings"><table>';
    html += `<tr>
        <th>Pos</th>
        <th>Jugador</th>
        <th>🥇 Campeón</th>
        <th>🥈 Subcampeón</th>
        <th>🥉 3er Puesto</th>
        <th>4° Puesto</th>
        <th>🏅 Semifinalista</th>
        <th>❌ No Clasifica</th>
    </tr>`;

    ranking.forEach((j, index) => {
        html += `<tr>
            <td class="position">${index + 1}°</td>
            <td><strong>${j.nombre}</strong></td>
            <td><span class="prob-badge gold">${j.probCampeon.toFixed(1)}%</span></td>
            <td><span class="prob-badge silver">${j.probSubcampeon.toFixed(1)}%</span></td>
            <td><span class="prob-badge bronze">${j.probTercero.toFixed(1)}%</span></td>
            <td><span class="prob-badge">${j.probCuarto.toFixed(1)}%</span></td>
            <td><span class="prob-badge blue">${j.probSemi.toFixed(1)}%</span></td>
            <td><span class="prob-badge gray">${j.probNoClasifica.toFixed(1)}%</span></td>
        </tr>`;
    });

    html += '</table></div>';

    // Top 3 destacado
    html += '<div class="phase-title">👑 TOP 3 FAVORITOS</div>';
    html += '<div class="podium">';

    if (ranking.length >= 3) {
        html += `
            <div class="podium-place second">
                <div class="medal">🥈</div>
                <div class="place-name">2° FAVORITO</div>
                <div class="place-player">${ranking[1].nombre}</div>
                <div class="place-prob">${ranking[1].probCampeon.toFixed(2)}%</div>
            </div>
            <div class="podium-place first">
                <div class="medal">🥇</div>
                <div class="place-name">FAVORITO</div>
                <div class="place-player">${ranking[0].nombre}</div>
                <div class="place-prob">${ranking[0].probCampeon.toFixed(2)}%</div>
            </div>
            <div class="podium-place third">
                <div class="medal">🥉</div>
                <div class="place-name">3° FAVORITO</div>
                <div class="place-player">${ranking[2].nombre}</div>
                <div class="place-prob">${ranking[2].probCampeon.toFixed(2)}%</div>
            </div>
        `;
    }

    html += '</div>';

    // Insights
    html += '<div class="phase-title">💡 ANÁLISIS</div>';
    html += '<div class="insights">';

    const favorito = ranking[0];
    const segundoFavorito = ranking[1];
    const diferencia = favorito.probCampeon - segundoFavorito.probCampeon;

    html += `<div class="insight-card">
        <h3>🎯 Favorito Claro</h3>
        <p><strong>${favorito.nombre}</strong> tiene ${favorito.probCampeon.toFixed(1)}% de probabilidad de ganar,
        ${diferencia.toFixed(1)} puntos porcentuales más que ${segundoFavorito.nombre}.</p>
    </div>`;

    html += `<div class="insight-card">
        <h3>🏆 Probabilidad de Podio</h3>
        <p><strong>${favorito.nombre}</strong> tiene ${(favorito.probCampeon + favorito.probSubcampeon + favorito.probTercero).toFixed(1)}%
        de probabilidad de terminar en el podio (Top 3).</p>
    </div>`;

    const sorpresa = ranking[ranking.length - 1];
    html += `<div class="insight-card">
        <h3>⚡ Dark Horse</h3>
        <p><strong>${sorpresa.nombre}</strong> tiene solo ${sorpresa.probCampeon.toFixed(2)}% de ganar,
        pero ${sorpresa.probSemi.toFixed(1)}% de llegar a semifinales.</p>
    </div>`;

    html += '</div>';

    document.getElementById('resultado').innerHTML = html;
}

function getColorByRank(rank) {
    const colors = [
        'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', // Oro
        'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', // Plata
        'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', // Bronce
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Púrpura
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Rosa
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Azul
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Verde
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Naranja
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // Azul oscuro
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'  // Pastel
    ];

    return colors[rank] || colors[colors.length - 1];
}

function getFormatoNombre(numJugadores) {
    const formatos = {
        7: '7 Jugadores - Liga (Todos contra todos)',
        8: '8 Jugadores - 2 Grupos de 4',
        9: '9 Jugadores - 3 Grupos de 3',
        10: '10 Jugadores - 2 Grupos de 5'
    };

    return formatos[numJugadores] || 'Formato desconocido';
}
