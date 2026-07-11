<template>
  <!-- ローディング -->
  <div v-if="loading" class="loading-overlay">
    <div class="text-center">
      <div class="spinner-border text-primary" style="width:3rem;height:3rem;" role="status"></div>
      <p class="mt-3">住居リストを読み込み中...</p>
    </div>
  </div>

  <main class="container-fluid py-2">

    <!-- ヘッダー -->
    <header class="sticky-top bg-white mb-2 py-2 border-bottom">
      <div class="d-flex justify-content-between align-items-center px-2">
        <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'settingsEditDetail' })">
          <i class="fas fa-arrow-circle-left fa-2x"></i>
          <div class="small">戻る</div>
        </button>

        <div class="text-center flex-grow-1">
          <div style="font-size:18px;font-weight:700;">住居リストの編集</div>
          <div class="small text-muted">{{ cardNo }}-{{ childNo }} ／ {{ houses.length }}件</div>
        </div>

        <button class="btn btn-link p-0 text-center" @click="router.push({ name: 'mainMenu' })">
          <i class="fas fa-home fa-2x"></i>
          <div class="small">ホーム</div>
        </button>
      </div>
    </header>

    <!-- ツールバー -->
    <div class="d-flex flex-wrap gap-2 justify-content-end mb-2 px-2">
      <button class="btn btn-outline-secondary" @click="fetchHouses" :disabled="busy">
        <i class="fas fa-redo"></i> 再読み込み
      </button>
      <button class="btn btn-outline-secondary" @click="renumberIds" :disabled="busy">
        <i class="fas fa-list-ol"></i> ID振り直し
      </button>
      <button class="btn btn-primary" @click="openAddModal" :disabled="busy">
        <i class="fas fa-plus-circle"></i> 住戸の追加
      </button>
    </div>

    <!-- 一覧テーブル -->
    <div class="table-responsive px-2">
      <table class="table table-sm table-hover table-bordered align-middle">
        <thead class="table-light">
          <tr>
            <th style="width:70px;">移動</th>
            <th style="width:60px;">#</th>
            <th>表札名</th>
            <th>建物名・部屋番号</th>
            <th>住所</th>
            <th>TEL / 種別</th>
            <th style="width:70px;">可否</th>
            <th style="width:210px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(h, index) in houses" :key="h.DetailID">
            <td class="text-center">
              <button class="btn btn-sm btn-secondary mb-1" :disabled="index === 0" @click="moveRow(h, 'up')">
                <i class="fas fa-chevron-up"></i>
              </button>
              <button class="btn btn-sm btn-secondary" :disabled="index === houses.length - 1" @click="moveRow(h, 'down')">
                <i class="fas fa-chevron-down"></i>
              </button>
            </td>
            <td class="text-center fw-bold">{{ h.HousingNo }}</td>
            <td>{{ h.FamilyName || "（表札名なし）" }}</td>
            <td>{{ h.BuildingName }} {{ h.RoomNo }}</td>
            <td class="small">
              <span v-if="h.AddressSW === '直接入力'">{{ h.InputTownName }}{{ h.InputCho }}{{ h.InputBanchi }}</span>
              <span v-else>{{ h.CSVTownName }}{{ h.CSVCho }}{{ h.CSVBanchi }}</span>
            </td>
            <td class="small">{{ h.TEL }} {{ h.Type }}</td>
            <td class="text-center">
              <i v-if="h.NGFlag === '不可' || h.NGFlag === '訪問不可'" class="fas fa-ban text-danger" title="訪問不可"></i>
              <span v-else>可</span>
            </td>
            <td class="text-nowrap">
              <button class="btn btn-sm btn-outline-primary me-1" @click="openEditModal(h)">編集</button>
              <button class="btn btn-sm btn-outline-secondary me-1" @click="openCopyModal(h)">複製</button>
              <button class="btn btn-sm btn-outline-danger" @click="deleteRow(h)">削除</button>
            </td>
          </tr>
          <tr v-if="houses.length === 0">
            <td colspan="8" class="text-center text-muted py-4">住戸データがありません</td>
          </tr>
        </tbody>
      </table>
    </div>

  </main>

  <!-- 編集・複製・追加モーダル -->
  <div v-if="showModal">
    <div class="modal-backdrop-custom" @click="closeModal"></div>
    <div class="modal d-block" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <span v-if="editMode === 'edit'">住戸情報の編集</span>
              <span v-else-if="editMode === 'copy'">住戸情報の複製</span>
              <span v-else>住戸情報の追加</span>
            </h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>

          <div class="modal-body">
            <div class="row g-3">

              <div class="col-sm-6">
                <label class="form-label">区域種別</label>
                <select class="form-select" v-model="editForm.Type">
                  <option v-for="t in CardKinds" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>

              <div class="col-sm-6">
                <label class="form-label">表札名</label>
                <input type="text" class="form-control" v-model="editForm.FamilyName">
              </div>

              <div class="col-sm-4">
                <label class="form-label">建物種別</label>
                <select class="form-select" v-model="editForm.BuildingCategory">
                  <option v-for="b in BuildKinds" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>

              <div class="col-sm-4">
                <label class="form-label">建物番号</label>
                <input type="text" class="form-control" v-model="editForm.BuildingNo">
              </div>

              <div class="col-sm-4" v-if="editForm.BuildingCategory !== '戸建て'">
                <label class="form-label">建物名</label>
                <input type="text" class="form-control" v-model="editForm.BuildingName">
              </div>

              <div class="col-sm-4">
                <label class="form-label">階数</label>
                <input type="text" class="form-control" v-model="editForm.Floors">
              </div>

              <div class="col-sm-4">
                <label class="form-label">部屋数</label>
                <input type="text" class="form-control" v-model="editForm.Rooms">
              </div>

              <div class="col-sm-4" v-if="editForm.BuildingCategory !== '戸建て'">
                <label class="form-label">部屋番号</label>
                <input type="text" class="form-control" v-model="editForm.RoomNo">
              </div>

              <div class="col-sm-12"><hr><b>住所（参照のみ・kiban CSV連携は未移行）</b></div>

              <div class="col-sm-6">
                <label class="form-label">町名／番／号（CSV）</label>
                <input type="text" class="form-control" disabled
                  :value="`${editForm.CSVTownName || ''}${editForm.CSVCho || ''}${editForm.CSVBanchi || ''}`">
              </div>

              <div class="col-sm-6">
                <label class="form-label">町名／番／号（直接入力）</label>
                <input type="text" class="form-control" disabled
                  :value="`${editForm.InputTownName || ''}${editForm.InputCho || ''}${editForm.InputBanchi || ''}`">
              </div>

              <div class="col-sm-12"><hr><b>電話番号</b></div>

              <div class="col-sm-4">
                <label class="form-label">TEL番号</label>
                <input type="text" class="form-control" v-model="editForm.TEL">
              </div>

              <div class="col-sm-4">
                <label class="form-label">情報源</label>
                <select class="form-select" v-model="editForm.TELSource">
                  <option v-for="s in TelSourceKinds" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>

              <div class="col-sm-4">
                <label class="form-label">入力日</label>
                <input type="date" class="form-control" v-model="editForm.TELUpdateDate">
              </div>

              <div class="col-sm-12"><hr><b>可否・その他</b></div>

              <div class="col-sm-3">
                <label class="form-label">可否</label>
                <select class="form-select" v-model="editForm.NGFlag">
                  <option v-for="n in NGStatus" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>

              <template v-if="editForm.NGFlag === '不可' || editForm.NGFlag === '訪問不可'">
                <div class="col-sm-3">
                  <label class="form-label">記録日</label>
                  <input type="date" class="form-control" v-model="editForm.NGDate">
                </div>
                <div class="col-sm-3">
                  <label class="form-label">奉仕監督確認</label>
                  <select class="form-select" v-model="editForm.NGChecked">
                    <option v-for="c in NGCheckSels" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                <div class="col-sm-12">
                  <label class="form-label">説明</label>
                  <textarea class="form-control" rows="2" maxlength="128" v-model="editForm.NGComment"></textarea>
                </div>
              </template>

              <div class="col-sm-6">
                <div class="form-check mt-4">
                  <input class="form-check-input" type="checkbox" id="ygFlag" v-model="youngerGenChecked">
                  <label class="form-check-label" for="ygFlag">若い世代・年少者フラグ</label>
                </div>
              </div>

              <div class="col-sm-12">
                <label class="form-label">備考（Note）</label>
                <textarea class="form-control" rows="2" v-model="editForm.Note"></textarea>
              </div>

              <div class="col-sm-12">
                <label class="form-label">コメント（Comment）</label>
                <textarea class="form-control" rows="2" v-model="editForm.Comment"></textarea>
              </div>

              <div class="col-sm-12">
                <label class="form-label">備考（Description）</label>
                <textarea class="form-control" rows="2" maxlength="128" v-model="editForm.Description"></textarea>
              </div>

            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModal">閉じる</button>
            <button class="btn btn-primary" @click="saveForm" :disabled="busy">
              {{ editMode === "edit" ? "更新" : "登録" }}
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  getChildDetail,
  upsertDetail,
  deleteDetail,
  moveDetailRow,
  renumberDetailList,
} from "@/services/api.js";

