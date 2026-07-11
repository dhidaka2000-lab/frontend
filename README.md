# eKUIKI Frontend

Google Apps Script で動いていた区域管理 Web アプリのフロントエンド移植版。
GitHub Pages 上に静的ホストし、API は別リポジトリの Cloudflare Worker（[ekuiki_worker](https://github.com/dhidaka2000-lab/ekuiki_worker)）経由で Supabase に接続する。

## アーキテクチャ

```
[Browser]
   │ ① Firebase Auth でログイン
   ▼
[Firebase Authentication]
   │ ② ID Token (JWT)
   ▼
[GitHub Pages: Vue 3 SPA]   ←── このリポジトリ
   │ ③ POST {funcName, ...} + Bearer <ID Token>
   ▼
[Cloudflare Worker: ekuiki-worker]
   │ ④ JWT 検証 → Supabase REST API
   ▼
[Supabase (PostgreSQL)]
```

## スタック

- Vue 3 + Vite + Pinia + Vue Router (hash history)
- Firebase Authentication (Email/PW + Google/Apple/Microsoft OAuth)
- Bootstrap 5 + Font Awesome（CDN 経由）

## ローカル開発

```bash
# 1. .env を作成
cp .env.example .env
# 必要なら VITE_WORKER_URL を http://127.0.0.1:8787 に書き換える（ローカル Worker と接続する場合）

# 2. 依存インストール
npm install

# 3. dev server 起動（http://localhost:5173）
npm run dev
```

## ビルド

```bash
npm run build   # dist/ に生成
npm run preview # ローカルで dist/ を配信
```

## GitHub Pages デプロイ

`main` ブランチに push すると `.github/workflows/deploy-pages.yml` が自動で Pages にデプロイする。

### 事前準備（1回だけ）

1. GitHub リポジトリ Settings → Pages → Source = **GitHub Actions**
2. Settings → Secrets and variables → Actions → **Variables** タブに以下を登録:
   - `VITE_WORKER_URL` = `https://ekuiki-worker.<your-workers-subdomain>.workers.dev`
   - `VITE_FIREBASE_APIKEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`

> Note: Firebase API Key は公開しても問題ないため Variables（Secrets ではない）で管理。

## ディレクトリ構成

```
src/
├── main.js              ... エントリーポイント（Pinia / Router 初期化）
├── App.vue              ... ルート（auth ロード中スピナー）
├── router/index.js      ... Vue Router 定義（hash history）
├── store/authStore.js   ... Pinia: Firebase user + Supabase user_master 情報
├── services/
│   ├── auth.js          ... Firebase Auth ラッパー
│   ├── api.js           ... Worker への fetch 呼び出し集約
│   └── maps.js          ... Google Maps API ロード
├── views/
│   ├── LoginView.vue
│   ├── MainMenuView.vue
│   ├── AssignmentListView.vue  ... マイページ（カード一覧）
│   └── ChildMapView.vue        ... 区域地図
└── components/
    └── VisitModal.vue          ... 訪問記録入力モーダル
```

## 移植元との対応

| 旧 (GAS HTML) | 新 (Vue View) |
|---|---|
| `Login.html`         | `LoginView.vue` |
| `Menu.html`          | `MainMenuView.vue` |
| `AssignmentList.html`| `AssignmentListView.vue`（マイページ） |
| `ChildMap.html`      | `ChildMapView.vue` |

その他の旧画面（CardList / EditChildList / Settings 等）は順次移植予定。
