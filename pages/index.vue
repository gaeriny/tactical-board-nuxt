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
import { ref, reactive } from 'vue'
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

const fetchedPasswords = ref(null)

// 1. 단발성 데이터 조회 핸들러 (캐시 파괴 및 엄격한 검증)
const checkChannelExistence = async () => {
  if (!channelName.value) return alert('채널명을 입력해 주세요!')
  
  // 조회 시작 전 화면 초기화
  channelStatus.value = ''
  fetchedPasswords.value = null
  passwordInput.value = ''

  try {
    // 💡 [핵심 교정 1]: URL 뒤에 타임스탬프(?_cb=시간)를 붙여 브라우저와 Vercel의 강제 캐싱을 원천 붕괴시킵니다.
    const cacheBuster = Date.now()
    const response = await fetch(`https://tactical-board-nuxt-default-rtdb.firebaseio.com/matches/${channelName.value}.json?_cb=${cacheBuster}`)
    const data = await response.json()
    
    // 💡 [핵심 교정 2]: 단순히 data가 있는지만 보지 않고, 내부 핵심 속성(scores, currentSport, passwords) 중 하나라도 확실히 유효한지 검사합니다.
    if (data && data !== 'null' && (data.currentSport || data.scores || data.passwords)) {
      fetchedPasswords.value = data.passwords || null
      channelStatus.value = 'exists'
    } else {
      // 찌꺼기 데이터가 오거나 null이면 무조건 완전히 새로운 방으로 취급합니다.
      channelStatus.value = 'new'
    }
  } catch (err) {
    console.error(err)
    alert('채널 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

// 2. 신규 채널 생성 로직
const createNewChannel = async () => {
  if (!newChannelPasswords.manager || !newChannelPasswords.referee) {
    return alert('감독 및 심판 비밀번호를 모두 지정해야 채널 개설이 가능합니다!')
  }

  const initialSchema = {
    currentSport: 'soccer',
    scores: { home: 0, away: 0 },
    teamNames: { home: 'HOME', away: 'AWAY' },
    players: [],
    passwords: {
      manager: newChannelPasswords.manager,
      referee: newChannelPasswords.referee
    }
  }

  try {
    await fetch(`https://tactical-board-nuxt-default-rtdb.firebaseio.com/matches/${channelName.value}.json`, {
      method: 'PUT',
      body: JSON.stringify(initialSchema)
    })
    
    alert(`🎉 [${channelName.value}] 채널이 개설되었습니다! 감독/심판 뷰 진입 시 설정한 암호를 사용하세요.`)
    // 생성 완료 후 입력 폼 초기화 및 관중 전송
    channelStatus.value = ''
    router.push(`/match/${channelName.value}`)
  } catch (err) {
    alert('채널 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

// 3. 권한별 비밀번호 검증 처리
const enterChannel = () => {
  if (selectedRole.value === 'audience') {
    router.push(`/match/${channelName.value}`)
    return
  }

  if (!fetchedPasswords.value || !fetchedPasswords.value[selectedRole.value]) {
    alert('이 채널은 암호가 설정되지 않은 이전 방입니다. 바로 입장합니다.')
    router.push(`/match/${channelName.value}/${selectedRole.value}`)
    return
  }

  if (passwordInput.value === fetchedPasswords.value[selectedRole.value]) {
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
