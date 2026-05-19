<template>
  <div class="lobby-container">
    <header class="lobby-header">
      <div class="logo">🏟️</div>
      <h1>실시간 경기 전술 대시보드</h1>
      <p class="subtitle">원하시는 작업을 선택해 주세요.</p>
    </header>

    <div v-if="mode === ''" class="menu-selector-card">
      <button @click="setMode('enter')" class="btn-menu enter-mode">🚪 기존 채널 입장하기</button>
      <button @click="setMode('create')" class="btn-menu create-mode">➕ 새로운 채널 개설하기</button>
    </div>

    <main v-else-if="mode === 'create'" class="lobby-card">
      <div class="back-zone">
        <button @click="goBack" class="btn-back">⬅️ 처음으로</button>
      </div>

      <div class="input-group">
        <label>📌 개설할 채널 이름</label>
        <input 
          type="text" 
          v-model.trim="channelName" 
          placeholder="예: test1, my-match"
          class="normal-input"
        />
      </div>

      <div class="input-group">
        <label>📋 감독용 패스워드 설정</label>
        <input type="password" v-model="newChannelPasswords.manager" placeholder="감독 진입용 암호" class="normal-input" />
      </div>

      <div class="input-group">
        <label>📯 심판용 패스워드 설정</label>
        <input type="password" v-model="newChannelPasswords.referee" placeholder="심판 진입용 암호" class="normal-input" />
      </div>

      <button @click="createNewChannel" class="btn-action create">✨ 경기 채널 신규 개설</button>
    </main>

    <main v-else-if="mode === 'enter'" class="lobby-card">
      <div class="back-zone">
        <button @click="goBack" class="btn-back">⬅️ 처음으로</button>
      </div>

      <div class="input-group">
        <label>📌 입장할 채널 이름</label>
        <div class="search-box">
          <input 
            type="text" 
            v-model.trim="channelName" 
            placeholder="채널명을 입력하세요"
            @keyup.enter="checkChannelExistence"
            :disabled="isChannelVerified"
          />
          <button @click="checkChannelExistence" class="btn-primary" :disabled="isChannelVerified">조회</button>
        </div>
      </div>

      <div v-if="isChannelVerified" class="verified-zone">
        <div class="alert-msg success">🟢 [{{ channelName }}] 채널이 확인되었습니다.</div>
        
        <div class="role-selector">
          <label>진입 권한 선택</label>
          <div class="role-btns">
            <button @click="selectedRole = 'audience'" :class="{ active: selectedRole === 'audience' }">📺 관중 뷰</button>
            <button @click="selectedRole = 'manager'" :class="{ active: selectedRole === 'manager' }">📋 감독 뷰</button>
            <button @click="selectedRole = 'referee'" :class="{ active: selectedRole === 'referee' }">📯 심판 뷰</button>
          </div>
        </div>

        <div v-if="selectedRole !== 'audience'" class="input-group">
          <label>🔑 해당 권한 비밀번호 입력</label>
          <input 
            type="password" 
            v-model="passwordInput" 
            placeholder="비밀번호를 입력하세요" 
            @keyup.enter="enterChannel" 
            class="normal-input"
          />
        </div>

        <button @click="enterChannel" class="btn-action enter">🚪 채널 진입하기</button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 상태 제어 변수
const mode = ref('') // '', 'create', 'enter'
const channelName = ref('')
const isChannelVerified = ref(false)
const selectedRole = ref('audience')
const passwordInput = ref('')

const newChannelPasswords = reactive({
  manager: '',
  referee: ''
})

const fetchedPasswords = ref(null)

// 모드 전환 핸들러
const setMode = (targetMode) => {
  mode.value = targetMode
  goBackClear()
}

// 초기화 처리
const goBackClear = () => {
  channelName.value = ''
  isChannelVerified.value = false
  selectedRole.value = 'audience'
  passwordInput.value = ''
  newChannelPasswords.manager = ''
  newChannelPasswords.referee = ''
  fetchedPasswords.value = null
}

const goBack = () => {
  mode.value = ''
  goBackClear()
}

// 1. 기존 채널 실존 여부 원격 조회
const checkChannelExistence = async () => {
  if (!channelName.value) return alert('채널명을 입력해 주세요!')
  
  try {
    const cacheBuster = Date.now()
    const response = await fetch(`https://tactical-board-nuxt-default-rtdb.firebaseio.com/matches/${channelName.value}.json?_cb=${cacheBuster}`)
    const data = await response.json()
    
    // 데이터가 있고 올바른 방 구조일 때만 통과
    if (data && data !== 'null' && data.passwords) {
      fetchedPasswords.value = data.passwords
      isChannelVerified.value = true
    } else {
      alert('❌ 존재하지 않는 채널입니다. 채널명을 다시 확인하시거나 새로 개설해 주세요.')
      isChannelVerified.value = false
    }
  } catch (err) {
    console.error(err)
    alert('채널 조회 중 통신 오류가 발생했습니다.')
  }
}

