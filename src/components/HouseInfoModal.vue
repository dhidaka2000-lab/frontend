<template>
  <div
    class="modal fade"
    :class="{ show: modelValue }"
    :style="modelValue ? 'display:block' : 'display:none'"
    tabindex="-1"
    role="dialog"
    @click.self="close"
  >
    <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
      <div class="modal-content" v-if="form">

        <div class="modal-header">
          <h5 class="modal-title">住戸情報の表示・編集</h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>

        <div class="modal-body">
          <div class="row g-2">

            <div class="col-12"><h6 class="text-muted">基本情報</h6></div>

            <div class="col-3 col-form-label small">お名前</div>
            <div class="col-9">
              <input class="form-control form-control-sm" v-model="form.FamilyName" :disabled="readOnly" placeholder="( 表札名なし )" />
            </div>

            <div class="col-3 col-form-label small">若い世代</div>
            <div class="col-9">
              <select class="form-select form-select-sm" v-model="form.YoungerGENFlag" :disabled="readOnly">
                <option v-for="opt in YOUNGER_GEN_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <template v-if="form.AddressSW === '直接入力'">
              <div class="col-3 col-form-label small">町名</div>
              <div class="col-9">
                <input class="form-control form-control-sm" v-model="form.InputTownName" :disabled="readOnly" />
              </div>
              <div class="col-3 col-form-label small">番地</div>
              <div class="col-9">
                <input class="form-control form-control-sm" v-model="form.InputCho" :disabled="readOnly" />
              </div>
              <div class="col-3 col-form-label small">住居番号</div>
              <div class="col-9">
                <input class="form-control form-control-sm" v-model="form.InputBanchi" :disabled="readOnly" />
              </div>
            </template>
            <template v-else>
              <div class="col-3 col-form-label small">住所</div>
              <div class="col-9">
                <input class="form-control form-control-sm" :value="csvAddressDisplay" disabled />
                <div class="form-text">住居表示CSV由来の住所は、設定 &gt; 住居表示住所CSVインポートから変更してください。</div>
              </div>
            </template>

            <div class="col-3 col-form-label small">建物種別</div>
            <div class="col-9">
              <select class="form-select form-select-sm" v-model="form.BuildingCategory" :disabled="readOnly">
                <option v-for="opt in BUILD_KINDS" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <template v-if="form.BuildingCategory !== '戸建て'">
              <div class="col-3 col-form-label small">建物名</div>
              <div class="col-9">
                <input class="form-control form-control-sm" v-model="form.BuildingName" :disabled="readOnly" />
              </div>
              <div class="col-3 col-form-label small">部屋番号</div>
              <div class="col-9">
                <input class="form-control form-control-sm" v-model="form.RoomNo" :disabled="readOnly" />
              </div>
            </template>

            <div class="col-3 col-form-label small">緯度</div>
            <div class="col-9">
              <input class="form-control form-control-sm" v-model="form.CSVLat" :disabled="readOnly" placeholder="例）34.768660059488724" />
            </div>
            <div class="col-3 col-form-label small">経度</div>
            <div class="col-9">
              <input class="form-control form-control-sm" v-model="form.CSVLng" :disabled="readOnly" placeholder="例）135.59748150473885" />
            </div>

            <div class="col-12"><hr /></div>
            <div class="col-12"><h6 class="text-muted">電話</h6></div>

            <div class="col-3 col-form-label small">電話番号</div>
            <div class="col-9">
              <input class="form-control form-control-sm" v-model="form.TEL" :disabled="readOnly" placeholder="例）072-800-0000" />
            </div>
            <div class="col-3 col-form-label small">情報源</div>
            <div class="col-9">
              <select class="form-select form-select-sm" v-model="form.TELSource" :disabled="readOnly">
                <option v-for="opt in TEL_SOURCE_KINDS" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
            <div class="col-3 col-form-label small">取得日</div>
            <div class="col-9">
              <input class="form-control form-control-sm" :value="form.TELUpdateDate || '-'" disabled />
            </div>

            <div class="col-12"><hr /></div>

            <div class="col-3 col-form-label small">訪問可否</div>
            <div class="col-9">{{ form.NGFlag || "可" }}</div>
            <template v-if="form.NGFlag === '不可' && form.NGComment">
              <div class="col-3 col-form-label small">訪問不可説明</div>
              <div class="col-9">{{ form.NGComment }}</div>
            </template>

            <div class="col-3 col-form-label small">チェック結果</div>
            <div class="col-9">
              <span v-if="form.BadFlag === 'Bad'" class="text-danger"><i class="fas fa-exclamation-triangle"></i> 要確認</span>
              <span v-else-if="form.BadFlag === 'Good'" class="text-success"><i class="fas fa-check-circle"></i> チェック済</span>
              <span v-else class="text-muted">未確認</span>
            </div>

            <div class="col-3 col-form-label small">備考</div>
            <div class="col-9">
              <textarea class="form-control form-control-sm" v-model="form.Description" :disabled="readOnly" rows="2"></textarea>
            </div>

          </div>

          <p v-if="readOnly" class="text-muted small mt-2">
            <i class="fas fa-plane"></i> オフラインで保存したデータを表示しています。編集はネット接続時のみ行えます。
          </p>
          <p v-if="saveError" class="text-danger small mt-2">{{ saveError }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="close">閉じる</button>
          <button v-if="!readOnly" class="btn btn-primary" @click="save" :disabled="saving">
            <span v-if="saving"><i class="fas fa-spinner fa-spin"></i> 保存中...</span>
            <span v-else><i class="fas fa-save"></i> 保存</span>
          </button>
        </div>

      </div>
    </div>
  </div>
  <div v-if="modelValue" class="modal-backdrop fade show"></div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { upsertDetail } from "@/services/api.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  house:      { type: Object, default: null },
  // オフライン（未ログインでのキャッシュ閲覧含む）で開いている場合は表示のみとし、保存はさせない
  readOnly:   { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "saved"]);

