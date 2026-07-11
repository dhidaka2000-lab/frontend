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
          <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'settings' })">
            <i class="fas fa-arrow-circle-left fa-2x"></i>
            <div class="small">戻る</div>
          </button>
        </div>
        <div class="text-center flex-grow-1">
          <p class="mb-0">[ユーザー名]<br />{{ authStore.userName }}<br />({{ authStore.userGroup }})</p>
        </div>
        <div>
          <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'mainMenu' })">
            <i class="fas fa-home fa-2x"></i>
            <div class="small">ホーム</div>
          </button>
        </div>
      </div>
    </header>

    <div class="text-center my-4">
      <h2>住戸リストの編集対象選択</h2>
    </div>

    <div class="row">
      <div class="col-sm-2"></div>
      <div class="col-sm-8">

        <div class="mb-3">
          <label class="form-label">編集対象の区域カードを選択してください。</label>
          <select class="form-select" v-model="selectedCardNo" @change="onCardChange">
            <option :value="null" disabled>-- 区域を選択 --</option>
            <option v-for="card in cards" :key="card.CARDNO" :value="card.CARDNO">
              [{{ card.CARDNO }}] {{ card.TOWNNAME }}
            </option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label">編集対象の子カードを選択してください。</label>
          <select class="form-select" v-model="selectedChildNo" :disabled="!selectedCardNo || children.length === 0">
            <option :value="null" disabled>-- 子カードを選択 --</option>
            <option v-for="child in children" :key="child.CHILDNO" :value="child.CHILDNO">
              [{{ selectedCardNo }}-{{ child.CHILDNO }}] {{ child.CHILDBLOCK }}
            </option>
          </select>
        </div>

        <div class="text-center">
          <button
            class="btn btn-primary"
            :disabled="!selectedCardNo || !selectedChildNo"
            @click="goToEditDetailList"
          >
            選択
          </button>
        </div>

      </div>
      <div class="col-sm-2"></div>
    </div>

  </main>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/authStore.js";
import { getCardList, getChildListByCard } from "@/services/api.js";

const router    = useRouter();
const authStore = useAuthStore();

const loading        = ref(false);
const cards          = ref([]);
const children       = ref([]);
const selectedCardNo  = ref(null);
const selectedChildNo = ref(null);

async function fetchCards() {
  loading.value = true;
  try {
    const res = await getCardList();
    if (res.status === "success") {
      cards.value = res.cards || [];
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function onCardChange() {
  selectedChildNo.value = null;
  children.value = [];
  if (!selectedCardNo.value) return;

  loading.value = true;
  try {
    const res = await getChildListByCard(selectedCardNo.value);
    if (res.status === "success") {
      children.value = res.children || [];
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function goToEditDetailList() {
  router.push({
    name:   "editDetailList",
    params: { cardNo: selectedCardNo.value, childNo: selectedChildNo.value },
  });
}

fetchCards();
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
</style>
