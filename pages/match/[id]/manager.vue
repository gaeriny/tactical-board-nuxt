<template>
  <div class="manager-layout" v-if="matchData">
    <header class="header">
      <h2>📋 감독 제어판 (채널: {{ matchId }})</h2>
      <div class="sport-selectors">
        <button @click="setSport('soccer')" :class="{ active: matchData.currentSport === 'soccer' }" class="sport-btn soccer-btn">⚽ 축구</button>
        <button @click="setSport('basketball')" :class="{ active: matchData.currentSport === 'basketball' }" class="sport-btn basketball-btn">🏀 농구</button>
      </div>
    </header>
    
    <TacticalBoard 
      :sport="matchData.currentSport || 'soccer'" 
      :players="matchData.players || []" 
      :readOnly="false" 
      @update-player="onPlayerUpdate" 
    />

    <section class="bench">
      <h4>선수 대기석 (터치하여 코트 진입)</h4>
      <div class="bench-players">
        <button 
          v-for="no in [1, 5, 7, 9, 10, 11, 23]" 
          :key="no" 
          @click="putOnPitch(no)" 
          class="bench-btn"
          :class="{ 'on-pitch': isOnPitch(no) }"
        >
          {{ no }}번 선수
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import TacticalBoard from '@/components/TacticalBoard.vue'

const matchId = useRoute().params.id
const { matchData, saveToServer } = useMatchFirebase(matchId)

const setSport = (sport) => {
  if (!matchData.value) return
  matchData.value.currentSport = sport
  saveToServer()
}

// 선수 등록 기능 부활
const putOnPitch = (no) => {
  if (!matchData.value) return
  if (!matchData.value.players) matchData.value.players = []
  
  const exists = matchData.value.players.find(p => p.no === no)
  if (!exists) {
    // 1번 선수 황색 칩 기본 좌표 (왼쪽 진영)
    matchData.value.players.push({ 
      id: Date.now() + no, // 고유ID
      no, 
      state: 'pitch', 
      x: 25, 
      y: 50 
    })
    saveToServer()
  } else {
    // 이미 코트에 있다면 뺌
    matchData.value.players = matchData.value.players.filter(p => p.no !== no)
    saveToServer()
  }
}

const isOnPitch = (no) => {
  return matchData.value?.players?.some(p => p.no === no)
}

// 드래그 후 좌표 서버 저장
const onPlayerUpdate = (updatedPlayer) => {
  if (!matchData.value) return
  const idx = matchData.value.players.findIndex(p => p.id === updatedPlayer.id)
  if (idx !== -1) {
    matchData.value.players[idx] = updatedPlayer
    saveToServer()
  }
}
</script>

<style scoped>
.manager-layout { padding: 15px; font-family: sans-serif; background-color: #f0f4f8; min-height: 100vh; }
.header { text-align: center; margin-bottom: 15px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.header h2 { margin: 0 0 10px 0; font-size: 1.2rem; }
.sport-selectors { display: flex; justify-content: center; gap: 10px; }
.sport-btn { padding: 8px 16px; border-radius: 20px; border: 1px solid #ccc; background: #eee; cursor: pointer; }
.soccer-btn.active { background-color: #2e7d32; color: white; border-color: #1b5e20; }
.basketball-btn.active { background-color: #d84315; color: white; border-color: #bf360c; }

.bench { margin-top: 20px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.bench h4 { margin: 0 0 10px 0; color: #555; }
.bench-players { display: flex; gap: 8px; flex-wrap: wrap; }
.bench-btn { padding: 10px 14px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; transition: background 0.1s; }
.bench-btn.on-pitch { background-color: #ffeb3b; color: black; font-weight: bold; border-color: #f57f17; }
</style>
