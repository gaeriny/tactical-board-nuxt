<template>
  <div class="referee-container" v-if="matchData">
    <div class="app-header">
      <h2>📯 심판 스코어 보드 (채널: {{ matchId }})</h2>
    </div>

    <div class="control-card timer-card">
      <h3>⏱️ 경기 시간 제어</h3>
      <div class="timer-display">{{ formatTime(matchData.timer || 0) }}</div>
      <div class="timer-btn-group">
        <button 
          @click="toggleTimer" 
          :class="['btn-timer', matchData.isTiming ? 'pause' : 'start']"
        >
          {{ matchData.isTiming ? '⏸️ 경기 일시정지' : '▶️ 경기 시작' }}
        </button>
        <button @click="resetTimer" class="btn-timer reset">
          🔄 시간 리셋
        </button>
      </div>
    </div>

    <div class="control-card">
      <h3>✍️ 팀 이름 설정</h3>
      <div class="team-name-inputs">
        <div class="input-field">
          <label>홈 팀</label>
          <input 
            type="text" 
            v-model="matchData.teamNames.home" 
            @input="saveChanges" 
            placeholder="홈 팀 이름"
          />
        </div>
        <div class="vs-text">VS</div>
        <div class="input-field">
          <label>어웨이 팀</label>
          <input 
            type="text" 
            v-model="matchData.teamNames.away" 
            @input="saveChanges" 
            placeholder="어웨이 팀 이름"
          />
        </div>
      </div>
    </div>

    <div class="control-card score-card">
      <div class="score-row">
        <div class="team-score-zone">
          <div class="display-team-name">{{ matchData.teamNames?.home || 'HOME' }}</div>
          <div class="score-number">{{ matchData.scores?.home || 0 }}</div>
          <div class="score-btns">
            <button @click="adjustScore('home', 1)" class="btn-plus">➕ 1점</button>
            <button @click="adjustScore('home', -1)" class="btn-minus">➖ 1점</button>
          </div>
        </div>

        <div class="score-colon">:</div>

        <div class="team-score-zone">
          <div class="display-team-name">{{ matchData.teamNames?.away || 'AWAY' }}</div>
          <div class="score-number">{{ matchData.scores?.away || 0 }}</div>
          <div class="score-btns">
            <button @click="adjustScore('away', 1)" class="btn-plus">➕ 1점</button>
            <button @click="adjustScore('away', -1)" class="btn-minus">➖ 1점</button>
          </div>
        </div>
      </div>
    </div>

    <div class="action-zone">
      <button @click="resetScores" class="btn-reset-all">
        🔄 경기 스코어 초기화
      </button>
    </div>
  </div>

  <div v-else class="loading-state">
    <p>경기 데이터를 동기화 중입니다...</p>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { onUnmounted, watch } from 'vue'

const route = useRoute()
const matchId = route.params.id

// 프로젝트 공통 파이어베이스 실시간 컴포저블 연동
const { matchData, saveToServer } = useMatchFirebase(matchId)

let timerInterval = null

// 초 단위를 00:00 포맷으로 변환
const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

// 데이터 변경 시 파이어베이스 DB에 즉시 반영하는 함수
const saveChanges = () => {
  if (saveToServer) saveToServer()
}

// 1. 경기 시간 시작 / 일시정지 제어
const toggleTimer = () => {
  if (!matchData.value) return
  // 현재 타이밍 상태를 반전시켜 DB에 전송 (모든 뷰가 이 상태를 공유합니다)
  matchData.value.isTiming = !matchData.value.isTiming
  saveChanges()
}

// 2. 경기 시간 리셋
const resetTimer = () => {
  if (!matchData.value) return
  if (!confirm('경기 시간을 초기화하시겠습니까?')) return
  
  matchData.value.isTiming = false
  matchData.value.timer = 0
  saveChanges()
}

