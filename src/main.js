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

// Firebase 認証状態を監視してから画面を表示する
const authStore = useAuthStore();
authStore.init().then(() => {
  app.mount("#app");
});