const props = defineProps({
  cardNo:  { type: Number, required: true },
  childNo: { type: Number, required: true },
});

const router = useRouter();

const loading = ref(true);
const busy    = ref(false);
const houses  = ref([]);

const showModal = ref(false);
const editMode  = ref("add"); // 'add' | 'copy' | 'edit'
const editForm  = ref({});

// 選択肢（legacy EditDetailList.html の定数をそのまま踏襲）
const CardKinds      = ["家から家", "オートロック", "商店・会社"];
const BuildKinds      = ["戸建て", "長屋", "アパート", "マンション", "オートロック", "寮", "店舗", "事務所", "工場", "倉庫", "各種施設", "駐車場", "空地", "空き家", "その他"];
const TelSourceKinds  = ["ハローページ", "タウンページ", "公式ウェブサイト", "民間の情報サイト等", "看板・掲示物", "チラシ・広告", "公式情報", "官公庁/公共団体の公開情報", "直接入手", "未確認", "過去リストから移行", "その他"];
const NGStatus        = ["可", "不可", "訪問不可"];
const NGCheckSels     = ["未確認", "確認済"];

// YoungerGENFlag は真偽値/文字列どちらの表現でも扱えるようにチェックボックスと相互変換
const youngerGenChecked = computed({
  get: () => !!editForm.value.YoungerGENFlag && editForm.value.YoungerGENFlag !== "" && editForm.value.YoungerGENFlag !== "0",
  set: (v) => { editForm.value.YoungerGENFlag = v ? "該当" : ""; },
});

