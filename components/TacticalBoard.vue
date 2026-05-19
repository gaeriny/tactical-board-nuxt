<template>
  <div class="board-wrapper">
    <div v-if="sport === 'soccer'" class="pitch pitch-soccer" ref="pitchRef" @mousemove="onDragMove" @touchmove="onDragMove" @mouseup="onDragEnd" @touchend="onDragEnd">
      <div class="half-line"></div>
      <div v-for="p in playersInPitch" :key="p.id" class="player-chip" :style="getPlayerStyle(p)" @mousedown="onDragStart($event, p)" @touchstart="onDragStart($event, p)">
        {{ p.no }}
      </div>
    </div>

    <div v-else class="pitch pitch-basketball" ref="pitchRef" @mousemove="onDragMove" @touchmove="onDragMove" @mouseup="onDragEnd" @touchend="onDragEnd">
      <div class="half-line"></div>
      <div v-for="p in playersInPitch" :key="p.id" class="player-chip" :style="getPlayerStyle(p)" @mousedown="onDragStart($event, p)" @touchstart="onDragStart($event, p)">
        {{ p.no }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  sport: String,
  players: Array,
  readOnly: Boolean // 관중 뷰일 때는 드래그를 막아주기 위한 안전장치
})

const emit = defineEmits(['update-player'])
const pitchRef = ref(null)

// 코트 위에 올라와 있는 선수들만 필터링
const playersInPitch = computed(() => {
  return (props.players || []).filter(p => p.state === 'pitch')
})

// 드래그 상태 관리 변수들
let draggingPlayer = null

const onDragStart = (e, player) => {
  if (props.readOnly) return
  draggingPlayer = player
}

const onDragMove = (e) => {
  if (!draggingPlayer || !pitchRef.value) return
  
  const rect = pitchRef.value.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY

  let x = ((clientX - rect.left) / rect.width) * 100
  let y = ((clientY - rect.top) / rect.height) * 100

  // 코트 밖을 벗어나지 못하도록 제한
  x = Math.max(0, Math.min(100, x))
  y = Math.max(0, Math.min(100, y))

  draggingPlayer.x = x
  draggingPlayer.y = y
}

const onDragEnd = () => {
  if (!draggingPlayer) return
  emit('update-player', { ...draggingPlayer })
  draggingPlayer = null
}

// [핵심 변경 사항] 하프라인(50%) 기준으로 어웨이 영역 침범 시 팀 컬러 실시간 변조
const getPlayerStyle = (player) => {
  const isAwayArea = player.x > 50 
  // 홈 진영(왼쪽)에선 황색 바탕에 검은 글씨, 어웨이 진영(오른쪽)에선 청색 바탕에 흰 글씨
  const bg = isAwayArea ? '#007bff' : '#ffeb3b'
  const text = isAwayArea ? '#ffffff' : '#000000'

  return {
    left: `${player.x}%`,
    top: `${player.y}%`,
    backgroundColor: bg,
    color: text,
    borderColor: isAwayArea ? '#004085' : '#f57f17'
  }
}
</script>

<style scoped>
.board-wrapper { width: 100%; margin: 10px 0; }
.pitch { position: relative; width: 100%; height: 380px; border: 3px solid #fff; border-radius: 8px; overflow: hidden; touch-action: none; }
.pitch-soccer { background-color: #2e7d32; }
.pitch-basketball { background-color: #d84315; }
.half-line { position: absolute; left: 50%; top: 0; width: 2px; height: 100%; background-color: rgba(255, 255, 255, 0.7); border-style: dashed; }
.player-chip { position: absolute; width: 32px; height: 32px; transform: translate(-50%, -50%); border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; user-select: none; cursor: grab; box-shadow: 0 3px 6px rgba(0,0,0,0.16); transition: background-color 0.1s; }
</style>
