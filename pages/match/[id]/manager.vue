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
    />

    <section class="bench">
      <div class="bench-header">
        <h4>🏃 출전 선수 명단</h4>
        <button @click="showModal = true" class="add-player-btn">➕ 선수 직접 등록</button>
      </div>

      <div class="bench-players">
        <div v-if="!matchData.players || matchData.players.length === 0" class="empty-msg">
          등록된 선수가 없습니다. 오른쪽 위의 버튼을 눌러 선수를 추가하세요!
        </div>
        
        <div 
          v-for="p in matchData.players" 
          :key="p.id" 
          class="player-card"
          @click="removePlayer(p.id)"
        >
          <span class="card-no">{{ p.no }}</span>
          <span class="card-name">{{ p.name || '선수' }}</span>
          <span class="card-delete">❌</span>
        </div>
      </div>
    </section>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h3>🏃 새 선수 등록</h3>
        <div class="input-group">
          <label>등번호</label>
          <input type="number" v-model="newPlayer.no" placeholder="예: 10" ref="noInput">
        </div>
        <div class="input-group">
          <label>선수 이름</label>
          <input type="text" v-model="newPlayer.name" placeholder="예: 손흥민" @keyup.enter="submitPlayer">
        </div>
        <div class="modal-actions">
          <button @click="closeModal" class="cancel-btn">취소</button>
          <button @click="submitPlayer" class="confirm-btn">코트 진입</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute } from 'vue-router'
import TacticalBoard from '@/components/TacticalBoard.vue'

const matchId = useRoute().params.id
const { matchData, saveToServer } = useMatchFirebase(matchId)

// 팝업 상태 관리
const showModal = ref(false)
const newPlayer = reactive({
  no: '',
  name: ''
})

const setSport = (sport) => {
  if (!matchData.value) return
  matchData.value.currentSport = sport
  saveToServer()
}

// 팝업 닫기 및 초기화
const closeModal = () => {
  showModal.value = false
  newPlayer.no = ''
  newPlayer.name = ''
}

// [기능 복원] 번호와 이름을 입력받아 실시간 커스텀 선수 등록
const submitPlayer = () => {
  if (!newPlayer.no) {
    alert('등번호를 입력해 주세요!')
    return
  }
  if (!matchData.value) return
  if (!matchData.value.players) matchData.value.players = []

  // 중복 등번호 체크
  const isDuplicate = matchData.value.players.some(p => p.no === parseInt(newPlayer.no))
  if (isDuplicate) {
    alert('이미 코트에 있는 등번호입니다!');
    return;
  }

  // 왼쪽 진영(x: 25, y: 50)에 황색 칩으로 자동 배치
  matchData.value.players.push({
    id: Date.now(), // 고유 ID
    no: parseInt(newPlayer.no),
    name: newPlayer.name || `${newPlayer.no}번`,
    state: 'pitch',
    x: 25, 
    y: 50
  })

  saveToServer()
  closeModal()
}

// 명단에서 클릭 시 전술판에서 실시간 제외(삭제)
const removePlayer = (playerId) => {
  if (!matchData.value || !matchData.value.players) return
  if (confirm('이 선수를 전술판에서 제외할까요?')) {
    matchData.value.players = matchData.value.players.filter(p => p.id !== playerId)
    saveToServer()
  }
}

// 드래그 후 좌표 실시간 저장
const onPlayerUpdate = (updatedPlayer) => {
  if (!matchData.value) return
  const idx = matchData.value.players.findIndex(p => p.id === updatedPlayer.id)
  if (idx !== -1) {
    matchData.value.players[idx] = updatedPlayer
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

.bench { margin-top: 20px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.bench-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.bench h4 { margin: 0; color: #333; }
.add-player-btn { background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 0.85rem; }

.bench-players { display: flex; gap: 8px; flex-wrap: wrap; min-height: 50px; align-items: center; }
.empty-msg { font-size: 0.85rem; color: #888; text-align: center; width: 100%; padding: 10px 0; }
.player-card { display: flex; align-items: center; gap: 6px; background: #fffde7; border: 1px solid #fff59d; padding: 8px 12px; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer; }
.card-no { background: #ffeb3b; font-weight: bold; min-width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }
.card-name { font-size: 0.85rem; font-weight: bold; color: #333; }
.card-delete { font-size: 0.7rem; margin-left: 4px; opacity: 0.6; }

/* 팝업 모달창 스타일 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-content { background: white; padding: 20px; border-radius: 12px; width: 85%; max-width: 320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal-content h3 { margin-top: 0; font-size: 1.1rem; color: #333; margin-bottom: 15px; }
.input-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.input-group label { font-size: 0.8rem; font-weight: bold; color: #666; }
.input-group input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn { background: #eee; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.confirm-btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
</style>
