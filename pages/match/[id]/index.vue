<template>
  <div style="padding: 15px; font-family: sans-serif;" v-if="matchData">
    <h2>📺 실시간 전술 현황 중계 (채널: {{ matchId }})</h2>
    
    <div style="background:#333; color:#fff; padding:15px; border-radius:8px; text-align:center; margin-bottom: 15px;">
      <h3>{{ matchData.teamNames?.home || 'HOME' }} vs {{ matchData.teamNames?.away || 'AWAY' }}</h3>
      <h1 style="font-size:2.5rem; margin:10px 0;">
        {{ matchData.scores?.home ?? 0 }} : {{ matchData.scores?.away ?? 0 }}
      </h1>
      <div>경기 시간: {{ Math.floor((matchData.timeLeft || 900) / 60) }}:{{ ((matchData.timeLeft || 900) % 60).toString().padStart(2, '0') }}</div>
    </div>

    <TacticalBoard 
      :sport="matchData.currentSport || 'soccer'" 
      :players="matchData.players || []" 
      :readOnly="true" 
    />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import TacticalBoard from '@/components/TacticalBoard.vue'

const matchId = useRoute().params.id
const { matchData } = useMatchFirebase(matchId)
</script>
