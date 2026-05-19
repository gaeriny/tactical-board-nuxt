<template>
  <div class="lobby-container">
    <header class="lobby-header">
      <div class="logo">🏟️</div>
      <h1>실시간 경기 전술 대시보드</h1>
      <p class="subtitle">채널을 생성하거나 참여하여 경기를 관리하세요.</p>
    </header>

    <main class="lobby-card">
      <div class="input-group">
        <label>📌 경기 채널 이름</label>
        <div class="search-box">
          <input 
            type="text" 
            v-model.trim="channelName" 
            placeholder="채널명을 입력하세요 (예: test1)"
            @keyup.enter="checkChannelExistence"
          />
          <button @click="checkChannelExistence" class="btn-primary">확인</button>
        </div>
      </div>

      <div v-if="channelStatus === 'exists'" class="status-zone">
        <div class="alert-msg success">🟢 가동 중인 채널을 찾았습니다!</div>
        
        <div class="role-selector">
          <label>진입 권한 선택</label>
          <div class="role-btns">
            <button @click="selectedRole = 'audience'" :class="{ active: selectedRole === 'audience' }">📺 관중 뷰</button>
            <button @click="selectedRole = 'manager'" :class="{ active: selectedRole === 'manager' }">📋 감독 뷰</button>
            <button @click="selectedRole = 'referee'" :class="{ active: selectedRole === 'referee' }">📯 심판 뷰</button>
          </div>
        </div>

        <div v-if="selectedRole !== 'audience'" class="input-group">
          <label>🔑 보안 비밀번호</label>
          <input type="password" v-model="passwordInput" placeholder="비밀번호를 입력하세요" @keyup.enter="enterChannel" class="normal-input"/>
        </div>

        <button @click="enterChannel" class="btn-action enter">🚪 채널 입장하기</button>
      </div>

      <div v-else-if="channelStatus === 'new'" class="status-zone">
        <div class="alert-msg info">✨ 개설 가능한 새로운 채널명입니다.</div>
        
        <div class="input-group">
          <label>📋 감독용 패스워드 설정</label>
          <input type="password" v-model="newChannelPasswords.manager" placeholder="감독 진입 시 사용할 암호" class="normal-input" />
        </div>

        <div class="input-group">
          <label>📯 심판용 패스워드 설정</label>
          <input type="password" v-model="newChannelPasswords.referee" placeholder="심판 진입 시 사용할 암호" class="normal-input" />
        </div>

        <button @click="createNewChannel" class="btn-action create">➕ 새 경기 채널 개설</button>
      </div>
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

const checkChannelExistence = async () => {
  if (!channelName.value) return alert('채널명을 입력해 주세요!')
  
  channelStatus.value = ''
  fetchedPasswords.value = null
  passwordInput.value = ''

  try {
    const cacheBuster = Date.now()
    const response = await fetch(`https://tactical-board-nuxt-default-rtdb.firebaseio.com/matches/${channelName.value}.json?_cb=${cacheBuster}`)
    const data = await response.json()
    
    if (data && data !== 'null' && data.passwords) {
      fetchedPasswords.value = data.passwords
      channelStatus.value = 'exists'
    } else {
      channelStatus.value = 'new'
    }
  } catch (err) {
    console.error(err)
    alert('채널 확인 중 오류가 발생했습니다.')
  }
}

const createNewChannel = async () => {
  if (!newChannelPasswords.manager || !newChannelPasswords.referee) {
    return alert('감독 및 심판 비밀번호를 모두 지정해주세요!')
  }

  const initialSchema = {
    scores: { home: 0, away: 0 },
    teamNames: { home: 'HOME', away: 'AWAY' },
    timer: 0,
    isTiming: false,
    passwords: {
      manager: newChannelPasswords.manager,
      referee: newChannelPasswords.referee
    },
    players: []
  }

  const targetName = String(channelName.value)

  try {
    await fetch(`https://tactical-board-nuxt-default-rtdb.firebaseio.com/matches/${targetName}.json`, {
      method: 'PUT',
      body: JSON.stringify(initialSchema)
    })
    alert(`🎉 [${targetName}] 채널이 개설되었습니다.`);
    // 생성 직후 바로 관중뷰로 리다이렉트 시 Object 깨짐 방지 처리
    router.push(`/match/${targetName}`)
  } catch (err) {
    alert('채널 생성 실패')
  }
}

const enterChannel = () => {
  const targetName = String(channelName.value)

  if (selectedRole.value === 'audience') {
    router.push(`/match/${targetName}`)
    return
  }

  if (!fetchedPasswords.value || !fetchedPasswords.value[selectedRole.value]) {
    // 백업 진입 구조
    router.push(`/match/${targetName}/${selectedRole.value}`)
    return
  }

  if (passwordInput.value === fetchedPasswords.value[selectedRole.value]) {
    router.push(`/match/${targetName}/${selectedRole.value}`)
  } else {
    alert('❌ 비밀번호가 올바르지 않습니다.')
  }
}
</script>

<style scoped>
.lobby-container { min-height: 100vh; background-color: #eef2f5; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
.lobby-header { text-align: center; margin-bottom: 20px; }
.logo { font-size: 3rem; margin-bottom: 5px; }
.lobby-header h1 { font-size: 1.4rem; color: #1e293b; margin: 0 0 5px 0; font-weight: bold; }
.lobby-header .subtitle { font-size: 0.85rem; color: #64748b; margin: 0; }
.lobby-card { background: white; border-radius: 16px; padding: 20px; width: 100%; max-width: 360px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); box-sizing: border-box; }
.input-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; width: 100%; }
.input-group label { font-size: 0.8rem; font-weight: bold; color: #475569; }
.search-box { display: flex; gap: 6px; width: 100%; }
.search-box input { flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; min-width: 0; }
.normal-input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; width: 100%; box-sizing: border-box; }
.btn-primary { background: #2563eb; color: white; border: none; padding: 0 16px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.85rem; }
.status-zone { border-top: 1px dashed #cbd5e1; margin-top: 15px; padding-top: 15px; width: 100%; }
.alert-msg { padding: 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; margin-bottom: 12px; text-align: center; }
.alert-msg.success { background: #f0fdf4; color: #166534; }
.alert-msg.info { background: #eff6ff; color: #1e40af; }
.role-selector { margin-bottom: 12px; }
.role-btns { display: flex; gap: 4px; width: 100%; margin-top: 4px; }
.role-btns button { flex: 1; padding: 8px 0; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer; }
.role-btns button.active { background: #1e293b; color: white; border-color: #1e293b; }
.btn-action { width: 100%; padding: 12px 0; border: none; border-radius: 8px; font-weight: bold; font-size: 0.9rem; cursor: pointer; color: white; margin-top: 5px; }
.btn-action.enter { background-color: #1e293b; }
.btn-action.create { background-color: #166534; }
</style>