function blankForm() {
  return {
    DetailID: null,
    CardNo:   props.cardNo,
    ChildNo:  props.childNo,
    Type:     "家から家",
    BuildingNo: "",
    BuildingCategory: "戸建て",
    BuildingName: "",
    Floors: "",
    Rooms: "",
    RoomNo: "",
    FamilyName: "",
    TEL: "",
    TELSource: "未確認",
    TELUpdateDate: "",
    Comment: "",
    Note: "",
    CSVTownName: "",
    CSVCho: "",
    CSVBanchi: "",
    InputTownName: "",
    InputCho: "",
    InputBanchi: "",
    AddressSW: "リストから選択",
    NGFlag: "可",
    NGDate: "",
    NGComment: "",
    NGChecked: "未確認",
    YoungerGENFlag: "",
    Description: "",
  };
}

async function fetchHouses() {
  busy.value = true;
  try {
    const res = await getChildDetail(props.cardNo, props.childNo);
    if (res.status === "success") houses.value = res.houses;
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
    loading.value = false;
  }
}

function openAddModal() {
  editMode.value = "add";
  editForm.value = blankForm();
  showModal.value = true;
}

function openCopyModal(h) {
  editMode.value = "copy";
  editForm.value = {
    ...blankForm(),
    Type: h.Type,
    BuildingNo: h.BuildingNo,
    BuildingCategory: h.BuildingCategory,
    BuildingName: h.BuildingName,
    Floors: h.Floors,
    Rooms: h.Rooms,
    RoomNo: h.RoomNo,
    CSVTownName: h.CSVTownName,
    CSVCho: h.CSVCho,
    CSVBanchi: h.CSVBanchi,
    InputTownName: h.InputTownName,
    InputCho: h.InputCho,
    InputBanchi: h.InputBanchi,
    AddressSW: h.AddressSW,
  };
  showModal.value = true;
}

function openEditModal(h) {
  editMode.value = "edit";
  editForm.value = { ...h };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

async function saveForm() {
  busy.value = true;
  try {
    await upsertDetail(editForm.value);
    showModal.value = false;
    await fetchHouses();
  } catch (e) {
    console.error(e);
    alert("保存に失敗しました");
  } finally {
    busy.value = false;
  }
}

async function deleteRow(h) {
  if (!confirm(`住戸ID: ${h.DetailID} ${h.FamilyName || "（表札名なし）"} を削除しますか？`)) return;
  busy.value = true;
  try {
    await deleteDetail(h.DetailID);
    await fetchHouses();
  } catch (e) {
    console.error(e);
    alert("削除に失敗しました");
  } finally {
    busy.value = false;
  }
}

async function moveRow(h, direction) {
  busy.value = true;
  try {
    await moveDetailRow(h.DetailID, direction);
    await fetchHouses();
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

async function renumberIds() {
  if (!confirm("住戸IDを現在の表示順で振り直します。よろしいですか？")) return;
  busy.value = true;
  try {
    await renumberDetailList(props.cardNo, props.childNo);
    await fetchHouses();
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

onMounted(fetchHouses);
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.modal-backdrop-custom {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1040;
}

.modal {
  z-index: 1050;
}
</style>
