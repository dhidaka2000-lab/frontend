// src/services/api.js
// Cloudflare Worker への API 呼び出しを集約するサービスモジュール
//
// すべての認証付きリクエストは callWorker() を経由する。
// Firebase ID Token の取得・付与を自動で行う。

import { getIdToken } from "./auth.js";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://ekuikidev.dhidaka2000-lab.workers.dev";

// ----------------------------------------------------------------
// 共通ヘルパー
// ----------------------------------------------------------------

/**
 * Worker に POST リクエストを送る（認証あり）
 * @param {object} body  - funcName を含むリクエストボディ
 * @returns {Promise<object>}
 */
async function callWorker(body) {
  const token = await getIdToken();
  const res   = await fetch(WORKER_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Worker error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Worker に POST リクエストを送る（認証なし）
 * @param {object} body
 */
async function callWorkerPublic(body) {
  const res = await fetch(WORKER_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Worker error ${res.status}`);
  return res.json();
}

// ----------------------------------------------------------------
// 公開 API（認証不要）
// ----------------------------------------------------------------

/** Firebase API Key を取得する */
export async function getFirebaseConfig() {
  return callWorkerPublic({ funcName: "getFirebaseConfig" });
}

// ----------------------------------------------------------------
// 認証付き API
// ----------------------------------------------------------------

/** ログインユーザー情報を取得する */
export async function getLoginUserInformation() {
  return callWorker({ funcName: "getLoginUserInformation" });
}

/** Google Maps URL を取得する */
export async function getGoogleMapsUrl() {
  return callWorker({ funcName: "getGoogleMapsUrl" });
}

/**
 * ログインユーザーに紐づく子カード一覧を取得する（マイページ用）
 */
export async function getFilteredChildCardbyUser() {
  return callWorker({ funcName: "getFilteredChildCardbyUser" });
}

/**
 * 子カード詳細（cardInfo / childInfo / houses）を取得する
 * @param {number} CardNo
 * @param {number} ChildNo
 */
export async function getChildDetail(CardNo, ChildNo) {
  return callWorker({ funcName: "getChildDetail", CardNo, ChildNo });
}

/**
 * 訪問履歴を取得する
 * @param {number} CardNo
 * @param {number} ChildNo
 */
export async function getVisitRecord(CardNo, ChildNo) {
  return callWorker({ funcName: "getVisitRecord", CardNo, ChildNo });
}

/**
 * 訪問記録を登録 / 更新する
 * @param {object} record
 */
export async function upsertVisitRecord(record) {
  return callWorker({ funcName: "upsertVisitRecord", ...record });
}

/**
 * 訪問記録を削除する
 * @param {number} VisitID
 */
export async function deleteVisitRecord(VisitID) {
  return callWorker({ funcName: "deleteVisitRecord", VisitID });
}

/**
 * KML ファイルを取得する
 * @param {string}      file
 * @param {string|null} ChildNo
 */
export async function getKml(file, ChildNo = null) {
  const url = new URL(`${WORKER_URL}/getKml`);
  url.searchParams.set("file", file);
  if (ChildNo) url.searchParams.set("ChildNo", ChildNo);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`KML fetch error ${res.status}`);
  return res.text();
}
