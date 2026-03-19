/**
 * AudioUploader.vue のコンポーネントテスト
 * 実行: npm test (frontend/)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import AudioUploader from "../AudioUploader.vue";

// fetch をモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AudioUploader", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── レンダリング ────────────────────────────────────────

  it("初期状態でドロップゾーンが表示されること", () => {
    const wrapper = mount(AudioUploader);
    expect(wrapper.find(".drop-zone").exists()).toBe(true);
  });

  it("初期状態でファイルが未選択の場合ボタンが無効であること", () => {
    const wrapper = mount(AudioUploader);
    const btn = wrapper.find("button");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("「解析 & ブロックチェーンに記録」ボタンが存在すること", () => {
    const wrapper = mount(AudioUploader);
    expect(wrapper.find("button").text()).toContain("解析");
  });

  // ── ファイル選択 ────────────────────────────────────────

  it("ファイル選択後にボタンが有効になること", async () => {
    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");

    Object.defineProperty(input.element, "files", {
      value: [file],
      configurable: true,
    });
    await input.trigger("change");

    const btn = wrapper.find("button");
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  it("ファイル選択後にファイル名が表示されること", async () => {
    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "sample.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");

    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    expect(wrapper.text()).toContain("sample.wav");
  });

  // ── API通信 ─────────────────────────────────────────────

  it("解析成功時に analyzed イベントを emit すること", async () => {
    const mockAnalysis = {
      hash: "a".repeat(64),
      duration: 3.0,
      waveform: [],
      features: { zero_crossing_rate: 0.05, rms_energy: 0.03, spectral_centroid: 2000, tempo_bpm: 120 },
    };
    const mockBlock = { index: 1, timestamp: "2026-03-18T10:00:00.000Z", hash: "b".repeat(64), previousHash: "0" };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysis: mockAnalysis, block: mockBlock, chainValid: true }),
    });

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await vi.waitFor(() => wrapper.emitted("analyzed"));

    const emitted = wrapper.emitted("analyzed");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toHaveProperty("analysis");
    expect(emitted[0][0]).toHaveProperty("block");
  });

  it("解析中に analyzing-banner が表示されること", async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".analyzing-banner").exists()).toBe(true);
  });

  it("解析完了後に analyzing-banner が非表示になること", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysis: { hash: "a".repeat(64), waveform: [], features: {} }, block: {}, chainValid: true }),
    });

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(wrapper.find(".analyzing-banner").exists()).toBe(false);
  });

  it("解析中にボタンが無効になること", async () => {
    // fetchが解決されない状態をシミュレート
    mockFetch.mockReturnValue(new Promise(() => {}));

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
    expect(wrapper.find("button").text()).toContain("解析中");
  });

  it("APIエラー時にエラーメッセージが表示されること", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Python解析エラー" }),
    });

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(wrapper.find(".error-msg").exists()).toBe(true);
    expect(wrapper.find(".error-msg").text()).toContain("Python解析エラー");
  });

  it("ネットワークエラー時にエラーメッセージが表示されること", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network Error"));

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(wrapper.find(".error-msg").exists()).toBe(true);
    expect(wrapper.find(".error-msg").text()).toContain("Network Error");
  });

  // ── analyzing イベント ──────────────────────────────────

  it("解析開始時に analyzing(true) をemitすること", async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // 解決しない

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();

    const emitted = wrapper.emitted("analyzing");
    expect(emitted).toBeTruthy();
    expect(emitted[0]).toEqual([true]);
  });

  it("解析完了後に analyzing(false) をemitすること", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysis: { hash: "a".repeat(64), waveform: [], features: {} }, block: {}, chainValid: true }),
    });

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await flushPromises();

    const emitted = wrapper.emitted("analyzing");
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1]).toEqual([false]);
  });

  it("解析エラー時にも analyzing(false) をemitすること", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network Error"));

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await flushPromises();

    const emitted = wrapper.emitted("analyzing");
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1]).toEqual([false]);
  });

  it("/api/analyze に POST することを確認すること", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysis: { hash: "a".repeat(64), waveform: [], features: {} }, block: {}, chainValid: true }),
    });

    const wrapper = mount(AudioUploader);
    const file = new File(["audio"], "test.wav", { type: "audio/wav" });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    await wrapper.find("button").trigger("click");
    await vi.waitFor(() => mockFetch.mock.calls.length > 0);

    expect(mockFetch).toHaveBeenCalledWith("/api/analyze", expect.objectContaining({ method: "POST" }));
  });
});