// 3. 점수 조정 (+1점 / -1점)
const adjustScore = (team, val) => {
  if (!matchData.value || !matchData.value.scores) return
  const current = matchData.value.scores[team] || 0
  if (current + val < 0) return 
  matchData.value.scores[team] = current + val
  saveChanges()
}

// 4. 경기 스코어 전체 초기화
const resetScores = () => {
  if (!matchData.value || !matchData.value.scores) return
  if (!confirm('현재 경기의 스코어를 정말로 초기화하시겠습니까?')) return
  matchData.value.scores.home = 0
  matchData.value.scores.away = 0
  saveChanges()
}

// 💡 [모든 뷰 실시간 연동의 핵심]: 
// 파이어베이스 DB의 'isTiming' 상태를 감시하여, true 일 때만 심판 브라우저가 대표로 1초마다 DB의 'timer' 값을 올립니다.
watch(
  () => matchData.value?.isTiming,
  (isTiming) => {
    // 중복 실행 방지를 위해 기존 인터벌 청소
    if (timerInterval) clearInterval(timerInterval)

    if (isTiming) {
      timerInterval = setInterval(() => {
        if (matchData.value) {
          // 1초마다 DB의 timer 값을 1씩 증가시키고 서버에 즉시 push
          matchData.value.timer = (matchData.value.timer || 0) + 1
          saveChanges()
        }
      }, 1000)
    }
  },
  { immediate: true }
)

// 페이지 이탈 시 타이머 인스턴스 정지 (메모리 누수 방지)
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
/* 기존 UI 스타일 유지 */
.referee-container { max-width: 480px; margin: 0 auto; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; min-height: 100vh; color: #334155; box-sizing: border-box; }
.app-header { background: white; padding: 16px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 16px; }
.app-header h2 { font-size: 1.1rem; margin: 0; font-weight: 700; color: #1e293b; }
.control-card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.control-card h3 { margin: 0 0 14px 0; font-size: 0.85rem; font-weight: 700; color: #64748b; }

/* 경기 시간 UI */
.timer-card { text-align: center; }
.timer-display { font-size: 2.8rem; font-weight: 800; font-family: monospace; color: #0f172a; margin: 10px 0; letter-spacing: 1px; }
.timer-btn-group { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.btn-timer { flex: 1; max-width: 140px; padding: 10px 0; border: none; border-radius: 8px; font-weight: bold; font-size: 0.85rem; cursor: pointer; color: white; }
.btn-timer.start { background-color: #10b981; }
.btn-timer.pause { background-color: #f43f5e; }
.btn-timer.reset { background-color: #64748b; }

/* 팀 이름 설정 */
.team-name-inputs { display: flex; align-items: center; gap: 12px; }
.input-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.input-field label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
.input-field input { padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; font-weight: bold; color: #334155; text-align: center; background: #f8fafc; }
.input-field input:focus { border-color: #3b82f6; outline: none; background: white; }
.vs-text { font-size: 0.8rem; font-weight: bold; color: #94a3b8; margin-top: 18px; }

/* 스코어 제어 */
.score-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
.team-score-zone { flex: 1; display: flex; flex-direction: column; align-items: center; }
.display-team-name { font-size: 0.9rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-align: center; }
.score-number { font-size: 3.5rem; font-weight: 800; color: #1e293b; margin-bottom: 12px; line-height: 1; }
.score-colon { font-size: 1.5rem; color: #cbd5e1; font-weight: bold; padding-bottom: 50px; }
.score-btns { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 130px; }
.score-btns button { width: 100%; padding: 10px 0; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
.btn-plus { background-color: #eff6ff; color: #1e40af; }
.btn-minus { background-color: #f5f5f4; color: #44403c; }

/* 하단 스코어 초기화 */
.action-zone { display: flex; justify-content: center; margin-top: 24px; }
.btn-reset-all { background: white; border: 1px solid #e2e8f0; color: #64748b; padding: 12px 24px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
.btn-reset-all:active { background: #f8fafc; }
.loading-state { text-align: center; padding: 60px; color: #64748b; font-size: 0.9rem; }
</style>
