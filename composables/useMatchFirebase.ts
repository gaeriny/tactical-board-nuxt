import { ref, onMounted, onUnmounted } from 'vue'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref as dbRef, onValue, set } from 'firebase/database'

export function useMatchFirebase(matchId: string) {
  const config = useRuntimeConfig()

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    databaseURL: config.public.firebaseDatabaseUrl,
    projectId: config.public.firebaseProjectId,
  }

  // 안전한 싱글톤 초기화 처리
  const app = initializeApp(firebaseConfig)
  const db = getDatabase(app)

  const matchData = ref({
    currentSport: 'soccer',
    teamNames: { home: "HOME", away: "AWAY" },
    scores: { home: 0, away: 0 },
    timeLeft: 15 * 60,
    isPlaying: false,
    players: []
  })

  let unsubscribe: any = null

  onMounted(() => {
    const matchNodeRef = dbRef(db, `matches/${matchId}`)
    unsubscribe = onValue(matchNodeRef, (snapshot) => {
      const data = snapshot.val()
      if (data) matchData.value = data
    })
  })

  onUnmounted(() => {
    if (unsubscribe) unsubscribe()
  })

  const saveToServer = async () => {
    await set(dbRef(db, `matches/${matchId}`), matchData.value)
  }

  return { matchData, saveToServer }
}
