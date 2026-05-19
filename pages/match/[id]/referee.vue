<template>
  <div class="referee-container">
    <header class="ref-header">
      <span class="ref-badge">📯 심판 제어 센터: {{ matchId }}</span>
      <div class="main-timer">{{ formatTime(matchData?.timer || 0) }}</div>
      
      <div class="timer-controls">
        <button v-if="!matchData?.isTiming" @click="toggleTimer" class="btn-start" :disabled="!matchData">▶️ 경기 시작</button>
        <button v-else @click="toggleTimer" class="btn-pause" :disabled="!matchData">⏸️ 일시 정지</button>
        <button @click="resetTimer" class="btn-reset" :disabled="!matchData">🔄 리셋</button>
      </div>
    </header>

    <main class="control-grid">
      <div class="team-card home-card">
        <input 
          type="text" 
          :value="matchData?.teamNames?.home || 'HOME'" 
          @input="updateTeamName('home', $event.target.value)" 
          class="team-name-input"
          :disabled="!matchData"
        />
        <div class="score-modifier">
          <button @click="modifyScore('home', -1)" :disabled="!matchData">-</button>
          <span class="score-val">{{ matchData?.scores?.home || 0 }}</span>
          <button @click="modifyScore('home', 1)" :disabled="!matchData">+</button>
        </div>
      </div>

      <div class="vs-divider">VS</div>

      <div class="team-card away-card">
        <input 
          type="text" 
          :value="matchData?.teamNames?.away || 'AWAY'" 
          @input="updateTeamName('away', $event.target.value)" 
          class="team-name-input"
          :disabled="!matchData"
        />
        <div class="score-modifier">
          <button @click="modifyScore('away', -1)" :disabled="!matchData">-</button>
          <span class="score-val">{{ matchData?.scores?.away || 0 }}</span>
          <button @click="modifyScore('away', 1)" :disabled="!matchData">+</button>
        </div>
      </div>
    </main>

    <div v-if="!matchData" class="mini-loading-bar">
      📡 서버 데이터 동기화 중...
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const matchId = route.params.id

const { matchData, saveToServer } = useMatchFirebase(matchId)
let intervalId = null

const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

const saveChanges = () => {
  if (saveToServer) saveToServer()
}

const updateTeamName = (team, value) => {
  if (!matchData.value) return
  if (!matchData.value.teamNames) matchData.value.teamNames = { home: 'HOME', away: 'AWAY' }
  matchData.value.teamNames[team] = value
  saveChanges()
}

const toggleTimer = () => {
  if (!matchData.value) return
  matchData.value.isTiming = !matchData.value.isTiming
  
  if (matchData.value.isTiming) {
    intervalId = setInterval(() => {
      if (matchData.value && matchData.value.isTiming) {
        matchData.value.timer = (matchData.value.timer || 0) + 1
        saveChanges()
      }
    }, 1000)
  } else {
    clearInterval(intervalId)
  }
  saveChanges()
}

const resetTimer = () => {
  if (!confirm('경기를 초기화 상태로 되돌리시겠습니까?')) return
  clearInterval(intervalId)
  if (matchData.value) {
    matchData.value.timer = 0
    matchData.value.isTiming = false
    saveChanges()
  }
}

const modifyScore = (team, amount) => {
  if (!matchData.value) return
  if (!matchData.value.scores) matchData.value.scores = { home: 0, away: 0 }
  matchData.value.scores[team] = Math.max(0, (matchData.value.scores[team] || 0) + amount)
  saveChanges()
}

onUnmounted(() => {
  clearInterval(intervalId)
})
</script>

<style scoped>
.referee-container { width: 100vw; height: 100vh; background: #f8fafc; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; position: relative; }
.ref-header { background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 15px; }
.ref-badge { font-size: 0.8rem; background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-weight: bold; }
.main-timer { font-size: 3.5rem; font-weight: bold; font-family: monospace; color: #1e293b; margin: 10px 0; }

.timer-controls { display: flex; gap: 10px; justify-content: center; }
.timer-controls button { padding: 12px 24px; border: none; border-radius: 10px; font-weight: bold; font-size: 0.95rem; cursor: pointer; color: white; }
.timer-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-start { background: #16a34a; }
.btn-pause { background: #ea580c; }
.btn-reset { background: #64748b; }

.control-grid { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.team-card { background: white; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.03); justify-content: center; flex: 1; }
.team-name-input { font-size: 1.3rem; font-weight: 800; border: none; text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; width: 150px; color: #1e293b; }
.team-name-input:focus { outline: none; border-color: #2563eb; }

.score-modifier { display: flex; align-items: center; gap: 24px; margin-top: 15px; }
.score-modifier button { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 1.5rem; cursor: pointer; color: #475569; }
.score-modifier button:disabled { opacity: 0.5; cursor: not-allowed; }
.score-val { font-size: 3rem; font-weight: 800; color: #0f172a; min-width: 50px; text-align: center; }
.vs-divider { text-align: center; font-weight: bold; color: #94a3b8; font-size: 0.85rem; }

.mini-loading-bar { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; pointer-events: none; z-index: 10; }
</style>
