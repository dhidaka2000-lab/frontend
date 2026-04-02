<template>
  <!-- Bootstrap 5 モーダル -->
  <div
    class="modal fade"
    :class="{ show: modelValue }"
    :style="modelValue ? 'display:block' : 'display:none'"
    tabindex="-1"
    role="dialog"
    @click.self="$emit('update:modelValue', false)"
  >
    <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
      <div class="modal-content">

        <!-- ヘッダー -->
        <div class="modal-header">
          <h5 class="modal-title">
            住戸 #{{ house?.HousingNo }} 訪問記録
            <small class="text-muted ms-2">{{ house?.BuildingName }} {{ house?.RoomNo }}</small>
          </h5>
          <button type="button" class="btn-close" @click="$emit('update:modelValue', false)"></button>
        </div>

        <!-- ボディ -->
        <div class="modal-body">

          <!-- 既存の訪問履歴タイムライン -->
          <h6 class="mb-2">訪問履歴</h6>
          <div v-if="house?.VRecord && house.VRecord.length > 0" class="visit-record-timeline mb-3">
            <div
              v-for="r in sortedVRecord"
              :key="r.VisitID"
              class="visit-record-item"
            >
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <span class="badge bg-secondary me-1">{{ r.VisitDate }}</span>
                  <span class="badge bg-light text-dark me-1">{{ r.Time }}</span>
                  <strong>{{ r.Result }}</strong>
                  <span v-if="r.Minister" class="ms-1 small text-muted">（{{ r.Minister }}）</span>
                </div>
                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="deleteRecord(r.VisitID)"
                  :disabled="saving"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
              <p v-if="r.Comment" class="mb-0 small">{{ r.Comment }}</p>
              <p v-if="r.Note"    class="mb-0 small text-muted">{{ r.Note }}</p>
            </div>
          </div>
          <p v-else class="text-muted small">訪問履歴はありません</p>

          <hr />

          <!-- 新規登録フォーム -->
          <h6 class="mb-2">訪問記録を追加</h6>
          <div class="row g-2">

            <div class="col-6">
              <label class="form-label small">訪問日</label>
              <input type="date" class="form-control form-control-sm" v-model="form.VisitDate" />
            </div>

            <div class="col-6">
              <label class="form-label small">時間帯</label>
              <select class="form-select form-select-sm" v-model="form.Time">
                <option value="">選択してください</option>
                <option>9時以前</option>
                <option>9時〜12時</option>
                <option>12時〜13時</option>
                <option>13時〜16時</option>
                <option>16時〜18時</option>
                <option>18時以降</option>
              </select>
            </div>

            <div class="col-6">
              <label class="form-label small">結果</label>
              <select class="form-select form-select-sm" v-model="form.Result">
                <option value="">選択してください</option>
                <option>済</option>
                <option>済(投函)</option>
                <option>済(留守録)</option>
                <option>不在</option>
                <option>訪問不可</option>
              </select>
            </div>

            <div class="col-6">
              <label class="form-label small">担当者</label>
              <input type="text" class="form-control form-control-sm" v-model="form.Minister" placeholder="担当者名" />
            </div>

            <div class="col-12">
              <label class="form-label small">コメント</label>
              <textarea class="form-control form-control-sm" v-model="form.Comment" rows="2"></textarea>
            </div>

            <div class="col-12">
              <label class="form-label small">メモ</label>
              <textarea class="form-control form-control-sm" v-model="form.Note" rows="2"></textarea>
            </div>

            <!-- NG フラグ -->
            <div class="col-12">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="ngCheck" v-model="ngFlagEnabled" />
                <label class="form-check-label small" for="ngCheck">訪問不可（NG）に設定する</label>
              </div>
            </div>

          </div>

          <p v-if="saveError" class="text-danger mt-2 small">{{ saveError }}</p>
        </div>

        <!-- フッター -->
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">閉じる</button>
          <button class="btn btn-primary" @click="submitRecord" :disabled="saving">
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
import { upsertVisitRecord, deleteVisitRecord } from "@/services/api.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  house:      { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "saved", "deleted"]);

const saving       = ref(false);
const saveError    = ref("");
const ngFlagEnabled = ref(false);

const form = ref({
  VisitDate: new Date().toISOString().slice(0, 10),
  Time:      "",
  Result:    "",
  Minister:  "",
  Comment:   "",
  Note:      "",
});

// モーダルが開くたびにフォームをリセット
watch(() => props.modelValue, (v) => {
  if (v) {
    form.value = {
      VisitDate: new Date().toISOString().slice(0, 10),
      Time:      "",
      Result:    "",
      Minister:  "",
      Comment:   "",
      Note:      "",
    };
    ngFlagEnabled.value = false;
    saveError.value     = "";
  }
});

// VRecord を日付降順にソート
const sortedVRecord = computed(() => {
  return [...(props.house?.VRecord || [])].sort((a, b) =>
    b.VisitDate?.localeCompare(a.VisitDate ?? "") ?? 0
  );
});

async function submitRecord() {
  if (!form.value.VisitDate || !form.value.Result) {
    saveError.value = "訪問日と結果は必須です";
    return;
  }
  saving.value    = true;
  saveError.value = "";

  try {
    const record = {
      CardNo:    props.house.CardNo,
      ChildNo:   props.house.ChildNo,
      HousingNo: props.house.HousingNo,
      NGFlag:    ngFlagEnabled.value ? "不可" : "",
      ...form.value,
    };
    const res = await upsertVisitRecord(record);
    if (res.status === "success") {
      emit("saved", { house: props.house, visitStatus: res.visitStatus });
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

async function deleteRecord(VisitID) {
  if (!confirm("この訪問記録を削除しますか？")) return;
  saving.value = true;
  try {
    const res = await deleteVisitRecord(VisitID);
    if (res.status === "success") {
      emit("deleted", { house: props.house, visitStatus: res.visitStatus });
      emit("update:modelValue", false);
    }
  } catch (e) {
    saveError.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.visit-record-timeline {
  border-left: 3px solid #6c757d;
  margin-left: 0.5rem;
  padding-left: 0.75rem;
}

.visit-record-item {
  margin-bottom: 0.75rem;
  position: relative;
}

.visit-record-item::before {
  content: "";
  position: absolute;
  left: -1.1rem;
  top: 0.3rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #6c757d;
}
</style>
