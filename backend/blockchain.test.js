/**
 * blockchain.js のユニットテスト
 * 実行: npm test (backend/)
 */

const { Block, Blockchain } = require("./blockchain");

// ─── Block クラス ────────────────────────────────────────────

describe("Block", () => {
  let block;

  beforeEach(() => {
    block = new Block(1, { filename: "test.wav" }, "prevhash123");
  });

  test("正しいプロパティを持つこと", () => {
    expect(block.index).toBe(1);
    expect(block.data).toEqual({ filename: "test.wav" });
    expect(block.previousHash).toBe("prevhash123");
    expect(typeof block.timestamp).toBe("string");
    expect(typeof block.hash).toBe("string");
  });

  test("hashが64文字のhex文字列であること", () => {
    expect(block.hash).toHaveLength(64);
    expect(block.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("timestampがISO8601形式であること", () => {
    expect(block.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test("calculateHashが冪等であること（同じ入力なら同じhash）", () => {
    expect(block.calculateHash()).toBe(block.hash);
  });

  test("dataが変更されるとhashが変わること（改ざん検知）", () => {
    const originalHash = block.hash;
    block.data = { filename: "tampered.wav" };
    expect(block.calculateHash()).not.toBe(originalHash);
  });

  test("timestampが変更されるとhashが変わること", () => {
    const originalHash = block.hash;
    block.timestamp = new Date(0).toISOString();
    expect(block.calculateHash()).not.toBe(originalHash);
  });

  test("異なるindexのBlockは異なるhashを持つこと", () => {
    const blockA = new Block(1, { filename: "a.wav" }, "prev");
    const blockB = new Block(2, { filename: "a.wav" }, "prev");
    expect(blockA.hash).not.toBe(blockB.hash);
  });

  test("異なるpreviousHashを持つBlockは異なるhashになること", () => {
    const blockA = new Block(1, { filename: "a.wav" }, "hash_aaa");
    const blockB = new Block(1, { filename: "a.wav" }, "hash_bbb");
    expect(blockA.hash).not.toBe(blockB.hash);
  });
});

// ─── Blockchain クラス ───────────────────────────────────────

describe("Blockchain", () => {
  let chain;

  beforeEach(() => {
    chain = new Blockchain();
  });

  // Genesisブロック
  describe("Genesis Block", () => {
    test("初期化時にチェーンの長さが1であること", () => {
      expect(chain.getChain()).toHaveLength(1);
    });

    test("Genesisブロックのindexが0であること", () => {
      expect(chain.getChain()[0].index).toBe(0);
    });

    test("GenesisブロックのpreviousHashが\"0\"であること", () => {
      expect(chain.getChain()[0].previousHash).toBe("0");
    });

    test("Genesisブロックのdataにmessageが含まれること", () => {
      expect(chain.getChain()[0].data).toHaveProperty("message");
    });
  });

  // addBlock
  describe("addBlock", () => {
    test("ブロックを追加するとチェーン長が増えること", () => {
      chain.addBlock({ filename: "test.wav" });
      expect(chain.getChain()).toHaveLength(2);
    });

    test("追加したブロックのindexが正しいこと", () => {
      const block = chain.addBlock({ filename: "test.wav" });
      expect(block.index).toBe(1);
    });

    test("追加したブロックのpreviousHashがGenesisのhashと一致すること", () => {
      const genesis = chain.getLatestBlock();
      const block = chain.addBlock({ filename: "test.wav" });
      expect(block.previousHash).toBe(genesis.hash);
    });

    test("連続追加時に各ブロック間のpreviousHashリンクが全て正しいこと", () => {
      chain.addBlock({ filename: "a.wav" });
      chain.addBlock({ filename: "b.wav" });
      chain.addBlock({ filename: "c.wav" });
      const blocks = chain.getChain();
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i].previousHash).toBe(blocks[i - 1].hash);
      }
    });

    test("複数ブロック追加後のindexが連番になること", () => {
      chain.addBlock({ filename: "a.wav" });
      chain.addBlock({ filename: "b.wav" });
      chain.addBlock({ filename: "c.wav" });
      const blocks = chain.getChain();
      blocks.forEach((b, i) => expect(b.index).toBe(i));
    });

    test("追加したブロックが返却されること", () => {
      const result = chain.addBlock({ filename: "test.wav" });
      expect(result).toBeInstanceOf(Block);
      expect(result.data).toEqual({ filename: "test.wav" });
    });
  });

  // getLatestBlock
  describe("getLatestBlock", () => {
    test("初期状態ではGenesisブロックを返すこと", () => {
      expect(chain.getLatestBlock().index).toBe(0);
    });

    test("ブロック追加後は最後のブロックを返すこと", () => {
      chain.addBlock({ filename: "a.wav" });
      chain.addBlock({ filename: "b.wav" });
      expect(chain.getLatestBlock().index).toBe(2);
    });

    test("返却値がBlockインスタンスであること", () => {
      expect(chain.getLatestBlock()).toBeInstanceOf(Block);
    });
  });

  // isValid
  describe("isValid", () => {
    test("新規チェーンは有効であること", () => {
      expect(chain.isValid()).toBe(true);
    });

    test("ブロック追加後も有効であること", () => {
      chain.addBlock({ filename: "a.wav" });
      chain.addBlock({ filename: "b.wav" });
      expect(chain.isValid()).toBe(true);
    });

    test("ブロックのdataを改ざんすると無効になること", () => {
      chain.addBlock({ filename: "a.wav" });
      chain.getChain()[1].data = { filename: "tampered.wav" };
      expect(chain.isValid()).toBe(false);
    });

    test("ブロックのhashを改ざんすると無効になること", () => {
      chain.addBlock({ filename: "a.wav" });
      chain.getChain()[1].hash = "0".repeat(64);
      expect(chain.isValid()).toBe(false);
    });

    test("ブロックのpreviousHashを改ざんすると無効になること", () => {
      chain.addBlock({ filename: "a.wav" });
      chain.getChain()[1].previousHash = "0".repeat(64);
      expect(chain.isValid()).toBe(false);
    });

    test("Genesisブロックのdataを改ざんすると無効になること", () => {
      chain.getChain()[0].data = { message: "tampered" };
      expect(chain.isValid()).toBe(false);
    });

    test("内部的に整合したブロックでもpreviousHashリンクが切れていると無効になること", () => {
      chain.addBlock({ filename: "a.wav" });
      // hash == calculateHash() を満たすが previousHash が前ブロックと繋がっていない偽ブロックを作成
      const forgedBlock = new Block(1, chain.getChain()[1].data, "fake_previous_hash");
      chain.getChain()[1] = forgedBlock;
      // L:49（hash不一致）はパスするが L:50（previousHashリンク不一致）で検知される
      expect(chain.isValid()).toBe(false);
    });
  });

  // getChain
  describe("getChain", () => {
    test("配列を返すこと", () => {
      expect(Array.isArray(chain.getChain())).toBe(true);
    });

    test("追加したブロック数だけ含まれること", () => {
      chain.addBlock({});
      chain.addBlock({});
      expect(chain.getChain()).toHaveLength(3); // genesis + 2
    });

    test("全要素がBlockインスタンスであること", () => {
      chain.addBlock({ filename: "a.wav" });
      chain.getChain().forEach((b) => expect(b).toBeInstanceOf(Block));
    });

    test("チェーンがindex昇順で並んでいること", () => {
      chain.addBlock({ filename: "a.wav" });
      chain.addBlock({ filename: "b.wav" });
      const blocks = chain.getChain();
      blocks.forEach((b, i) => expect(b.index).toBe(i));
    });
  });
});
