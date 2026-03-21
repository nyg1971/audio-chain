const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { execFile } = require("child_process");
const fs = require("fs");
const { instance: blockchain } = require("./blockchain");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// uploads/ ディレクトリが存在しない場合は自動生成
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// アップロード先設定
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "audio/mpeg", "audio/mp3",      // MP3
      "audio/wav",  "audio/x-wav",    // WAV
      "audio/ogg",                    // OGG
      "audio/flac", "audio/x-flac",   // FLAC
    ];
    if (allowed.includes(file.mimetype) && file.originalname.match(/\.(mp3|wav|ogg|flac)$/i)) {
      cb(null, true);
    } else {
      const err = new Error("音声ファイル（mp3, wav, ogg, flac）のみアップロード可能です");
      err.code = "INVALID_FILE_TYPE";
      cb(err);
    }
  },
});

// ファイル存在チェックミドルウェア
const requireFile = (req, res, next) => {
  if (!req.file) {
    const err = new Error("音声ファイルをアップロードしてください");
    err.code = "NO_FILE";
    return next(err);
  }
  next();
};

// Python スクリプトのパス
const PYTHON_SCRIPT = path.join(__dirname, "../python/analyze.py");

// Python を呼び出して解析
function runPythonAnalysis(filePath) {
  return new Promise((resolve, reject) => {
    execFile("python3", [PYTHON_SCRIPT, filePath], { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        // Python の例外ハンドラが stdout に {"error": "..."} を書いている場合はそちらを優先
        try {
          const parsed = JSON.parse(stdout);
          reject(new Error(parsed.error || stderr || err.message));
        } catch {
          reject(new Error(stderr || err.message));
        }
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Pythonの出力をパースできませんでした: " + stdout));
      }
    });
  });
}

// POST /api/analyze — 音声ファイルをアップロードして解析
app.post("/api/analyze", upload.single("audio"), requireFile, async (req, res) => {
  const uploadedPath = req.file.path;

  try {
    const analysisResult = await runPythonAnalysis(uploadedPath);

    // ブロックチェーンに記録
    const blockData = {
      filename: req.file.originalname,
      filesize: req.file.size,
      audioHash: analysisResult.hash,
      duration: analysisResult.duration,
      features: analysisResult.features,
    };
    const newBlock = blockchain.addBlock(blockData);

    res.json({
      analysis: analysisResult,
      block: newBlock,
      chainValid: blockchain.isValid(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    // アップロードファイルを削除
    fs.unlink(uploadedPath, () => {});
  }
});

// アップロード系エラーを一元管理
app.use((err, req, res, next) => {
  // ファイルが残っていれば削除（LIMIT_FILE_SIZE 時のみ req.file が存在する）
  /* istanbul ignore next */
  if (req.file) {
    fs.unlink(req.file.path, () => {});
  }
  if (
    err.code === "LIMIT_FILE_SIZE" ||
    err.code === "INVALID_FILE_TYPE" ||
    err.code === "NO_FILE"
  ) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// GET /api/blockchain — チェーン全体を取得
app.get("/api/blockchain", (req, res) => {
  res.json({
    chain: blockchain.getChain(),
    length: blockchain.getChain().length,
    isValid: blockchain.isValid(),
  });
});

// テスト時は listen しない（supertest が内部で管理するため）
/* istanbul ignore next */
if (require.main === module) {
  /* istanbul ignore next */
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
