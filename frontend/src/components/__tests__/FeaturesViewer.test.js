/**
 * FeaturesViewer.vue のコンポーネントテスト
 * 実行: npm test (frontend/)
 */

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FeaturesViewer from "../FeaturesViewer.vue";

const MOCK_FEATURES = {
  zero_crossing_rate: 0.123456,
  rms_energy: 0.234567,
  spectral_centroid: 3456.78,
  tempo_bpm: 120.0,
};

const MOCK_HASH = "a".repeat(64);

const MOCK_BLOCK = {
  index: 1,
  timestamp: "2026-03-18T10:00:00.000Z",
  hash: "b".repeat(64),
  previousHash: "0".repeat(64),
};

describe("FeaturesViewer", () => {
  // ── 特徴量の表示 ────────────────────────────────────────

  it("特徴量ラベルが表示されること", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: MOCK_BLOCK },
    });
    expect(wrapper.text()).toContain("Zero Crossing Rate");
    expect(wrapper.text()).toContain("RMS Energy");
    expect(wrapper.text()).toContain("Spectral Centroid");
    expect(wrapper.text()).toContain("Tempo");
  });

  it("特徴量の値が表示されること", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: MOCK_BLOCK },
    });
    expect(wrapper.text()).toContain("0.123456");
    expect(wrapper.text()).toContain("0.234567");
    expect(wrapper.text()).toContain("3456.78");
    expect(wrapper.text()).toContain("120");
  });

  it("特徴量の説明（日本語）が表示されること", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: MOCK_BLOCK },
    });
    expect(wrapper.text()).toContain("音の粗さ・明瞭さ");
    expect(wrapper.text()).toContain("平均音量");
    expect(wrapper.text()).toContain("音の明るさ");
    expect(wrapper.text()).toContain("テンポ");
  });

  // ── ブロック情報の表示 ──────────────────────────────────

  it("ブロックのindexが表示されること", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: MOCK_BLOCK },
    });
    expect(wrapper.text()).toContain("#1");
  });

  it("ブロックのtimestampが表示されること", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: MOCK_BLOCK },
    });
    expect(wrapper.text()).toContain("2026-03-18T10:00:00.000Z");
  });

  it("Audio Hash（ファイルハッシュ）が表示されること", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: MOCK_BLOCK },
    });
    expect(wrapper.text()).toContain(MOCK_HASH);
  });

  it("Block Hash が表示されること", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: MOCK_BLOCK },
    });
    expect(wrapper.text()).toContain(MOCK_BLOCK.hash);
  });

  it("Prev Hash が表示されること", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: MOCK_BLOCK },
    });
    expect(wrapper.text()).toContain(MOCK_BLOCK.previousHash);
  });

  // ── block が null の場合 ────────────────────────────────

  it("block が null の時にブロック情報が表示されないこと", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: null },
    });
    expect(wrapper.find(".block-info").exists()).toBe(false);
  });

  it("block が null でも特徴量は表示されること", () => {
    const wrapper = mount(FeaturesViewer, {
      props: { features: MOCK_FEATURES, hash: MOCK_HASH, block: null },
    });
    expect(wrapper.text()).toContain("Zero Crossing Rate");
  });
});
