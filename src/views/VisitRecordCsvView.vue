<template>
  <main role="main" class="container py-3">

    <!-- ヘッダー -->
    <header class="sticky-top bg-white mb-2 py-2 border-bottom">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'admins' })">
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
      <h2><i class="fas fa-file-csv"></i> 訪問履歴のCSV入出力</h2>
    </div>

    <div class="alert alert-secondary small">
      訪問履歴（visit_record）全件のCSVインポート・エクスポートを行います（GitHub Actions上で
      バックグラウンド実行されるため、件数が多くても失敗しません。画面を閉じても処理は継続します）。<br>
      現アプリ用CSVの各項目（時間帯・訪問結果・奉仕者・コメント等）は復号済みの平文で入出力されます。
      旧アプリ（GAS版）からのCSVは、そのまま取り込むことができます（内部で自動的に暗号方式を変換します）。
      旧アプリ用CSVの取り込みは常に追加（履歴の積み増し）となります。<br>
      「総入替」モードは既存の訪問履歴を全て削除してからCSVの内容で置き換える破壊的な操作です。実行前に確認が入ります。
    </div>

    <div class="d-flex justify-content-center">
      <CsvImportExportPanel
        title="訪問履歴"
        :columns="CSV_COLUMNS"
        :legacy-columns="LEGACY_CSV_COLUMNS"
        :has-legacy-format="true"
        :import-modes="IMPORT_MODES"
        import-target="visit_record"
        format-template-filename="訪問履歴CSVフォーマット.csv"
        export-filename="訪問履歴.csv"
        :export-rows="exportCsvRows"
        :export-filters="() => ({})"
        :import-batch="importCsvBatch"
      />
    </div>

  </main>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/authStore.js";
import { getVisitRecordExportPage, importVisitRecordBatch } from "@/services/api.js";
import CsvImportExportPanel from "@/components/CsvImportExportPanel.vue";

const router    = useRouter();
const authStore = useAuthStore();

// 現アプリ用：row_idを含める（再インポート時にこの値が一致すればUPDATE、無ければINSERT）
const CSV_COLUMNS = [
  "row_id", "card_no", "child_no", "housing_no", "visit_date",
  "time", "field", "result", "minister", "comment", "note", "term",
];
// 旧アプリ（GAS版）：idは旧システム側の識別子で現行row_idとは無関係のため、
// 旧アプリ用フォーマットの取り込みは常に新規追加になる
const LEGACY_CSV_COLUMNS = [
  "id", "card_no", "child_no", "housing_no", "visit_date",
  "time", "field", "result", "minister", "comment", "note", "term",
];

const IMPORT_MODES = [
  { value: "upsert",  label: "追加更新（区域番号・子カード番号・住戸番号・訪問日・時間帯が一致すれば上書き、なければ追加）" },
  { value: "replace", label: "総入替（既存を削除して差し替え）" },
];

const EXPORT_PAGE_SIZE = 1000;

// importTarget指定時、実際のエクスポートはジョブ方式（CsvImportExportPanel側）を
// 使うため、この関数はプロップの都合上残しているだけで呼ばれない
// （EditCardListView.vue等の他画面と同じ既存の慣習）。
async function exportCsvRows() {
  const rows = [];
  let afterRowId = 0;
  for (;;) {
    const res = await getVisitRecordExportPage({}, afterRowId, EXPORT_PAGE_SIZE);
    // legacy列リストの "id" 列にも同じ値が出るよう、row_idをidとしても持たせておく
    rows.push(...(res.rows || []).map(r => ({ ...r, id: r.row_id })));
    if (!res.hasMore) break;
    afterRowId = res.lastRowId;
  }
  return rows;
}

async function importCsvBatch(rows, { format, mode }) {
  return importVisitRecordBatch(rows, format, mode);
}
</script>
