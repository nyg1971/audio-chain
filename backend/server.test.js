/**
 * server.js の統合テスト
 * 実行: npm test (backend/)
 *
 * Pythonの呼び出し部分はモックし、APIレイヤーのみを検証する
 */

const request = require("supertest");
const path = require("path");
const fs = require("fs");

// ── Python呼び出しをモック ──────────────────────────────────
// server.js 内の child_process.execFile をモックして
// Pythonなしでサーバーテストを実行できるようにする
jest.mock("child_process", () => ({
  execFile: jest.fn((cmd, args, opts, callback) => {
    const mockResult = {
      hash: "a".repeat(64),
      duration: 3.0,
      sample_rate: 22050,
      n_samples: 66150,
      waveform: Array(100).fill(0.1),
      features: {
        mfcc_mean: Array(13).fill(0.0),
        zero_crossing_rate: 0.05,
        rms_energy: 0.03,
        spectral_centroid: 2000.0,
        tempo_bpm: 120.0,
      },
    };
    callback(null, JSON.stringify(mockResult), "");
  }),
}));

// ── app を分離してテスト用にエクスポート ────────────────────
// server.js を直接 require すると app.listen が走るため、
// テスト用に app だけを取り出せるよう server.js を調整するか
// supertest が listen を内部で管理する形を使う
// ここでは server.js を直接 require して supertest に渡す

let app;
beforeAll(() => {
  // モック設定後にserver.jsをロード
  app = require("./server");
});

afterAll((done) => {
  // サーバーが起動していれば閉じる
  if (app && app.close) app.close(done);
  else done();
});

// ── GET /api/blockchain ──────────────────────────────────────

describe("GET /api/blockchain", () => {
  test("200を返すこと", async () => {
    const res = await request(app).get("/api/blockchain");
    expect(res.status).toBe(200);
  });

  test("chain配列を含むこと", async () => {
    const res = await request(app).get("/api/blockchain");
    expect(Array.isArray(res.body.chain)).toBe(true);
  });

  test("length フィールドを含むこと", async () => {
    const res = await request(app).get("/api/blockchain");
    expect(typeof res.body.length).toBe("number");
  });

  test("lengthがchain配列の実際の長さと一致すること", async () => {
    const res = await request(app).get("/api/blockchain");
    expect(res.body.length).toBe(res.body.chain.length);
  });

  test("isValidフィールドを含むこと", async () => {
    const res = await request(app).get("/api/blockchain");
    expect(typeof res.body.isValid).toBe("boolean");
    expect(res.body.isValid).toBe(true);
  });

  test("Genesisブロックが先頭に存在すること", async () => {
    const res = await request(app).get("/api/blockchain");
    const genesis = res.body.chain[0];
    expect(genesis.index).toBe(0);
    expect(genesis.previousHash).toBe("0");
  });
});

// ── POST /api/analyze ────────────────────────────────────────

