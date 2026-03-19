# Audio Chain (prototype)

音声解析（Python）・Webアプリ（Node.js / Vue）・ブロックチェーン概念を統合した技術検証プロトタイプです。

音声コンテンツの著作権管理・改ざん検証ニーズを背景に、音声解析とブロックチェーンを組み合わせた技術検証を目的として構築しました。
音声ファイルをアップロードしてPythonで解析し、解析結果とSHA-256ハッシュを独自実装のブロックチェーン（インメモリ）に記録・検証・可視化するプロトタイプです。
ブロックチェーンの概念検証を目的としており、Ethereumテストネット接続を将来の拡張として想定しています。

---

## デモ

音声ファイルアップロード -> 解析 & ブロックチェーンに追加 -> 解析結果 & ブロック情報表示 ->ブロックチェーン一覧更新

<video src="https://github.com/user-attachments/assets/86f86b04-1bda-4809-889c-06adcb172a65" width="80%" controls></video>

---

## 技術的なポイント

- Node.jsからPythonを呼び出し、解析処理を分離
- 音声特徴量の抽出とハッシュ化を組み合わせたデータ検証
- インメモリブロックチェーンによる整合性確認
- フロントエンドでの可視化（波形・特徴量・チェーン構造）

---

## アーキテクチャ

```
[ ブラウザ (Vue 3 + Vite) :5173 ]
        ↕  POST /api/analyze
        ↕  GET  /api/blockchain
[ Node.js / Express :3001 ]
        ↕  execFile (stdout: JSON)
[ Python 3 / librosa ]

[ ローカルブロックチェーン (インメモリ) ]
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Vue 3 + Vite |
| バックエンド | Node.js + Express + multer |
| 解析エンジン | Python 3 + librosa |
| ブロックチェーン | ローカルシミュレーション（Node.js） |
| テスト（Python） | pytest |
| テスト（Node.js） | Jest + supertest |
| テスト（Vue.js） | Vitest + @vue/test-utils |

---

## ディレクトリ構成

```
audio-chain/
├── backend/
│   ├── server.js              # Expressサーバー（APIエンドポイント）
│   ├── blockchain.js          # ブロックチェーンのローカルシミュレーション
│   ├── blockchain.test.js
│   ├── server.test.js
│   ├── __testHelpers__/
│   │   └── blockchainFactory.js
│   └── uploads/               # 一時ファイル保存先（解析後即削除）
├── python/
│   ├── analyze.py             # 音声解析スクリプト
│   ├── requirements.txt
│   └── test_analyze.py
├── frontend/
│   ├── vite.config.js
│   ├── src/
│   │   ├── App.vue
│   │   ├── style.css
│   │   └── components/
│   │       ├── AudioUploader.vue
│   │       ├── WaveformViewer.vue
│   │       ├── FeaturesViewer.vue
│   │       ├── BlockchainViewer.vue
│   │       └── __tests__/
│   └── mockup/
│       └── mockup.html        # UIモックアップ（静的HTML）
└── .gitignore
```

---

## セットアップ

### 前提条件

- Node.js 18 以上
- Python 3.8 以上 + pip

### 1. Python依存ライブラリのインストール

```bash
pip install --prefer-binary -r python/requirements.txt
```

> `--prefer-binary` はコンパイル済みwheelを優先します。Python 3.9〜3.12+ で動作します。

### 2. Node.js依存ライブラリのインストール

```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## 起動

ターミナルを2つ開いて実行します。

**Terminal 1 — バックエンド（ポート3001）**

```bash
cd backend
npm run dev
```

**Terminal 2 — フロントエンド（ポート5173）**

```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

---

## 使い方

1. 音声ファイル（mp3 / wav / ogg / flac、最大50MB）をドロップまたは選択
2. **「解析 & ブロックチェーンに記録」** ボタンをクリック
3. 波形・特徴量・ブロック情報が表示される（再解析中は前回結果がグレーアウト）
4. 画面下部のブロックチェーン一覧でブロックヘッダーをクリックすると詳細を展開
5. **「↻ 更新」** でブロックチェーン一覧を最新化

### 解析される特徴量

| 特徴量 | 説明 |
|--------|------|
| MFCC（13次元） | 音声の周波数特性 |
| Zero Crossing Rate | 音の粗さ・明瞭さ |
| RMS Energy | 平均音量 |
| Spectral Centroid | 音の明るさ（Hz） |
| Tempo（BPM） | テンポ推定 |

---

## APIリファレンス

### `POST /api/analyze`

音声ファイルを解析してブロックチェーンに記録します。

- **Body:** `multipart/form-data`、フィールド名 `audio`
- **Response:**

```json
{
  "analysis": {
    "hash": "<SHA-256>",
    "duration": 12.345,
    "waveform": [...],
    "features": { "zero_crossing_rate": 0.045, ... }
  },
  "block": { "index": 1, "hash": "...", "previousHash": "...", ... },
  "chainValid": true
}
```

### `GET /api/blockchain`

チェーン全体を取得します。

```json
{
  "chain": [ { "index": 0, ... }, { "index": 1, ... } ],
  "length": 2,
  "isValid": true
}
```

---

## テスト

### Python

```bash
# pytest のインストール（初回のみ）
pip install pytest

pytest python/test_analyze.py -v
```

### Node.js

```bash
cd backend
npm test
```

### Vue.js

```bash
cd frontend
npm test
```

### テスト全体の概要

| レイヤー | テスト数 | フレームワーク |
|---------|---------|--------------|
| Python | 24 | pytest |
| Node.js | 42 | Jest + supertest |
| Vue.js | 48 | Vitest + @vue/test-utils |
| **合計** | **114** | |

### カバレッジ

各レイヤーにカバレッジ閾値を設定し、GitHub Actions で自動検証しています。

---

## 設計ドキュメント

要件定義書・基本設計書・詳細設計書・テスト設計書を別途整備しています。


---

## UIモックアップ

`/frontend/mockup/mockup.html` をブラウザで直接開くと、APIなしでUIの動作確認ができます。

---


## 今後の拡張想定

| フェーズ | 内容 |
|---------|------|
| Phase 1 | Ethereumテストネット（Sepolia）接続・スマートコントラクトによる記録 |
| Phase 2 | 解析エンジンのFastAPI化（マイクロサービス構成への移行） |
| Phase 3 | リアルタイム音声解析・マルチユーザー対応 |

---

## 注意事項

- ブロックチェーンはインメモリのため、**サーバー再起動でリセット**されます
- ローカル動作専用です（本番環境・クラウド展開は非対応）
