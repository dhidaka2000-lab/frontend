<template>
  <main role="main" class="container py-3" style="max-width:480px;">

    <!-- ヘッダー：初回強制リセット中は他画面へ逃げられないよう戻る/ホームを隠す（#41） -->
    <header v-if="!authStore.mustResetPassword" class="sticky-top bg-white mb-2 py-2 border-bottom">
      <div class="d-flex justify-content-between align-items-center">
        <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'mySettings' })">
          <i class="fas fa-arrow-circle-left fa-2x"></i>
          <div class="small">戻る</div>
        </button>
        <div class="text-center flex-grow-1">パスワード変更</div>
        <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'mainMenu' })">
          <i class="fas fa-home fa-2x"></i>
          <div class="small">ホーム</div>
        </button>
      </div>
    </header>

    <div class="text-center my-4">
      <h2><i class="fas fa-key"></i> パスワード変更</h2>
    </div>

    <div v-if="authStore.mustResetPassword" class="alert alert-warning">
      仮パスワードでログインしています。続けるには新しいパスワードを設定してください。
    </div>

    <form @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label">現在のパスワード</label>
        <input type="password" class="form-control" v-model="currentPassword" autocomplete="current-password" required>
      </div>
      <div class="mb-3">
        <label class="form-label">新しいパスワード（6文字以上）</label>
        <input type="password" class="form-control" v-model="newPassword" autocomplete="new-password" minlength="6" required>
      </div>
      <div class="mb-3">
        <label class="form-label">新しいパスワード（確認）</label>
        <input type="password" class="form-control" v-model="confirmPassword" autocomplete="new-password" minlength="6" required>
      </div>
      <p v-if="errorMessage" class="text-danger small">{{ errorMessage }}</p>
      <button type="submit" class="btn btn-primary w-100" :disabled="submitting">
        <span v-if="submitting"><i class="fas fa-spinner fa-spin"></i> 変更中...</span>
        <span v-else>変更する</span>
      </button>
    </form>

  </main>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/authStore.js";
import { changeOwnPassword } from "@/services/auth.js";
import { clearMustResetFlag } from "@/services/api.js";

const router    = useRouter();
const authStore = useAuthStore();

const currentPassword = ref("");
const newPassword     = ref("");
const confirmPassword = ref("");
const errorMessage    = ref("");
const submitting      = ref(false);

function mapFirebaseError(e) {
  const code = e?.code || "";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "現在のパスワードが正しくありません。";
  if (code.includes("weak-password"))     return "パスワードが簡単すぎます。もう少し複雑なパスワードにしてください。";
  if (code.includes("too-many-requests")) return "試行回数が多すぎます。しばらく時間をおいてから再度お試しください。";
  return e?.message || "パスワードの変更に失敗しました。";
}

async function submit() {
  errorMessage.value = "";

  if (newPassword.value.length < 6) {
    errorMessage.value = "新しいパスワードは6文字以上で入力してください。";
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = "新しいパスワードが一致しません。";
    return;
  }

  submitting.value = true;
  try {
    await changeOwnPassword(currentPassword.value, newPassword.value);
    await clearMustResetFlag();
    authStore.clearMustResetPassword();
    alert("パスワードを変更しました。");
    router.push({ name: "mainMenu" });
  } catch (e) {
    errorMessage.value = mapFirebaseError(e);
  } finally {
    submitting.value = false;
  }
}
</script>
