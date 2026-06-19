# TaskFlow - タスク管理アプリ

タスク管理 + ToDo + スケジュール管理の統合Webアプリです。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS v4
- **データベース**: Neon (Postgres) + Drizzle ORM
- **ファイルストレージ**: Vercel Blob
- **デプロイ**: Vercel

## セットアップ手順

### 1. 環境変数の設定

`.env.local` を編集してください:

```env
DATABASE_URL=postgresql://...  # Neonコンソールから取得
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...  # Vercelダッシュボードから取得
```

### 2. データベースのセットアップ

```bash
# スキーマをDBに反映
npm run db:push
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## デプロイ (Vercel)

1. [Vercel](https://vercel.com) にリポジトリをインポート
2. 環境変数を設定 (`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`)
3. デプロイ

## 主な機能

- **3ペイン構成**: 左(ナビゲーション) / 中央(タスク一覧) / 右(詳細パネル)
- **スマートフィルタ**: 今日・今週・今月のタスクを自動抽出
- **カテゴリ/プロジェクト管理**: 階層構造、進捗率表示
- **タスク/ToDo管理**: 優先度・期限・サブタスク・タグ対応
- **ファイル添付**: 画像・PDF・Excelをアップロード (Vercel Blob)
- **進捗自動計算**: サブタスクの完了率から自動算出
