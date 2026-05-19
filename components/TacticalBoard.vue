<template>
  <div class="board-container">
    <div 
      ref="pitchRef" 
      class="pitch" 
      :class="{ 'pitch-soccer': sport === 'soccer', 'pitch-basketball': sport === 'basketball' }"
      @mousemove="onDragMove"
      @touchmove="onDragMove"
      @mouseup="onDragEnd"
      @touchend="onDragEnd"
      @mouseleave="onDragEnd"
    >
      <div class="half-line"></div>
      
      <div 
        v-for="p in playersInPitch" 
        :key="p.id" 
        class="player-node"
        :style="{ left: `${p.x}%`, top: `${p.y}%` }"
        @mousedown="onDragStart($event, p)"
        @touchstart="onDragStart($event, p)"
      >
        <div class="player-chip" :style="getPlayerStyle(p)">
          {{ p.no }}
        </div>
        <div class="player-name-tag">{{ p.name || '선수' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'

const props = defineProps({
  sport: String,
  players: Array,
  readOnly: Boolean
})

const emit = defineEmits(['update-player'])

const pitchRef = ref(null)
const dragStatus = reactive({ player: null })

const playersInPitch = computed(() => {
  return (props.players || []).filter(p => p.state === 'pitch')
})

const onDragStart = (e, player) => {
  if (props.readOnly) return
  dragStatus.player = player
}

const onDragMove = (e) => {
  if (!dragStatus.player || !pitchRef.value) return
  const rect = pitchRef.value.getBoundingClientRect()
  const event = e.touches ? e.touches[0] : e
  
  let x = ((event.clientX - rect.left) / rect.width) * 100
  let y = ((event.clientY - rect.top) / rect.height) * 100

  x = Math.max(0, Math.min(100, x))
  y = Math.max(0, Math.min(100, y))

  dragStatus.player.x = x
  dragStatus.player.y = y
}

const onDragEnd = () => {
  if (!dragStatus.player) return
  emit('update-player', { ...dragStatus.player })
  dragStatus.player = null
}

const getPlayerStyle = (player) => {
  const isAwayArea = player.x > 50 
  const bgColor = isAwayArea ? '#007bff' : '#ffeb3b'
  const textColor = isAwayArea ? '#ffffff' : '#000000'
  const borderColor = isAwayArea ? '#004085' : '#f57f17'

  return {
    backgroundColor: bgColor,
    color: textColor,
    borderColor: borderColor,
    cursor: props.readOnly ? 'default' : 'grab'
  }
}
</script>

<style scoped>
.board-container { width: 100%; display: flex; justify-content: center; margin: 10px 0; }
.pitch { position: relative; width: 100%; aspect-ratio: 16 / 10; border: 4px solid #fff; border-radius: 8px; overflow: hidden; touch-action: none; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
.pitch-soccer { background-color: #2e7d32; background-image: repeating-linear-gradient(0deg, #2e7d32, #2e7d32 30px, #388e3c 30px, #388e3c 60px); }
.pitch-basketball { background-color: #d84315; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNiNTVjMDMiIGZpbGwtb3BhY2l0eT0iMC41Ij48cGF0aCBkPSJNMCAwaDQwdjQwaC00MFYwek0yMCAyMGgyMHYyMEgyMFYyMHoyMCAwaDIwdjIwSDIwVjB6TTAgMjBoMjB2MjBIMFYyMHoyMCAwaDIwdjIwSDIwVjB6Ii8+PC9nPjwvZz48L3N2Zz4='); }
.half-line { position: absolute; left: 50%; top: 0; width: 2px; height: 100%; background-color: rgba(255, 255, 255, 0.7); transform: translateX(-50%); border-style: dashed; }

/* 선수 노드 패키지 배치 */
.player-node { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 3px; z-index: 10; }
.player-chip { width: 32px; height: 32px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; user-select: none; box-shadow: 0 4px 8px rgba(0,0,0,0.25); transition: transform 0.1s; }
.player-node:active .player-chip { transform: scale(1.15); }

/* 선수 이름 이름표 스타일 */
.player-name-tag { background: rgba(0, 0, 0, 0.75); color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
</style>
