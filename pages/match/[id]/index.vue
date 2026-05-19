<template>
  <div class="match-container">
    <header class="scoreboard-header">
      <div class="top-row">
        <span class="mode-badge">📺 관중 모드: {{ matchId }}</span>
        <div class="timer-display">{{ formatTime(matchData?.timer || 0) }}</div>
      </div>
      
      <div class="score-row">
        <div class="team home">
          <span class="name">{{ matchData?.teamNames?.home || 'HOME' }}</span>
          <span class="score">{{ matchData?.scores?.home || 0 }}</span>
        </div>
        <div class="vs">vs</div>
        <div class="team away">
          <span class="score">{{ matchData?.scores?.away || 0 }}</span>
          <span class="name">{{ matchData?.teamNames?.away || 'AWAY' }}</span>
        </div>
      </div>
    </header>

    <main class="pitch-container">
      <div class="pitch">
        <div class="center-line"></div>
        <div class="center-circle"></div>
        
        <div 
          v-for="player in matchData?.players || []" 
          :key="player.id"
          class="player-token"
          :style="{ left: (player.x ?? 50) + '%', top: (player.y ?? 50) + '%' }"
        >
          <div class="token-circle">{{ player.number || '?' }}</div>
          <div class="token-name">{{ player.name || '선수' }}</div>
        </div>
      </div>
    </main>

    <div v-if="!matchData" class="mini-loading-bar">
      📡 실시간 데이터를 동기화 중입니다...
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
const matchId = route.params.id

const { matchData } = useMatchFirebase(matchId)

const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}
</script>

<style scoped>
.match-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; background: #f0f2f5; overflow: hidden; box-sizing: border-box; padding: 10px; position: relative; }
.scoreboard-header { background: #1a2332; border-radius: 16px; padding: 12px 16px; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-bottom: 10px; }
.top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.mode-badge { font-size: 0.75rem; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 6px; color: #cbd5e1; }
.timer-display { font-size: 1.8rem; font-weight: bold; font-family: monospace; color: #ff4d6d; }
.score-row { display: flex; align-items: center; justify-content: center; gap: 15px; }
.team { display: flex; align-items: center; gap: 12px; }
.team.home { justify-content: flex-end; flex: 1; }
.team.away { justify-content: flex-start; flex: 1; }
.name { font-size: 1.1rem; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
.score { font-size: 2.2rem; font-weight: 800; }
.vs { font-size: 0.85rem; color: #475569; font-weight: bold; text-transform: uppercase; }

.pitch-container { flex: 1; background: white; border-radius: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden; padding: 6px; box-sizing: border-box; }
.pitch { width: 100%; height: 100%; background: #2c4c38; border-radius: 12px; position: relative; border: 2px solid rgba(255,255,255,0.4); }
.center-line { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.4); }
.center-circle { position: absolute; top: 50%; left: 50%; width: 70px; height: 70px; border: 2px solid rgba(255,255,255,0.4); border-radius: 50%; transform: translate(-50%, -50%); }

.player-token { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; transition: left 0.1s linear, top 0.1s linear; }
.token-circle { width: 26px; height: 26px; background: #ff4d6d; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
.token-name { font-size: 0.65rem; background: rgba(0,0,0,0.75); color: white; padding: 1px 4px; border-radius: 3px; margin-top: 2px; white-space: nowrap; }

.mini-loading-bar { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; pointer-events: none; z-index: 10; }
</style>
