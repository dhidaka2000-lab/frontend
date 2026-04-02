// src/router/index.js
// Vue Router 設定

import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from "@/store/authStore.js";

const routes = [
  {
    path:      "/",
    name:      "login",
    component: () => import("@/views/LoginView.vue"),
    meta:      { public: true },
  },
  {
    path:      "/menu",
    name:      "mainMenu",
    component: () => import("@/views/MainMenuView.vue"),
  },
  {
    path:      "/mypage",
    name:      "assignmentList",
    component: () => import("@/views/AssignmentListView.vue"),
  },
  {
    path:      "/childmap/:cardNo/:childNo",
    name:      "childMap",
    component: () => import("@/views/ChildMapView.vue"),
    props:     route => ({
      cardNo:  Number(route.params.cardNo),
      childNo: Number(route.params.childNo),
    }),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// ナビゲーションガード: 未認証なら / へリダイレクト
router.beforeEach((to) => {
  if (to.meta.public) return true;

  const auth = useAuthStore();
  if (!auth.isLoggedIn) return { name: "login" };
  return true;
});

export default router;