// 2. 신규 채널 데이터 생성 바인딩
const createNewChannel = async () => {
  if (!channelName.value) return alert('개설할 채널 이름을 입력해 주세요!')
  if (!newChannelPasswords.manager || !newChannelPasswords.referee) {
    return alert('감독 및 심판 비밀번호를 모두 지정해야 개설할 수 있습니다!')
  }

  // 중복 개설 방지 실시간 락 체크
  try {
    const checkResp = await fetch(`https://tactical-board-nuxt-default-rtdb.firebaseio.com/matches/${channelName.value}.json`)
    const checkData = await checkResp.json()
    if (checkData && checkData !== 'null') {
      return alert('⚠️ 이미 존재하는 채널명입니다. 다른 이름을 사용해 주세요.')
    }
  } catch (e) {}

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
    alert(`🎉 [${targetName}] 채널이 성공적으로 개설되었습니다! 관중 뷰로 진입합니다.`)
    router.push(`/match/${targetName}`)
  } catch (err) {
    alert('채널 생성 처리에 실패했습니다.')
  }
}

// 3. 비밀번호 매칭 후 최종 라우팅 권한 진입
const enterChannel = () => {
  const targetName = String(channelName.value)

  // 관중은 패스워드 프리패스
  if (selectedRole.value === 'audience') {
    router.push(`/match/${targetName}`)
    return
  }

  // 비밀번호 검증 암호 대조
  if (!fetchedPasswords.value || !fetchedPasswords.value[selectedRole.value]) {
    alert('암호 구조가 누락된 방입니다. 강제 입장 처리합니다.')
    router.push(`/match/${targetName}/${selectedRole.value}`)
    return
  }

  if (passwordInput.value === fetchedPasswords.value[selectedRole.value]) {
    router.push(`/match/${targetName}/${selectedRole.value}`)
  } else {
    alert('❌ 비밀번호가 일치하지 않습니다. 다시 확인해 주세요!')
  }
}
</script>

<style scoped>
.lobby-container { min-height: 100vh; background-color: #f1f5f9; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; font-family: -apple-system, sans-serif; }
.lobby-header { text-align: center; margin-bottom: 24px; }
.logo { font-size: 3.2rem; margin-bottom: 5px; }
.lobby-header h1 { font-size: 1.4rem; color: #0f172a; margin: 0 0 6px 0; font-weight: 800; }
.lobby-header .subtitle { font-size: 0.85rem; color: #64748b; margin: 0; }

/* 1단계 메뉴 대형 버튼 선택 창 */
.menu-selector-card { display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 340px; }
.btn-menu { width: 100%; padding: 20px 0; border: none; border-radius: 14px; font-size: 1rem; font-weight: bold; cursor: pointer; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.06); transition: transform 0.1s; }
.btn-menu:active { transform: scale(0.98); }
.enter-mode { background: #1e293b; }
.create-mode { background: #16a34a; }

/* 2단계 공용 카드 템플릿 */
.lobby-card { background: white; border-radius: 18px; padding: 22px; width: 100%; max-width: 350px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); box-sizing: border-box; }
.back-zone { margin-bottom: 15px; }
.btn-back { background: none; border: none; color: #64748b; font-size: 0.8rem; font-weight: bold; cursor: pointer; padding: 0; }

.input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; width: 100%; box-sizing: border-box; }
.input-group label { font-size: 0.8rem; font-weight: 700; color: #475569; }
.search-box { display: flex; gap: 6px; width: 100%; }
.search-box input { flex: 1; padding: 11px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; min-width: 0; font-weight: bold; }
.normal-input { padding: 11px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; width: 100%; box-sizing: border-box; }
.btn-primary { background: #2563eb; color: white; border: none; padding: 0 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.85rem; }
.btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; }

/* 승인 통과 존 */
.verified-zone { border-top: 1px dashed #e2e8f0; margin-top: 16px; padding-top: 16px; }
.alert-msg { padding: 9px; border-radius: 8px; font-size: 0.8rem; font-weight: bold; margin-bottom: 14px; text-align: center; }
.alert-msg.success { background: #f0fdf4; color: #166534; }

.role-selector { margin-bottom: 14px; }
.role-btns { display: flex; gap: 5px; width: 100%; margin-top: 5px; }
.role-btns button { flex: 1; padding: 10px 0; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 7px; font-size: 0.75rem; font-weight: bold; cursor: pointer; color: #475569; }
.role-btns button.active { background: #0f172a; color: white; border-color: #0f172a; }

.btn-action { width: 100%; padding: 13px 0; border: none; border-radius: 8px; font-weight: bold; font-size: 0.95rem; cursor: pointer; color: white; margin-top: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.btn-action.enter { background-color: #0f172a; }
.btn-action.create { background-color: #15803d; }
</style>
