<template>
  <div style="padding: 15px; font-family: sans-serif;" v-if="matchData">
    <h2>📺 실시간 전술 현황 중계 (채널: {{ matchId }})</h2>
    <div style="background:#333; color:#fff; padding:15px; border-radius:8px; text-align:center;">
      <h3>{{ matchData.teamNames.home }} vs {{ matchData.teamNames.away }}</h3>
      <h1 style="font-size:2.5rem; margin:10px 0;">{{ matchData.scores.home }} : {{ matchData.scores.away }}</h1>
      <div>경기 시간: {{ Math.floor(matchData.timeLeft / 60) }}:{{ (matchData.timeLeft % 60).toString().padStart(2, '0') }}</div>
    </div>
    <TacticalBoard :sport="matchData.currentSport" :players="matchData.players" :readOnly="true" />
  </div>
</template>

<script setup>
const matchId = useRoute().params.id
const { matchData } = useMatchFirebase(matchId)
</script>
