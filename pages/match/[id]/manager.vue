<template>
  <div class="manager-layout" v-if="matchData">
    <header class="header">
      <div class="team-vs-title">
        <span class="t-name home">{{ matchData.teamNames?.home || 'HOME' }}</span>
        <span class="vs">vs</span>
        <span class="t-name away">{{ matchData.teamNames?.away || 'AWAY' }}</span>
      </div>
      
      <div class="sport-selectors">
        <button @click="setSport('soccer')" :class="{ active: matchData.currentSport === 'soccer' }" class="sport-btn soccer-btn">⚽ 축구</button>
        <button @click="setSport('basketball')" :class="{ active: matchData.currentSport === 'basketball' }" class="sport-btn basketball-btn">🏀 농구</button>
      </div>
    </header>
    
    <div class="pitch-wrapper" ref="pitchWrapperRef">
      <TacticalBoard 
        :sport="matchData.currentSport || 'soccer'" 
        :players="matchData.players || []" 
        :readOnly="false" 
        @update-player="onPlayerUpdate"
        @return-to-bench="movePlayerToBench"
      />
    </div>

    <section class="bench">
      <div class="bench-header">
        <h4>🏃 대기 선수 명단 (경기장으로 드래그하여 투입)</h4>
        <button @click="showModal = true" class="add-player-btn">➕ 선수 등록</button>
      </div>

      <div class="bench-players-zone" @mousemove="onBenchDragMove" @touchmove="onBenchDragMove" @mouseup="onBenchDragEnd" @touchend="onBenchDragEnd">
        <div v-if="playersInBench.length === 0" class="empty-msg">
          대기 중인 선수가 없습니다. 선수를 등록한 후 경기장으로 올려보세요!
        </div>
        
        <div 
          v-for="p in playersInBench" 
          :key="p.id" 
          class="bench-player-node"
          :class="{ 'is-dragging': activeBenchDragPlayer?.id === p.id }"
          :style="getBenchPlayerStyle(p)"
          @mousedown="onBenchDragStart($event, p)"
          @touchstart="onBenchDragStart($event, p)"
        >
          <div class="bench-chip">{{ p.no }}</div>
          <span class="bench-name">{{ p.name }}</span>
          <span class="delete-x" @click.stop="deletePlayerCompletely(p.id)">❌</span>
        </div>
      </div>
    </section>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h3>🏃 대기 명단에 선수 추가</h3>
        <div class="input-group">
          <label>등번호</label>
          <input type="number" v-model="newPlayer.no" placeholder="예: 7">
        </div>
        <div class="input-group">
          <label>선수 이름</label>
          <input type="text" v-model="newPlayer.name" placeholder="예: 손흥민" @keyup.enter="submitPlayer">
        </div>
        <div class="modal-actions">
          <button @click="closeModal" class="cancel-btn">취소</button>
          <button @click="submitPlayer" class="confirm-btn">명단 등록</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import TacticalBoard from '@/components/TacticalBoard.vue'

const matchId = useRoute().params.id
const { matchData, saveToServer } = useMatchFirebase(matchId)

const showModal = ref(false)
const newPlayer = reactive({ no: '', name: '' })

const pitchWrapperRef = ref(null)
const activeBenchDragPlayer = ref(null)
const benchDragPositions = reactive({ x: 0, y: 0 })

const playersInBench = computed(() => {
  return (matchData.value?.players || []).filter(p => p.state === 'bench')
})

const setSport = (sport) => {
  if (!matchData.value) return
  matchData.value.currentSport = sport
  saveToServer()
}

const closeModal = () => {
  showModal.value = false
  newPlayer.no = ''
  newPlayer.name = ''
}

const submitPlayer = () => {
  if (!newPlayer.no) return alert('등번호를 입력하세요!')
  if (!matchData.value) return
  if (!matchData.value.players) matchData.value.players = []

  const isDuplicate = matchData.value.players.some(p => p.no === parseInt(newPlayer.no))
  if (isDuplicate) return alert('이미 존재하는 등번호입니다!')

  matchData.value.players.push({
    id: Date.now(),
    no: parseInt(newPlayer.no),
    name: newPlayer.name || `${newPlayer.no}번`,
    state: 'bench',
    x: 0,
    y: 0
  })

  saveToServer()
  closeModal()
}

// ================= 드래그 앤 드롭 정밀 안착 로직 =================
const onBenchDragStart = (e, player) => {
  const event = e.touches ? e.touches[0] : e
  activeBenchDragPlayer.value = player
  benchDragPositions.x = event.clientX
  benchDragPositions.y = event.clientY
}

const onBenchDragMove = (e) => {
  if (!activeBenchDragPlayer.value) return
  const event = e.touches ? e.touches[0] : e
  benchDragPositions.x = event.clientX
  benchDragPositions.y = event.clientY
}