describe("POST /api/analyze", () => {
  // テスト用の最小限WAVファイルをバッファとして生成
  function makeMinimalWavBuffer() {
    const dataSize = 44; // 最小サイズ
    const buf = Buffer.alloc(44 + dataSize);
    buf.write("RIFF", 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write("WAVE", 8);
    buf.write("fmt ", 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(22050, 24);
    buf.writeUInt32LE(44100, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write("data", 36);
    buf.writeUInt32LE(dataSize, 40);
    return buf;
  }

  test("ファイルなしで400を返すこと", async () => {
    const res = await request(app).post("/api/analyze");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("wavファイルで200を返すこと", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.status).toBe(200);
  });

  test("analysisフィールドを含むこと", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body).toHaveProperty("analysis");
  });

  test("analysis.hashが含まれること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body.analysis).toHaveProperty("hash");
  });

  test("analysis.durationが正の値であること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body.analysis.duration).toBeGreaterThan(0);
  });

  test("analysis.waveformが配列であること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(Array.isArray(res.body.analysis.waveform)).toBe(true);
  });

  test("analysis.featuresの全キーが存在すること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    const features = res.body.analysis.features;
    for (const key of ["mfcc_mean", "zero_crossing_rate", "rms_energy", "spectral_centroid", "tempo_bpm"]) {
      expect(features).toHaveProperty(key);
    }
  });

  test("blockフィールドを含むこと", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body).toHaveProperty("block");
  });

  test("block.data.filenameが元のファイル名と一致すること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body.block.data.filename).toBe("test.wav");
  });

  test("block.data.audioHashがanalysis.hashと一致すること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body.block.data.audioHash).toBe(res.body.analysis.hash);
  });

  test("block.data.filesizeが数値であること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(typeof res.body.block.data.filesize).toBe("number");
  });

  test("block.data.durationがanalysis.durationと一致すること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body.block.data.duration).toBe(res.body.analysis.duration);
  });

  test("block.data.featuresが存在すること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body.block.data).toHaveProperty("features");
  });

  test("blockのindexが1以上であること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body.block.index).toBeGreaterThanOrEqual(1);
  });

  test("chainValidフィールドがtrueであること", async () => {
    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });
    expect(res.body.chainValid).toBe(true);
  });

  test("非対応ファイル形式で400を返すこと", async () => {
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", Buffer.from("not audio"), {
        filename: "file.txt",
        contentType: "text/plain",
      });
    expect(res.status).toBe(400);
  });

  test("拡張子は .mp3 だが mimetype が不正なファイルで400を返すこと", async () => {
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", Buffer.from("not audio"), {
        filename: "malicious.mp3",
        contentType: "text/plain",
      });
    expect(res.status).toBe(400);
  });

  test("Pythonに渡すファイルパスに元の拡張子が含まれること", async () => {
    const { execFile } = require("child_process");
    const wavBuf = makeMinimalWavBuffer();
    await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });

    // execFile("python3", [scriptPath, filePath], opts, cb) の filePath を検証
    const calledPath = execFile.mock.calls.at(-1)[1][1];
    expect(calledPath).toMatch(/\.wav$/i);
  });

  test("解析後にuploadsディレクトリにファイルが残らないこと", async () => {
    const uploadsDir = path.join(__dirname, "uploads");
    const before = fs.readdirSync(uploadsDir).length;

    const wavBuf = makeMinimalWavBuffer();
    await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });

    // 少し待ってから確認（fs.unlinkは非同期）
    await new Promise((r) => setTimeout(r, 100));
    const after = fs.readdirSync(uploadsDir).length;
    expect(after).toBe(before);
  });

  // ── Python エラー系 ──────────────────────────────────────────

  test("Pythonが正常終了したが stdout が不正なJSONの場合に500を返すこと", async () => {
    const { execFile } = require("child_process");
    execFile.mockImplementationOnce((cmd, args, opts, callback) => {
      callback(null, "not valid json", "");
    });

    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Pythonの出力をパースできませんでした");
  });

  test("Pythonがエラー終了し stdout に {error} がある場合、そのメッセージで500を返すこと", async () => {
    const { execFile } = require("child_process");
    const fakeError = new Error("process exited with code 1");
    fakeError.code = 1;
    // stderrには警告テキスト、stdoutにはPythonの例外ハンドラが書いたJSON
    execFile.mockImplementationOnce((cmd, args, opts, callback) => {
      callback(
        fakeError,
        JSON.stringify({ error: "音声ファイルを読み込めませんでした" }),
        "UserWarning: FNV hashing is not implemented in Numba."
      );
    });

    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("音声ファイルを読み込めませんでした");
  });

  test("Pythonがエラー終了し stdout が空の場合、stderr のメッセージで500を返すこと", async () => {
    const { execFile } = require("child_process");
    const fakeError = new Error("process exited with code 1");
    fakeError.code = 1;
    execFile.mockImplementationOnce((cmd, args, opts, callback) => {
      callback(fakeError, "", "ModuleNotFoundError: No module named 'librosa'");
    });

    const wavBuf = makeMinimalWavBuffer();
    const res = await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("ModuleNotFoundError");
  });

  // ── LIMIT_FILE_SIZE エラーハンドラ ──────────────────────────

  test("ファイルサイズ超過時に400を返しerrorフィールドを含むこと", (done) => {
    jest.isolateModules(() => {
      jest.mock("multer", () => {
        const m = () => ({
          single: () => (req, res, next) => {
            const err = new Error("File too large");
            err.code = "LIMIT_FILE_SIZE";
            next(err);
          },
        });
        m.diskStorage = () => ({});
        return m;
      });
      const limitApp = require("./server");
      request(limitApp)
        .post("/api/analyze")
        .attach("audio", Buffer.from("x"), { filename: "big.wav", contentType: "audio/wav" })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty("error");
        })
        .end(done);
    });
  });

  test("Pythonエラー時もuploadsディレクトリにファイルが残らないこと", async () => {
    const { execFile } = require("child_process");
    const fakeError = new Error("process exited with code 1");
    fakeError.code = 1;
    execFile.mockImplementationOnce((cmd, args, opts, callback) => {
      callback(fakeError, JSON.stringify({ error: "解析失敗" }), "");
    });

    const uploadsDir = path.join(__dirname, "uploads");
    const before = fs.readdirSync(uploadsDir).length;

    const wavBuf = makeMinimalWavBuffer();
    await request(app)
      .post("/api/analyze")
      .attach("audio", wavBuf, { filename: "test.wav", contentType: "audio/wav" });

    await new Promise((r) => setTimeout(r, 100));
    const after = fs.readdirSync(uploadsDir).length;
    expect(after).toBe(before);
  });
});
