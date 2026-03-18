"""
analyze.py のユニットテスト
実行: pytest python/test_analyze.py -v
"""

import json
import os
import hashlib
import struct
import sys
import tempfile
import wave

import numpy as np
import pytest

# テスト対象モジュールをインポート
sys.path.insert(0, os.path.dirname(__file__))
from analyze import compute_hash, analyze


# ─── フィクスチャ ────────────────────────────────────────────

def make_wav(path: str, frequency: float = 440.0, duration: float = 1.0, sr: int = 22050):
    """テスト用のサイン波WAVファイルを生成する"""
    n_samples = int(sr * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    samples = (np.sin(2 * np.pi * frequency * t) * 32767).astype(np.int16)

    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16bit
        wf.setframerate(sr)
        wf.writeframes(samples.tobytes())


@pytest.fixture
def wav_file(tmp_path):
    """1秒間の440Hz正弦波WAVファイルのパスを返すフィクスチャ"""
    path = str(tmp_path / "test_440hz.wav")
    make_wav(path, frequency=440.0, duration=1.0)
    return path


@pytest.fixture
def long_wav_file(tmp_path):
    """3秒間のWAVファイル（波形ダウンサンプリング確認用）"""
    path = str(tmp_path / "test_long.wav")
    make_wav(path, frequency=220.0, duration=3.0)
    return path


# ─── compute_hash ────────────────────────────────────────────

class TestComputeHash:
    def test_returns_64char_hex(self, wav_file):
        h = compute_hash(wav_file)
        assert isinstance(h, str)
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)

    def test_same_file_same_hash(self, wav_file):
        h1 = compute_hash(wav_file)
        h2 = compute_hash(wav_file)
        assert h1 == h2

    def test_different_files_different_hash(self, tmp_path):
        p1 = str(tmp_path / "a.wav")
        p2 = str(tmp_path / "b.wav")
        make_wav(p1, frequency=440.0)
        make_wav(p2, frequency=880.0)
        assert compute_hash(p1) != compute_hash(p2)

    def test_matches_manual_sha256(self, wav_file):
        h = compute_hash(wav_file)
        with open(wav_file, "rb") as f:
            expected = hashlib.sha256(f.read()).hexdigest()
        assert h == expected

    def test_file_not_found_raises(self):
        with pytest.raises(FileNotFoundError):
            compute_hash("/nonexistent/path/file.wav")


# ─── analyze ─────────────────────────────────────────────────

class TestAnalyze:
    def test_returns_dict(self, wav_file):
        result = analyze(wav_file)
        assert isinstance(result, dict)

    def test_required_keys(self, wav_file):
        result = analyze(wav_file)
        assert "hash" in result
        assert "duration" in result
        assert "sample_rate" in result
        assert "n_samples" in result
        assert "waveform" in result
        assert "features" in result

    def test_feature_keys(self, wav_file):
        features = analyze(wav_file)["features"]
        assert "mfcc_mean" in features
        assert "zero_crossing_rate" in features
        assert "rms_energy" in features
        assert "spectral_centroid" in features
        assert "tempo_bpm" in features

    def test_hash_is_sha256(self, wav_file):
        h = analyze(wav_file)["hash"]
        assert len(h) == 64

    def test_duration_is_positive(self, wav_file):
        result = analyze(wav_file)
        assert result["duration"] > 0

    def test_duration_approx_1sec(self, wav_file):
        result = analyze(wav_file)
        assert abs(result["duration"] - 1.0) < 0.1

    def test_sample_rate_is_22050(self, wav_file):
        result = analyze(wav_file)
        assert result["sample_rate"] == 22050

    def test_waveform_max_1000_points(self, long_wav_file):
        result = analyze(long_wav_file)
        assert len(result["waveform"]) <= 1000

    def test_waveform_values_in_range(self, wav_file):
        waveform = analyze(wav_file)["waveform"]
        assert all(-1.0 <= v <= 1.0 for v in waveform)

    def test_mfcc_mean_is_13_dimensions(self, wav_file):
        mfcc = analyze(wav_file)["features"]["mfcc_mean"]
        assert len(mfcc) == 13

    def test_zcr_is_non_negative(self, wav_file):
        zcr = analyze(wav_file)["features"]["zero_crossing_rate"]
        assert zcr >= 0

    def test_rms_is_non_negative(self, wav_file):
        rms = analyze(wav_file)["features"]["rms_energy"]
        assert rms >= 0

    def test_spectral_centroid_is_positive(self, wav_file):
        sc = analyze(wav_file)["features"]["spectral_centroid"]
        assert sc > 0

    def test_tempo_bpm_is_positive(self, wav_file):
        bpm = analyze(wav_file)["features"]["tempo_bpm"]
        assert bpm > 0

    def test_tempo_bpm_is_python_float(self, wav_file):
        """numpy配列ではなくPythonのfloatであること（np.atleast_1d変換の確認）"""
        bpm = analyze(wav_file)["features"]["tempo_bpm"]
        assert isinstance(bpm, float)

    def test_invalid_file_raises(self, tmp_path):
        bad = tmp_path / "not_audio.txt"
        bad.write_text("this is not audio")
        with pytest.raises(Exception):
            analyze(str(bad))


# ─── CLI entry point ─────────────────────────────────────────

class TestCLI:
    def test_stdout_is_valid_json(self, wav_file):
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "analyze.py"), wav_file],
            capture_output=True, text=True
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        assert "hash" in data

    def test_no_args_returns_error_json(self):
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "analyze.py")],
            capture_output=True, text=True
        )
        assert result.returncode == 1
        data = json.loads(result.stdout)
        assert "error" in data

    def test_invalid_path_returns_error_json(self):
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "analyze.py"), "/nonexistent.wav"],
            capture_output=True, text=True
        )
        assert result.returncode == 1
        data = json.loads(result.stdout)
        assert "error" in data