const onBenchDragEnd = () => {
  if (!activeBenchDragPlayer.value || !pitchWrapperRef.value) return

  // 전술판 실제 돔 위치 획득
  const pitchEl = pitchWrapperRef.value.querySelector('.pitch')
  if (pitchEl) {
    const rect = pitchEl.getBoundingClientRect()
    
    // 놓은 손가락 위치가 전술판 가운뎃 영역 내부인지 검사
    if (
      benchDragPositions.x >= rect.left &&
      benchDragPositions.x <= rect.right &&
      benchDragPositions.y >= rect.top &&
      benchDragPositions.y <= rect.bottom
    ) {
      // 💡 [버그수정] 고정값이 아니라 놓은 손가락 지점의 비율(%) 좌표를 동적으로 실시간 연산!
      const dropX = ((benchDragPositions.x - rect.left) / rect.width) * 100
      const dropY = ((benchDragPositions.y - rect.top) / rect.height) * 100

      const idx = matchData.value.players.findIndex(p => p.id === activeBenchDragPlayer.value.id)
      if (idx !== -1) {
        matchData.value.players[idx].state = 'pitch'
        matchData.value.players[idx].x = Math.max(0, Math.min(100, dropX))
        matchData.value.players[idx].y = Math.max(0, Math.min(100, dropY))
        saveToServer()
      }
    }
  }

  activeBenchDragPlayer.value = null
}

const getBenchPlayerStyle = (player) => {
  if (activeBenchDragPlayer.value?.id === player.id && benchDragPositions.x !== 0) {
    return {
      position: 'fixed',
      left: `${benchDragPositions.x}px`,
      top: `${benchDragPositions.y}px`,
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      opacity: 0.85,
      pointerEvents: 'none'
    }
  }
  return {}
}

const onPlayerUpdate = (updatedPlayer) => {
  if (!matchData.value) return
  const idx = matchData.value.players.findIndex(p => p.id === updatedPlayer.id)
  if (idx !== -1) {
    matchData.value.players[idx] = updatedPlayer
    saveToServer()
  }
}

const movePlayerToBench = (playerId) => {
  if (!matchData.value) return
  const idx = matchData.value.players.findIndex(p => p.id === playerId)
  if (idx !== -1) {
    matchData.value.players[idx].state = 'bench'
    saveToServer()
  }
}

const deletePlayerCompletely = (playerId) => {
  if (!matchData.value) return
  if (confirm('이 선수를 명단에서 완전히 삭제하시겠습니까?')) {
    matchData.value.players = matchData.value.players.filter(p => p.id !== playerId)
    saveToServer()
  }
}
</script>

<style scoped>
.manager-layout { padding: 15px; font-family: sans-serif; background-color: #f0f4f8; min-height: 100vh; box-sizing: border-box; }
.header { text-align: center; margin-bottom: 12px; background: white; padding: 12px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }

/* 감독 상단 팀명 UI 조형 */
.team-vs-title { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; font-weight: bold; }
.team-vs-title .t-name { font-size: 1.1rem; color: #222; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.team-vs-title .vs { font-size: 0.8rem; color: #999; text-transform: uppercase; }

.sport-selectors { display: flex; justify-content: center; gap: 10px; }
.sport-btn { padding: 8px 18px; border-radius: 20px; border: 1px solid #ddd; background: #f5f5f5; cursor: pointer; font-weight: bold; font-size: 0.85rem; }
.soccer-btn.active { background-color: #2e7d32; color: white; border-color: #1b5e20; }
.basketball-btn.active { background-color: #d84315; color: white; border-color: #bf360c; }

.pitch-wrapper { width: 100%; }

.bench { margin-top: 15px; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.bench-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.bench h4 { margin: 0; color: #444; font-size: 0.85rem; }
.add-player-btn { background: #007bff; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem; }

.bench-players-zone { display: flex; gap: 8px; flex-wrap: wrap; min-height: 80px; align-items: center; background: #fafafa; border: 2px dashed #e0e0e0; border-radius: 8px; padding: 10px; box-sizing: border-box; }
.empty-msg { font-size: 0.8rem; color: #999; text-align: center; width: 100%; }

.bench-player-node { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #ddd; padding: 6px 12px; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); cursor: grab; user-select: none; }
.bench-player-node.is-dragging { opacity: 0.2; }
.bench-chip { width: 22px; height: 22px; background: #f0f0f0; border: 1px solid #ccc; font-weight: bold; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: #333; }
.bench-name { font-size: 0.8rem; font-weight: bold; color: #444; }
.delete-x { font-size: 0.7rem; margin-left: 4px; cursor: pointer; padding: 2px; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-content { background: white; padding: 20px; border-radius: 12px; width: 85%; max-width: 300px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
.modal-content h3 { margin-top: 0; font-size: 1rem; color: #333; margin-bottom: 15px; }
.input-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.input-group label { font-size: 0.75rem; font-weight: bold; color: #666; }
.input-group input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn { background: #eee; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.confirm-btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
</style>
