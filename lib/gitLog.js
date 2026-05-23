import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const sh = (cwd, args, timeoutMs = 8000) => {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8", timeout: timeoutMs }).trim();
  } catch {
    return "";
  }
};

/** 서울 기준 YYYY-MM-DD → 그 날 자정 ms (KST) */
function dayBounds(dateISO) {
  const startKst = Date.UTC(
    +dateISO.slice(0, 4),
    +dateISO.slice(5, 7) - 1,
    +dateISO.slice(8, 10),
  ) - 9 * 3600 * 1000;
  return { start: startKst, end: startKst + 24 * 3600 * 1000 };
}

/**
 * 한 repo 에서 발생한 활동 — 커밋된 것 + 미커밋(staged/unstaged/untracked) 까지.
 *
 * @param {string} repoPath
 * @param {string} dateISO      "YYYY-MM-DD" — 커밋과 untracked mtime 필터에 사용
 * @param {object} opts
 * @param {boolean=} opts.includeUncommitted  미커밋 변경 포함 (기본 true)
 */
export function collectGitActivity(repoPath, dateISO, opts = {}) {
  const includeUncommitted = opts.includeUncommitted !== false;

  if (!fs.existsSync(path.join(repoPath, ".git"))) return null;

  const since = `${dateISO}T00:00:00+09:00`;
  const until = `${dateISO}T23:59:59+09:00`;

  /* ── 1) 커밋 ──
   *
   * 구분자: \x1e 를 헤더 prefix 로 둔다. body 가 비어있어도 다음 commit 블록과 헷갈리지 않게.
   * 형식: \x1e<HASH>\x1f<SUBJECT>\x1f<BODY>\n<NAME-STATUS LINES>
   */
  const log = sh(repoPath, [
    "log", `--since=${since}`, `--until=${until}`, "--all",
    "--pretty=format:%x1e%H%x1f%s%x1f%b", "--name-status",
  ]);

  const commits = [];
  if (log) {
    for (const block of log.split("\x1e").filter(b => b && b.includes("\x1f"))) {
      const firstNL = block.indexOf("\n");
      const header  = firstNL < 0 ? block : block.slice(0, firstNL);
      const rest    = firstNL < 0 ? ""    : block.slice(firstNL + 1);
      const [hash, subject, ...bodyParts] = header.split("\x1f");
      const body = bodyParts.join("\x1f").trim();
      const files = rest.split("\n").filter(Boolean).map(line => {
        const [status, ...pathParts] = line.split("\t");
        return { status, path: pathParts.join("\t") };
      });
      commits.push({ hash: hash?.slice(0, 7), subject, body, files });
    }
  }

  const shortstat = sh(repoPath, [
    "log", `--since=${since}`, `--until=${until}`, "--all", "--shortstat", "--pretty=format:",
  ]);
  let files = 0, insertions = 0, deletions = 0;
  for (const m of shortstat.matchAll(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/g)) {
    files      += +m[1] || 0;
    insertions += +m[2] || 0;
    deletions  += +m[3] || 0;
  }

  /* ── 2) 미커밋 변경 ── */
  let staged = [], unstaged = [], untracked = [];
  let stagedStat = null, unstagedStat = null;
  if (includeUncommitted) {
    // staged (index vs HEAD)
    const stagedRaw = sh(repoPath, ["diff", "--cached", "--name-status"]);
    staged = parseNameStatus(stagedRaw);
    stagedStat = parseShortstat(sh(repoPath, ["diff", "--cached", "--shortstat"]));

    // unstaged (working tree vs index)
    const unstagedRaw = sh(repoPath, ["diff", "--name-status"]);
    unstaged = parseNameStatus(unstagedRaw);
    unstagedStat = parseShortstat(sh(repoPath, ["diff", "--shortstat"]));

    // untracked
    const untrackedRaw = sh(repoPath, ["ls-files", "--others", "--exclude-standard"]);
    untracked = untrackedRaw ? untrackedRaw.split("\n").filter(Boolean).map(p => ({ status: "??", path: p })) : [];
  }

  /* ── 3) 최근 mtime — 어제~오늘 작업했지만 commit 안 한 파일들 식별 ── */
  const recentEdits = [];
  if (includeUncommitted) {
    const { start, end } = dayBounds(dateISO);
    const inRangeOrEarlier = (mtime) => mtime <= end; // dateISO 까지의 modification
    const allFiles = [
      ...staged.map(f => f.path),
      ...unstaged.map(f => f.path),
      ...untracked.map(f => f.path),
    ];
    const seen = new Set();
    for (const rel of allFiles) {
      if (seen.has(rel)) continue;
      seen.add(rel);
      try {
        const abs = path.join(repoPath, rel);
        const stat = fs.statSync(abs);
        if (!stat.isFile()) continue;
        if (!inRangeOrEarlier(stat.mtimeMs)) continue;
        // KST 자정 기준 며칠 전인지 계산
        const daysAgo = Math.max(0, Math.floor((end - stat.mtimeMs) / (24 * 3600 * 1000)));
        recentEdits.push({ path: rel, daysAgo, mtimeISO: new Date(stat.mtimeMs).toISOString() });
      } catch { /* ignore */ }
    }
    // 가장 최근 변경 먼저
    recentEdits.sort((a, b) => new Date(b.mtimeISO) - new Date(a.mtimeISO));
  }

  return {
    repo: path.basename(repoPath),
    commits,
    summary: { files, insertions, deletions },
    uncommitted: includeUncommitted ? {
      staged,
      unstaged,
      untracked,
      stagedStat,
      unstagedStat,
      recentEdits,
    } : null,
  };
}

