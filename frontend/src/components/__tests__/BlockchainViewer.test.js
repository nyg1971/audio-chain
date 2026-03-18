/**
 * BlockchainViewer.vue のコンポーネントテスト
 * 実行: npm test (frontend/)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import BlockchainViewer from "../BlockchainViewer.vue";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const GENESIS = {
  index: 0,
  timestamp: "2026-03-18T09:00:00.000Z",
  data: { message: "Genesis Block" },
  previousHash: "0",
  hash: "0".repeat(64),
};

const BLOCK1 = {
  index: 1,
  timestamp: "2026-03-18T10:00:00.000Z",
  data: { filename: "sample.wav", duration: 3.0, audioHash: "a".repeat(64) },
  previousHash: "0".repeat(64),
  hash: "b".repeat(64),
};

function mockValidChain(chain = [GENESIS]) {
  mockFetch.mockResolvedValue({
    json: async () => ({ chain, length: chain.length, isValid: true }),
  });
}

describe("BlockchainViewer", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 初期レンダリング ────────────────────────────────────

  it("セクションタイトル「ブロックチェーン」が表示されること", async () => {
    mockValidChain();
    const wrapper = mount(BlockchainViewer);
    await flushPromises();
    expect(wrapper.text()).toContain("ブロックチェーン");
  });

  it("「↻ 更新」ボタンが存在すること", async () => {
    mockValidChain();
    const wrapper = mount(BlockchainViewer);
    await flushPromises();
    expect(wrapper.find("button").text()).toContain("更新");
  });

  // ── チェーンデータの表示 ────────────────────────────────

  it("Genesisブロックが表示されること", async () => {
    mockValidChain([GENESIS]);
    const wrapper = mount(BlockchainViewer);
    await flushPromises();
    expect(wrapper.text()).toContain("#0");
  });

  it("複数ブロックが表示されること", async () => {
    mockValidChain([GENESIS, BLOCK1]);
    const wrapper = mount(BlockchainViewer);
    await flushPromises();
    expect(wrapper.text()).toContain("#0");
    expect(wrapper.text()).toContain("#1");
  });

  it("ブロックのtimestampが表示されること", async () => {
    mockValidChain([GENESIS]);
    const wrapper = mount(BlockchainViewer);
    await flushPromises();
    expect(wrapper.text()).toContain("2026-03-18");
  });

  it("ブロック1のfilenameが表示されること", async () => {
    mockValidChain([GENESIS, BLOCK1]);
    const wrapper = mount(BlockchainViewer);
    await flushPromises();
    expect(wrapper.text()).toContain("sample.wav");
  });

  // ── バリデーションバッジ ────────────────────────────────

  it("チェーンが有効の時 VALID バッジが表示されること", async () => {
    mockValidChain();
    const wrapper = mount(BlockchainViewer);
    await flushPromises();
    expect(wrapper.text()).toContain("VALID");
  });

  it("チェーンが無効の時 INVALID バッジが表示されること", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ chain: [GENESIS], length: 1, isValid: false }),
    });
    const wrapper = mount(BlockchainViewer);
    await flushPromises();
    expect(wrapper.text()).toContain("INVALID");
  });

  // ── APIリクエスト ───────────────────────────────────────

  it("マウント時に /api/blockchain にGETリクエストを送ること", async () => {
    mockValidChain();
    mount(BlockchainViewer);
    await flushPromises();
    expect(mockFetch).toHaveBeenCalledWith("/api/blockchain");
  });

  it("「更新」ボタンクリックで再fetchすること", async () => {
    mockValidChain([GENESIS]);
    const wrapper = mount(BlockchainViewer);
    await flushPromises();

    mockFetch.mockResolvedValue({
      json: async () => ({ chain: [GENESIS, BLOCK1], length: 2, isValid: true }),
    });

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("#1");
  });

  // ── エラーハンドリング ──────────────────────────────────

  it("fetchが失敗してもクラッシュしないこと", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"));
    expect(() => mount(BlockchainViewer)).not.toThrow();
    await flushPromises();
    // エラー時は空チェーン（Genesisブロックのみ想定しない）
  });
});
