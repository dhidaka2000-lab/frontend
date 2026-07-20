// src/main.js
// アプリケーションのエントリーポイント

import { createApp } from "vue";
import { createPinia } from "pinia";

import App    from "./App.vue";
import router from "./router/index.js";
import { useAuthStore } from "./store/authStore.js";

const app   = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// デプロイ直後は、それより前に開いていたタブが参照する古いチャンクファイルが
// GitHub Pages上に存在しなくなり、遅延読み込み（route-level code splitting）に
// 失敗することがある。その場合は一度だけ自動でページを再読み込みし、
// 最新のビルドを取得し直す（無限リロードを避けるためsessionStorageで1回に制限）。
const RELOAD_GUARD_KEY = "ekuiki_chunk_reload_guard";
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
  sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  window.location.reload();
});
router.onError((error) => {
  if (!/Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(error?.message || "")) return;
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
  sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  window.location.reload();
});

// Firebase 認証状態を監視してから画面を表示する
const authStore = useAuthStore();
authStore.init().then(() => {
  app.mount("#app");
  // 起動できたので、次に新しいデプロイに遭遇した際も再度リロードできるようにする
  sessionStorage.removeItem(RELOAD_GUARD_KEY);
});
