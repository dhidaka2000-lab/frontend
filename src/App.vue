<template>
  <div>
    <!-- 認証状態ロード中はスピナーを表示 -->
    <div v-if="authStore.loading" class="d-flex justify-content-center align-items-center" style="height: 100vh">
      <div class="text-center">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-3">読み込み中...</p>
      </div>
    </div>

    <!-- ロード完了後はルーターアウトレットを表示 -->
    <router-view v-else />
  </div>
</template>

<script setup>
import { useAuthStore } from "@/store/authStore.js";
const authStore = useAuthStore();
</script>