// ORIGINAL/ChildMap.html・EditDetailList.html のBuildKinds/TelSourceKindsを踏襲
const BUILD_KINDS = [
  "戸建て", "長屋", "アパート", "マンション", "オートロック", "寮",
  "店舗", "事務所", "工場", "倉庫", "各種施設", "駐車場", "空地", "空き家", "その他",
];
const TEL_SOURCE_KINDS = [
  "-選択-", "ハローページ", "タウンページ", "公式ウェブサイト", "民間の情報サイト等",
  "看板・掲示物", "チラシ・広告", "公式情報", "官公庁/公共団体の公開情報",
  "直接入手", "未確認", "過去リストから移行", "その他",
];
const YOUNGER_GEN_OPTIONS = ["若い世代に会えた", "若い世代と推定", "一般", "未確認"];

const form       = ref(null);
const saving     = ref(false);
const saveError  = ref("");

watch(() => props.modelValue, (open) => {
  if (open && props.house) {
    form.value = { ...props.house };
    saveError.value = "";
  }
});

const csvAddressDisplay = computed(() => {
  if (!form.value) return "";
  return `${form.value.CSVTownName ?? ""}${form.value.CSVCho ?? ""}-${form.value.CSVBanchi ?? ""}`;
});

function close() {
  if (saving.value) return;
  emit("update:modelValue", false);
}

async function save() {
  if (!form.value) return;
  saving.value    = true;
  saveError.value = "";
  try {
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      ...form.value,
      TELUpdateDate: form.value.TEL ? today : form.value.TELUpdateDate,
    };
    const res = await upsertDetail(payload);
    if (res.status === "success") {
      emit("saved", payload);
      emit("update:modelValue", false);
    } else {
      saveError.value = res.message || "保存に失敗しました";
    }
  } catch (e) {
    saveError.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>
