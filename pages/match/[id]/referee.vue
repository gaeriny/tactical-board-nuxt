<template>
  <div class="referee-container" v-if="matchData">
    <header class="referee-header">
      <h2>📯 심판 제어 패널 (채널: {{ matchId }})</h2>
      <button @click="goBack" class="btn-back">로비로 이동</button>
    </header>

    <section class="timer-section">
      <h3>⏱️ 경기 타이머 제어</h3>
      <div class="timer-display">{{ formatTime(matchData.timer || 0) }}</div>
      
      <div class="timer-controls">
        <button 
          @click="toggleTimer" 
          :class="['btn-timer', matchData.isTiming ? 'pause' : 'start']"
        >
          {{ matchData.isTiming ? '⏸️ 일시 정지' : '▶️ 타이머 시작' }}
        </button>
        
        <button @click="resetTimer" class="btn-timer reset">
          🔄 초기화
        </button>
      </div>
    </section>

    <section class="score-section">
      <h3>⚽ 스코어 보드 관리</h3>
      <div class="score-board">
        <div class="team-control">
          <span class="team-name">{{ matchData.teamNames?.home || 'HOME' }}</span>
          <div class="score-actions">
            <button @click="updateScore('home', -1)">-</button>
            <span class="score-num">{{ matchData.scores?.home || 0 }}</span>
            <button @click="updateScore('home', 1)">+</button>
          </div>
        </div>

        <div class="score-divider">VS</div>

        <div class="team-control">
          <span class="team-name">{{ matchData.teamNames?.away || 'AWAY' }}</span>
          <div class="score-actions">
            <button @click="updateScore('away', -1)">-</button>
            <span class="score-num">{{ matchData.scores?.away || 0 }}</span>
            <button @click="updateScore('away', 1)">+</button>
          </div>
        </div>
      </div>
    </section>
  </div>
  <div v-else class="loading-state">
    <p>경기 데이터를 불러오는 중입니다...</p>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { onUnmounted, watch } from 'vue'

const route = useRoute()
const router = useRouter()
const matchId = route.params.id

// 기존 프로젝트에 정의된 실시간 파이어베이스 연동 컴포저블 호출
const { matchData, saveToServer } = useMatchFirebase(matchId)

// 자바스크립트 내부 타이머 인스턴스 홀더
let timerInterval = null

// 시간 포맷팅 인터페이스 (예: 90 -> 01:30)
const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

// 1. 타이머 가동/중지 토글 컨트롤러
const toggleTimer = () => {
  if (!matchData.value) return
  
  // 상태 변경 후 서버 동기화
  matchData.value.isTiming = !matchData.value.isTiming
  saveToServer()
}

// 2. 타이머 초기화 리셋 핸들러
const resetTimer = () => {
  if (!matchData.value) return
  if (!confirm('타이머를 00:00으로 초기화하시겠습니까?')) return

  matchData.value.isTiming = false
  matchData.value.timer = 0
  saveToServer()
}

// 3. 스코어 제어 핸들러
const updateScore = (team, amount) => {
  if (!matchData.value || !matchData.value.scores) return
  const currentScore = matchData.value.scores[team] || 0
  
  // 음수 점수 방지
  if (currentScore + amount < 0) return

  matchData.value.scores[team] = currentScore + amount
  saveToServer()
}

// ⏳ [핵심 복구 리스너]: 파이어베이스의 isTiming 상태를 감시하여 브라우저 타이머 동기화 구동
watch(
  () => matchData.value?.isTiming,
  (isTiming) => {
    // 기존에 돌던 인터벌이 있다면 중복 방지를 위해 청소
    if (timerInterval) clearInterval(timerInterval)

    if (isTiming) {
      // 실시간으로 1초마다 내부 timer 값을 올려주고 서버에 밀어 넣습니다.
      timerInterval = setInterval(() => {
        if (matchData.value) {
          matchData.value.timer = (matchData.value.timer || 0) + 1
          saveToServer()
        }
      }, 1000)
    }
  },
  { immediate: true }
)

// 페이지를 나갈 때 메모리 누수 방지를 위해 타이머 소멸 처리
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.referee-container { max-width: 500px; margin: 0 auto; padding: 20px; font-family: sans-serif; background: #fafafa; min-height: 100vh; }
.referee-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; }
.referee-header h2 { font-size: 1.2rem; margin: 0; color: #333; }
.btn-back { background: #666; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }

.timer-section, .score-section { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; }
.timer-section h3, .score-section h3 { margin-top: 0; font-size: 1rem; color: #555; text-align: left; border-left: 4px solid #007bff; padding-left: 8px; }

.timer-display { font-size: 3.5rem; font-weight: 800; font-family: monospace; margin: 15px 0; color: #222; letter-spacing: 2px; }
.timer-controls { display: flex; gap: 10px; justify-content: center; }

.btn-timer { flex: 1; max-width: 150px; padding: 12px 0; border: none; border-radius: 8px; font-weight: bold; font-size: 0.95rem; cursor: pointer; color: white; }
.btn-timer.start { background-color: #2e7d32; }
.btn-timer.pause { background-color: #d32f2f; }
.btn-timer.reset { background-color: #757575; }
.btn-timer:active { transform: scale(0.98); }

.score-board { display: flex; align-items: center; justify-content: space-around; margin-top: 20px; }
.team-control { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.team-name { font-weight: bold; color: #444; font-size: 1.1rem; }
.score-actions { display: flex; align-items: center; gap: 15px; }
.score-actions button { width: 36px; height: 36px; border: 1px solid #ccc; background: #f0f0f0; border-radius: 50%; font-size: 1.2rem; font-weight: bold; cursor: pointer; }
.score-actions button:active { background: #ddd; }
.score-num { font-size: 2rem; font-weight: bold; min-width: 40px; }
.score-divider { font-size: 1.2rem; font-weight: bold; color: #999; }

.loading-state { text-align: center; padding: 50px; color: #666; }
</style>
