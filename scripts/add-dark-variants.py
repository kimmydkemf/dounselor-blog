#!/usr/bin/env python3
"""
명시적 라이트 클래스에 dark: variant 자동 추가.

이미 옆에 같은 prefix 의 dark: variant 가 있으면 skip.
HTML/JSX 클래스 문자열 안에서만 동작 (className/class 어트리뷰트).
"""
import re
import sys
from pathlib import Path
import io

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass

# light → dark mapping (왼쪽 패턴이 있고 옆에 dark: 가 없으면 추가)
MAP = [
    ("bg-white",                "dark:bg-slate-900"),
    ("bg-slate-50",             "dark:bg-slate-900"),
    ("bg-slate-50/50",          "dark:bg-slate-900/50"),
    ("bg-slate-50/40",          "dark:bg-slate-900/40"),
    ("bg-slate-100",            "dark:bg-slate-800"),
    ("bg-slate-100/80",         "dark:bg-slate-800/60"),
    ("border-slate-100",        "dark:border-slate-800"),
    ("border-slate-200",        "dark:border-slate-800"),
    ("border-slate-300",        "dark:border-slate-700"),
    ("text-slate-900",          "dark:text-white"),
    ("text-slate-800",          "dark:text-slate-100"),
    ("text-slate-700",          "dark:text-slate-200"),
    ("text-slate-600",          "dark:text-slate-300"),
    ("text-slate-500",          "dark:text-slate-400"),
    ("text-slate-400",          "dark:text-slate-500"),
    ("hover:bg-slate-100",      "dark:hover:bg-slate-800"),
    ("hover:bg-slate-50",       "dark:hover:bg-slate-800"),
    ("hover:text-slate-900",    "dark:hover:text-white"),
    ("hover:text-slate-700",    "dark:hover:text-slate-200"),
    ("hover:text-slate-800",    "dark:hover:text-slate-100"),
    ("hover:border-slate-300",  "dark:hover:border-slate-600"),
    ("hover:border-slate-400",  "dark:hover:border-slate-500"),
    ("placeholder:text-slate-300", "dark:placeholder:text-slate-600"),
    ("placeholder:text-slate-400", "dark:placeholder:text-slate-500"),
    ("focus:border-slate-900",  "dark:focus:border-slate-100"),
    ("ring-slate-200",          "dark:ring-slate-700"),
    ("divide-slate-100",        "dark:divide-slate-800"),
    ("divide-slate-200",        "dark:divide-slate-800"),
]

CLASS_ATTR_RE = re.compile(
    r'(className\s*=\s*[`"\']|class\s*=\s*[`"\'])([^`"\']*?)([`"\'])',
    re.DOTALL,
)

def patch_class_string(s, mapping):
    """공백 구분 클래스 문자열에서 light → dark 추가"""
    tokens = s.split()
    out = []
    for tok in tokens:
        # template literal expression 안의 토큰은 그대로 (예: ${cond ? "a" : "b"})
        # 단순 패턴 토큰만 처리
        if "${" in tok or tok.startswith("$"):
            out.append(tok)
            continue
        out.append(tok)

    text = " ".join(out)

    for light, dark in mapping:
        # light 패턴이 정확히 (word boundary) 매칭되고, 같은 클래스 문자열 안에 그 dark variant 이미 없으면 추가
        # word boundary 정의: 앞은 공백/시작/`/${, 뒤는 공백/끝/`/}
        pattern = re.compile(
            r'(^|[\s\$\{\}\(\)\?\:`"\'])(' + re.escape(light) + r')(?=$|[\s\$\{\}\(\)\?\:`"\']|/[A-Za-z0-9])'
        )

        def replace(m):
            prefix = m.group(1)
            cls    = m.group(2)
            # 이미 그 dark variant 가 같은 클래스 문자열 어디든 있으면 skip
            if dark in text:
                return prefix + cls
            return prefix + cls + " " + dark

        # in-place 갱신
        new_text = pattern.sub(replace, text)
        if new_text != text:
            text = new_text
    return text

def patch_file(path: Path):
    src = path.read_text(encoding="utf-8")
    orig = src

    def on_match(m):
        head, body, tail = m.group(1), m.group(2), m.group(3)
        new_body = patch_class_string(body, MAP)
        return head + new_body + tail

    src = CLASS_ATTR_RE.sub(on_match, src)
    if src != orig:
        path.write_text(src, encoding="utf-8")
        return True
    return False

def main():
    files = sys.argv[1:]
    if not files:
        print("Usage: add-dark-variants.py <file> [...]")
        return
    for f in files:
        p = Path(f)
        if not p.exists():
            print(f"  skip (not found): {f}")
            continue
        changed = patch_file(p)
        print(f"  {'✓' if changed else '·'} {f}")

if __name__ == "__main__":
    main()
