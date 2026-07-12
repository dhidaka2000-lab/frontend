<template>
  <!-- ローディング -->
  <div v-if="loading" class="loading">
    <i class="fas fa-spinner fa-4x fa-spin"></i>
  </div>

  <main role="main" class="container py-3">

    <!-- ヘッダー -->
    <header class="sticky-top bg-white mb-2 py-2 border-bottom">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'mainMenu' })">
            <i class="fas fa-arrow-circle-left fa-2x"></i>
            <div class="small">戻る</div>
          </button>
        </div>
        <div class="text-center flex-grow-1" style="font-size:22px; font-weight:700;">マイページ</div>
        <div>
          <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'mainMenu' })">
            <i class="fas fa-home fa-2x"></i>
            <div class="small">ホーム</div>
          </button>
        </div>
      </div>
    </header>

    <!-- ユーザー情報 -->
    <div class="alert alert-secondary py-2 mb-3">
      <strong>{{ authStore.userName }}</strong>（{{ authStore.userEmail }}）
      ／ グループ：{{ authStore.userGroup }} ／ 権限：{{ authStore.userRole }}
    </div>

    <!-- フィルタ + 更新ボタン -->
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-2">
      <div class="d-flex flex-wrap">
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" id="filter-all" value="all" v-model="filterMode">
          <label class="form-check-label" for="filter-all">全件表示</label>
        </div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" id="filter-lent" value="lent" v-model="filterMode">
          <label class="form-check-label" for="filter-lent">貸出中のみ</label>
        </div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" id="filter-focus" value="focus" v-model="filterMode">
          <label class="form-check-label" for="filter-focus">重点のみ</label>
        </div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" id="filter-nonfocus" value="nonfocus" v-model="filterMode">
          <label class="form-check-label" for="filter-nonfocus">重点以外</label>
        </div>
      </div>
      <button class="btn btn-primary" @click="refresh" :disabled="isUpdating">
        <i class="fas fa-sync-alt"></i> 最新情報に更新
      </button>
    </div>

    <!-- カード一覧 -->
    <div class="row g-3">
      <div
        class="col-12 col-sm-6"
        v-for="child in filteredChilds"
        :key="child.CHILDID"
      >
        <div
          class="card shadow-sm h-100"
          :style="{ borderLeft: `6px solid ${child.COLOR || '#ccc'}` }"
        >
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <h5 class="card-title mb-0">
                <span class="cardno-badge">{{ child.CARDNO }}-{{ child.CHILDNO }}</span>
                {{ child.CHILDBLOCK }}
              </h5>
              <span class="badge rounded-pill" :style="statusPillStyle(child.CHILDSTATUS)">
                {{ child.CHILDSTATUS }}
              </span>
            </div>

            <p class="mb-1 small text-muted">
              {{ child.CHILDHOUSES }}件 ／ 訪問済：{{ child.VISITED ?? 0 }}件
            </p>

            <p v-if="child.DESCRIPTION" class="mb-1 small">{{ child.DESCRIPTION }}</p>

            <div class="d-flex justify-content-between align-items-center mt-2">
              <small class="text-muted">
                貸出: {{ child.CHILDCHECKOUTDATE ?? "-" }} ／
                期限: {{ child.CHILDLIMITDATE ?? "-" }}
              </small>
              <button
                class="btn btn-sm btn-outline-primary"
                @click="openChildMap(child)"
              >
                <i class="fas fa-map-marked-alt"></i> 開く
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="filteredChilds.length === 0 && !loading" class="text-center text-muted mt-5">
      <i class="fas fa-inbox fa-3x mb-3"></i>
      <p>表示するカードがありません</p>
    </div>

  </main>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/authStore.js";
import { getFilteredChildCardbyUser } from "@/services/api.js";

const router    = useRouter();
const authStore = useAuthStore();

const childs     = ref([]);
const filterMode = ref("all");
const loading    = ref(false);
const isUpdating = ref(false);

// フィルタ済み一覧
const filteredChilds = computed(() => {
  if (filterMode.value === "all")      return childs.value;
  if (filterMode.value === "lent")     return childs.value.filter(c => c.CHILDSTATUS === "貸出中");
  if (filterMode.value === "focus")    return childs.value.filter(c => c.CHILDSTATUS === "重点");
  if (filterMode.value === "nonfocus") return childs.value.filter(c => c.CHILDSTATUS !== "重点");
  return childs.value;
});

async function fetchData() {
  loading.value = true;
  try {
    const res = await getFilteredChildCardbyUser();
    if (res.status === "success") {
      childs.value = res.cards || [];
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function refresh() {
  isUpdating.value = true;
  await fetchData();
  isUpdating.value = false;
}

function openChildMap(child) {
  router.push({
    name:   "childMap",
    params: { cardNo: child.CARDNO, childNo: child.CHILDNO },
  });
}

// オリジナル版のBootstrap4配色をhex直指定で踏襲（区域リスト画面と同一）
const STATUS_COLORS = {
  "貸出中": { bg: "#ffc107", color: "#212529" },
  "返却済": { bg: "#17a2b8", color: "#fff" },
  "整備中": { bg: "#6c757d", color: "#fff" },
  "完了":   { bg: "#28a745", color: "#fff" },
  "重点":   { bg: "#dc3545", color: "#fff" },
};

function statusPillStyle(status) {
  const c = STATUS_COLORS[status] || STATUS_COLORS["整備中"];
  return { backgroundColor: c.bg, color: c.color };
}

onMounted(fetchData);
</script>

<style scoped>
.loading {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.cardno-badge {
  border: 2px solid #007bff;
  border-radius: 8px;
  padding: 2px 8px;
  font-weight: bold;
  margin-right: 6px;
  font-size: 14px;
}
</style>
