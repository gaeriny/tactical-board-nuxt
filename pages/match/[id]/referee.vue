<template>
  <div style="padding: 15px; font-family: sans-serif; text-align:center;" v-if="matchData">
    <h2>📯 심판 스코어 보드 제어기</h2>
    <div style="display:flex; justify-content:space-around; margin:20px 0;">
      <div>
        <h3>HOME</h3>
        <button @click="score('home', 1)" style="font-size:1.5rem; padding:10px 20px;">+1</button>
        <h2>{{ matchData.scores.home }}</h2>
        <button @click="score('home', -1)">-1</button>
      </div>
      <div>
        <h3>AWAY</h3>
        <button @click="score('away', 1)" style="font-size:1.5rem; padding:10px 20px;">+1</button>
        <h2>{{ matchData.scores.away }}</h2>
        <button @click="score('away', -1)">-1</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const matchId = useRoute().params.id
const { matchData, saveToServer } = useMatchFirebase(matchId)

const score = (team, val) => {
  matchData.value.scores[team] = Math.max(0, matchData.value.scores[team] + val)
  saveToServer()
}
</script>