function parseNameStatus(raw) {
  if (!raw) return [];
  return raw.split("\n").filter(Boolean).map(line => {
    const [status, ...rest] = line.split("\t");
    return { status, path: rest.join("\t") };
  });
}
function parseShortstat(raw) {
  if (!raw) return null;
  const m = raw.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
  if (!m) return null;
  return { files: +m[1] || 0, insertions: +m[2] || 0, deletions: +m[3] || 0 };
}

export function collectActivities(repoPaths, dateISO, opts) {
  const out = [];
  for (const p of repoPaths) {
    if (!p) continue;
    const a = collectGitActivity(p, dateISO, opts);
    if (a) out.push(a);
  }
  return out;
}

export function activitiesToPrompt(activities) {
  if (!activities.length) return "(추적된 git 활동 없음)";
  const parts = [];
  for (const a of activities) {
    const hasAny =
      a.commits.length > 0 ||
      (a.uncommitted && (a.uncommitted.staged.length || a.uncommitted.unstaged.length || a.uncommitted.untracked.length));
    if (!hasAny) continue;

    parts.push(`### ${a.repo}`);

    // 커밋
    if (a.commits.length) {
      if (a.summary.files) parts.push(`- 커밋 통계: ${a.summary.files}개 파일, +${a.summary.insertions} / -${a.summary.deletions} 줄`);
      for (const c of a.commits) {
        parts.push(`- \`${c.hash}\` ${c.subject}`);
        if (c.body?.trim()) parts.push(`  > ${c.body.trim().split("\n").join("\n  > ")}`);
        if (c.files.length && c.files.length <= 12) {
          parts.push(`  파일: ${c.files.slice(0, 10).map(f => `\`${f.path}\``).join(", ")}${c.files.length > 10 ? " 외" : ""}`);
        } else if (c.files.length > 12) {
          parts.push(`  파일 ${c.files.length}개`);
        }
      }
    }

    // 미커밋 — 진행 중 작업
    if (a.uncommitted) {
      const u = a.uncommitted;
      const total = u.staged.length + u.unstaged.length + u.untracked.length;
      if (total > 0) {
        parts.push(`- **아직 커밋 안 한 작업 (진행 중)**`);
        if (u.staged.length) {
          const stat = u.stagedStat ? ` — +${u.stagedStat.insertions}/-${u.stagedStat.deletions}` : "";
          parts.push(`  - staged ${u.staged.length}개${stat}: ${u.staged.slice(0, 10).map(f => `\`${f.path}\``).join(", ")}${u.staged.length > 10 ? " 외" : ""}`);
        }
        if (u.unstaged.length) {
          const stat = u.unstagedStat ? ` — +${u.unstagedStat.insertions}/-${u.unstagedStat.deletions}` : "";
          parts.push(`  - 수정 중 ${u.unstaged.length}개${stat}: ${u.unstaged.slice(0, 10).map(f => `\`${f.path}\``).join(", ")}${u.unstaged.length > 10 ? " 외" : ""}`);
        }
        if (u.untracked.length) {
          parts.push(`  - 새 파일 ${u.untracked.length}개: ${u.untracked.slice(0, 10).map(f => `\`${f.path}\``).join(", ")}${u.untracked.length > 10 ? " 외" : ""}`);
        }
      }
      // 최근 mtime — 어떤 파일이 언제 마지막으로 손댔는지
      if (u.recentEdits.length) {
        const today    = u.recentEdits.filter(e => e.daysAgo === 0);
        const yesterday= u.recentEdits.filter(e => e.daysAgo === 1);
        const earlier  = u.recentEdits.filter(e => e.daysAgo >= 2 && e.daysAgo <= 7);
        if (today.length)     parts.push(`  - 오늘 손댄 파일 ${today.length}개: ${today.slice(0, 6).map(e => `\`${e.path}\``).join(", ")}${today.length > 6 ? " 외" : ""}`);
        if (yesterday.length) parts.push(`  - 어제 손댄 파일 ${yesterday.length}개: ${yesterday.slice(0, 6).map(e => `\`${e.path}\``).join(", ")}${yesterday.length > 6 ? " 외" : ""}`);
        if (earlier.length)   parts.push(`  - 며칠 전 손대고 멈춰둔 파일 ${earlier.length}개: ${earlier.slice(0, 6).map(e => `\`${e.path}\` (${e.daysAgo}일 전)`).join(", ")}${earlier.length > 6 ? " 외" : ""}`);
      }
    }
  }
  return parts.length ? parts.join("\n") : "(추적된 git 활동 없음)";
}
