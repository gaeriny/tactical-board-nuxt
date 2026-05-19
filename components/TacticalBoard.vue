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
      <div v-if="sport === 'soccer'" class="soccer-lines">
        <div class="soccer-half-line"></div>
        <div class="soccer-center-circle"></div>
        <div class="soccer-center-spot"></div>
        <div class="soccer-penalty-box left"></div>
        <div class="soccer-goal-box left"></div>
        <div class="soccer-goal left"></div>
        <div class="soccer-penalty-box right"></div>
        <div class="soccer-goal-box right"></div>
        <div class="soccer-goal right"></div>
      </div>

      <div v-if="sport === 'basketball'" class="basketball-lines">
        <div class="bb-half-line"></div>
        <div class="bb-center-circle"></div>
        <div class="bb-three-point left"></div>
        <div class="bb-key left"></div>
        <div class="bb-backboard left"></div>
        <div class="bb-ring left"></div>
        <div class="bb-three-point right"></div>
        <div class="bb-key right"></div>
        <div class="bb-backboard right"></div>
        <div class="bb-ring right"></div>
      </div>
      
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
        <div class="player-name-tag">{{ p.name }}</div>
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

const emit = defineEmits(['update-player', 'return-to-bench'])

const pitchRef = ref(null)
const dragStatus = reactive({ player: null })

// 오직 경기장(pitch) 상태인 선수들만 화면에 표시
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

  // 드래그 중인 임시 좌표 계산 (X축은 가두고, Y축은 아래로 탈출 가능성 열어둠)
  x = Math.max(0, Math.min(100, x))
  
  // 만약 드래그가 경기장 바닥 아래(y > 108%)로 내려가면 벤치 수거 모드로 작동 유도
  dragStatus.player.x = x
  dragStatus.player.y = y
}

const onDragEnd = () => {
  if (!dragStatus.player) return
  
  // 💡 드래그 종료 시 Y축이 경기장 밑바닥을 한참 벗어나면 벤치로 복귀시킴
  if (dragStatus.player.y > 105) {
    emit('return-to-bench', dragStatus.player.id)
  } else {
    // 경기장 내부라면 상한선 가두고 서버 저장
    dragStatus.player.y = Math.max(0, Math.min(100, dragStatus.player.y))
    emit('update-player', { ...dragStatus.player })
  }
  
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
.pitch { position: relative; width: 100%; aspect-ratio: 16 / 10; border: 4px solid #fff; border-radius: 8px; overflow: hidden; touch-action: none; box-shadow: 0 5px 15px rgba(0,0,0,0.3); user-select: none; }
.pitch-soccer { background-color: #2e7d32; background-image: repeating-linear-gradient(90deg, #2e7d32, #2e7d32 8%, #388e3c 8%, #388e3c 16%); }
.pitch-basketball { background-color: #d84315; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 20px 20px; }
.soccer-lines *, .basketball-lines * { position: absolute; border: 2px solid rgba(255, 255, 255, 0.85); box-sizing: border-box; pointer-events: none; }
.soccer-half-line { left: 50%; top: 0; width: 0; height: 100%; transform: translateX(-50%); }
.soccer-center-circle { left: 50%; top: 50%; width: 22%; aspect-ratio: 1; border-radius: 50%; transform: translate(-50%, -50%); }
.soccer-center-spot { left: 50%; top: 50%; width: 6px; height: 6px; background: #fff; border-radius: 50%; transform: translate(-50%, -50%); }
.soccer-penalty-box { top: 15%; width: 16%; height: 70%; }
.soccer-penalty-box.left { left: 0; border-left: none; border-radius: 0 4px 4px 0; }
.soccer-penalty-box.right { right: 0; border-right: none; border-radius: 4px 0 0 4px; }
.soccer-goal-box { top: 32%; width: 6%; height: 36%; }
.soccer-goal-box.left { left: 0; border-left: none; }
.soccer-goal-box.right { right: 0; border-right: none; }
.soccer-goal { top: 42%; width: 2%; height: 16%; background: rgba(255,255,255,0.1); }
.soccer-goal.left { left: -2px; border-right: none; }
.soccer-goal.right { right: -2px; border-left: none; }
.bb-half-line { left: 50%; top: 0; width: 0; height: 100%; transform: translateX(-50%); }
.bb-center-circle { left: 50%; top: 50%; width: 18%; aspect-ratio: 1; border-radius: 50%; transform: translate(-50%, -50%); }
.bb-three-point { top: 5%; width: 28%; height: 90%; border-radius: 50%; }
.bb-three-point.left { left: -14%; border-left: none; }
.bb-three-point.right { right: -14%; border-right: none; }
.bb-key { top: 30%; width: 18%; height: 40%; background: rgba(255,255,255,0.05); }
.bb-key.left { left: 0; border-left: none; }
.bb-key.right { right: 0; border-right: none; }
.bb-backboard { top: 44%; width: 0px; height: 12%; border-width: 2px; }
.bb-backboard.left { left: 4%; }
.bb-backboard.right { right: 4%; }
.bb-ring { top: 47%; width: 3.5%; aspect-ratio: 1; border-radius: 50%; border-color: #ff5722; }
.bb-ring.left { left: 4.8%; }
.bb-ring.right { right: 4.8%; }

.player-node { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 3px; z-index: 10; }
.player-chip { width: 32px; height: 32px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; box-shadow: 0 4px 8px rgba(0,0,0,0.25); transition: transform 0.1s; }
.player-node:active .player-chip { transform: scale(1.15); }
.player-name-tag { background: rgba(0, 0, 0, 0.75); color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
</style>
