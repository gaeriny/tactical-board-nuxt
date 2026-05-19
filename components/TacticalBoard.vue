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
        class="player-chip" 
        :style="getPlayerStyle(p)"
        @mousedown="onDragStart($event, p)"
        @touchstart="onDragStart($event, p)"
      >
        {{ p.no }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'

const props = defineProps({
  sport: String,
  players: Array,
  readOnly: Boolean // 관중 뷰일 때는 드래그 차단
})

const emit = defineEmits(['update-player'])

const pitchRef = ref(null)
const dragStatus = reactive({
  player: null,
  startX: 0,
  startY: 0
})

const playersInPitch = computed(() => {
  return (props.players || []).filter(p => p.state === 'pitch')
})

// [드래그 시작 logic] 모바일 터치 및 마우스 호환
const onDragStart = (e, player) => {
  if (props.readOnly) return
  const event = e.touches ? e.touches[0] : e
  dragStatus.player = player
  dragStatus.startX = event.clientX
  dragStatus.startY = event.clientY
}

// [드래그 이동 logic] 실시간 좌표 계산
const onDragMove = (e) => {
  if (!dragStatus.player || !pitchRef.value) return
  const rect = pitchRef.value.getBoundingClientRect()
  const event = e.touches ? e.touches[0] : e
  
  // % 좌표로 환산
  let x = ((event.clientX - rect.left) / rect.width) * 100
  let y = ((event.clientY - rect.top) / rect.height) * 100

  // 코트 밖 이탈 방지
  x = Math.max(0, Math.min(100, x))
  y = Math.max(0, Math.min(100, y))

  dragStatus.player.x = x
  dragStatus.player.y = y
}

// [드래그 종료 logic] 서버에 좌표 저장
const onDragEnd = () => {
  if (!dragStatus.player) return
  emit('update-player', { ...dragStatus.player })
  dragStatus.player = null
}

// [색상 변경 logic] 하프라인(50%) 기준으로 팀 컬러 자동 변경
const getPlayerStyle = (player) => {
  const isAwayArea = player.x > 50 
  
  // 황색 (홈 진영) vs 청색 (어웨이 진영)
  const bgColor = isAwayArea ? '#007bff' : '#ffeb3b'
  const textColor = isAwayArea ? '#ffffff' : '#000000'
  const borderColor = isAwayArea ? '#004085' : '#f57f17'

  return {
    left: `${player.x}%`,
    top: `${player.y}%`,
    backgroundColor: bgColor,
    color: textColor,
    borderColor: borderColor,
    cursor: props.readOnly ? 'default' : 'grab'
  }
}
</script>

<style scoped>
.board-container { width: 100%; display: flex; justify-content: center; margin: 10px 0; }

.pitch {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10; /* 전술판 비율 고정 */
  border: 4px solid #fff;
  border-radius: 8px;
  overflow: hidden;
  touch-action: none; /* 모바일 브라우저 스크롤 방지 */
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

/* [배경 디자인] 축구: 초록 잔디 / 농구: 갈색 코트 */
.pitch-soccer {
  background-color: #2e7d32;
  background-image: repeating-linear-gradient(0deg, #2e7d32, #2e7d32 30px, #388e3c 30px, #388e3c 60px);
}

.pitch-basketball {
  background-color: #d84315;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNiNTVjMDMiIGZpbGwtb3BhY2l0eT0iMC41Ij48cGF0aCBkPSJNMCAwaDQwdjQwaC00MFYwek0yMCAyMGgyMHYyMEgyMFYyMHoyMCAwaDIwdjIwSDIwVjB6TTAgMjBoMjB2MjBIMFYyMHoyMCAwaDIwdjIwSDIwVjB6Ii8+PC9nPjwvZz48L3N2Zz4=');
}

.half-line {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  transform: translateX(-50%);
  z-style: dashed;
}

.player-chip {
  position: absolute;
  width: 32px;
  height: 32px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
  user-select: none;
  box-shadow: 0 4px 8px rgba(0,0,0,0.25);
  transition: transform 0.1s;
}
.player-chip:active { transform: translate(-50%, -50%) scale(1.15); } /* 잡았을 때 확대 */
</style>
