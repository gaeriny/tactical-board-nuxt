<template>
  <div style="padding: 15px; font-family: sans-serif;" v-if="matchData">
    <h2>📋 감독 모드 (채널: {{ matchId }})</h2>
    <div style="margin-bottom:15px;">
      <button @click="toggleSport('soccer')" :style="{background: matchData.currentSport==='soccer'?'green':''}">축구</button>
      <button @click="toggleSport('basketball')" :style="{background: matchData.currentSport==='basketball'?'orange':''}">농구</button>
    </div>
    
    <TacticalBoard :sport="matchData.currentSport" :players="matchData.players" :readOnly="false" @update-player="onPlayerUpdate" />

    <div style="margin-top:20px; background:#eee; padding:10px; border-radius:5px;">
      <h4>선수 대기석 (클릭 시 코트 진입)</h4>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button v-for="no in [1, 7, 9, 10, 11]" :key="no" @click="putOnPitch(no)" style="padding:8px 12px;">{{ no }}번 선수</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const matchId = useRoute().params.id
const { matchData, saveToServer } = useMatchFirebase(matchId)

const toggleSport = (sport) => {
  matchData.value.currentSport = sport
  saveToServer()
}

const putOnPitch = (no) => {
  if (!matchData.value.players) matchData.value.players = []
  const exists = matchData.value.players.find(p => p.no === no)
  if (!exists) {
    matchData.value.players.push({ id: Date.now() + no, no, state: 'pitch', x: 25, y: 50 })
    saveToServer()
  }
}

const onPlayerUpdate = (updatedPlayer) => {
  const idx = matchData.value.players.findIndex(p => p.id === updatedPlayer.id)
  if (idx !== -1) {
    matchData.value.players[idx] = updatedPlayer
    saveToServer()
  }
}
</script>
