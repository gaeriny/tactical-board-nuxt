export default defineNuxtConfig({
  compatibilityDate: '2026-05-19',
  devtools: { enabled: true },
  ssr: false, // 전술판 특성상 모바일 터치/드래그가 중요하므로 클라이언트 전용(SPA) 모드로 안전하게 작동하도록 설정
  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseDatabaseUrl: process.env.NUXT_PUBLIC_FIREBASE_DATABASE_URL,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
    }
  }
})
