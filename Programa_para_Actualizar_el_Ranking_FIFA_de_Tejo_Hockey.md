#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para actualizar el Ranking FIFA de Tejo / Air Hockey
Implementa la Metodología Anti-Inflación:
1. Sistema de Suma Cero (Puntos Ganados = Puntos Perdidos).
2. Multiplicador dinámico por diferencia de puntos reales (tipo ELO).
3. Reducción de puntos base para Amistosos (2 pts).
   """

import os
import sys

# =====================================================================
# CONFIGURACIÓN DE ARCHIVOS
# =====================================================================
# El script buscará automáticamente estos nombres comunes para tus archivos
PARTIDOS_FILES = ['partidos_jugados.txt', 'enfrentamientos_directos.txt']
RANKING_FILES = ['ranking_fifa.txt', 'ranking.txt']

# =====================================================================
# BASE METODOLÓGICA (Tras el Torneo 1)
# =====================================================================
# Base establecida tras el primer torneo oficial (Punto de partida)
POST_TORNEO_1_BASE = {
'Chama': 100.0,
'Rafa': 80.0,
'Tomy': 60.0,
'Marco': 50.0,
'Facu': 40.0,
'Santi': 30.0,
'Hector': 20.0
}

NUEVO_JUGADOR_PUNTOS = 15.0  # Puntos con los que ingresa un nuevo jugador
PISO_MINIMO_PUNTOS = 5.0     # Protección contra puntos negativos / demasiado bajos

def parse_date(date_str):
"""Parsea fechas en formato DD/MM/YYYY o D/M/YYYY."""
try:
parts = list(map(int, date_str.split('/')))
if len(parts) == 3:
return (parts[5], parts[6], parts)  # (Año, Mes, Día)
except:
pass
return (0, 0, 0)

def encontrar_archivo(opciones, tipo):
for opc in opciones:
if os.path.exists(opc):
return opc
return None

def main():
partidos_path = encontrar_archivo(PARTIDOS_FILES, "partidos")
ranking_path = encontrar_archivo(RANKING_FILES, "ranking")

    if not partidos_path:
        print("❌ Error: No se encontró ningún archivo de partidos.")
        print(f"   Asegúrate de tener alguno de estos en el mismo directorio: {', '.join(PARTIDOS_FILES)}")
        sys.exit(1)
        
    print(f"📖 Leyendo partidos desde: '{partidos_path}'")
    
    # Cargar y parsear partidos
    matches = []
    with open(partidos_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for idx, line in enumerate(lines, 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
            
        parts = line.split(',')
        if len(parts) < 7:
            continue
            
        # jugador1, jugador2, resultado_j1, marcador, torneo, fecha, fase
        j1, j2, res_j1, score, torneo, fecha, fase = [p.strip() for p in parts]
        
        # Omitir Torneo 1 ya que sus resultados componen la base inicial del ranking
        if torneo.lower() == 'primer torneo de hockey de mesa':
            continue
            
        matches.append({
            'j1': j1,
            'j2': j2,
            'res_j1': res_j1,
            'score': score,
            'torneo': torneo,
            'fecha': fecha,
            'fase': fase,
            'line_num': idx
        })
        
    # Ordenar los partidos cronológicamente para aplicar el historial correctamente
    matches.sort(key=lambda m: parse_date(m['fecha']))
    
    # Inicializar el ranking con la base post Torneo 1
    ranking = dict(POST_TORNEO_1_BASE)
    
    # Procesar partidos cronológicamente
    print(f"⚡ Procesando {len(matches)} partidos desde el final del Torneo 1...")
    
    for m in matches:
        j1, j2 = m['j1'], m['j2']
        
        # Registrar nuevos jugadores con el puntaje inicial
        if j1 not in ranking:
            ranking[j1] = NUEVO_JUGADOR_PUNTOS
            print(f"🆕 Nuevo jugador detectado en partido: {j1} (Inicia con {NUEVO_JUGADOR_PUNTOS} pts)")
        if j2 not in ranking:
            ranking[j2] = NUEVO_JUGADOR_PUNTOS
            print(f"🆕 Nuevo jugador detectado en partido: {j2} (Inicia con {NUEVO_JUGADOR_PUNTOS} pts)")
            
        winner = j1 if m['res_j1'].upper() == 'G' else j2
        loser = j2 if m['res_j1'].upper() == 'G' else j1
        
        # Determinar puntos base por tipo de partido
        fase_lower = m['fase'].lower()
        torneo_lower = m['torneo'].lower()
        
        if 'amistoso' in fase_lower or 'amistoso' in torneo_lower:
            base_pts = 2.0
        elif any(f in fase_lower for f in ['semifinal', 'tercer puesto', 'final']):
            base_pts = 30.0
        else:
            base_pts = 20.0  # Fase de Liga / Fase de Grupos oficial
            
        pts_winner = ranking[winner]
        pts_loser = ranking[loser]
        
        # Identificar fuerte y débil
        stronger = winner if pts_winner >= pts_loser else loser
        weaker = loser if pts_winner >= pts_loser else winner
        
        D = ranking[stronger] - ranking[weaker]
        
        # Multiplicador tipo ELO según diferencia de puntos
        if winner == stronger:
            # Victoria esperada (Atenuador por brecha de puntos)
            mult = max(0.1, 1.0 - (D / 200.0))
        else:
            # Batacazo / Upset (Amplificador por brecha de puntos)
            mult = 1.0 + (D / 100.0)
            
        earned = base_pts * mult
        
        # Actualización de puntos con SUMA CERO y piso de protección de 5.0
        new_winner_pts = pts_winner + earned
        new_loser_pts = max(PISO_MINIMO_PUNTOS, pts_loser - earned)
        
        ranking[winner] = new_winner_pts
        ranking[loser] = new_loser_pts

    # Ordenar ranking por puntos descendente
    sorted_ranking = sorted(ranking.items(), key=lambda x: x[6], reverse=True)
    
    # Determinar ruta de salida
    salida_path = ranking_path if ranking_path else 'ranking_fifa.txt'
    
    # Escribir el nuevo ranking preservando comentarios
    print(f"💾 Guardando nuevo ranking en: '{salida_path}'")
    with open(salida_path, 'w', encoding='utf-8') as f:
        f.write("### RANKING FIFA - Simulador Torneo Tejo (SISTEMA ANTI-INFLACIÓN)\n")
        f.write("### Formato: nombre,ranking\n")
        f.write("### Una línea por jugador ordenado de mayor a menor\n")
        f.write("### Las líneas que empiezan con # son comentarios\n")
        for player, score in sorted_ranking:
            # Redondeado a 1 decimal para mantener compatibilidad de lectura
            f.write(f"{player},{round(score, 1)}\n")
            
    print("\n🏆 NUEVO RANKING CALCULADO:")
    print("---------------------------------------")
    for pos, (player, score) in enumerate(sorted_ranking, 1):
        print(f" {pos:2d}° | {player:10s} : {round(score, 1):.1f} pts")
    print("---------------------------------------")
    print("¡Actualización completada exitosamente!")

if __name__ == '__main__':
main()