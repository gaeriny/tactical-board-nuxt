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
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const channelName = ref('')
const channelStatus = ref('') // 'exists', 'new', ''
const selectedRole = ref('audience')
const passwordInput = ref('')

const newChannelPasswords = reactive({
  manager: '',
  referee: ''
})

// 💡 [핵심 교정] 기존 시스템인 useMatchFirebase를 동적으로 활용하기 위해 정의
const currentChannelId = ref('')
const { matchData, saveToServer } = useMatchFirebase(currentChannelId)

// 채널 이름을 새로 조회할 때마다 Firebase 리스너를 동적으로 스위칭합니다.
const checkChannelExistence = () => {
  if (!channelName.value) return alert('채널명을 입력해 주세요!')
  
  // 현재 입력한 채널 ID를 useMatchFirebase에 주입하여 데이터를 실시간으로 가져옵니다.
  currentChannelId.value = channelName.value

  // 데이터가 로드되는 시점을 캐치하기 위해 잠시 대기 후 검사 (Firebase 연결 확인)
  setTimeout(() => {
    if (matchData.value && (matchData.value.currentSport || matchData.value.passwords)) {
      channelStatus.value = 'exists'
    } else {
      channelStatus.value = 'new'
    }
  }, 600)
}

// 새 채널 개설 로직
const createNewChannel = () => {
  if (!newChannelPasswords.manager || !newChannelPasswords.referee) {
    return alert('감독 및 심판 비밀번호를 모두 지정해야 채널 개설이 가능합니다!')
  }

  // 기존 구조와 완벽히 일치하는 초기 스키마 구성 및 비밀번호 내재화
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

  // 기존 컴포저블의 내장 함수를 사용해 안전하게 Firebase에 저장합니다.
  saveToServer()
  
  alert(`🎉 [${channelName.value}] 채널이 성공적으로 개설되었습니다! 관중 모드로 자동 진입합니다.`)
  router.push(`/match/${channelName.value}`)
}

// 기존 채널 검증 후 입장 로직
const enterChannel = () => {
  if (selectedRole.value === 'audience') {
    router.push(`/match/${channelName.value}`)
    return
  }

  const savedPasswords = matchData.value?.passwords

  if (!savedPasswords || !savedPasswords[selectedRole.value]) {
    // 만약 예전에 만든 방이라 비밀번호 데이터가 아예 없다면 프리패스로 진입 허용 처리
    alert('이 채널은 초기 보안 설정이 없는 방입니다. 바로 진입합니다.')
    router.push(`/match/${channelName.value}/${selectedRole.value}`)
    return
  }

  // 비밀번호 일치 여부 확인
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
.alert-msg.info { background: #e3f2fd; color: #0d
