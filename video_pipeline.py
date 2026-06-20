#!/usr/bin/env python3
"""
Video pipeline v2 — split a video into scenes (one clip per camera angle / shot).

Steps:
  1. (optional) strip soft subtitle tracks
  2. (optional) blank a fixed logo/subtitle box via ffmpeg `delogo`
  3. detect scene cuts (angle/shot changes) with PySceneDetect
  4. split into one clip per scene

Requires: ffmpeg + ffprobe on PATH, and `pip install scenedetect[opencv]`

Usage:
  python video_pipeline.py input.mp4 --outdir clips
  python video_pipeline.py input.mp4 --outdir clips \
      --delogo 0.05 0.80 0.90 0.18    # x y w h as fractions of frame (optional)
  python video_pipeline.py input.mp4 --copy    # fast, keyframe-accurate split
"""
import argparse
import os
import shutil
import subprocess
import sys

from scenedetect import detect, ContentDetector


def run(cmd):
    print(" ".join(cmd))
    subprocess.run(cmd, check=True)


def require_tools(*names):
    missing = [n for n in names if shutil.which(n) is None]
    if missing:
        sys.exit(f"missing required tool(s) on PATH: {', '.join(missing)}")


def probe_dims(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0:s=x", path
    ]).decode().strip()
    w, h = out.split("x")
    return int(w), int(h)


def probe_fps(path):
    """Return the video's average frame rate as a float (defaults to 30.0)."""
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=avg_frame_rate",
        "-of", "csv=p=0", path
    ]).decode().strip()
    try:
        num, den = out.split("/")
        fps = float(num) / float(den)
        return fps if fps > 0 else 30.0
    except (ValueError, ZeroDivisionError):
        return 30.0


def probe_duration(path):
    """Return the video duration in seconds (0.0 if unknown)."""
    out = subprocess.check_output([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0", path
    ]).decode().strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def preclean(src, dst, delogo_box, drop_soft_subs):
    """Strip soft subs and/or blank a fixed box. Returns path to use downstream."""
    vf = []
    if delogo_box:
        w, h = probe_dims(src)
        fx, fy, fw, fh = delogo_box
        # delogo needs an even-sized box that stays inside the frame.
        x = max(0, min(int(fx * w), w - 2))
        y = max(0, min(int(fy * h), h - 2))
        bw = max(2, min(int(fw * w), w - x))
        bh = max(2, min(int(fh * h), h - y))
        bw -= bw % 2
        bh -= bh % 2
        vf.append(f"delogo=x={x}:y={y}:w={bw}:h={bh}")

    if not vf and not drop_soft_subs:
        return src  # nothing to do

    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    cmd = ["ffmpeg", "-y", "-i", src]
    if vf:
        cmd += ["-vf", ",".join(vf)]
    else:
        cmd += ["-c:v", "copy"]          # no filtering → keep video bit-exact
    if drop_soft_subs:
        cmd += ["-sn"]                   # no subtitle streams
    cmd += ["-c:a", "copy", dst]
    run(cmd)
    return dst


def split_scenes(src, outdir, threshold, min_len_sec, copy=False):
    os.makedirs(outdir, exist_ok=True)
    fps = probe_fps(src)
    min_frames = max(1, int(round(min_len_sec * fps)))
    scenes = detect(src, ContentDetector(threshold=threshold,
                                         min_scene_len=min_frames))

    # Fall back to the whole video as a single scene when no cuts are found.
    if scenes:
        spans = [(s.get_seconds(), e.get_seconds()) for s, e in scenes]
    else:
        print("No cuts found — treating whole video as one scene.")
        spans = [(0.0, probe_duration(src))]

    base = os.path.splitext(os.path.basename(src))[0]
    manifest = []
    for i, (s, e) in enumerate(spans, 1):
        out = os.path.join(outdir, f"{base}_scene{i:03d}.mp4")
        cmd = ["ffmpeg", "-y", "-i", src, "-ss", f"{s:.3f}"]
        if e > 0:
            cmd += ["-to", f"{e:.3f}"]
        if copy:
            # Fast, but cuts land on the nearest keyframe.
            cmd += ["-c", "copy", "-avoid_negative_ts", "make_zero"]
        else:
            # Accurate, re-encoded cuts.
            cmd += ["-c:v", "libx264", "-preset", "fast", "-c:a", "aac"]
        cmd += [out]
        run(cmd)
        manifest.append((i, round(s, 2), round(e, 2), round(e - s, 2), out))

    print("\nscene  start    end    dur   file")
    for row in manifest:
        print(f"{row[0]:>4}  {row[1]:>6} {row[2]:>6} {row[3]:>5}  {row[4]}")
    return manifest


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--outdir", default="clips")
    ap.add_argument("--threshold", type=float, default=27.0,
                    help="ContentDetector sensitivity; lower = more cuts")
    ap.add_argument("--min-len", type=float, default=1.0,
                    help="minimum scene length in seconds")
    ap.add_argument("--delogo", nargs=4, type=float, metavar=("X", "Y", "W", "H"),
                    help="logo box as fractions of frame, e.g. 0.05 0.80 0.90 0.18")
    ap.add_argument("--drop-soft-subs", action="store_true")
    ap.add_argument("--copy", action="store_true",
                    help="fast stream-copy split (cuts snap to keyframes)")
    ap.add_argument("--keep-cleaned", action="store_true",
                    help="keep the intermediate _cleaned.mp4 file")
    args = ap.parse_args()

    require_tools("ffmpeg", "ffprobe")
    if not os.path.exists(args.input):
        sys.exit(f"not found: {args.input}")

    os.makedirs(args.outdir, exist_ok=True)
    cleaned_path = os.path.join(args.outdir, "_cleaned.mp4")
    cleaned = preclean(args.input, cleaned_path, args.delogo, args.drop_soft_subs)

    try:
        split_scenes(cleaned, args.outdir, args.threshold, args.min_len, args.copy)
    finally:
        # Remove the temp file unless asked to keep it (and only if we made one).
        if cleaned == cleaned_path and not args.keep_cleaned and os.path.exists(cleaned_path):
            os.remove(cleaned_path)


if __name__ == "__main__":
    main()
