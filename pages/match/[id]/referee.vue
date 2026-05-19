<template>
  <div class="referee-layout" v-if="matchData">
    <header class="header">
      <h2>📯 심판 스코어 보드 (채널: {{ matchId }})</h2>
    </header>

    <section class="card team-name-section">
      <h4>✏️ 팀 이름 설정</h4>
      <div class="team-name-inputs">
        <div class="input-box">
          <label>홈 팀</label>
          <input 
            type="text" 
            v-model="matchData.teamNames.home" 
            @input="updateTeamNames" 
            placeholder="HOME 팀명"
          />
        </div>
        <div class="vs-label">VS</div>
        <div class="input-box">
          <label>어웨이 팀</label>
          <input 
            type="text" 
            v-model="matchData.teamNames.away" 
            @input="updateTeamNames" 
            placeholder="AWAY 팀명"
          />
        </div>
      </div>
    </section>

    <section class="card score-section">
      <div class="score-board">
        <div class="score-ctrl-box">
          <div class="team-title-display">{{ matchData.teamNames?.home || 'HOME' }}</div>
          <div class="score-num">{{ matchData.scores?.home ?? 0 }}</div>
          <div class="btn-group">
            <button @click="adjustScore('home', 1)" class="btn-plus">➕ 1점</button>
            <button @click="adjustScore('home', -1)" class="btn-minus">➖ 1점</button>
          </div>
        </div>

        <div class="vs-center">:</div>

        <div class="score-ctrl-box">
          <div class="team-title-display">{{ matchData.teamNames?.away || 'AWAY' }}</div>
          <div class="score-num">{{ matchData.scores?.away ?? 0 }}</div>
          <div class="btn-group">
            <button @click="adjustScore('away', 1)" class="btn-plus">➕ 1점</button>
            <button @click="adjustScore('away', -1)" class="btn-minus">➖ 1점</button>
          </div>
        </div>
      </div>
    </section>

    <div class="reset-wrapper">
      <button @click="resetMatch" class="btn-reset">🔄 경기 스코어 초기화</button>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const matchId = useRoute().params.id
const { matchData, saveToServer } = useMatchFirebase(matchId)

// 팀 이름 실시간 서버 입력 동기화
const updateTeamNames = () => {
  if (!matchData.value) return
  if (!matchData.value.teamNames) {
    matchData.value.teamNames = { home: '', away: '' }
  }
  saveToServer()
}

// 점수 증감 제어
const adjustScore = (team, amount) => {
  if (!matchData.value) return
  if (!matchData.value.scores) {
    matchData.value.scores = { home: 0, away: 0 }
  }
  
  matchData.value.scores[team] = Math.max(0, (matchData.value.scores[team] ?? 0) + amount)
  saveToServer()
}

// 경기 초기화
const resetMatch = () => {
  if (!matchData.value) return
  if (confirm('현재 경기 점수와 팀 이름을 초기화할까요?')) {
    matchData.value.scores = { home: 0, away: 0 }
    matchData.value.teamNames = { home: 'HOME', away: 'AWAY' }
    saveToServer()
  }
}
</script>

<style scoped>
.referee-layout { padding: 15px; font-family: sans-serif; background-color: #f7f9fc; min-height: 100vh; }
.header { text-align: center; margin-bottom: 15px; background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.header h2 { margin: 0; font-size: 1.1rem; color: #333; }

.card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 15px; }
.card h4 { margin: 0 0 10px 0; color: #666; font-size: 0.85rem; }

/* 팀 이름 입력 필드 스타일 */
.team-name-inputs { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.input-box { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.input-box label { font-size: 0.75rem; font-weight: bold; color: #888; }
.input-box input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; font-weight: bold; text-align: center; background: #fafafa; }
.input-box input:focus { border-color: #007bff; background: #fff; outline: none; }
.vs-label { font-size: 0.8rem; font-weight: bold; color: #aaa; margin-top: 15px; }

/* 점수 제어 스코어보드 스타일 */
.score-board { display: flex; align-items: center; justify-content: space-around; padding: 10px 0; }
.score-ctrl-box { display: flex; flex-direction: column; align-items: center; flex: 1; text-align: center; }
.team-title-display { font-size: 0.9rem; font-weight: bold; color: #444; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 5px; }
.score-num { font-size: 3rem; font-weight: 900; color: #222; margin: 5px 0; font-variant-numeric: tabular-nums; }

.vs-center { font-size: 2rem; font-weight: bold; color: #ccc; margin-top: 15px; flex: 0.2; text-align: center; }

/* 가독성 높은 터치 버튼 레이아웃 */
.btn-group { display: flex; flex-direction: column; gap: 6px; width: 85%; }
.btn-group button { padding: 10px 0; border: none; border-radius: 6px; font-weight: bold; font-size: 0.85rem; cursor: pointer; }
.btn-plus { background-color: #e3f2fd; color: #0d47a1; }
.btn-plus:active { background-color: #bbdefb; }
.btn-minus { background-color: #efebe9; color: #4e342e; }
.btn-minus:active { background-color: #d7ccc8; }

.reset-wrapper { text-align: center; margin-top: 25px; }
.btn-reset { background: none; border: 1px solid #bbb; padding: 10px 16px; border-radius: 6px; color: #777; font-size: 0.85rem; font-weight: bold; cursor: pointer; }
.btn-reset:active { background: #eee; }
</style>
