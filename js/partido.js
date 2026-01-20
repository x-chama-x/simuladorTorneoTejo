// Variables para almacenar el historial de enfrentamientos directos
let enfrentamientosDirectos = {};
let partidosDetallados = []; // Array con todos los partidos individuales

// Función para cargar todo el historial desde el archivo unificado
async function cargarHistorialCompleto() {
    try {
        const response = await fetch('enfrentamientos_directos.txt');
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo enfrentamientos_directos.txt');
        }
        const texto = await response.text();
        const lineas = texto.split('\n');

        enfrentamientosDirectos = {};
        partidosDetallados = [];

        let seccionActual = null; // 'RESUMEN' o 'PARTIDOS'

        for (const linea of lineas) {
            const lineaTrimmed = linea.trim();

            // Ignorar líneas vacías y comentarios
            if (lineaTrimmed === '' || lineaTrimmed.startsWith('#') || lineaTrimmed.startsWith('=')) {
                continue;
            }

            // Detectar cambio de sección
            if (lineaTrimmed === '[RESUMEN]') {
                seccionActual = 'RESUMEN';
                continue;
            }
            if (lineaTrimmed === '[PARTIDOS]') {
                seccionActual = 'PARTIDOS';
                continue;
            }

            const partes = lineaTrimmed.split(',');

            // Procesar según la sección actual
            if (seccionActual === 'RESUMEN' && partes.length >= 6) {
                const jugador1 = partes[0].trim();
                const jugador2 = partes[1].trim();
                const victoriasJ1 = parseInt(partes[2].trim());
                const victoriasJ2 = parseInt(partes[3].trim());
                const golesJ1 = parseInt(partes[4].trim());
                const golesJ2 = parseInt(partes[5].trim());

                // Crear clave única para el enfrentamiento (ordenada alfabéticamente)
                const clave = [jugador1, jugador2].sort().join('_vs_');

                // Guardar en el formato correcto
                enfrentamientosDirectos[clave] = {
                    jugadores: [jugador1, jugador2],
                    victorias: { [jugador1]: victoriasJ1, [jugador2]: victoriasJ2 },
                    goles: { [jugador1]: golesJ1, [jugador2]: golesJ2 }
                };
            } else if (seccionActual === 'PARTIDOS' && partes.length >= 7) {
                const jugador1 = partes[0].trim();
                const jugador2 = partes[1].trim();
                const resultado = partes[2].trim(); // G o P para jugador1
                const marcador = partes[3].trim();
                const torneo = partes[4].trim();
                const fecha = partes[5].trim();
                const fase = partes[6].trim();

                // Parsear marcador
                const [goles1, goles2] = marcador.split('-').map(g => parseInt(g.trim()));

                partidosDetallados.push({
                    jugador1,
                    jugador2,
                    ganador: resultado === 'G' ? jugador1 : jugador2,
                    perdedor: resultado === 'G' ? jugador2 : jugador1,
                    marcador,
                    goles1,
                    goles2,
                    torneo,
                    fecha,
                    fase
                });
            }
        }

        console.log('✅ Enfrentamientos directos cargados:', Object.keys(enfrentamientosDirectos).length);
        console.log('✅ Partidos detallados cargados:', partidosDetallados.length);
        return true;
    } catch (error) {
        console.error('❌ Error al cargar historial:', error);
        return false;
    }
}

// Función para obtener los partidos entre dos jugadores específicos
function obtenerPartidosEntreJugadores(nombreJ1, nombreJ2) {
    return partidosDetallados.filter(p =>
        (p.jugador1 === nombreJ1 && p.jugador2 === nombreJ2) ||
        (p.jugador1 === nombreJ2 && p.jugador2 === nombreJ1)
    );
}

// Función para obtener el historial entre dos jugadores
function obtenerHistorialEnfrentamiento(nombreJ1, nombreJ2) {
    const clave = [nombreJ1, nombreJ2].sort().join('_vs_');
    return enfrentamientosDirectos[clave] || null;
}

