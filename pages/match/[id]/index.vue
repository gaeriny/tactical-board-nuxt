<template>
  <div class="audience-layout" v-if="matchData">
    <header class="header">
      <h2>📺 채널: {{ matchId }}</h2>
    </header>

    <section class="scoreboard-display">
      <div class="team-names">
        <span class="team-lbl home">{{ matchData.teamNames?.home || 'HOME' }}</span>
        <span class="vs-divider">vs</span>
        <span class="team-lbl away">{{ matchData.teamNames?.away || 'AWAY' }}</span>
      </div>
      <div class="digits">
        {{ matchData.scores?.home ?? 0 }} : {{ matchData.scores?.away ?? 0 }}
      </div>
      <div class="game-time">경기 시간: 15:00</div>
    </section>

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

<style scoped>
.audience-layout { padding: 15px; font-family: sans-serif; background-color: #f4f6f9; min-height: 100vh; box-sizing: border-box; }
.header { text-align: center; margin-bottom: 12px; }
.header h2 { margin: 0; font-size: 1.2rem; color: #333; font-weight: 800; }

.scoreboard-display { background: #222; color: #fff; padding: 18px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 15px; }
.team-names { display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: bold; font-size: 1.05rem; margin-bottom: 5px; color: #eee; }
.team-lbl { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vs-divider { font-size: 0.8rem; color: #888; text-transform: uppercase; }

.digits { font-size: 2.8rem; font-weight: 900; letter-spacing: 2px; margin-bottom: 5px; font-variant-numeric: tabular-nums; color: #ffeb3b; }
.game-time { font-size: 0.8rem; color: #aaa; font-weight: 500; }
</style>
