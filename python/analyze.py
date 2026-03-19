#!/usr/bin/env python3
"""
音声解析スクリプト
- 波形データ（ダウンサンプリング済み）
- スペクトル特徴量（MFCCs, ZCR, RMS等）
- ファイルのSHA-256ハッシュ
を JSON で標準出力に返す
"""

import sys
import json
import hashlib
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="numba")
import numpy as np
import librosa


def compute_hash(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def analyze(filepath: str) -> dict:
    # ハッシュ
    file_hash = compute_hash(filepath)

    # 音声ロード（モノラル、22050Hz）
    y, sr = librosa.load(filepath, sr=22050, mono=True)

    # 波形データ（表示用にダウンサンプリング: 最大1000点）
    n_samples = len(y)
    step = max(1, n_samples // 1000)
    waveform = y[::step].tolist()

    # 基本情報
    duration = librosa.get_duration(y=y, sr=sr)

    # MFCC（音声の周波数特性）
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = mfccs.mean(axis=1).tolist()

    # Zero Crossing Rate（音の荒さ・明瞭さ）
    zcr = float(librosa.feature.zero_crossing_rate(y).mean())

    # RMS Energy（音量の大きさ）
    rms = float(librosa.feature.rms(y=y).mean())

    # Spectral Centroid（音の明るさ）
    spectral_centroid = float(librosa.feature.spectral_centroid(y=y, sr=sr).mean())

    # Tempo（テンポ推定）
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.atleast_1d(tempo)[0])

    return {
        "hash": file_hash,
        "duration": round(duration, 3),
        "sample_rate": sr,
        "n_samples": n_samples,
        "waveform": waveform,
        "features": {
            "mfcc_mean": mfcc_mean,
            "zero_crossing_rate": round(zcr, 6),
            "rms_energy": round(rms, 6),
            "spectral_centroid": round(spectral_centroid, 2),
            "tempo_bpm": round(tempo, 2),
        },
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    filepath = sys.argv[1]
    try:
        result = analyze(filepath)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
