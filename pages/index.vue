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
            placeholder="예: test1, k리그-결승"
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
const channelStatus = ref('') // 'exists', 'new', ''
const selectedRole = ref('audience')
const passwordInput = ref('')

// 새 채널 개설 시 설정할 비밀번호 바인딩
const newChannelPasswords = reactive({
  manager: '',
  referee: ''
})

// useMatchFirebase 연동 로직 (프로젝트에 구현된 DB 가져오기 수식 호출)
// 만약 composables 구조가 다르면 본인의 수집 패스로 교정하셔도 됩니다.
import { database } from '@/plugins/firebase' // 예시 경로이며, 현재 쓰시는 firebase 레퍼런스를 참조하세요.
import { ref as dbRef, get, set } from 'firebase/database'

// 1. 해당 채널이 실시간 DB에 이미 파여있는지 확인
const checkChannelExistence = async () => {
  if (!channelName.value) return alert('채널명을 입력해 주세요!')
  
  try {
    const matchSnapshot = await get(dbRef(database, `matches/${channelName.value}`))
    
    if (matchSnapshot.exists()) {
      channelStatus.value = 'exists'
    } else {
      channelStatus.value = 'new'
    }
  } catch (err) {
    console.error(err)
    alert('채널 조회 중 에러가 발생했습니다.')
  }
}

// 2. 신규 채널 생성 트랜잭션
const createNewChannel = async () => {
  if (!newChannelPasswords.manager || !newChannelPasswords.referee) {
    return alert('감독 및 심판 비밀번호를 모두 지정해야 채널 개설이 가능합니다!')
  }

  const initialSchema = {
    currentSport: 'soccer',
    scores: { home: 0, away: 0 },
    teamNames: { home: 'HOME', away: 'AWAY' },
    players: [],
    // 보안 패스워드 메타 데이터 내재화
    passwords: {
      manager: newChannelPasswords.manager,
      referee: newChannelPasswords.referee
    }
  }

  try {
    await set(dbRef(database, `matches/${channelName.value}`), initialSchema)
    alert(`🎉 [${channelName.value}] 채널이 성공적으로 개설되었습니다! 관중 모드로 자동 진입합니다.`)
    router.push(`/match/${channelName.value}`)
  } catch (err) {
    alert('채널 개설 실패: ' + err.message)
  }
}

// 3. 기존 채널 검증 후 맞춤형 입장 통로 핸들러
const enterChannel = async () => {
  if (selectedRole.value === 'audience') {
    // 관중은 조건 없이 바로 진입
    router.push(`/match/${channelName.value}`)
    return
  }

  // 관리자용 비번 검증
  try {
    const pwdSnapshot = await get(dbRef(database, `matches/${channelName.value}/passwords`))
    if (!pwdSnapshot.exists()) {
      return alert('채널 보안 정보가 누락되었습니다. 새 방을 파주세요.')
    }

    const savedPasswords = pwdSnapshot.val()
    const targetPassword = savedPasswords[selectedRole.value]

    if (passwordInput.value === targetPassword) {
      // 검증 성공 시 각각 감독뷰(/manager) 또는 심판뷰(/referee) 패스로 라우팅
      router.push(`/match/${channelName.value}/${selectedRole.value}`)
    } else {
      alert('❌ 비밀번호가 올바르지 않습니다. 다시 확인해 주세요.')
    }
  } catch (err) {
    alert('비밀번호 검증 과정 중 오류 발생')
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

/* 권한 선택 탭 구조 */
.role-selector { margin-bottom: 16px; }
.role-selector label { font-size: 0.8rem; font-weight: bold; color: #444; display: block; margin-bottom: 6px; }
.role-buttons { display: flex; gap: 6px; }
.role-btns { display: flex; gap: 6px; width: 100%; }
.role-btns button { flex: 1; padding: 10px 0; border: 1px solid #ddd; background: #f9f9f9; border-radius: 8px; font-size: 0.8rem; font-weight: bold; cursor: pointer; color: #555; }
.role-btns button.active { background: #333; color: white; border-color: #333; }

.password-group input { padding: 11px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem; }

.btn-action { width: 100%; padding: 14px 0; border: none; border-radius: 8px; font-weight: bold; font-size: 0.95rem; cursor: pointer; color: white; margin-top: 10px; }
.btn-action.enter { background-color: #222; }
.btn-action.create { background-color: #2e7d32; }
.btn-action:active { transform: scale(0.99); opacity: 0.9; }

/* 트랜지션 모션 효과 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
