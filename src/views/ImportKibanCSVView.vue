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
        <div class="text-center flex-grow-1" style="font-size:22px; font-weight:700;">住居表示住所CSVインポート</div>
        <div>
          <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'mainMenu' })">
            <i class="fas fa-home fa-2x"></i>
            <div class="small">ホーム</div>
          </button>
        </div>
      </div>
    </header>

    <div class="alert alert-secondary">
      <p class="mb-1">国土地理院・電子国土基本図（地名情報）の「住居表示住所」データをインポートします。</p>
      <p class="mb-1">
        <a href="https://www.gsi.go.jp/kihonjohochousa/jukyo_jusho.html" target="_blank" rel="noopener">ダウンロードサイト</a>
      </p>
      <p class="mb-0">住所毎の緯度・経度情報を、指定した区域カード／子カードの住居リストにインポートします。</p>
    </div>

    <!-- インポート対象の選択 -->
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="card-title">インポート対象</h5>
        <div class="row g-2">
          <div class="col-sm-6">
            <label class="form-label">区域カード</label>
            <select class="form-select" v-model="selectedCardNo" @change="onCardChange">
              <option :value="null" disabled>選択してください</option>
              <option v-for="c in cardList" :key="c.CARDNO" :value="c.CARDNO">
                {{ c.CARDNO }} - {{ c.TOWNNAME }}
              </option>
            </select>
          </div>
          <div class="col-sm-6">
            <label class="form-label">子カード</label>
            <select class="form-select" v-model="selectedChildNo" :disabled="!selectedCardNo">
              <option :value="null" disabled>選択してください</option>
              <option v-for="ch in childList" :key="ch.CHILDNO" :value="ch.CHILDNO">
                {{ ch.CHILDNO }} - {{ ch.CHILDBLOCK }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- ファイル選択 -->
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="card-title">CSVファイルの選択</h5>
        <p class="text-muted small">登録したいファイルを選択してください。</p>
        <input type="file" class="form-control" accept=".csv" @change="onFileChange" />
        <p v-if="parseMessage" class="mt-2 mb-0">{{ parseMessage }}</p>
      </div>
    </div>

    <!-- プレビュー -->
    <div class="card mb-3" v-if="rows.length > 0">
      <div class="card-body">
        <h5 class="card-title">プレビュー（先頭{{ previewRows.length }}件 / 全{{ rows.length }}件）</h5>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead>
              <tr>
                <th v-for="h in headers" :key="h">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in previewRows" :key="idx">
                <td v-for="h in headers" :key="h">{{ row[h] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 実行 -->
    <div class="d-grid mb-4">
      <button
        class="btn btn-primary"
        :disabled="!canImport || loading"
        @click="runImport"
      >
        <i class="fas fa-file-import"></i> インポート実行
      </button>
    </div>

    <div v-if="resultMessage" :class="['alert', resultOk ? 'alert-success' : 'alert-danger']">
      {{ resultMessage }}
    </div>

  </main>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { getCardList, getChildListByCard, importKibanCsv } from "@/services/api.js";

const router = useRouter();

const loading    = ref(false);
const cardList   = ref([]);
const childList  = ref([]);
const selectedCardNo  = ref(null);
const selectedChildNo = ref(null);

const headers = ref([]);
const rows    = ref([]);
const parseMessage  = ref("");
const resultMessage = ref("");
const resultOk       = ref(false);

const previewRows = computed(() => rows.value.slice(0, 20));
const canImport    = computed(() => !!selectedCardNo.value && !!selectedChildNo.value && rows.value.length > 0);

// 国土地理院CSVのヘッダー名 → detailテーブルの列名 マッピング
// ※ 実際のCSVヘッダー名は要確認（原本の変換処理は列位置(0始まり 1,2,3,6,7列目)で
//    町名/番地/号/経度/緯度を拾っており、ヘッダー行の有無・名称は未確認）
const HEADER_MAP = {
  "町名":        "csv_town_name",
  "大字町名":    "csv_town_name",
  "丁目":        "csv_cho",
  "字丁目":      "csv_cho",
  "番地":        "csv_banchi",
  "号":          "csv_banchi",
  "経度":        "csv_lng",
  "緯度":        "csv_lat",
  "lng":         "csv_lng",
  "lat":         "csv_lat",
  "url":         "csv_url",
};

function mapHeader(h) {
  return HEADER_MAP[h] || h;
}

// カンマ区切り・簡易ダブルクォート対応のCSV行パーサー
function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseCsvText(text) {
  const lines = text.split(/\r\n|\r|\n/).filter(l => l.length > 0);
  if (lines.length === 0) return { headers: [], parsedRows: [] };

  const rawHeaders = parseCsvLine(lines[0]).map(h => h.trim());
  const mappedHeaders = rawHeaders.map(mapHeader);

  const parsedRows = lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const obj = {};
    mappedHeaders.forEach((h, idx) => {
      obj[h] = cells[idx] !== undefined ? cells[idx].trim() : "";
    });
    return obj;
  });

  return { headers: mappedHeaders, parsedRows };
}

// 国土地理院CSVはShift_JISで配布されているため、まずSJISでデコードを試みる
async function readFileAsText(file) {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("shift_jis").decode(buffer);
  } catch (e) {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

async function onFileChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  resultMessage.value = "";
  loading.value = true;
  try {
    const text = await readFileAsText(file);
    const { headers: h, parsedRows } = parseCsvText(text);
    headers.value = h;
    rows.value = parsedRows;
    parseMessage.value = `${parsedRows.length}件のデータを読み込みました。内容を確認して「インポート実行」を押してください。`;
  } catch (e) {
    console.error(e);
    headers.value = [];
    rows.value = [];
    parseMessage.value = "ファイルの読み込みに失敗しました。";
  } finally {
    loading.value = false;
  }
}

async function onCardChange() {
  selectedChildNo.value = null;
  childList.value = [];
  if (!selectedCardNo.value) return;

  loading.value = true;
  try {
    const res = await getChildListByCard(selectedCardNo.value);
    if (res.status === "success") {
      childList.value = res.childs || [];
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function fetchCardList() {
  loading.value = true;
  try {
    const res = await getCardList();
    if (res.status === "success") {
      cardList.value = res.cards || [];
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function runImport() {
  if (!canImport.value) return;

  loading.value = true;
  resultMessage.value = "";
  try {
    const res = await importKibanCsv({
      cardNo:  selectedCardNo.value,
      childNo: selectedChildNo.value,
      rows:    rows.value,
    });
    if (res.status === "success") {
      resultOk.value = true;
      resultMessage.value = `インポートが完了しました。（${res.importedCount ?? rows.value.length}件）`;
    } else {
      resultOk.value = false;
      resultMessage.value = res.message || "インポートに失敗しました。もう一度やり直してください。";
    }
  } catch (e) {
    console.error(e);
    resultOk.value = false;
    resultMessage.value = "インポートに失敗しました。もう一度やり直してください。";
  } finally {
    loading.value = false;
  }
}

fetchCardList();
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
