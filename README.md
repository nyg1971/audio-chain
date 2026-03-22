# Audio Chain (prototype)

「この音声コンテンツは本物か」という問いに対して、「技術的に証明するには何が必要か」を出発点に作ったプロトタイプです。

Python・Node.js・Vue・ブロックチェーン概念を組み合わせて、音声コンテンツの真正性を検証するフローを実装しました。

## きっかけ

音声コンテンツの真正性担保に関連する技術を調べてみると、様々なアプローチが存在することがわかりました。
調査した範囲では、それぞれに固有の限界があり、単独では真正性を完全に担保できていないのが現状のようです。

## 調べてわかったこと（既存技術の限界）

| 既存技術 | 真正性担保における限界 |
|---------|-------------------|
| NFT | コンテンツ本体をハッシュ化しないため、リンク先の差し替えを検知できない |
| SHA-256ハッシュ単体 | バイト完全一致のみ。再エンコード・軽微な改変で別物と判定される |
| 音声特徴量単体 | 類似度判定はできるが、記録の改ざん耐性がない |

## 考えて実装したこと

各技術の限界を踏まえ、以下の3層を組み合わせれば互いの弱点を補えるのではと考え、実装してみました。

| 層 | 技術 | 役割 |
|----|------|------|
| ① バイト同一性 | SHA-256ハッシュ | ファイルそのものが改ざんされていないことを証明 |
| ② コンテンツ同一性 | 音声特徴量（MFCC・テンポ等） | 再エンコード・軽微な改変を超えた同一コンテンツの照合（知覚的ハッシュの概念） |
| ③ 記録の改ざん耐性 | ブロックチェーン | ①②の記録自体が書き換えられていないことを保証 |

本プロトタイプでは、音声解析（Python）・ローカルでのブロックチェーン・Webアプリ（Node.js / Vue）を使って、上記の3層の登録・記録するフローを検証したものです。

この登録・記録された各種データを基盤とし、「登録済み音源との照合・検証フロー」を開発し組み合わせることで、音声コンテンツの真正性を担保する技術となると考えています。


---

## デモ

音声ファイルアップロード -> 解析 & ブロックチェーンに追加 -> 解析結果 & ブロック情報表示 ->ブロックチェーン一覧更新

<video src="https://github.com/user-attachments/assets/86f86b04-1bda-4809-889c-06adcb172a65" width="80%" controls></video>

---

## 技術的なポイント

- Node.jsからPythonを呼び出し、解析処理をプロセス分離（スケーラビリティを考慮した構成）
- フロントエンドでの可視化（波形・特徴量・チェーン構造）

### 3層の有用性と限界

| 層 | 解決できること | 解決できないこと |
|----|--------------|----------------|
| SHA-256ハッシュ | バイト単位の完全一致を証明 | 再エンコード・形式変換後の同一性 |
| 音声特徴量（MFCC・テンポ等） | 軽微な再エンコード後も同一コンテンツと照合できる | 大幅な音質劣化・ピッチ変更等 |
| ブロックチェーン | 上記2つの記録の改ざんを検知 | 登録前のコンテンツの真正性 |

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
| Python | 28 | pytest |
| Node.js | 62 | Jest + supertest |
| Vue.js | 48 | Vitest + @vue/test-utils |
| **合計** | **138** | |

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
| Phase 1 | 永続化（SQLite等）・CORS制限・セキュリティ改善 |
| Phase 2 | **照合・検証フローの実装**（中央APIベース）— 登録済み音源との照合API・特徴量類似度による同一コンテンツ判定 |
| Phase 3 | **P2Pノード参加型への移行**（ローカルファースト）— 音源を登録・利用するクライアントが自動的にP2Pノードとして参加し、チェーンを分散保持。ローカルに同期済みのチェーンデータを使って照合・真正性検証をオフラインで完結させる構成（Rust + libp2p を想定） |

---

## 注意事項

- ブロックチェーンはインメモリのため、**サーバー再起動でリセット**されます
- ローカル動作専用です（本番環境・クラウド展開は非対応）
