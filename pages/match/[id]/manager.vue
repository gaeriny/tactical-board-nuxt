<template>
  <div class="match-container">
    <header class="scoreboard-header">
      <div class="top-row">
        <span class="mode-badge">📋 감독 전술 제어: {{ matchId }}</span>
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

    <section class="toolbar">
      <button @click="addPlayer" class="btn-blue" :disabled="!matchData">➕ 전술판 선수 추가</button>
      <button @click="clearPlayers" class="btn-gray" :disabled="!matchData">🗑️ 선수 전체 초기화</button>
    </section>

    <main 
      class="pitch-container" 
      @mousemove="dragPlayer" 
      @mouseup="stopDrag" 
      @mouseleave="stopDrag"
      @touchmove="dragPlayerTouch"
      @touchend="stopDrag"
    >
      <div class="pitch" ref="pitchRef">
        <div class="center-line"></div>
        <div class="center-circle"></div>
        
        <div 
          v-for="(player, index) in matchData?.players || []" 
          :key="player.id"
          class="player-token"
          :style="{ left: (player.x ?? 50) + '%', top: (player.y ?? 50) + '%' }"
          @mousedown="startDrag($event, index)"
          @touchstart="startDragTouch($event, index)"
        >
          <div class="token-circle">{{ player.number || (index + 1) }}</div>
          <input 
            type="text" 
            v-model="player.name" 
            @change="saveChanges" 
            class="name-edit-input"
            placeholder="이름"
            @mousedown.stop
            @touchstart.stop
          />
          <button class="btn-del" @mousedown.stop @touchstart.stop @click="deletePlayer(index)">×</button>
        </div>
      </div>
    </main>

    <div v-if="!matchData" class="mini-loading-bar">
      📡 실시간 서버 연결을 기다리는 중입니다...
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const matchId = route.params.id

const { matchData, saveToServer } = useMatchFirebase(matchId)
const pitchRef = ref(null)
let activeIndex = null

const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

const saveChanges = () => {
  if (saveToServer) saveToServer()
}

const addPlayer = () => {
  if (!matchData.value) return
  if (!matchData.value.players) matchData.value.players = []
  
  matchData.value.players.push({
    id: 'p_' + Date.now(),
    name: '선수',
    number: matchData.value.players.length + 1,
    x: 50,
    y: 50
  })
  saveChanges()
}

const deletePlayer = (index) => {
  if (!matchData.value?.players) return
  matchData.value.players.splice(index, 1)
  saveChanges()
}

const clearPlayers = () => {
  if (!confirm('모든 선수를 초기화하시겠습니까?')) return
  if (matchData.value) {
    matchData.value.players = []
    saveChanges()
  }
}

const startDrag = (e, index) => { activeIndex = index }
const dragPlayer = (e) => {
  if (activeIndex === null || !pitchRef.value) return
  const rect = pitchRef.value.getBoundingClientRect()
  updateCoordinates(e.clientX, e.clientY, rect)
}

const startDragTouch = (e, index) => { activeIndex = index }
const dragPlayerTouch = (e) => {
  if (activeIndex === null || !pitchRef.value) return
  const rect = pitchRef.value.getBoundingClientRect()
  const touch = e.touches[0]
  updateCoordinates(touch.clientX, touch.clientY, rect)
}

const updateCoordinates = (clientX, clientY, rect) => {
  let x = ((clientX - rect.left) / rect.width) * 100
  let y = ((clientY - rect.top) / rect.height) * 100

  if (x < 3) x = 3; if (x > 97) x = 97
  if (y < 3) y = 3; if (y > 97) y = 97

  if (matchData.value?.players?.[activeIndex]) {
    matchData.value.players[activeIndex].x = Math.round(x)
    matchData.value.players[activeIndex].y = Math.round(y)
  }
}

const stopDrag = () => {
  if (activeIndex !== null) { activeIndex = null; saveChanges(); }
}
</script>

<style scoped>
/* 구조는 기존 스타일 유지 */
.match-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; background: #f0f2f5; overflow: hidden; box-sizing: border-box; padding: 10px; position: relative; }
.scoreboard-header { background: #1a2332; border-radius: 16px; padding: 12px 16px; color: white; margin-bottom: 8px; }
.top-row { display: flex; justify-content: space-between; align-items: center; }
.mode-badge { font-size: 0.75rem; background: #0284c7; padding: 4px 8px; border-radius: 6px; font-weight: bold; }
.timer-display { font-size: 1.8rem; font-weight: bold; font-family: monospace; color: #ff4d6d; }
.score-row { display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 2px; }
.team { display: flex; align-items: center; gap: 12px; flex: 1; }
.team.home { justify-content: flex-end; }
.team.away { justify-content: flex-start; }
.name { font-size: 1.1rem; font-weight: bold; color: #94a3b8; }
.score { font-size: 2.2rem; font-weight: 800; }
.vs { font-size: 0.85rem; color: #475569; font-weight: bold; }

.toolbar { display: flex; gap: 8px; margin-bottom: 8px; }
.toolbar button { flex: 1; padding: 10px 0; border: none; border-radius: 8px; font-weight: bold; font-size: 0.85rem; cursor: pointer; }
.toolbar button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-blue { background: #3b82f6; color: white; }
.btn-gray { background: #e2e8f0; color: #475569; }

.pitch-container { flex: 1; background: white; border-radius: 16px; overflow: hidden; padding: 6px; box-sizing: border-box; }
.pitch { width: 100%; height: 100%; background: #2c4c38; border-radius: 12px; position: relative; border: 2px solid rgba(255,255,255,0.4); }
.center-line { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.4); }
.center-circle { position: absolute; top: 50%; left: 50%; width: 70px; height: 70px; border: 2px solid rgba(255,255,255,0.4); border-radius: 50%; transform: translate(-50%, -50%); }

.player-token { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; cursor: grab; touch-action: none; }
.token-circle { width: 26px; height: 26px; background: #3b82f6; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
.name-edit-input { width: 50px; background: rgba(0,0,0,0.8); border: none; color: white; font-size: 0.65rem; text-align: center; border-radius: 3px; margin-top: 2px; padding: 1px 0; }
.btn-del { position: absolute; top: -5px; right: -5px; width: 14px; height: 14px; background: #ef4444; color: white; border: none; border-radius: 50%; font-size: 0.6rem; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; }

.mini-loading-bar { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; pointer-events: none; z-index: 10; }
</style>
