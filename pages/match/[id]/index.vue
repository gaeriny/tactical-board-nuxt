<template>
  <div class="match-container" v-if="matchData">
    <header class="scoreboard-header">
      <div class="match-info">
        <span class="channel-badge">📺 관중 모드: {{ matchId }}</span>
        <div class="global-timer">{{ formatTime(matchData.timer || 0) }}</div>
      </div>
      
      <div class="live-score-zone">
        <div class="team-block home">
          <span class="team-name">{{ matchData.teamNames?.home || 'HOME' }}</span>
          <span class="score-display">{{ matchData.scores?.home || 0 }}</span>
        </div>
        <div class="score-vs">VS</div>
        <div class="team-block away">
          <span class="score-display">{{ matchData.scores?.away || 0 }}</span>
          <span class="team-name">{{ matchData.teamNames?.away || 'AWAY' }}</span>
        </div>
      </div>
    </header>

    <main class="tactics-zone">
      <div class="pitch-board">
        <div class="pitch-line center-circle"></div>
        <div class="pitch-line center-line"></div>
        
        <div 
          v-for="player in matchData.players" 
          :key="player.id"
          class="player-token readonly"
          :style="{ left: player.x + '%', top: player.y + '%' }"
        >
          <span class="player-number">{{ player.number || '' }}</span>
          <span class="player-name-tag">{{ player.name || '선수' }}</span>
        </div>
      </div>
    </main>
  </div>
  
  <div v-else class="loading-state">
    <p>실시간 전광판 데이터를 연결 중입니다...</p>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const matchId = route.params.id

// 실시간 컴포저블 바인딩 (관중 뷰는 감지만 함)
const { matchData } = useMatchFirebase(matchId)

// 초 단위를 분:초 레이아웃으로 변경
const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}
</script>

<style scoped>
.match-container { max-width: 800px; margin: 0 auto; padding: 16px; font-family: sans-serif; background-color: #f1f5f9; min-height: 100vh; }
.scoreboard-header { background: #0f172a; color: white; padding: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 16px; }
.match-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
.channel-badge { font-size: 0.8rem; background: #334155; padding: 4px 8px; border-radius: 6px; color: #cbd5e1; }
.global-timer { font-size: 1.8rem; font-weight: 800; font-family: monospace; color: #f43f5e; letter-spacing: 1px; }

.live-score-zone { display: flex; align-items: center; justify-content: center; gap: 24px; padding: 8px 0; }
.team-block { display: flex; align-items: center; gap: 16px; flex: 1; }
.team-block.home { justify-content: flex-end; }
.team-block.away { justify-content: flex-start; }
.team-name { font-size: 1.2rem; font-weight: 700; color: #94a3b8; }
.score-display { font-size: 2.5rem; font-weight: 800; font-family: sans-serif; color: white; }
.score-vs { font-size: 1rem; font-weight: bold; color: #475569; }

/* 경기장 스타일 */
.tactics-zone { background: #1e3a1e; border: 4px solid #fff; border-radius: 12px; height: 450px; position: relative; overflow: hidden; box-shadow: inset 0 0 40px rgba(0,0,0,0.4); }
.pitch-board { width: 100%; height: 100%; position: relative; }
.center-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.5); }
.center-circle { position: absolute; left: 50%; top: 50%; width: 100px; height: 100px; border: 2px solid rgba(255,255,255,0.5); border-radius: 50%; transform: translate(-50%, -50%); }

/* 동기화된 선수 말 디자인 */
.player-token { position: absolute; width: 32px; height: 32px; background: #ef4444; border: 2px solid white; border-radius: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.8rem; box-shadow: 0 4px 8px rgba(0,0,0,0.3); transition: left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.player-name-tag { position: absolute; bottom: -20px; background: rgba(0,0,0,0.7); color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; white-space: nowrap; font-weight: normal; }
.loading-state { text-align: center; padding: 8px 0; color: #64748b; font-size: 0.9rem; margin-top: 80px; }
</style>
