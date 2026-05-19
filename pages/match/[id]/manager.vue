<template>
  <div class="manager-layout" v-if="matchData">
    <header class="header">
      <h2>📋 감독 제어판 (채널: {{ matchId }})</h2>
      <div class="sport-selectors">
        <button @click="setSport('soccer')" :class="{ active: matchData.currentSport === 'soccer' }" class="sport-btn soccer-btn">⚽ 축구</button>
        <button @click="setSport('basketball')" :class="{ active: matchData.currentSport === 'basketball' }" class="sport-btn basketball-btn">🏀 농구</button>
      </div>
    </header>
    
    <TacticalBoard 
      :sport="matchData.currentSport || 'soccer'" 
      :players="matchData.players || []" 
      :readOnly="false" 
      @update-player="onPlayerUpdate"
      @return-to-bench="movePlayerToBench"
    />

    <section class="bench">
      <div class="bench-header">
        <h4>🏃 대기 선수 명단 (칩을 위 경기장으로 드래그하여 투입)</h4>
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

// 벤치 칩 모바일 수동 드래그 임시 상태 변수
const activeBenchDragPlayer = ref(null)
const benchDragOffsets = reactive({ x: 0, y: 0 })

// 벤치(bench) 상태인 선수들 필터링
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

// [기능 원상복구] 등록하면 코트가 아니라 'bench'로 대기 진입시킴
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
    state: 'bench', // 처음엔 무조건 대기명단(벤치) 상태!
    x: 0,
    y: 0
  })

  saveToServer()
  closeModal()
}

// ================== 벤치 ➔ 코트 투입 핸들러 (드래그 제어) ==================
const onBenchDragStart = (e, player) => {
  const event = e.touches ? e.touches[0] : e
  activeBenchDragPlayer.value = player
  benchDragOffsets.x = 0
  benchDragOffsets.y = 0
}

const onBenchDragMove = (e) => {
  if (!activeBenchDragPlayer.value) return
  const event = e.touches ? e.touches[0] : e
  
  // 기준점으로부터 위로 얼마나 밀어 올렸는지 변화량 추적
  // 벤치존에서 바깥(위쪽 전술판 방향)으로 나가는 흐름 감지용 임시 시각 피드백
  benchDragOffsets.x = event.clientX
  benchDragOffsets.y = event.clientY
}

const onBenchDragEnd = (e) => {
  if (!activeBenchDragPlayer.value) return
  
  // 만약 손가락을 뗀 최종 마우스/터치 위치가 위쪽 전술판 영역 내부로 넘어갔다면 코트 진입!
  // 모바일 스크린 해상도 및 간편 판정을 위해 화면 Y축 흐름 기준 위로 던져졌는지 체크
  if (benchDragOffsets.y > 0 && benchDragOffsets.y < window.innerHeight * 0.55) {
    const idx = matchData.value.players.findIndex(p => p.id === activeBenchDragPlayer.value.id)
    if (idx !== -1) {
      matchData.value.players[idx].state = 'pitch' // 전술판(코트) 모드로 전환!
      matchData.value.players[idx].x = 50  // 화면 한가운데에 칩 생성
      matchData.value.players[idx].y = 85  // 하단 진입부 부근 배치
      saveToServer()
    }
  }
  
  activeBenchDragPlayer.value = null
  benchDragOffsets.x = 0
  benchDragOffsets.y = 0
}

const getBenchPlayerStyle = (player) => {
  if (activeBenchDragPlayer.value?.id === player.id && benchDragOffsets.x !== 0) {
    return {
      position: 'fixed',
      left: `${benchDragOffsets.x}px`,
      top: `${benchDragOffsets.y}px`,
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      opacity: 0.8
    }
  }
  return {}
}

// 전술판 드래그 업데이트 수신
const onPlayerUpdate = (updatedPlayer) => {
  if (!matchData.value) return
  const idx = matchData.value.players.findIndex(p => p.id === updatedPlayer.id)
  if (idx !== -1) {
    matchData.value.players[idx] = updatedPlayer
    saveToServer()
  }
}

// 코트 안의 선수를 바닥 아래로 드래그 앤 드롭했을 때 벤치로 다시 수거하는 리스너
const movePlayerToBench = (playerId) => {
  if (!matchData.value) return
  const idx = matchData.value.players.findIndex(p => p.id === playerId)
  if (idx !== -1) {
    matchData.value.players[idx].state = 'bench' // 상태를 다시 벤치로 복귀!
    saveToServer()
  }
}

// ❌ 버튼을 누르면 데이터베이스에서 영구 소멸
const deletePlayerCompletely = (playerId) => {
  if (!matchData.value) return
  if (confirm('이 선수를 명단에서 완전히 삭제하시겠습니까?')) {
    matchData.value.players = matchData.value.players.filter(p => p.id !== playerId)
    saveToServer()
  }
}
</script>

<style scoped>
.manager-layout { padding: 15px; font-family: sans-serif; background-color: #f0f4f8; min-height: 100vh; }
.header { text-align: center; margin-bottom: 15px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.header h2 { margin: 0 0 10px 0; font-size: 1.2rem; }
.sport-selectors { display: flex; justify-content: center; gap: 10px; }
.sport-btn { padding: 8px 16px; border-radius: 20px; border: 1px solid #ccc; background: #eee; cursor: pointer; font-weight: bold; }
.soccer-btn.active { background-color: #2e7d32; color: white; border-color: #1b5e20; }
.basketball-btn.active { background-color: #d84315; color: white; border-color: #bf360c; }

.bench { margin-top: 15px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.bench-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.bench h4 { margin: 0; color: #333; font-size: 0.9rem; }
.add-player-btn { background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 0.8rem; }

/* 벤치 드래그 감지 활성 존 */
.bench-players-zone { display: flex; gap: 10px; flex-wrap: wrap; min-height: 80px; align-items: center; background: #fafafa; border: 2px dashed #ddd; border-radius: 6px; padding: 10px; box-sizing: border-box; }
.empty-msg { font-size: 0.8rem; color: #999; text-align: center; width: 100%; }

/* 대기 선수 노드 칩 셋 */
.bench-player-node { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #ccc; padding: 6px 10px; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.06); cursor: grab; user-select: none; }
.bench-player-node.is-dragging { opacity: 0.4; }
.bench-chip { width: 24px; height: 24px; background: #f0f0f0; border: 1px solid #bbb; font-weight: bold; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: #333; }
.bench-name { font-size: 0.8rem; font-weight: bold; color: #444; }
.delete-x { font-size: 0.7rem; margin-left: 2px; cursor: pointer; padding: 2px; }

/* 모달창 디자인 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-content { background: white; padding: 20px; border-radius: 12px; width: 85%; max-width: 320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal-content h3 { margin-top: 0; font-size: 1.05rem; color: #333; margin-bottom: 15px; }
.input-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.input-group label { font-size: 0.8rem; font-weight: bold; color: #666; }
.input-group input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn { background: #eee; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.confirm-btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
</style>
