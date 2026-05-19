// composables/useMatchFirebase.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMatchFirebase(matchId) {
  const matchData = ref(null)
  let eventSource = null

  // 💡 사용자님의 싱가포르(asia-southeast1) 리전 실시간 DB 주소 반영
  const DB_BASE_URL = 'https://jungjin-test-tactics-board-default-rtdb.asia-southeast1.firebasedatabase.app'
  const targetUrl = `${DB_BASE_URL}/matches/${matchId}.json`

  // 1. 실시간 데이터 리스너 가동 (파이어베이스 -> 브라우저 스트리밍)
  onMounted(() => {
    if (!matchId) return

    // Firebase REST API의 .json 스냅샷 리스너 바인딩
    eventSource = new EventSource(targetUrl)

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        
        // SSE 최초 연결(put)이거나 통째로 업데이트될 때
        if (payload.event === 'put' && payload.path === '/') {
          matchData.value = payload.data
        } 
        // 특정 단일 데이터 필드가 개별 수정될 때 (패치 최적화 대응)
        else if (payload.event === 'patch') {
          if (!matchData.value) matchData.value = {}
          
          // 패치된 하위 트리 경로를 분해해서 로컬 reactive 객체에 병합
          const segments = payload.path.replace(/^\/|\/$/g, '').split('/')
          if (segments[0] === '') {
            Object.assign(matchData.value, payload.data)
          } else {
            let current = matchData.value
            for (let i = 0; i < segments.length - 1; i++) {
              if (!current[segments[i]]) current[segments[i]] = {}
              current = current[segments[i]]
            }
            current[segments[segments.length - 1]] = payload.data
          }
        }
      } catch (err) {
        console.error('실시간 데이터 파싱 오류:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('파이어베이스 스트리밍 연결 끊김/오류:', err)
    }
  })

  // 2. 화면 이탈 시 실시간 리스너 해제 (메모리 누수 방지)
  onUnmounted(() => {
    if (eventSource) {
      eventSource.close()
    }
  })

  // 3. 변경된 데이터를 파이어베이스 DB 서버로 역전송 (감독/심판 조작 푸시용)
  const saveToServer = async () => {
    if (!matchId || !matchData.value) return

    try {
      // 컴포넌트에서 변경된 반응형 matchData를 깊은 복사하여 원격지로 PUT 전송
      await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(matchData.value)
      })
    } catch (err) {
      console.error('서버로 데이터 저장 실패:', err)
    }
  }

  return {
    matchData,
    saveToServer
  }
}