// Función para mostrar el historial de enfrentamientos
function mostrarHistorial(nombreJ1, nombreJ2) {
    const historialContainer = document.getElementById('historialDirecto');
    const historialContent = document.getElementById('historialContent');

    const historial = obtenerHistorialEnfrentamiento(nombreJ1, nombreJ2);
    const partidos = obtenerPartidosEntreJugadores(nombreJ1, nombreJ2);

    // Tomar los últimos 5 partidos (los más recientes están al final del array)
    const ultimosPartidos = partidos.slice(-5).reverse();

    if (historial || partidos.length > 0) {
        const victoriasJ1 = historial ? (historial.victorias[nombreJ1] || 0) : 0;
        const victoriasJ2 = historial ? (historial.victorias[nombreJ2] || 0) : 0;
        const golesJ1 = historial ? (historial.goles[nombreJ1] || 0) : 0;
        const golesJ2 = historial ? (historial.goles[nombreJ2] || 0) : 0;
        const totalPartidos = victoriasJ1 + victoriasJ2;

        let partidosHTML = '';
        if (ultimosPartidos.length > 0) {
            partidosHTML = `
                <div class="partidos-previos">
                    <h4>📋 Últimos ${ultimosPartidos.length} partido${ultimosPartidos.length > 1 ? 's' : ''}</h4>
                    <div class="partidos-lista">
                        ${ultimosPartidos.map(p => {
                            // Determinar quién es azul y quién es rojo según la selección actual
                            const esJ1Ganador = p.ganador === nombreJ1;
                            const marcadorDisplay = p.jugador1 === nombreJ1 
                                ? p.marcador 
                                : `${p.goles2}-${p.goles1}`;
                            
                            return `
                                <div class="partido-item ${esJ1Ganador ? 'win-j1' : 'win-j2'}">
                                    <div class="partido-resultado">
                                        <span class="jugador-nombre ${esJ1Ganador ? 'ganador' : ''}">${nombreJ1}</span>
                                        <span class="marcador">${marcadorDisplay}</span>
                                        <span class="jugador-nombre ${!esJ1Ganador ? 'ganador' : ''}">${nombreJ2}</span>
                                    </div>
                                    <div class="partido-info">
                                        <span class="torneo">${p.torneo}</span>
                                        <span class="fase">${p.fase}</span>
                                        <span class="fecha">${p.fecha}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        historialContent.innerHTML = `
            <div class="historial-stats">
                <div class="historial-player blue">
                    <div class="nombre">${nombreJ1}</div>
                    <div class="victorias">${victoriasJ1}</div>
                    <div class="goles">${golesJ1} goles</div>
                </div>
                <div class="historial-middle">
                    <div class="total-partidos">${totalPartidos}</div>
                    <div class="subtitulo">partidos jugados</div>
                </div>
                <div class="historial-player red">
                    <div class="nombre">${nombreJ2}</div>
                    <div class="victorias">${victoriasJ2}</div>
                    <div class="goles">${golesJ2} goles</div>
                </div>
            </div>
            ${partidosHTML}
        `;
        historialContainer.style.display = 'block';
    } else {
        historialContent.innerHTML = `
            <div class="no-historial">
                No hay historial de enfrentamientos previos entre ${nombreJ1} y ${nombreJ2}
            </div>
        `;
        historialContainer.style.display = 'block';
    }
}

// Función para simular un partido con el historial de enfrentamientos
function simularPartidoConHistorial(jugador1, jugador2) {
    // Obtener historial de enfrentamientos
    const historial = obtenerHistorialEnfrentamiento(jugador1.nombre, jugador2.nombre);

    // FÓRMULA LOGÍSTICA (SIGMOIDE) - Base del simulador
    // Factor de fuerza combinado: 40% ranking + 60% winRate
    let fuerza1 = (jugador1.ranking * 0.4) + (jugador1.winRate * 100 * 0.6);
    let fuerza2 = (jugador2.ranking * 0.4) + (jugador2.winRate * 100 * 0.6);

    // Ajuste por historial de enfrentamientos directos (si existe)
    if (historial) {
        const totalEnfrentamientos = historial.victorias[jugador1.nombre] + historial.victorias[jugador2.nombre];

        if (totalEnfrentamientos > 0) {
            // Calcular winrate del enfrentamiento directo
            const winRateDirecto1 = historial.victorias[jugador1.nombre] / totalEnfrentamientos;
            const winRateDirecto2 = historial.victorias[jugador2.nombre] / totalEnfrentamientos;

            // El historial directo tiene un peso del 20% adicional
            // Esto afecta la fuerza de cada jugador
            const pesoHistorial = Math.min(0.2, totalEnfrentamientos * 0.02); // Máximo 20%, más partidos = más peso

            const ajusteHistorial1 = (winRateDirecto1 - 0.5) * 100 * pesoHistorial;
            const ajusteHistorial2 = (winRateDirecto2 - 0.5) * 100 * pesoHistorial;

            fuerza1 += ajusteHistorial1;
            fuerza2 += ajusteHistorial2;

            console.log(`📊 Historial aplicado: ${jugador1.nombre} (${historial.victorias[jugador1.nombre]} victorias) vs ${jugador2.nombre} (${historial.victorias[jugador2.nombre]} victorias)`);
            console.log(`   Ajuste: ${jugador1.nombre} +${ajusteHistorial1.toFixed(2)}, ${jugador2.nombre} +${ajusteHistorial2.toFixed(2)}`);
        }
    }

    // Diferencia de fuerza
    const diffFuerza = fuerza1 - fuerza2;

    // Función sigmoide: prob = 1 / (1 + e^(-x/k))
    const k = 30;
    const probFinal = 1 / (1 + Math.exp(-diffFuerza / k));

    const gana1 = Math.random() < probFinal;

    let goles1, goles2;

    // Calcular diferencia de goles basada en promedioGoles
    const promGanador = gana1 ? jugador1.promedioGoles : jugador2.promedioGoles;
    const promPerdedor = gana1 ? jugador2.promedioGoles : jugador1.promedioGoles;

    const diffPromedio = promGanador - promPerdedor;
    const bonusDiff = Math.max(0, Math.min(2, diffPromedio));
    const diffBase = Math.floor(Math.random() * 4) + 1;
    const diffFinal = Math.min(7, Math.round(diffBase + bonusDiff));

    if (gana1) {
        goles1 = 7;
        goles2 = Math.max(0, 7 - diffFinal);
    } else {
        goles2 = 7;
        goles1 = Math.max(0, 7 - diffFinal);
    }

    return {
        ganador: gana1 ? jugador1.nombre : jugador2.nombre,
        goles1: goles1,
        goles2: goles2,
        resultado: `${goles1}-${goles2}`,
        probabilidadJ1: probFinal
    };
}

// Función para mostrar el resultado del partido
function mostrarResultadoPartido(jugador1, jugador2, resultado) {
    const resultadoDiv = document.getElementById('resultado');

    resultadoDiv.innerHTML = `
        <div class="resultado-partido">
            <div class="match-header">🏆 Resultado del Partido</div>
            <div class="players-display">
                <span class="player-name blue">${jugador1.nombre}</span>
                <span style="font-size: 1.5em; color: #666;">vs</span>
                <span class="player-name red">${jugador2.nombre}</span>
            </div>
            <div class="score-display">${resultado.goles1} - ${resultado.goles2}</div>
            <div class="winner-announcement">🏆 ¡${resultado.ganador} gana!</div>
        </div>
    `;
}

// Función para simular múltiples partidos
function simularMultiplesPartidos(jugador1, jugador2, cantidad) {
    let victoriasJ1 = 0;
    let victoriasJ2 = 0;
    let golesJ1 = 0;
    let golesJ2 = 0;

    for (let i = 0; i < cantidad; i++) {
        const resultado = simularPartidoConHistorial(jugador1, jugador2);
        if (resultado.ganador === jugador1.nombre) {
            victoriasJ1++;
        } else {
            victoriasJ2++;
        }
        golesJ1 += resultado.goles1;
        golesJ2 += resultado.goles2;
    }

    return {
        cantidad,
        victoriasJ1,
        victoriasJ2,
        porcentajeJ1: (victoriasJ1 / cantidad * 100).toFixed(1),
        porcentajeJ2: (victoriasJ2 / cantidad * 100).toFixed(1),
        promedioGolesJ1: (golesJ1 / cantidad).toFixed(2),
        promedioGolesJ2: (golesJ2 / cantidad).toFixed(2)
    };
}

// Función para mostrar resultados de simulación múltiple
function mostrarResultadosMultiples(jugador1, jugador2, stats) {
    const resultadoDiv = document.getElementById('resultadoMultiple');

    resultadoDiv.innerHTML = `
        <div class="multiple-results">
            <h3>📊 Análisis de ${stats.cantidad.toLocaleString()} Simulaciones</h3>
            
            <div class="probability-bars">
                <div class="probability-bar">
                    <div class="label">
                        <span style="color: #2196F3;">🔵 ${jugador1.nombre}</span>
                        <span>${stats.victoriasJ1.toLocaleString()} victorias</span>
                    </div>
                    <div class="bar-container">
                        <div class="bar-fill blue" style="width: ${stats.porcentajeJ1}%;">
                            <span class="percentage">${stats.porcentajeJ1}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="probability-bar">
                    <div class="label">
                        <span style="color: #f44336;">🔴 ${jugador2.nombre}</span>
                        <span>${stats.victoriasJ2.toLocaleString()} victorias</span>
                    </div>
                    <div class="bar-container">
                        <div class="bar-fill red" style="width: ${stats.porcentajeJ2}%;">
                            <span class="percentage">${stats.porcentajeJ2}%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="stats-summary">
                <h4>📈 Estadísticas Detalladas</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Promedio goles ${jugador1.nombre}</div>
                        <div class="stat-value">${stats.promedioGolesJ1}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Promedio goles ${jugador2.nombre}</div>
                        <div class="stat-value">${stats.promedioGolesJ2}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Favorito</div>
                        <div class="stat-value">${stats.porcentajeJ1 > stats.porcentajeJ2 ? jugador1.nombre : jugador2.nombre}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Diferencia</div>
                        <div class="stat-value">${Math.abs(stats.porcentajeJ1 - stats.porcentajeJ2).toFixed(1)}%</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    resultadoDiv.style.display = 'block';
}

// Función para poblar los selectores con jugadores
function poblarSelectores() {
    const select1 = document.getElementById('jugador1');
    const select2 = document.getElementById('jugador2');

    // Limpiar opciones existentes
    select1.innerHTML = '<option value="">Seleccionar jugador...</option>';
    select2.innerHTML = '<option value="">Seleccionar jugador...</option>';

    // Agregar jugadores
    jugadoresDisponibles.forEach(jugador => {
        select1.innerHTML += `<option value="${jugador.nombre}">${jugador.nombre} (${jugador.ranking} pts)</option>`;
        select2.innerHTML += `<option value="${jugador.nombre}">${jugador.nombre} (${jugador.ranking} pts)</option>`;
    });
}

// Función para obtener jugador por nombre
function obtenerJugadorPorNombre(nombre) {
    return jugadoresDisponibles.find(j => j.nombre === nombre);
}

// Función para actualizar el estado de los botones
function actualizarBotones() {
    const jugador1 = document.getElementById('jugador1').value;
    const jugador2 = document.getElementById('jugador2').value;
    const btnSimular = document.getElementById('simularPartidoBtn');
    const btnMultiples = document.getElementById('simularMultiplesBtn');

    const habilitado = jugador1 && jugador2 && jugador1 !== jugador2;
    btnSimular.disabled = !habilitado;
    btnMultiples.disabled = !habilitado;

    // Mostrar historial si ambos jugadores están seleccionados
    if (habilitado) {
        mostrarHistorial(jugador1, jugador2);
    } else {
        document.getElementById('historialDirecto').style.display = 'none';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar jugadores desde ranking.txt
    await cargarJugadoresDesdeArchivo();

    // Cargar enfrentamientos directos
    await cargarHistorialCompleto();

    // Poblar selectores
    poblarSelectores();

    // Eventos de cambio en selectores
    document.getElementById('jugador1').addEventListener('change', () => {
        actualizarBotones();
        // Limpiar resultados anteriores
        document.getElementById('resultado').innerHTML = '';
        document.getElementById('resultadoMultiple').style.display = 'none';
    });

    document.getElementById('jugador2').addEventListener('change', () => {
        actualizarBotones();
        // Limpiar resultados anteriores
        document.getElementById('resultado').innerHTML = '';
        document.getElementById('resultadoMultiple').style.display = 'none';
    });

    // Evento de simular partido
    document.getElementById('simularPartidoBtn').addEventListener('click', () => {
        const nombreJ1 = document.getElementById('jugador1').value;
        const nombreJ2 = document.getElementById('jugador2').value;

        const jugador1 = obtenerJugadorPorNombre(nombreJ1);
        const jugador2 = obtenerJugadorPorNombre(nombreJ2);

        if (jugador1 && jugador2) {
            const resultado = simularPartidoConHistorial(jugador1, jugador2);
            mostrarResultadoPartido(jugador1, jugador2, resultado);
            document.getElementById('resultadoMultiple').style.display = 'none';
        }
    });

    // Evento de simular múltiples partidos
    document.getElementById('simularMultiplesBtn').addEventListener('click', () => {
        const nombreJ1 = document.getElementById('jugador1').value;
        const nombreJ2 = document.getElementById('jugador2').value;

        const jugador1 = obtenerJugadorPorNombre(nombreJ1);
        const jugador2 = obtenerJugadorPorNombre(nombreJ2);

        if (jugador1 && jugador2) {
            const stats = simularMultiplesPartidos(jugador1, jugador2, 1000);
            mostrarResultadosMultiples(jugador1, jugador2, stats);
            document.getElementById('resultado').innerHTML = '';
        }
    });
});
