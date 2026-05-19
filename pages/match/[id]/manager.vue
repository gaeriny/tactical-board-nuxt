<template>
  <div class="match-container" v-if="matchData">
    <header class="scoreboard-header">
      <div class="match-info">
        <span class="channel-badge m-badge">📋 감독 전술 제어: {{ matchId }}</span>
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

    <section class="manager-toolbar">
      <button @click="addPlayer" class="btn-add-player">➕ 전술판 선수 추가</button>
      <button @click="clearPlayers" class="btn-clear-player">🗑️ 선수 전체 초기화</button>
    </section>

    <main class="tactics-zone" @mousemove="dragPlayer" @mouseup="stopDrag" @mouseleave="stopDrag">
      <div class="pitch-board" ref="pitchRef">
        <div class="pitch-line center-circle"></div>
        <div class="pitch-line center-line"></div>
        
        <div 
          v-for="(player, index) in matchData.players" 
          :key="player.id"
          class="player-token draggable"
          :style="{ left: player.x + '%', top: player.y + '%' }"
          @mousedown="startDrag($event, index)"
        >
          <span class="player-number">{{ player.number || (index + 1) }}</span>
          <input 
            type="text" 
            v-model="player.name" 
            @change="saveChanges" 
            class="player-name-input"
            placeholder="이름"
            @mousedown.stop
          />
          <button class="btn-delete-player" @mousedown.stop @click="deletePlayer(index)">×</button>
        </div>
      </div>
    </main>
  </div>
  
  <div v-else class="loading-state">
    <p>감독 전술 대시보드 권한을 동기화 중입니다...</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const matchId = route.params.id

// 파이어베이스 실시간 컴포저블 바인딩 (수정 데이터 푸시 권한 탑재)
const { matchData, saveToServer } = useMatchFirebase(matchId)

const pitchRef = ref(null)
let activePlayerIndex = null

const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

const saveChanges = () => {
  if (saveToServer) saveToServer()
}

// 👤 신규 선수 배치 토큰 생성
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

// 👤 선수 삭제 개별 로직
const deletePlayer = (index) => {
  if (!matchData.value?.players) return
  matchData.value.players.splice(index, 1)
  saveChanges()
}

// 👤 선수 리스트 전체 초기화
const clearPlayers = () => {
  if (!confirm('전술판 위의 모든 선수를 제거하시겠습니까?')) return
  if (matchData.value) {
    matchData.value.players = []
    saveChanges()
  }
}

// ↕️ 드래그앤드롭 좌표 제어 핸들러
const startDrag = (event, index) => {
  activePlayerIndex = index
}

const dragPlayer = (event) => {
  if (activePlayerIndex === null || !pitchRef.value || !matchData.value?.players) return
  
  const rect = pitchRef.value.getBoundingClientRect()
  // 전체 축 기준 백분율(%) 마우스 마스킹 연산
  let x = ((event.clientX - rect.left) / rect.width) * 100
  let y = ((event.clientY - rect.top) / rect.height) * 100

  // 전술판 경계선 탈출 방지 바운딩 가드 코드
  if (x < 2) x = 2
  if (x > 98) x = 98
  if (y < 3) y = 3
  if (y > 97) y = 97

  matchData.value.players[activePlayerIndex].x = Math.round(x)
  matchData.value.players[activePlayerIndex].y = Math.round(y)
}

const stopDrag = () => {
  if (activePlayerIndex !== null) {
    activePlayerIndex = null
    saveChanges() // 마우스를 놓는 즉시 파이어베이스에 위치 확정 동기화
  }
}
</script>

<style scoped>
/* 관중 뷰와 공유 디자인 톤 연동 */
.match-container { max-width: 800px; margin: 0 auto; padding: 16px; font-family: sans-serif; background-color: #f1f5f9; min-height: 100vh; }
.scoreboard-header { background: #1e293b; color: white; padding: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 12px; }
.match-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #475569; padding-bottom: 8px; }
.channel-badge.m-badge { background: #0284c7; color: white; font-weight: bold; }
.global-timer { font-size: 1.8rem; font-weight: 800; font-family: monospace; color: #f43f5e; letter-spacing: 1px; }

.live-score-zone { display: flex; align-items: center; justify-content: center; gap: 24px; padding: 4px 0; }
.team-block { display: flex; align-items: center; gap: 16px; flex: 1; }
.team-block.home { justify-content: flex-end; }
.team-block.away { justify-content: flex-start; }
.team-name { font-size: 1.2rem; font-weight: 700; color: #94a3b8; }
.score-display { font-size: 2.5rem; font-weight: 800; color: white; }
.score-vs { font-size: 1rem; font-weight: bold; color: #475569; }

/* 툴바 컨트롤 스타일 */
.manager-toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
.manager-toolbar button { padding: 10px 16px; border: none; border-radius: 8px; font-weight: bold; font-size: 0.85rem; cursor: pointer; }
.btn-add-player { background: #0284c7; color: white; }
.btn-clear-player { background: #e2e8f0; color: #475569; }

/* 작전 경기장 */
.tactics-zone { background: #1b4332; border: 4px solid #fff; border-radius: 12px; height: 450px; position: relative; overflow: hidden; box-shadow: inset 0 0 40px rgba(0,0,0,0.5); cursor: crosshair; }
.pitch-board { width: 100%; height: 100%; position: relative; }
.center-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.4); }
.center-circle { position: absolute; left: 50%; top: 50%; width: 100px; height: 100px; border: 2px solid rgba(255,255,255,0.4); border-radius: 50%; transform: translate(-50%, -50%); }

/* 감독 드래그 전용 선수 토큰 디자인 */
.player-token { position: absolute; width: 34px; height: 34px; background: #3b82f6; border: 2px solid white; border-radius: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.85rem; box-shadow: 0 6px 12px rgba(0,0,0,0.3); cursor: grab; user-select: none; }
.player-token:active { cursor: grabbing; background: #2563eb; transform: translate(-50%, -50%) scale(1.1); }

.player-name-input { position: absolute; bottom: -24px; width: 60px; background: rgba(15, 23, 42, 0.85); border: 1px solid #475569; color: white; font-size: 0.7rem; text-align: center; border-radius: 4px; padding: 2px 0; font-weight: normal; }
.player-name-input:focus { background: white; color: black; outline: none; }

.btn-delete-player { position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #ef4444; color: white; border: none; border-radius: 50%; font-size: 0.65rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; }

.loading-state { text-align: center; padding: 60px; color: #64748b; font-size: 0.9rem; }
</style>
