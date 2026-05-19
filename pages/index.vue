<template>
  <div class="lobby-container">
    <header class="lobby-header">
      <h1>🏟️ 실시간 경기 전술 대시보드</h1>
      <p class="subtitle">채널을 생성하거나 참여하여 경기를 관리하세요.</p>
    </header>

    <main class="lobby-card">
      <div class="input-group">
        <label for="channel-input">📌 경기 채널 이름</label>
        <div class="search-box">
          <input 
            id="channel-input"
            type="text" 
            v-model.trim="channelName" 
            placeholder="예: test1, my-match"
            @keyup.enter="checkChannelExistence"
          />
          <button @click="checkChannelExistence" class="btn-primary">확인</button>
        </div>
      </div>

      <transition name="fade">
        <div v-if="channelStatus === 'exists'" class="status-zone setup-zone">
          <div class="alert-msg success">🟢 가동 중인 채널을 찾았습니다!</div>
          
          <div class="role-selector">
            <label>진입 권한 선택</label>
            <div class="role-btns">
              <button @click="selectedRole = 'audience'" :class="{ active: selectedRole === 'audience' }">📺 관중 뷰</button>
              <button @click="selectedRole = 'manager'" :class="{ active: selectedRole === 'manager' }">📋 감독 뷰</button>
              <button @click="selectedRole = 'referee'" :class="{ active: selectedRole === 'referee' }">📯 심판 뷰</button>
            </div>
          </div>

          <div v-if="selectedRole !== 'audience'" class="input-group password-group">
            <label>🔑 보안 비밀번호</label>
            <input type="password" v-model="passwordInput" placeholder="비밀번호를 입력하세요" @keyup.enter="enterChannel" />
          </div>

          <button @click="enterChannel" class="btn-action enter">🚪 채널 입장하기</button>
        </div>

        <div v-else-if="channelStatus === 'new'" class="status-zone setup-zone">
          <div class="alert-msg info">✨ 개설 가능한 새로운 채널명입니다.</div>
          
          <div class="input-group">
            <label>📋 감독용 패스워드 설정</label>
            <input type="password" v-model="newChannelPasswords.manager" placeholder="감독 진입 시 사용할 암호" />
          </div>

          <div class="input-group">
            <label>📯 심판용 패스워드 설정</label>
            <input type="password" v-model="newChannelPasswords.referee" placeholder="심판 진입 시 사용할 암호" />
          </div>

          <button @click="createNewChannel" class="btn-action create">➕ 새 경기 채널 개설</button>
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const channelName = ref('')
const channelStatus = ref('') 
const selectedRole = ref('audience')
const passwordInput = ref('')

const newChannelPasswords = reactive({
  manager: '',
  referee: ''
})

// 💡 [핵심 교정] 500번 및 팝업 에러를 원천 차단하기 위해 원시 문자열로 전환될 변수 가동
const activeChannelId = ref('')

// 컴포저블 내부로 전달될 때는 Computed를 활용해 반응형 '스트링 값'만 깨끗하게 전달합니다.
const targetMatchId = computed(() => activeChannelId.value || '__LOBBY_HOLDER__')
const { matchData, saveToServer } = useMatchFirebase(targetMatchId)

// 1. 채널 검증 핸들러
const checkChannelExistence = () => {
  if (!channelName.value) return alert('채널명을 입력해 주세요!')
  
  // 입력된 순수 문자열 값을 트리거에 할당하여 컴포저블이 Firebase와 통신하도록 유도합니다.
  activeChannelId.value = channelName.value

  // 실시간 스트림 연결을 감안하여 0.5초 대기 후 데이터 존재 유무 판별
  setTimeout(() => {
    if (matchData.value && (matchData.value.currentSport || matchData.value.scores || matchData.value.passwords)) {
      channelStatus.value = 'exists'
    } else {
      channelStatus.value = 'new'
    }
  }, 500)
}

// 2. 신규 채널 생성 로직
const createNewChannel = () => {
  if (!newChannelPasswords.manager || !newChannelPasswords.referee) {
    return alert('감독 및 심판 비밀번호를 모두 지정해야 채널 개설이 가능합니다!')
  }

  // 데이터 구조 바인딩
  matchData.value = {
    currentSport: 'soccer',
    scores: { home: 0, away: 0 },
    teamNames: { home: 'HOME', away: 'AWAY' },
    players: [],
    passwords: {
      manager: newChannelPasswords.manager,
      referee: newChannelPasswords.referee
    }
  }

  // 기존 컴포저블 내장 저장 기능 활용
  saveToServer()
  
  alert(`🎉 [${channelName.value}] 채널이 개설되었습니다! 관중 모드로 입장합니다.`)
  router.push(`/match/${channelName.value}`)
}

// 3. 기존 채널 입장 및 권한 검증
const enterChannel = () => {
  if (selectedRole.value === 'audience') {
    router.push(`/match/${channelName.value}`)
    return
  }

  const savedPasswords = matchData.value?.passwords

  if (!savedPasswords || !savedPasswords[selectedRole.value]) {
    alert('이 채널은 보안 설정이 없는 방입니다. 비밀번호 없이 입장합니다.')
    router.push(`/match/${channelName.value}/${selectedRole.value}`)
    return
  }

  if (passwordInput.value === savedPasswords[selectedRole.value]) {
    router.push(`/match/${channelName.value}/${selectedRole.value}`)
  } else {
    alert('❌ 비밀번호가 올바르지 않습니다. 다시 확인해 주세요.')
  }
}
</script>

<style scoped>
.lobby-container { min-height: 100vh; background-color: #f4f6f9; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; font-family: sans-serif; }
.lobby-header { text-align: center; margin-bottom: 25px; }
.lobby-header h1 { font-size: 1.6rem; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 800; }
.lobby-header .subtitle { font-size: 0.9rem; color: #666; margin: 0; }

.lobby-card { background: white; border-radius: 16px; padding: 24px; width: 100%; max-width: 400px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); box-sizing: border-box; }
.input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; width: 100%; }
.input-group label { font-size: 0.8rem; font-weight: bold; color: #444; }

.search-box { display: flex; gap: 8px; width: 100%; }
.search-box input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; font-weight: bold; min-width: 0; }
.search-box input:focus { border-color: #007bff; outline: none; }
.btn-primary { background: #007bff; color: white; border: none; padding: 0 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.9rem; flex-shrink: 0; }

.status-zone { border-top: 1px dashed #e0e0e0; margin-top: 20px; padding-top: 20px; }
.alert-msg { padding: 10px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: bold; margin-bottom: 16px; text-align: center; }
.alert-msg.success { background: #e8f5e9; color: #2e7d32; }
.alert-msg.info { background: #e3f2fd; color: #0d47a1; }

.role-selector { margin-bottom: 16px; }
.role-selector label { font-size: 0.8rem; font-weight: bold; color: #444; display: block; margin-bottom: 6px; }
.role-btns { display: flex; gap: 6px; width: 100%; }
.role-btns button { flex: 1; padding: 10px 0; border: 1px solid #ddd; background: #f9f9f9; border-radius: 8px; font-size: 0.8rem; font-weight: bold; cursor: pointer; color: #555; }
.role-btns button.active { background: #333; color: white; border-color: #333; }

.password-group input { padding: 11px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem; }

.btn-action { width: 100%; padding: 14px 0; border: none; border-radius: 8px; font-weight: bold; font-size: 0.95rem; cursor: pointer; color: white; margin-top: 10px; }
.btn-action.enter { background-color: #222; }
.btn-action.create { background-color: #2e7d32; }
.btn-action:active { transform: scale(0.99); opacity: 0.9; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
