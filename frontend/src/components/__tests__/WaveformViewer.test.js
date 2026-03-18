/**
 * WaveformViewer.vue のコンポーネントテスト
 * 実行: npm test (frontend/)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import WaveformViewer from "../WaveformViewer.vue";

// jsdom はCanvas 2D APIをサポートしないためモックする
const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  strokeStyle: null,
  lineWidth: null,
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockCtx);
  Object.values(mockCtx).forEach((fn) => typeof fn === "function" && fn.mockClear?.());
});

const SAMPLE_WAVEFORM = Array.from({ length: 100 }, (_, i) =>
  Math.sin((i / 100) * Math.PI * 2) * 0.8
);

describe("WaveformViewer", () => {
  it("canvas要素が描画されること", () => {
    const wrapper = mount(WaveformViewer, {
      props: { waveform: SAMPLE_WAVEFORM, duration: 3.0 },
    });
    expect(wrapper.find("canvas").exists()).toBe(true);
  });

  it("durationが表示されること", () => {
    const wrapper = mount(WaveformViewer, {
      props: { waveform: SAMPLE_WAVEFORM, duration: 3.456 },
    });
    expect(wrapper.text()).toContain("3.46");
  });

  it("マウント時にCanvas描画が呼ばれること", () => {
    mount(WaveformViewer, {
      props: { waveform: SAMPLE_WAVEFORM, duration: 1.0 },
    });
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it("wavformが空でも描画エラーが出ないこと", () => {
    expect(() => {
      mount(WaveformViewer, { props: { waveform: [], duration: 0 } });
    }).not.toThrow();
  });

  it("waveformが更新されると再描画されること", async () => {
    const wrapper = mount(WaveformViewer, {
      props: { waveform: SAMPLE_WAVEFORM, duration: 1.0 },
    });
    const callsBefore = mockCtx.stroke.mock.calls.length;

    await wrapper.setProps({ waveform: SAMPLE_WAVEFORM.map((v) => v * 0.5), duration: 2.0 });

    expect(mockCtx.stroke.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("グラデーションが作成されること", () => {
    mount(WaveformViewer, {
      props: { waveform: SAMPLE_WAVEFORM, duration: 1.0 },
    });
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
  });

  it("waveformの各点でlineTo/moveToが呼ばれること", () => {
    const waveform = [0.1, 0.2, 0.3];
    mount(WaveformViewer, { props: { waveform, duration: 0.1 } });
    // 波形: moveTo(1) + lineTo(2) = 3
    // センターライン: moveTo(1) + lineTo(1) = 2
    // 合計 = waveform.length + 2
    const totalCalls = mockCtx.moveTo.mock.calls.length + mockCtx.lineTo.mock.calls.length;
    expect(totalCalls).toBe(waveform.length + 2);
  });
});
