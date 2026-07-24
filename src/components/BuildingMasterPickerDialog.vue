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
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">建物マスタから選択</h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>
        <div class="modal-body">
          <div class="row g-2 mb-2">
            <div class="col-12 col-sm-4">
              <label class="form-label small mb-1">町名</label>
              <select class="form-select form-select-sm" v-model="townFilter">
                <option value="">すべて</option>
                <option v-for="t in townOptions" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="col-8 col-sm-6">
              <label class="form-label small mb-1">建物名（部分一致）</label>
              <input type="text" class="form-control form-control-sm" v-model="nameFilter" placeholder="建物名の一部を入力" @keyup.enter="applyFilter">
            </div>
            <div class="col-4 col-sm-2 d-flex align-items-end">
              <button type="button" class="btn btn-outline-secondary btn-sm w-100" @click="applyFilter">
                <i class="fas fa-search"></i> 絞込
              </button>
            </div>
          </div>

          <div class="picker-list border rounded mb-2">
            <table class="table table-sm table-hover mb-0">
              <thead class="table-light sticky-top">
                <tr>
                  <th>建物ID</th>
                  <th>建物名</th>
                  <th>総階数</th>
                  <th>総戸数</th>
                  <th>住所</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="b in filteredBuildings"
                  :key="b.BuildingNo"
                  :class="{ 'table-primary': selected?.BuildingNo === b.BuildingNo }"
                  style="cursor:pointer"
                  @click="selectRow(b)"
                >
                  <td>{{ b.BuildingNo }}</td>
                  <td>{{ b.BuildingName }}</td>
                  <td>{{ b.Floors }}</td>
                  <td>{{ b.Rooms }}</td>
                  <td class="small">{{ buildingAddress(b) }}</td>
                </tr>
                <tr v-if="!loading && filteredBuildings.length === 0">
                  <td colspan="5" class="text-center text-muted py-3">該当する建物がありません</td>
                </tr>
                <tr v-if="loading">
                  <td colspan="5" class="text-center text-muted py-3">
                    <i class="fas fa-spinner fa-spin"></i> 読み込み中...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div ref="mapContainer" class="picker-map rounded border"></div>
          <p v-if="selected && !hasCoords(selected)" class="small text-muted mt-1 mb-0">
            この建物には座標が登録されていないため、初期表示位置を表示しています。
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">キャンセル</button>
          <button type="button" class="btn btn-primary" :disabled="!selected" @click="confirm">この建物を選択</button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="modelValue" class="modal-backdrop fade show"></div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { searchBuildingMaster, getKibanTowns } from "@/services/api.js";
import { loadGoogleMaps, createMap, addMarker } from "@/services/maps.js";
import { fetchDefaultCenter } from "@/services/mapCenter.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "select"]);

const loading      = ref(false);
const townOptions  = ref([]);
const townFilter   = ref("");
const nameFilter   = ref("");
const allBuildings = ref([]);
const selected     = ref(null);
const mapContainer = ref(null);

let mapInstance    = null;
let marker         = null;
let townsLoaded    = false;

// address_sw に応じてCSV由来／手入力のどちらかの住所を組み立てる（既存のhouseAddress()と同じルール）
function buildingAddress(b) {
  if (b.AddressSW === "直接入力") {
    return `${b.InputTownName ?? ""}${b.InputCho ?? ""}-${b.InputBanchi ?? ""}`;
  }
  return `${b.CSVTownName ?? ""}${b.CSVCho ?? ""}-${b.CSVBanchi ?? ""}`;
}

function buildingTown(b) {
  return b.AddressSW === "直接入力" ? (b.InputTownName ?? "") : (b.CSVTownName ?? "");
}

function hasCoords(b) {
  return Number.isFinite(Number(b?.CSVLat)) && Number.isFinite(Number(b?.CSVLng)) && Number(b?.CSVLat) && Number(b?.CSVLng);
}

// 町名・建物名（部分一致）で絞り込む。両フィルタは入力のたび即時反映されるため、
// 「絞込」ボタン自体は明示的な操作の手がかりとして置いているだけ
const filteredBuildings = computed(() => {
  let list = allBuildings.value;
  if (townFilter.value) list = list.filter(b => buildingTown(b) === townFilter.value);
  const kw = nameFilter.value.trim();
  if (kw) list = list.filter(b => (b.BuildingName || "").includes(kw));
  return list;
});

function applyFilter() {
  // computed が入力の都度自動的に再評価されるため、明示的な処理は不要
}

async function ensureTowns() {
  if (townsLoaded) return;
  townsLoaded = true;
  try {
    const res = await getKibanTowns();
    if (res.status === "success") townOptions.value = res.towns || [];
  } catch (e) {
    console.error("町名一覧の取得に失敗しました:", e);
  }
}

async function loadBuildings() {
  loading.value = true;
  try {
    const res = await searchBuildingMaster("");
    if (res.status === "success") allBuildings.value = res.buildings || [];
  } catch (e) {
    console.error("建物マスタの取得に失敗しました:", e);
  } finally {
    loading.value = false;
  }
}

function selectRow(b) {
  selected.value = b;
  showOnMap(b);
}

async function showOnMap(b) {
  await nextTick();
  if (!mapContainer.value) return;
  try {
    await loadGoogleMaps();
    const lat = Number(b.CSVLat);
    const lng = Number(b.CSVLng);
    const center = hasCoords(b) ? { lat, lng } : await fetchDefaultCenter();

    if (!mapInstance) {
      mapInstance = createMap(mapContainer.value, center, 17);
    } else {
      mapInstance.setCenter(center);
      mapInstance.setZoom(17);
      google.maps.event.trigger(mapInstance, "resize");
    }
    if (marker) marker.map = null;
    marker = addMarker(mapInstance, center, b.BuildingName || "");
  } catch (e) {
    console.error("地図表示に失敗しました:", e);
  }
}

function close() {
  emit("update:modelValue", false);
}

function confirm() {
  if (!selected.value) return;
  emit("select", selected.value);
  close();
}

watch(() => props.modelValue, async (open) => {
  if (!open) return;
  selected.value = null;
  townFilter.value = "";
  nameFilter.value = "";
  mapInstance = null;
  marker = null;
  await ensureTowns();
  await loadBuildings();
});
</script>

<style scoped>
.picker-list {
  max-height: 260px;
  overflow-y: auto;
}

.picker-map {
  width: 100%;
  height: 220px;
}

@media (max-width: 576px) {
  .picker-list { max-height: 200px; }
  .picker-map  { height: 160px; }
}
</style>
