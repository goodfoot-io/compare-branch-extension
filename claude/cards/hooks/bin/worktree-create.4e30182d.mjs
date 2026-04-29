#!/usr/bin/env -S node --enable-source-maps
import { createRequire as __createRequire } from "node:module";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __pathDirname } from "node:path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
process.env['CLAUDE_CODE_HOOKS_LOG_ENV_VAR'] = "CARDS_CLAUDE_CODE_HOOKS_LOG_FILE";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../../../../../../../../../workspace/node_modules/ignore/index.js
var require_ignore = __commonJS({
  "../../../../../../../../../../../workspace/node_modules/ignore/index.js"(exports, module) {
    function makeArray(subject) {
      return Array.isArray(subject) ? subject : [subject];
    }
    var UNDEFINED = void 0;
    var EMPTY = "";
    var SPACE = " ";
    var ESCAPE = "\\";
    var REGEX_TEST_BLANK_LINE = /^\s+$/;
    var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
    var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
    var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
    var REGEX_SPLITALL_CRLF = /\r?\n/g;
    var REGEX_TEST_INVALID_PATH = /^\.{0,2}\/|^\.{1,2}$/;
    var REGEX_TEST_TRAILING_SLASH = /\/$/;
    var SLASH = "/";
    var TMP_KEY_IGNORE = "node-ignore";
    if (typeof Symbol !== "undefined") {
      TMP_KEY_IGNORE = Symbol.for("node-ignore");
    }
    var KEY_IGNORE = TMP_KEY_IGNORE;
    var define = (object, key, value) => {
      Object.defineProperty(object, key, { value });
      return value;
    };
    var REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
    var RETURN_FALSE = () => false;
    var sanitizeRange = (range) => range.replace(
      REGEX_REGEXP_RANGE,
      (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY
    );
    var cleanRangeBackSlash = (slashes) => {
      const { length } = slashes;
      return slashes.slice(0, length - length % 2);
    };
    var REPLACERS = [
      [
        // Remove BOM
        // TODO:
        // Other similar zero-width characters?
        /^\uFEFF/,
        () => EMPTY
      ],
      // > Trailing spaces are ignored unless they are quoted with backslash ("\")
      [
        // (a\ ) -> (a )
        // (a  ) -> (a)
        // (a ) -> (a)
        // (a \ ) -> (a  )
        /((?:\\\\)*?)(\\?\s+)$/,
        (_, m1, m2) => m1 + (m2.indexOf("\\") === 0 ? SPACE : EMPTY)
      ],
      // Replace (\ ) with ' '
      // (\ ) -> ' '
      // (\\ ) -> '\\ '
      // (\\\ ) -> '\\ '
      [
        /(\\+?)\s/g,
        (_, m1) => {
          const { length } = m1;
          return m1.slice(0, length - length % 2) + SPACE;
        }
      ],
      // Escape metacharacters
      // which is written down by users but means special for regular expressions.
      // > There are 12 characters with special meanings:
      // > - the backslash \,
      // > - the caret ^,
      // > - the dollar sign $,
      // > - the period or dot .,
      // > - the vertical bar or pipe symbol |,
      // > - the question mark ?,
      // > - the asterisk or star *,
      // > - the plus sign +,
      // > - the opening parenthesis (,
      // > - the closing parenthesis ),
      // > - and the opening square bracket [,
      // > - the opening curly brace {,
      // > These special characters are often called "metacharacters".
      [
        /[\\$.|*+(){^]/g,
        (match) => `\\${match}`
      ],
      [
        // > a question mark (?) matches a single character
        /(?!\\)\?/g,
        () => "[^/]"
      ],
      // leading slash
      [
        // > A leading slash matches the beginning of the pathname.
        // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
        // A leading slash matches the beginning of the pathname
        /^\//,
        () => "^"
      ],
      // replace special metacharacter slash after the leading slash
      [
        /\//g,
        () => "\\/"
      ],
      [
        // > A leading "**" followed by a slash means match in all directories.
        // > For example, "**/foo" matches file or directory "foo" anywhere,
        // > the same as pattern "foo".
        // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
        // >   under directory "foo".
        // Notice that the '*'s have been replaced as '\\*'
        /^\^*\\\*\\\*\\\//,
        // '**/foo' <-> 'foo'
        () => "^(?:.*\\/)?"
      ],
      // starting
      [
        // there will be no leading '/'
        //   (which has been replaced by section "leading slash")
        // If starts with '**', adding a '^' to the regular expression also works
        /^(?=[^^])/,
        function startingReplacer() {
          return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
        }
      ],
      // two globstars
      [
        // Use lookahead assertions so that we could match more than one `'/**'`
        /\\\/\\\*\\\*(?=\\\/|$)/g,
        // Zero, one or several directories
        // should not use '*', or it will be replaced by the next replacer
        // Check if it is not the last `'/**'`
        (_, index, str) => index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
      ],
      // normal intermediate wildcards
      [
        // Never replace escaped '*'
        // ignore rule '\*' will match the path '*'
        // 'abc.*/' -> go
        // 'abc.*'  -> skip this rule,
        //    coz trailing single wildcard will be handed by [trailing wildcard]
        /(^|[^\\]+)(\\\*)+(?=.+)/g,
        // '*.js' matches '.js'
        // '*.js' doesn't match 'abc'
        (_, p1, p2) => {
          const unescaped = p2.replace(/\\\*/g, "[^\\/]*");
          return p1 + unescaped;
        }
      ],
      [
        // unescape, revert step 3 except for back slash
        // For example, if a user escape a '\\*',
        // after step 3, the result will be '\\\\\\*'
        /\\\\\\(?=[$.|*+(){^])/g,
        () => ESCAPE
      ],
      [
        // '\\\\' -> '\\'
        /\\\\/g,
        () => ESCAPE
      ],
      [
        // > The range notation, e.g. [a-zA-Z],
        // > can be used to match one of the characters in a range.
        // `\` is escaped by step 3
        /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
        (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" ? endEscape.length % 2 === 0 ? `[${sanitizeRange(range)}${endEscape}]` : "[]" : "[]"
      ],
      // ending
      [
        // 'js' will not match 'js.'
        // 'ab' will not match 'abc'
        /(?:[^*])$/,
        // WTF!
        // https://git-scm.com/docs/gitignore
        // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
        // which re-fixes #24, #38
        // > If there is a separator at the end of the pattern then the pattern
        // > will only match directories, otherwise the pattern can match both
        // > files and directories.
        // 'js*' will not match 'a.js'
        // 'js/' will not match 'a.js'
        // 'js' will match 'a.js' and 'a.js/'
        (match) => /\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`
      ]
    ];
    var REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\\\*$/;
    var MODE_IGNORE = "regex";
    var MODE_CHECK_IGNORE = "checkRegex";
    var UNDERSCORE = "_";
    var TRAILING_WILD_CARD_REPLACERS = {
      [MODE_IGNORE](_, p1) {
        const prefix = p1 ? `${p1}[^/]+` : "[^/]*";
        return `${prefix}(?=$|\\/$)`;
      },
      [MODE_CHECK_IGNORE](_, p1) {
        const prefix = p1 ? `${p1}[^/]*` : "[^/]*";
        return `${prefix}(?=$|\\/$)`;
      }
    };
    var makeRegexPrefix = (pattern) => REPLACERS.reduce(
      (prev, [matcher, replacer]) => prev.replace(matcher, replacer.bind(pattern)),
      pattern
    );
    var isString = (subject) => typeof subject === "string";
    var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) && pattern.indexOf("#") !== 0;
    var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF).filter(Boolean);
    var IgnoreRule = class {
      constructor(pattern, mark, body, ignoreCase, negative, prefix) {
        this.pattern = pattern;
        this.mark = mark;
        this.negative = negative;
        define(this, "body", body);
        define(this, "ignoreCase", ignoreCase);
        define(this, "regexPrefix", prefix);
      }
      get regex() {
        const key = UNDERSCORE + MODE_IGNORE;
        if (this[key]) {
          return this[key];
        }
        return this._make(MODE_IGNORE, key);
      }
      get checkRegex() {
        const key = UNDERSCORE + MODE_CHECK_IGNORE;
        if (this[key]) {
          return this[key];
        }
        return this._make(MODE_CHECK_IGNORE, key);
      }
      _make(mode, key) {
        const str = this.regexPrefix.replace(
          REGEX_REPLACE_TRAILING_WILDCARD,
          // It does not need to bind pattern
          TRAILING_WILD_CARD_REPLACERS[mode]
        );
        const regex = this.ignoreCase ? new RegExp(str, "i") : new RegExp(str);
        return define(this, key, regex);
      }
    };
    var createRule = ({
      pattern,
      mark
    }, ignoreCase) => {
      let negative = false;
      let body = pattern;
      if (body.indexOf("!") === 0) {
        negative = true;
        body = body.substr(1);
      }
      body = body.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
      const regexPrefix = makeRegexPrefix(body);
      return new IgnoreRule(
        pattern,
        mark,
        body,
        ignoreCase,
        negative,
        regexPrefix
      );
    };
    var RuleManager = class {
      constructor(ignoreCase) {
        this._ignoreCase = ignoreCase;
        this._rules = [];
      }
      _add(pattern) {
        if (pattern && pattern[KEY_IGNORE]) {
          this._rules = this._rules.concat(pattern._rules._rules);
          this._added = true;
          return;
        }
        if (isString(pattern)) {
          pattern = {
            pattern
          };
        }
        if (checkPattern(pattern.pattern)) {
          const rule = createRule(pattern, this._ignoreCase);
          this._added = true;
          this._rules.push(rule);
        }
      }
      // @param {Array<string> | string | Ignore} pattern
      add(pattern) {
        this._added = false;
        makeArray(
          isString(pattern) ? splitPattern(pattern) : pattern
        ).forEach(this._add, this);
        return this._added;
      }
      // Test one single path without recursively checking parent directories
      //
      // - checkUnignored `boolean` whether should check if the path is unignored,
      //   setting `checkUnignored` to `false` could reduce additional
      //   path matching.
      // - check `string` either `MODE_IGNORE` or `MODE_CHECK_IGNORE`
      // @returns {TestResult} true if a file is ignored
      test(path4, checkUnignored, mode) {
        let ignored = false;
        let unignored = false;
        let matchedRule;
        this._rules.forEach((rule) => {
          const { negative } = rule;
          if (unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored) {
            return;
          }
          const matched = rule[mode].test(path4);
          if (!matched) {
            return;
          }
          ignored = !negative;
          unignored = negative;
          matchedRule = negative ? UNDEFINED : rule;
        });
        const ret = {
          ignored,
          unignored
        };
        if (matchedRule) {
          ret.rule = matchedRule;
        }
        return ret;
      }
    };
    var throwError = (message, Ctor) => {
      throw new Ctor(message);
    };
    var checkPath = (path4, originalPath, doThrow) => {
      if (!isString(path4)) {
        return doThrow(
          `path must be a string, but got \`${originalPath}\``,
          TypeError
        );
      }
      if (!path4) {
        return doThrow(`path must not be empty`, TypeError);
      }
      if (checkPath.isNotRelative(path4)) {
        const r = "`path.relative()`d";
        return doThrow(
          `path should be a ${r} string, but got "${originalPath}"`,
          RangeError
        );
      }
      return true;
    };
    var isNotRelative = (path4) => REGEX_TEST_INVALID_PATH.test(path4);
    checkPath.isNotRelative = isNotRelative;
    checkPath.convert = (p) => p;
    var Ignore = class {
      constructor({
        ignorecase = true,
        ignoreCase = ignorecase,
        allowRelativePaths = false
      } = {}) {
        define(this, KEY_IGNORE, true);
        this._rules = new RuleManager(ignoreCase);
        this._strictPathCheck = !allowRelativePaths;
        this._initCache();
      }
      _initCache() {
        this._ignoreCache = /* @__PURE__ */ Object.create(null);
        this._testCache = /* @__PURE__ */ Object.create(null);
      }
      add(pattern) {
        if (this._rules.add(pattern)) {
          this._initCache();
        }
        return this;
      }
      // legacy
      addPattern(pattern) {
        return this.add(pattern);
      }
      // @returns {TestResult}
      _test(originalPath, cache, checkUnignored, slices) {
        const path4 = originalPath && checkPath.convert(originalPath);
        checkPath(
          path4,
          originalPath,
          this._strictPathCheck ? throwError : RETURN_FALSE
        );
        return this._t(path4, cache, checkUnignored, slices);
      }
      checkIgnore(path4) {
        if (!REGEX_TEST_TRAILING_SLASH.test(path4)) {
          return this.test(path4);
        }
        const slices = path4.split(SLASH).filter(Boolean);
        slices.pop();
        if (slices.length) {
          const parent = this._t(
            slices.join(SLASH) + SLASH,
            this._testCache,
            true,
            slices
          );
          if (parent.ignored) {
            return parent;
          }
        }
        return this._rules.test(path4, false, MODE_CHECK_IGNORE);
      }
      _t(path4, cache, checkUnignored, slices) {
        if (path4 in cache) {
          return cache[path4];
        }
        if (!slices) {
          slices = path4.split(SLASH).filter(Boolean);
        }
        slices.pop();
        if (!slices.length) {
          return cache[path4] = this._rules.test(path4, checkUnignored, MODE_IGNORE);
        }
        const parent = this._t(
          slices.join(SLASH) + SLASH,
          cache,
          checkUnignored,
          slices
        );
        return cache[path4] = parent.ignored ? parent : this._rules.test(path4, checkUnignored, MODE_IGNORE);
      }
      ignores(path4) {
        return this._test(path4, this._ignoreCache, false).ignored;
      }
      createFilter() {
        return (path4) => !this.ignores(path4);
      }
      filter(paths) {
        return makeArray(paths).filter(this.createFilter());
      }
      // @returns {TestResult}
      test(path4) {
        return this._test(path4, this._testCache, true);
      }
    };
    var factory = (options) => new Ignore(options);
    var isPathValid = (path4) => checkPath(path4 && checkPath.convert(path4), path4, RETURN_FALSE);
    var setupWindows = () => {
      const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
      checkPath.convert = makePosix;
      const REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
      checkPath.isNotRelative = (path4) => REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path4) || isNotRelative(path4);
    };
    if (
      // Detect `process` so that it can run in browsers.
      typeof process !== "undefined" && process.platform === "win32"
    ) {
      setupWindows();
    }
    module.exports = factory;
    factory.default = factory;
    module.exports.isPathValid = isPathValid;
    define(module.exports, Symbol.for("setupWindows"), setupWindows);
  }
});

// ../sdk/src/worktree.ts
import { execFile } from "node:child_process";
import * as fs2 from "node:fs/promises";
import * as path3 from "node:path";
import { promisify } from "node:util";

// ../sdk/src/cards-config.ts
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import * as path from "node:path";
var CARDS_DIR_NAME = ".cards";
function resolveGlobalCardsConfigDir() {
  const cardsHome = process.env["CARDS_HOME"];
  if (cardsHome) {
    return cardsHome;
  }
  const xdgDataHome = process.env["XDG_DATA_HOME"];
  if (xdgDataHome) {
    return path.join(xdgDataHome, CARDS_DIR_NAME);
  }
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"];
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, CARDS_DIR_NAME);
  }
  return path.join(homedir(), CARDS_DIR_NAME);
}
function generateRepoId(repoRoot) {
  const dirName = path.basename(repoRoot);
  const hash = createHash("sha256").update(repoRoot).digest("hex").slice(0, 8);
  return `${dirName}-${hash}`;
}
function resolveWorktreesRoot() {
  const overrideRoot = process.env["CARDS_WORKTREES_DIR"];
  if (overrideRoot) {
    return overrideRoot;
  }
  return path.join(resolveGlobalCardsConfigDir(), "worktrees");
}
function resolveWorktreeDir(repoRoot, ref) {
  const repoId = generateRepoId(repoRoot);
  return path.join(resolveWorktreesRoot(), repoId, ref);
}

// ../sdk/src/worktreeInclude.ts
var import_ignore = __toESM(require_ignore(), 1);
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path2 from "node:path";
var WorktreeIncludeError = class extends Error {
  name = "WorktreeIncludeError";
};
async function walkDir(rootDir, relDir = "") {
  const absDir = relDir ? path2.join(rootDir, relDir) : rootDir;
  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return [];
  }
  const results = [];
  for (const entry of entries) {
    const name = entry.name;
    const relPath = relDir ? `${relDir}/${name}` : name;
    if (entry.isDirectory()) {
      if (name === ".git" || name === ".worktrees") continue;
      const children = await walkDir(rootDir, relPath);
      results.push(...children);
    } else {
      results.push(relPath);
    }
  }
  return results;
}
async function gitIgnoredPaths(cwd, candidates) {
  if (candidates.length === 0) return [];
  return new Promise((resolve2, reject) => {
    const child = spawn("git", ["check-ignore", "--stdin", "-z"], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    child.on("close", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (code === 0) {
        resolve2(stdout ? stdout.split("\0").filter(Boolean) : []);
      } else if (code === 1) {
        resolve2([]);
      } else {
        reject(new WorktreeIncludeError(`git check-ignore failed (exit ${String(code)}): ${stderr}`));
      }
    });
    child.on("error", (err) => {
      reject(new WorktreeIncludeError(`git check-ignore spawn failed: ${err.message}`, { cause: err }));
    });
    const stdinData = candidates.join("\0");
    child.stdin.write(stdinData, "utf8");
    child.stdin.end();
  });
}
async function applyWorktreeInclude(opts) {
  const { sourceRoot, worktreeDir } = opts;
  let includeContent;
  try {
    includeContent = await fs.readFile(path2.join(sourceRoot, ".worktreeinclude"), "utf8");
  } catch (error) {
    const err = error;
    if (err.code === "ENOENT") return 0;
    throw new WorktreeIncludeError(`Failed to read .worktreeinclude: ${err.message}`, { cause: error });
  }
  const ig = (0, import_ignore.default)().add(includeContent);
  const allPaths = await walkDir(sourceRoot);
  const includedPaths = allPaths.filter((p) => {
    try {
      return ig.ignores(p);
    } catch {
      return false;
    }
  });
  if (includedPaths.length === 0) return 0;
  const gitIgnored = await gitIgnoredPaths(sourceRoot, includedPaths);
  const gitIgnoredSet = new Set(gitIgnored);
  const copySet = includedPaths.filter((p) => gitIgnoredSet.has(p));
  if (copySet.length === 0) return 0;
  let count = 0;
  for (const relPath of copySet) {
    const srcAbs = path2.join(sourceRoot, relPath);
    const destAbs = path2.join(worktreeDir, relPath);
    let stat;
    try {
      stat = await fs.lstat(srcAbs);
    } catch (error) {
      const err = error;
      if (err.code === "ENOENT") continue;
      throw new WorktreeIncludeError(`Failed to stat ${relPath}: ${err.message}`, { cause: error });
    }
    if (stat.isDirectory()) continue;
    try {
      await fs.mkdir(path2.dirname(destAbs), { recursive: true });
    } catch (error) {
      throw new WorktreeIncludeError(`Failed to create parent directory for ${relPath}: ${error.message}`, {
        cause: error
      });
    }
    if (stat.isSymbolicLink()) {
      try {
        const target = await fs.readlink(srcAbs);
        await fs.symlink(target, destAbs);
      } catch (error) {
        throw new WorktreeIncludeError(`Failed to recreate symlink ${relPath}: ${error.message}`, {
          cause: error
        });
      }
    } else {
      try {
        await fs.copyFile(srcAbs, destAbs);
        await fs.chmod(destAbs, stat.mode & 4095);
      } catch (error) {
        throw new WorktreeIncludeError(`Failed to copy ${relPath}: ${error.message}`, { cause: error });
      }
    }
    count++;
  }
  return count;
}

// ../sdk/src/worktree.ts
var execFileAsync = promisify(execFile);
function validateBranchName(name) {
  const branchNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;
  if (!branchNameRegex.test(name)) {
    throw new Error("Error: Invalid branch name format.");
  }
}
function isNestedUnder(dir, parentSet) {
  let current = dir;
  while (current.includes("/")) {
    current = current.substring(0, current.lastIndexOf("/"));
    if (parentSet.has(current)) {
      return true;
    }
  }
  return false;
}
function isInternalSymlink(target) {
  return target.startsWith("../");
}
async function createWorktree(ref, options) {
  const { sourceRoot, repoRoot } = await findGitRoots(options?.cwd ?? process.cwd());
  let refType;
  try {
    refType = await resolveRefType(repoRoot, ref);
  } catch {
    validateBranchName(ref);
    refType = "branch";
  }
  if (refType === "branch") {
    validateBranchName(ref);
  }
  const worktreeDir = resolveWorktreeDir(repoRoot, ref);
  const worktreeExists = await checkWorktreeExists(repoRoot, worktreeDir);
  if (worktreeExists) {
    throw new Error(`Error: Worktree already exists at ${worktreeDir}`);
  }
  await cleanStaleWorktreeDir(repoRoot, worktreeDir);
  if (refType === "branch") {
    const startPoint = await resolveHead(sourceRoot);
    const branchExists = await checkBranchExists(repoRoot, ref);
    await addWorktree({ repoRoot, worktreeDir, branchName: ref, branchExists, startPoint });
  } else {
    await addDetachedWorktree(repoRoot, worktreeDir, ref);
  }
  const settle = (async () => {
    const ignored = await discoverIgnoredPaths(sourceRoot);
    await copyExistingSymlinks(sourceRoot, worktreeDir);
    const filteredIgnored = {
      directories: ignored.directories.filter((d) => d !== ".cards" && !d.startsWith(".cards/")),
      files: ignored.files.filter((f) => !f.startsWith(".cards/"))
    };
    await symlinkIgnoredPaths({ sourceRoot, worktreeDir, ignored: filteredIgnored });
    await copyCardsDirectory(sourceRoot, worktreeDir);
    if (options?.cardId !== void 0) {
      if (options.cardId.length === 0) {
        throw new Error("createWorktree: cardId must be a non-empty string");
      }
      await writeCardBoundFile(worktreeDir, options.cardId);
    }
    const reroutedCount = await rerouteAllNodeModules({ sourceRoot, worktreeDir, repoRoot });
    const copiedFromInclude = await applyWorktreeInclude({ sourceRoot, worktreeDir });
    const additionalExcludes = options?.cardId !== void 0 ? [".cards/CARD_ID"] : [];
    const [, baseSha] = await Promise.all([
      updateGitExclude({
        worktreeDir,
        repoRoot,
        directories: ignored.directories,
        files: ignored.files,
        additionalExcludes
      }),
      resolveHead(worktreeDir)
    ]);
    const result = {
      branch: ref,
      worktree: worktreeDir,
      baseSha,
      copiedFromInclude,
      reroutedSymlinks: reroutedCount
    };
    return result;
  })();
  return { path: worktreeDir, settle };
}
async function cleanStaleWorktreeDir(repoRoot, worktreeDir) {
  try {
    await fs2.access(worktreeDir);
    await fs2.rm(worktreeDir, { recursive: true });
    await execFileAsync("git", ["worktree", "prune"], { cwd: repoRoot, timeout: 3e4 });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
async function findGitRoots(startDir) {
  let currentDir = path3.resolve(startDir);
  while (currentDir !== "/") {
    const gitPath = path3.join(currentDir, ".git");
    try {
      const stats = await fs2.lstat(gitPath);
      if (stats.isDirectory()) {
        return {
          sourceRoot: currentDir,
          repoRoot: currentDir
        };
      }
      if (stats.isFile()) {
        const gitFileContent = await fs2.readFile(gitPath, "utf-8");
        const gitdirLine = gitFileContent.trim();
        const gitdirPath = gitdirLine.replace(/^gitdir:\s*/, "");
        const mainGitDir = gitdirPath.replace(/\/worktrees\/[^/]+$/, "");
        const repoRoot = mainGitDir.replace(/\/\.git$/, "");
        return {
          sourceRoot: currentDir,
          repoRoot
        };
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    currentDir = path3.dirname(currentDir);
  }
  throw new Error("Not in a git repository");
}
async function resolveHead(cwd) {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd, timeout: 5e3 });
  return stdout.trim();
}
async function checkWorktreeExists(repoRoot, worktreeDir) {
  const { stdout } = await execFileAsync("git", ["worktree", "list", "--porcelain"], {
    cwd: repoRoot,
    timeout: 3e4
  });
  for (const line of stdout.split("\n")) {
    if (line.startsWith("worktree ") && line.slice("worktree ".length) === worktreeDir) {
      return true;
    }
  }
  return false;
}
async function checkBranchExists(repoRoot, branchName) {
  const { stdout } = await execFileAsync("git", ["branch", "--list", branchName], {
    cwd: repoRoot,
    timeout: 3e4
  });
  return stdout.trim().length > 0;
}
async function resolveRefType(repoRoot, ref) {
  const branchExists = await checkBranchExists(repoRoot, ref);
  if (branchExists) return "branch";
  const { stdout: tagOutput } = await execFileAsync("git", ["tag", "--list", ref], {
    cwd: repoRoot,
    timeout: 3e4
  });
  if (tagOutput.trim().length > 0) return "tag";
  try {
    await execFileAsync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: repoRoot,
      timeout: 5e3
    });
    return "commit";
  } catch {
    throw new Error(`Error: '${ref}' does not resolve to a branch, tag, or commit.`);
  }
}
async function addWorktree(opts) {
  const args = opts.branchExists ? ["worktree", "add", opts.worktreeDir, opts.branchName] : ["worktree", "add", "-b", opts.branchName, opts.worktreeDir, opts.startPoint];
  await execFileAsync("git", args, { cwd: opts.repoRoot, timeout: 3e4 });
}
async function addDetachedWorktree(repoRoot, worktreeDir, ref) {
  await execFileAsync("git", ["worktree", "add", "--detach", worktreeDir, ref], {
    cwd: repoRoot,
    timeout: 3e4
  });
}
async function discoverIgnoredPaths(sourceRoot) {
  const { stdout } = await execFileAsync(
    "git",
    ["-C", sourceRoot, "ls-files", "--ignored", "--exclude-standard", "--directory", "--others"],
    { cwd: sourceRoot, timeout: 3e4 }
  );
  const ignoredPrefixes = getIgnoredWorktreePrefixes(sourceRoot);
  const lines = stdout.split("\n").filter((line) => line.length > 0 && !isIgnoredWorktreePath(line, ignoredPrefixes));
  const directories = lines.filter((l) => l.endsWith("/")).map((l) => l.slice(0, -1));
  const files = lines.filter((l) => !l.endsWith("/"));
  return { directories, files };
}
async function copyCardsDirectory(sourceRoot, worktreeDir) {
  const sourcePath = path3.join(sourceRoot, ".cards");
  try {
    await fs2.cp(sourcePath, path3.join(worktreeDir, ".cards"), { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
async function writeCardBoundFile(worktreeDir, cardId) {
  const cardsDir = path3.join(worktreeDir, ".cards");
  await fs2.mkdir(cardsDir, { recursive: true });
  await fs2.writeFile(path3.join(cardsDir, "CARD_ID"), `${cardId}
`);
}
async function symlinkIgnoredPaths(opts) {
  const { sourceRoot, worktreeDir, ignored } = opts;
  const dirSet = new Set(ignored.directories);
  const nonNestedDirs = ignored.directories.filter((dir) => !isNestedUnder(dir, dirSet));
  const createDirSymlink = async (dir) => {
    try {
      const sourcePath = path3.join(sourceRoot, dir);
      try {
        await fs2.lstat(sourcePath);
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}
`
        );
        return false;
      }
      const destPath = path3.join(worktreeDir, dir);
      const parentDir = path3.dirname(dir);
      if (parentDir !== ".") {
        await fs2.mkdir(path3.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs2.symlink(sourcePath, destPath);
      return true;
    } catch (error) {
      const code = error.code;
      if (code === "EEXIST" || code === "ENOENT") {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}
`
      );
      return false;
    }
  };
  const createFileSymlink = async (file) => {
    try {
      const sourcePath = path3.join(sourceRoot, file);
      try {
        await fs2.lstat(sourcePath);
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}
`
        );
        return false;
      }
      const destPath = path3.join(worktreeDir, file);
      const parentDir = path3.dirname(file);
      if (parentDir !== ".") {
        await fs2.mkdir(path3.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs2.symlink(sourcePath, destPath);
      return true;
    } catch (error) {
      const code = error.code;
      if (code === "EEXIST" || code === "ENOENT") {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}
`
      );
      return false;
    }
  };
  const dirResults = await Promise.all(nonNestedDirs.map(createDirSymlink));
  const nonNestedFiles = ignored.files.filter((file) => !isNestedUnder(file, dirSet));
  const fileResults = await Promise.all(nonNestedFiles.map(createFileSymlink));
  const dirCount = dirResults.filter((r) => r).length;
  const fileCount = fileResults.filter((r) => r).length;
  return { dirCount, fileCount };
}
async function copyExistingSymlinks(sourceRoot, worktreeDir) {
  const entries = await fs2.readdir(sourceRoot, { withFileTypes: true });
  const ignoredRootEntries = getIgnoredWorktreeRootEntries(sourceRoot);
  const symlinks = entries.filter(
    (entry) => entry.isSymbolicLink() && entry.name !== ".git" && !ignoredRootEntries.has(entry.name)
  );
  const copySymlink = async (name) => {
    const destPath = path3.join(worktreeDir, name);
    try {
      await fs2.lstat(destPath);
      return false;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    const sourceLinkPath = path3.join(sourceRoot, name);
    const target = await fs2.readlink(sourceLinkPath);
    const resolvedTarget = path3.resolve(sourceRoot, target);
    if (resolvedTarget === sourceLinkPath) {
      return false;
    }
    await fs2.symlink(sourceLinkPath, destPath);
    return true;
  };
  const results = await Promise.all(symlinks.map((e) => copySymlink(e.name)));
  return results.filter((r) => r).length;
}
function getIgnoredWorktreePrefixes(sourceRoot) {
  const prefixes = /* @__PURE__ */ new Set([".worktrees"]);
  const worktreesRoot = path3.resolve(resolveWorktreesRoot());
  const relativeRoot = path3.relative(sourceRoot, worktreesRoot);
  if (!relativeRoot.startsWith("..") && !path3.isAbsolute(relativeRoot)) {
    const normalized = normalizeRelativePath(relativeRoot);
    if (normalized.length > 0) {
      prefixes.add(normalized);
    }
  }
  return [...prefixes];
}
function getIgnoredWorktreeRootEntries(sourceRoot) {
  const entries = /* @__PURE__ */ new Set([".worktrees"]);
  for (const prefix of getIgnoredWorktreePrefixes(sourceRoot)) {
    const [rootEntry] = prefix.split("/");
    if (rootEntry) {
      entries.add(rootEntry);
    }
  }
  return entries;
}
function normalizeRelativePath(relativePath) {
  return relativePath.split(path3.sep).filter((segment) => segment.length > 0 && segment !== ".").join("/");
}
function isIgnoredWorktreePath(candidate, ignoredPrefixes) {
  const normalizedCandidate = candidate.replace(/\/$/, "");
  return ignoredPrefixes.some(
    (prefix) => normalizedCandidate === prefix || normalizedCandidate.startsWith(`${prefix}/`)
  );
}
async function rerouteNodeModules(opts) {
  const { sourceNodeModules, destNodeModules } = opts;
  try {
    await fs2.lstat(sourceNodeModules);
  } catch (error) {
    if (error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }
  try {
    const destStats = await fs2.lstat(destNodeModules);
    if (destStats.isSymbolicLink()) {
      await fs2.unlink(destNodeModules);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  await fs2.mkdir(destNodeModules, { recursive: true });
  const entries = await fs2.readdir(sourceNodeModules, { withFileTypes: true });
  const counts = await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path3.join(sourceNodeModules, entry.name);
      const destPath = path3.join(destNodeModules, entry.name);
      if (entry.isSymbolicLink()) {
        const target = await fs2.readlink(sourcePath);
        if (isInternalSymlink(target)) {
          await fs2.symlink(target, destPath);
          return 1;
        } else {
          await fs2.symlink(sourcePath, destPath);
          return 0;
        }
      } else if (entry.isDirectory() && entry.name.startsWith("@")) {
        await fs2.mkdir(destPath, { recursive: true });
        const scopeEntries = await fs2.readdir(sourcePath, { withFileTypes: true });
        const scopeCounts = await Promise.all(
          scopeEntries.map(async (scopeEntry) => {
            const scopeSourcePath = path3.join(sourcePath, scopeEntry.name);
            const scopeDestPath = path3.join(destPath, scopeEntry.name);
            if (scopeEntry.isSymbolicLink()) {
              const target = await fs2.readlink(scopeSourcePath);
              if (isInternalSymlink(target)) {
                await fs2.symlink(target, scopeDestPath);
                return 1;
              } else {
                await fs2.symlink(scopeSourcePath, scopeDestPath);
                return 0;
              }
            } else {
              await fs2.symlink(scopeSourcePath, scopeDestPath);
              return 0;
            }
          })
        );
        return scopeCounts.reduce((sum, c) => sum + c, 0);
      } else {
        await fs2.symlink(sourcePath, destPath);
        return 0;
      }
    })
  );
  return counts.reduce((sum, c) => sum + c, 0);
}
async function rerouteAllNodeModules(opts) {
  const { sourceRoot, worktreeDir, repoRoot } = opts;
  let packageJson;
  try {
    const packageJsonContent = await fs2.readFile(path3.join(repoRoot, "package.json"), "utf-8");
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    if (error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }
  if (!packageJson.workspaces) {
    return 0;
  }
  let totalCount = 0;
  totalCount += await rerouteNodeModules({
    sourceNodeModules: path3.join(sourceRoot, "node_modules"),
    destNodeModules: path3.join(worktreeDir, "node_modules")
  });
  const packagesDir = path3.join(sourceRoot, "packages");
  try {
    const packageEntries = await fs2.readdir(packagesDir, { withFileTypes: true });
    for (const entry of packageEntries) {
      if (entry.isDirectory()) {
        const pkgNodeModules = path3.join(packagesDir, entry.name, "node_modules");
        let nodeModulesExists = false;
        try {
          await fs2.lstat(pkgNodeModules);
          nodeModulesExists = true;
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }
        if (nodeModulesExists) {
          const destPackageDir = path3.join(worktreeDir, "packages", entry.name);
          await fs2.mkdir(destPackageDir, { recursive: true });
          totalCount += await rerouteNodeModules({
            sourceNodeModules: pkgNodeModules,
            destNodeModules: path3.join(destPackageDir, "node_modules")
          });
        }
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  return totalCount;
}
async function updateGitExclude(opts) {
  const { worktreeDir, repoRoot, directories, files, additionalExcludes } = opts;
  const { stdout: gitDir } = await execFileAsync("git", ["-C", worktreeDir, "rev-parse", "--git-dir"], {
    timeout: 5e3
  });
  const excludePath = path3.join(gitDir.trim(), "info", "exclude");
  await fs2.mkdir(path3.dirname(excludePath), { recursive: true });
  const lines = ["# Symlinks created by instant-worktree"];
  for (const dir of directories) {
    if (!dir) continue;
    try {
      const stats = await fs2.lstat(path3.join(worktreeDir, dir));
      if (stats.isSymbolicLink()) lines.push(dir);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  for (const file of files) {
    if (!file) continue;
    try {
      const stats = await fs2.lstat(path3.join(worktreeDir, file));
      if (stats.isSymbolicLink()) lines.push(file);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  if (additionalExcludes) {
    for (const entry of additionalExcludes) {
      if (entry) lines.push(entry);
    }
  }
  await fs2.appendFile(excludePath, `${lines.join("\n")}
`);
  try {
    await execFileAsync("git", ["-C", repoRoot, "config", "extensions.worktreeConfig", "true"], { timeout: 5e3 });
  } catch (error) {
    process.stderr.write(
      `create-worktree: failed to set worktreeConfig extension: ${error instanceof Error ? error.message : String(error)}
`
    );
  }
  try {
    await execFileAsync("git", ["-C", worktreeDir, "config", "--worktree", "core.excludesFile", excludePath], {
      timeout: 5e3
    });
  } catch (error) {
    process.stderr.write(
      `create-worktree: failed to set core.excludesFile: ${error instanceof Error ? error.message : String(error)}
`
    );
  }
}

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/env.js
import * as fs3 from "node:fs";
var CLAUDE_ENV_VARS = {
  /**
   * Absolute path to the project root directory where Claude Code was started.
   * Available in all hooks.
   */
  PROJECT_DIR: "CLAUDE_PROJECT_DIR",
  /**
   * Path to a file where SessionStart hooks can persist environment variables.
   * Variables written to this file will be available in all subsequent bash commands.
   * Only available in SessionStart hooks.
   */
  ENV_FILE: "CLAUDE_ENV_FILE",
  /**
   * Set to "true" when running in a remote (web) environment.
   * Not set or empty when running in local CLI environment.
   */
  REMOTE: "CLAUDE_CODE_REMOTE"
};
function getEnvFilePath() {
  return process.env[CLAUDE_ENV_VARS.ENV_FILE];
}
function persistEnvVar(name, value) {
  const envFile = getEnvFilePath();
  if (envFile === void 0) {
    throw new Error("persistEnvVar can only be used in SessionStart hooks. CLAUDE_ENV_FILE environment variable is not set.");
  }
  const escapedValue = escapeShellValue(value);
  const exportStatement = `export ${name}=${escapedValue}
`;
  fs3.appendFileSync(envFile, exportStatement, "utf-8");
}
function persistEnvVars(vars) {
  for (const [name, value] of Object.entries(vars)) {
    persistEnvVar(name, value);
  }
}
function escapeShellValue(value) {
  const escaped = value.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/hooks.js
function createHookFunction(hookEventName, config, handler) {
  const hookFn = async (input, context) => {
    return await handler(input, context);
  };
  hookFn.hookEventName = hookEventName;
  hookFn.matcher = config.matcher;
  hookFn.timeout = config.timeout;
  return hookFn;
}
function worktreeCreateHook(config, handler) {
  return createHookFunction("WorktreeCreate", config, handler);
}

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/logger.js
import { closeSync, existsSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname as dirname3 } from "node:path";
var LOG_LEVELS = ["debug", "info", "warn", "error"];
var Logger = class {
  /**
   * Registered event handlers by log level.
   */
  handlers = /* @__PURE__ */ new Map();
  /**
   * File descriptor for log file output.
   * Lazily initialized on first write.
   */
  logFileFd = null;
  /**
   * Path to the log file, if configured.
   */
  logFilePath = null;
  /**
   * Whether file initialization has been attempted.
   */
  fileInitialized = false;
  /**
   * Current hook context for enriching log events.
   */
  currentHookType;
  /**
   * Current hook input for enriching log events.
   */
  currentInput;
  /**
   * Creates a new Logger instance.
   *
   * Typically you should use the exported `logger` singleton rather than
   * creating new instances.
   * @param config - Optional configuration
   * @example
   * ```typescript
   * // Use singleton (recommended)
   * import { logger } from '@goodfoot/claude-code-hooks';
   *
   * // Or create custom instance
   * const customLogger = new Logger({ logFilePath: '/var/log/hooks.log' });
   * ```
   */
  constructor(config = {}) {
    for (const level of LOG_LEVELS) {
      this.handlers.set(level, /* @__PURE__ */ new Set());
    }
    this.logFilePath = config.logFilePath ?? (config.logEnvVar ? process.env[config.logEnvVar] : void 0) ?? null;
  }
  /**
   * Logs a debug message.
   *
   * Use for detailed debugging information that is typically only useful
   * during development or troubleshooting.
   * @param message - The debug message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.debug('Processing tool input', { toolName: 'Bash', inputSize: 256 });
   * ```
   */
  debug(message, context) {
    this.emit("debug", message, context);
  }
  /**
   * Logs an info message.
   *
   * Use for general operational events like hook invocations, successful
   * completions, or state changes.
   * @param message - The info message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.info('Session started', { source: 'startup', sessionId: 'abc123' });
   * ```
   */
  info(message, context) {
    this.emit("info", message, context);
  }
  /**
   * Logs a warning message.
   *
   * Use for conditions that may indicate issues but don't prevent
   * operation, such as deprecated patterns or performance concerns.
   * @param message - The warning message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.warn('Deprecated hook pattern detected', { pattern: 'legacyMatcher' });
   * ```
   */
  warn(message, context) {
    this.emit("warn", message, context);
  }
  /**
   * Logs an error message.
   *
   * Use for error conditions that require attention but were handled
   * gracefully. For exceptions, prefer {@link logError}.
   * @param message - The error message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.error('Failed to validate tool input', { toolName: 'Bash', reason: 'empty command' });
   * ```
   */
  error(message, context) {
    this.emit("error", message, context);
  }
  /**
   * Logs a structured error with full error details.
   *
   * Use this method when logging caught exceptions to capture the full
   * error context including name, message, stack trace, and cause chain.
   * @param error - The error to log
   * @param message - Human-readable description of what failed
   * @param context - Optional additional context
   * @example
   * ```typescript
   * try {
   *   await dangerousOperation();
   * } catch (err) {
   *   logger.logError(err, 'Failed to execute dangerous operation', {
   *     operation: 'delete',
   *     target: '/important/file.txt'
   *   });
   * }
   * ```
   */
  logError(error, message, context) {
    const errorInfo = this.extractErrorInfo(error);
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: "error",
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      error: errorInfo,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Subscribes a handler to log events at the specified level.
   *
   * The handler will be called for every log event at the specified level.
   * Returns an unsubscribe function that should be called when the handler
   * is no longer needed.
   * @param level - The log level to subscribe to
   * @param handler - The handler function to call for each event
   * @returns A function to unsubscribe the handler
   * @example
   * ```typescript
   * // Subscribe to error events
   * const unsubscribe = logger.on('error', (event) => {
   *   console.error(`[${event.hookType}] ${event.message}`);
   *   if (event.error) {
   *     console.error(event.error.stack);
   *   }
   * });
   *
   * // Later, clean up
   * unsubscribe();
   * ```
   * @example
   * ```typescript
   * // Forward to external logging library
   * import pino from 'pino';
   * const pinoLogger = pino();
   *
   * logger.on('info', (event) => pinoLogger.info(event, event.message));
   * logger.on('warn', (event) => pinoLogger.warn(event, event.message));
   * logger.on('error', (event) => pinoLogger.error(event, event.message));
   * ```
   */
  on(level, handler) {
    const levelHandlers = this.handlers.get(level);
    if (levelHandlers) {
      levelHandlers.add(handler);
    }
    return () => {
      levelHandlers?.delete(handler);
    };
  }
  /**
   * Sets the current hook context for enriching log events.
   *
   * This is called internally by the runtime before invoking hook handlers.
   * You typically don't need to call this directly.
   * @param hookType - The type of hook being executed
   * @param input - The hook input data
   * @internal
   */
  setContext(hookType, input) {
    this.currentHookType = hookType;
    this.currentInput = input;
  }
  /**
   * Clears the current hook context.
   *
   * Called internally by the runtime after hook execution completes.
   * @internal
   */
  clearContext() {
    this.currentHookType = void 0;
    this.currentInput = void 0;
  }
  /**
   * Configures the log file path at runtime.
   *
   * Call this to enable or change file logging. Setting to `null` disables
   * file logging (but doesn't close existing file handle immediately).
   * @param filePath - Path to the log file, or null to disable
   * @example
   * ```typescript
   * // Enable file logging at runtime
   * logger.setLogFile('/var/log/claude-hooks.log');
   *
   * // Disable file logging
   * logger.setLogFile(null);
   * ```
   */
  setLogFile(filePath) {
    if (this.logFileFd !== null) {
      try {
        closeSync(this.logFileFd);
      } catch (closeError) {
        process.stderr.write(`[claude-code-hooks] Failed to close log file: ${String(closeError)}
`);
      }
      this.logFileFd = null;
    }
    this.logFilePath = filePath;
    this.fileInitialized = false;
  }
  /**
   * Closes all resources held by the logger.
   *
   * Call this during graceful shutdown to ensure all log data is flushed.
   * @example
   * ```typescript
   * process.on('exit', () => {
   *   logger.close();
   * });
   * ```
   */
  close() {
    if (this.logFileFd !== null) {
      try {
        closeSync(this.logFileFd);
      } catch (closeError) {
        process.stderr.write(`[claude-code-hooks] Failed to close log file: ${String(closeError)}
`);
      }
      this.logFileFd = null;
    }
    this.fileInitialized = false;
  }
  /**
   * Checks if there are any active handlers or destinations.
   *
   * Returns true if any handlers are registered or file logging is enabled.
   * @returns Whether the logger has any active output destinations
   */
  hasDestinations() {
    for (const handlers of this.handlers.values()) {
      if (handlers.size > 0)
        return true;
    }
    return this.logFilePath !== null;
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Emits a log event.
   * @param level - The severity level of the event
   * @param message - The log message
   * @param context - Optional additional context data
   */
  emit(level, message, context) {
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Delivers an event to all registered destinations.
   * @param event - The log event to deliver
   */
  deliverEvent(event) {
    const levelHandlers = this.handlers.get(event.level);
    if (levelHandlers) {
      for (const handler of levelHandlers) {
        try {
          handler(event);
        } catch (handlerError) {
          process.stderr.write(`[claude-code-hooks] Log handler error: ${String(handlerError)}
`);
        }
      }
    }
    this.writeToFile(event);
  }
  /**
   * Writes an event to the log file.
   * @param event - The log event to write
   */
  writeToFile(event) {
    if (!this.logFilePath)
      return;
    if (!this.fileInitialized) {
      this.initializeFile();
    }
    if (this.logFileFd === null)
      return;
    try {
      const line = `${JSON.stringify(event)}
`;
      writeSync(this.logFileFd, line);
    } catch (writeError) {
      this.logFileFd = null;
      this.fileInitialized = false;
      process.stderr.write(`[claude-code-hooks] Log file write failed: ${String(writeError)}
`);
    }
  }
  /**
   * Initializes the log file for writing.
   */
  initializeFile() {
    this.fileInitialized = true;
    if (!this.logFilePath)
      return;
    try {
      const dir = dirname3(this.logFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      this.logFileFd = openSync(this.logFilePath, "a");
    } catch {
      this.logFileFd = null;
    }
  }
  /**
   * Extracts structured error information from an unknown error.
   * @param error - The error to extract information from
   * @returns Structured error information
   */
  extractErrorInfo(error) {
    if (error instanceof Error) {
      const info = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      if (error.cause !== void 0) {
        info.cause = this.extractErrorInfo(error.cause);
      }
      return info;
    }
    return {
      name: "UnknownError",
      message: String(error)
    };
  }
};
var logger = new Logger({
  logEnvVar: process.env.CLAUDE_CODE_HOOKS_LOG_ENV_VAR ?? "CLAUDE_CODE_HOOKS_LOG_FILE"
});

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
var EXIT_CODES = {
  /** Handler completed successfully. Claude Code parses stdout as JSON. */
  SUCCESS: 0,
  /** Non-blocking error occurred (e.g., invalid input). stderr shown to user only. */
  ERROR: 1,
  /** Handler threw exception OR blocking action requested. stderr shown to Claude. */
  BLOCK: 2
};
function createSimpleOutputBuilder(hookType) {
  return (options = {}) => ({
    _type: hookType,
    stdout: options
  });
}
var worktreeCreateOutput = /* @__PURE__ */ createSimpleOutputBuilder("WorktreeCreate");

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
async function readStdin() {
  return new Promise((resolve2, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      chunks.push(chunk);
    });
    process.stdin.on("end", () => {
      resolve2(chunks.join(""));
    });
    process.stdin.on("error", (error) => {
      reject(error);
    });
  });
}
function parseStdinInput(stdinContent) {
  const rawInput = JSON.parse(stdinContent);
  return rawInput;
}
function writeStdout(output) {
  process.stdout.write(JSON.stringify(output));
}
function createMalformedInputOutput(error) {
  logger.error(`Invalid JSON input: ${error instanceof Error ? error.message : String(error)}`);
  return { stdout: {} };
}
function handleHandlerError(error) {
  if (error instanceof Error) {
    process.stderr.write(`${error.stack ?? error.message}
`);
  } else {
    process.stderr.write(`${String(error)}
`);
  }
  logger.error(`Hook handler error: ${error instanceof Error ? error.message : String(error)}`);
  logger.clearContext();
  logger.close();
  process.exit(EXIT_CODES.BLOCK);
}
function convertToHookOutput(specificOutput) {
  const { stdout, stderr } = specificOutput;
  return stderr !== void 0 ? { stdout, stderr } : { stdout };
}
async function execute(hookFn) {
  let output;
  try {
    let stdinContent;
    try {
      stdinContent = await readStdin();
    } catch (error) {
      logger.logError(error, "Failed to read stdin");
      output = createMalformedInputOutput(error);
      return;
    }
    let input;
    try {
      input = parseStdinInput(stdinContent);
    } catch (error) {
      logger.logError(error, "Failed to parse stdin JSON");
      output = createMalformedInputOutput(error);
      return;
    }
    const hookEventName = hookFn.hookEventName;
    logger.setContext(hookEventName, input);
    const context = hookEventName === "SessionStart" ? { logger, persistEnvVar, persistEnvVars } : { logger };
    try {
      const specificOutput = await hookFn(input, context);
      if (specificOutput !== null) {
        output = convertToHookOutput(specificOutput);
      }
    } catch (error) {
      handleHandlerError(error);
    }
  } finally {
    if (output !== void 0) {
      writeStdout(output.stdout);
    }
    logger.clearContext();
    logger.close();
    if (output?.stderr !== void 0) {
      process.stderr.write(output.stderr);
      process.exit(EXIT_CODES.BLOCK);
    }
    process.exit(EXIT_CODES.SUCCESS);
  }
}

// src/worktree-create.ts
var worktree_create_default = worktreeCreateHook({}, async (input, { logger: logger2 }) => {
  const start = Date.now();
  const cardId = process.env["CARD_ID"] || void 0;
  logger2.info("WorktreeCreate", {
    event: "WorktreeCreate",
    name: input.name,
    cwd: input.cwd,
    cardId: cardId ?? null
  });
  const { path: worktreePath, settle } = await createWorktree(input.name, {
    cwd: input.cwd,
    ...cardId !== void 0 ? { cardId } : {}
  });
  const result = await settle;
  logger2.info("WorktreeCreate complete", {
    event: "WorktreeCreate",
    name: input.name,
    worktreePath,
    cardId: cardId ?? null,
    elapsedMs: Date.now() - start,
    result
  });
  return worktreeCreateOutput({
    hookSpecificOutput: {
      hookEventName: "WorktreeCreate",
      worktreePath
    }
  });
});

// src/worktree-create-entry.ts
execute(worktree_create_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vd29ya3NwYWNlL25vZGVfbW9kdWxlcy9pZ25vcmUvaW5kZXguanMiLCAiLi4vc2RrL3NyYy93b3JrdHJlZS50cyIsICIuLi9zZGsvc3JjL2NhcmRzLWNvbmZpZy50cyIsICIuLi9zZGsvc3JjL3dvcmt0cmVlSW5jbHVkZS50cyIsICIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi93b3Jrc3BhY2Uvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2Vudi5qcyIsICIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi93b3Jrc3BhY2Uvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2hvb2tzLmpzIiwgIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3dvcmtzcGFjZS9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvbG9nZ2VyLmpzIiwgIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3dvcmtzcGFjZS9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3Qvb3V0cHV0cy5qcyIsICIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi93b3Jrc3BhY2Uvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMiLCAic3JjL3dvcmt0cmVlLWNyZWF0ZS50cyIsICJzcmMvd29ya3RyZWUtY3JlYXRlLWVudHJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyBBIHNpbXBsZSBpbXBsZW1lbnRhdGlvbiBvZiBtYWtlLWFycmF5XG5mdW5jdGlvbiBtYWtlQXJyYXkgKHN1YmplY3QpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoc3ViamVjdClcbiAgICA/IHN1YmplY3RcbiAgICA6IFtzdWJqZWN0XVxufVxuXG5jb25zdCBVTkRFRklORUQgPSB1bmRlZmluZWRcbmNvbnN0IEVNUFRZID0gJydcbmNvbnN0IFNQQUNFID0gJyAnXG5jb25zdCBFU0NBUEUgPSAnXFxcXCdcbmNvbnN0IFJFR0VYX1RFU1RfQkxBTktfTElORSA9IC9eXFxzKyQvXG5jb25zdCBSRUdFWF9JTlZBTElEX1RSQUlMSU5HX0JBQ0tTTEFTSCA9IC8oPzpbXlxcXFxdfF4pXFxcXCQvXG5jb25zdCBSRUdFWF9SRVBMQUNFX0xFQURJTkdfRVhDQVBFRF9FWENMQU1BVElPTiA9IC9eXFxcXCEvXG5jb25zdCBSRUdFWF9SRVBMQUNFX0xFQURJTkdfRVhDQVBFRF9IQVNIID0gL15cXFxcIy9cbmNvbnN0IFJFR0VYX1NQTElUQUxMX0NSTEYgPSAvXFxyP1xcbi9nXG5cbi8vIEludmFsaWQ6XG4vLyAtIC9mb28sXG4vLyAtIC4vZm9vLFxuLy8gLSAuLi9mb28sXG4vLyAtIC5cbi8vIC0gLi5cbi8vIFZhbGlkOlxuLy8gLSAuZm9vXG5jb25zdCBSRUdFWF9URVNUX0lOVkFMSURfUEFUSCA9IC9eXFwuezAsMn1cXC98XlxcLnsxLDJ9JC9cblxuY29uc3QgUkVHRVhfVEVTVF9UUkFJTElOR19TTEFTSCA9IC9cXC8kL1xuXG5jb25zdCBTTEFTSCA9ICcvJ1xuXG4vLyBEbyBub3QgdXNlIHRlcm5hcnkgZXhwcmVzc2lvbiBoZXJlLCBzaW5jZSBcImlzdGFuYnVsIGlnbm9yZSBuZXh0XCIgaXMgYnVnZ3lcbmxldCBUTVBfS0VZX0lHTk9SRSA9ICdub2RlLWlnbm9yZSdcbi8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG5pZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgVE1QX0tFWV9JR05PUkUgPSBTeW1ib2wuZm9yKCdub2RlLWlnbm9yZScpXG59XG5jb25zdCBLRVlfSUdOT1JFID0gVE1QX0tFWV9JR05PUkVcblxuY29uc3QgZGVmaW5lID0gKG9iamVjdCwga2V5LCB2YWx1ZSkgPT4ge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBrZXksIHt2YWx1ZX0pXG4gIHJldHVybiB2YWx1ZVxufVxuXG5jb25zdCBSRUdFWF9SRUdFWFBfUkFOR0UgPSAvKFswLXpdKS0oWzAtel0pL2dcblxuY29uc3QgUkVUVVJOX0ZBTFNFID0gKCkgPT4gZmFsc2VcblxuLy8gU2FuaXRpemUgdGhlIHJhbmdlIG9mIGEgcmVndWxhciBleHByZXNzaW9uXG4vLyBUaGUgY2FzZXMgYXJlIGNvbXBsaWNhdGVkLCBzZWUgdGVzdCBjYXNlcyBmb3IgZGV0YWlsc1xuY29uc3Qgc2FuaXRpemVSYW5nZSA9IHJhbmdlID0+IHJhbmdlLnJlcGxhY2UoXG4gIFJFR0VYX1JFR0VYUF9SQU5HRSxcbiAgKG1hdGNoLCBmcm9tLCB0bykgPT4gZnJvbS5jaGFyQ29kZUF0KDApIDw9IHRvLmNoYXJDb2RlQXQoMClcbiAgICA/IG1hdGNoXG4gICAgLy8gSW52YWxpZCByYW5nZSAob3V0IG9mIG9yZGVyKSB3aGljaCBpcyBvayBmb3IgZ2l0aWdub3JlIHJ1bGVzIGJ1dFxuICAgIC8vICAgZmF0YWwgZm9yIEphdmFTY3JpcHQgcmVndWxhciBleHByZXNzaW9uLCBzbyBlbGltaW5hdGUgaXQuXG4gICAgOiBFTVBUWVxuKVxuXG4vLyBTZWUgZml4dHVyZXMgIzU5XG5jb25zdCBjbGVhblJhbmdlQmFja1NsYXNoID0gc2xhc2hlcyA9PiB7XG4gIGNvbnN0IHtsZW5ndGh9ID0gc2xhc2hlc1xuICByZXR1cm4gc2xhc2hlcy5zbGljZSgwLCBsZW5ndGggLSBsZW5ndGggJSAyKVxufVxuXG4vLyA+IElmIHRoZSBwYXR0ZXJuIGVuZHMgd2l0aCBhIHNsYXNoLFxuLy8gPiBpdCBpcyByZW1vdmVkIGZvciB0aGUgcHVycG9zZSBvZiB0aGUgZm9sbG93aW5nIGRlc2NyaXB0aW9uLFxuLy8gPiBidXQgaXQgd291bGQgb25seSBmaW5kIGEgbWF0Y2ggd2l0aCBhIGRpcmVjdG9yeS5cbi8vID4gSW4gb3RoZXIgd29yZHMsIGZvby8gd2lsbCBtYXRjaCBhIGRpcmVjdG9yeSBmb28gYW5kIHBhdGhzIHVuZGVybmVhdGggaXQsXG4vLyA+IGJ1dCB3aWxsIG5vdCBtYXRjaCBhIHJlZ3VsYXIgZmlsZSBvciBhIHN5bWJvbGljIGxpbmsgZm9vXG4vLyA+ICAodGhpcyBpcyBjb25zaXN0ZW50IHdpdGggdGhlIHdheSBob3cgcGF0aHNwZWMgd29ya3MgaW4gZ2VuZXJhbCBpbiBHaXQpLlxuLy8gJ2Bmb28vYCcgd2lsbCBub3QgbWF0Y2ggcmVndWxhciBmaWxlICdgZm9vYCcgb3Igc3ltYm9saWMgbGluayAnYGZvb2AnXG4vLyAtPiBpZ25vcmUtcnVsZXMgd2lsbCBub3QgZGVhbCB3aXRoIGl0LCBiZWNhdXNlIGl0IGNvc3RzIGV4dHJhIGBmcy5zdGF0YCBjYWxsXG4vLyAgICAgIHlvdSBjb3VsZCB1c2Ugb3B0aW9uIGBtYXJrOiB0cnVlYCB3aXRoIGBnbG9iYFxuXG4vLyAnYGZvby9gJyBzaG91bGQgbm90IGNvbnRpbnVlIHdpdGggdGhlICdgLi5gJ1xuY29uc3QgUkVQTEFDRVJTID0gW1xuXG4gIFtcbiAgICAvLyBSZW1vdmUgQk9NXG4gICAgLy8gVE9ETzpcbiAgICAvLyBPdGhlciBzaW1pbGFyIHplcm8td2lkdGggY2hhcmFjdGVycz9cbiAgICAvXlxcdUZFRkYvLFxuICAgICgpID0+IEVNUFRZXG4gIF0sXG5cbiAgLy8gPiBUcmFpbGluZyBzcGFjZXMgYXJlIGlnbm9yZWQgdW5sZXNzIHRoZXkgYXJlIHF1b3RlZCB3aXRoIGJhY2tzbGFzaCAoXCJcXFwiKVxuICBbXG4gICAgLy8gKGFcXCApIC0+IChhIClcbiAgICAvLyAoYSAgKSAtPiAoYSlcbiAgICAvLyAoYSApIC0+IChhKVxuICAgIC8vIChhIFxcICkgLT4gKGEgIClcbiAgICAvKCg/OlxcXFxcXFxcKSo/KShcXFxcP1xccyspJC8sXG4gICAgKF8sIG0xLCBtMikgPT4gbTEgKyAoXG4gICAgICBtMi5pbmRleE9mKCdcXFxcJykgPT09IDBcbiAgICAgICAgPyBTUEFDRVxuICAgICAgICA6IEVNUFRZXG4gICAgKVxuICBdLFxuXG4gIC8vIFJlcGxhY2UgKFxcICkgd2l0aCAnICdcbiAgLy8gKFxcICkgLT4gJyAnXG4gIC8vIChcXFxcICkgLT4gJ1xcXFwgJ1xuICAvLyAoXFxcXFxcICkgLT4gJ1xcXFwgJ1xuICBbXG4gICAgLyhcXFxcKz8pXFxzL2csXG4gICAgKF8sIG0xKSA9PiB7XG4gICAgICBjb25zdCB7bGVuZ3RofSA9IG0xXG4gICAgICByZXR1cm4gbTEuc2xpY2UoMCwgbGVuZ3RoIC0gbGVuZ3RoICUgMikgKyBTUEFDRVxuICAgIH1cbiAgXSxcblxuICAvLyBFc2NhcGUgbWV0YWNoYXJhY3RlcnNcbiAgLy8gd2hpY2ggaXMgd3JpdHRlbiBkb3duIGJ5IHVzZXJzIGJ1dCBtZWFucyBzcGVjaWFsIGZvciByZWd1bGFyIGV4cHJlc3Npb25zLlxuXG4gIC8vID4gVGhlcmUgYXJlIDEyIGNoYXJhY3RlcnMgd2l0aCBzcGVjaWFsIG1lYW5pbmdzOlxuICAvLyA+IC0gdGhlIGJhY2tzbGFzaCBcXCxcbiAgLy8gPiAtIHRoZSBjYXJldCBeLFxuICAvLyA+IC0gdGhlIGRvbGxhciBzaWduICQsXG4gIC8vID4gLSB0aGUgcGVyaW9kIG9yIGRvdCAuLFxuICAvLyA+IC0gdGhlIHZlcnRpY2FsIGJhciBvciBwaXBlIHN5bWJvbCB8LFxuICAvLyA+IC0gdGhlIHF1ZXN0aW9uIG1hcmsgPyxcbiAgLy8gPiAtIHRoZSBhc3RlcmlzayBvciBzdGFyICosXG4gIC8vID4gLSB0aGUgcGx1cyBzaWduICssXG4gIC8vID4gLSB0aGUgb3BlbmluZyBwYXJlbnRoZXNpcyAoLFxuICAvLyA+IC0gdGhlIGNsb3NpbmcgcGFyZW50aGVzaXMgKSxcbiAgLy8gPiAtIGFuZCB0aGUgb3BlbmluZyBzcXVhcmUgYnJhY2tldCBbLFxuICAvLyA+IC0gdGhlIG9wZW5pbmcgY3VybHkgYnJhY2UgeyxcbiAgLy8gPiBUaGVzZSBzcGVjaWFsIGNoYXJhY3RlcnMgYXJlIG9mdGVuIGNhbGxlZCBcIm1ldGFjaGFyYWN0ZXJzXCIuXG4gIFtcbiAgICAvW1xcXFwkLnwqKygpe15dL2csXG4gICAgbWF0Y2ggPT4gYFxcXFwke21hdGNofWBcbiAgXSxcblxuICBbXG4gICAgLy8gPiBhIHF1ZXN0aW9uIG1hcmsgKD8pIG1hdGNoZXMgYSBzaW5nbGUgY2hhcmFjdGVyXG4gICAgLyg/IVxcXFwpXFw/L2csXG4gICAgKCkgPT4gJ1teL10nXG4gIF0sXG5cbiAgLy8gbGVhZGluZyBzbGFzaFxuICBbXG5cbiAgICAvLyA+IEEgbGVhZGluZyBzbGFzaCBtYXRjaGVzIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHBhdGhuYW1lLlxuICAgIC8vID4gRm9yIGV4YW1wbGUsIFwiLyouY1wiIG1hdGNoZXMgXCJjYXQtZmlsZS5jXCIgYnV0IG5vdCBcIm1vemlsbGEtc2hhMS9zaGExLmNcIi5cbiAgICAvLyBBIGxlYWRpbmcgc2xhc2ggbWF0Y2hlcyB0aGUgYmVnaW5uaW5nIG9mIHRoZSBwYXRobmFtZVxuICAgIC9eXFwvLyxcbiAgICAoKSA9PiAnXidcbiAgXSxcblxuICAvLyByZXBsYWNlIHNwZWNpYWwgbWV0YWNoYXJhY3RlciBzbGFzaCBhZnRlciB0aGUgbGVhZGluZyBzbGFzaFxuICBbXG4gICAgL1xcLy9nLFxuICAgICgpID0+ICdcXFxcLydcbiAgXSxcblxuICBbXG4gICAgLy8gPiBBIGxlYWRpbmcgXCIqKlwiIGZvbGxvd2VkIGJ5IGEgc2xhc2ggbWVhbnMgbWF0Y2ggaW4gYWxsIGRpcmVjdG9yaWVzLlxuICAgIC8vID4gRm9yIGV4YW1wbGUsIFwiKiovZm9vXCIgbWF0Y2hlcyBmaWxlIG9yIGRpcmVjdG9yeSBcImZvb1wiIGFueXdoZXJlLFxuICAgIC8vID4gdGhlIHNhbWUgYXMgcGF0dGVybiBcImZvb1wiLlxuICAgIC8vID4gXCIqKi9mb28vYmFyXCIgbWF0Y2hlcyBmaWxlIG9yIGRpcmVjdG9yeSBcImJhclwiIGFueXdoZXJlIHRoYXQgaXMgZGlyZWN0bHlcbiAgICAvLyA+ICAgdW5kZXIgZGlyZWN0b3J5IFwiZm9vXCIuXG4gICAgLy8gTm90aWNlIHRoYXQgdGhlICcqJ3MgaGF2ZSBiZWVuIHJlcGxhY2VkIGFzICdcXFxcKidcbiAgICAvXlxcXipcXFxcXFwqXFxcXFxcKlxcXFxcXC8vLFxuXG4gICAgLy8gJyoqL2ZvbycgPC0+ICdmb28nXG4gICAgKCkgPT4gJ14oPzouKlxcXFwvKT8nXG4gIF0sXG5cbiAgLy8gc3RhcnRpbmdcbiAgW1xuICAgIC8vIHRoZXJlIHdpbGwgYmUgbm8gbGVhZGluZyAnLydcbiAgICAvLyAgICh3aGljaCBoYXMgYmVlbiByZXBsYWNlZCBieSBzZWN0aW9uIFwibGVhZGluZyBzbGFzaFwiKVxuICAgIC8vIElmIHN0YXJ0cyB3aXRoICcqKicsIGFkZGluZyBhICdeJyB0byB0aGUgcmVndWxhciBleHByZXNzaW9uIGFsc28gd29ya3NcbiAgICAvXig/PVteXl0pLyxcbiAgICBmdW5jdGlvbiBzdGFydGluZ1JlcGxhY2VyICgpIHtcbiAgICAgIC8vIElmIGhhcyBhIHNsYXNoIGAvYCBhdCB0aGUgYmVnaW5uaW5nIG9yIG1pZGRsZVxuICAgICAgcmV0dXJuICEvXFwvKD8hJCkvLnRlc3QodGhpcylcbiAgICAgICAgLy8gPiBQcmlvciB0byAyLjIyLjFcbiAgICAgICAgLy8gPiBJZiB0aGUgcGF0dGVybiBkb2VzIG5vdCBjb250YWluIGEgc2xhc2ggLyxcbiAgICAgICAgLy8gPiAgIEdpdCB0cmVhdHMgaXQgYXMgYSBzaGVsbCBnbG9iIHBhdHRlcm5cbiAgICAgICAgLy8gQWN0dWFsbHksIGlmIHRoZXJlIGlzIG9ubHkgYSB0cmFpbGluZyBzbGFzaCxcbiAgICAgICAgLy8gICBnaXQgYWxzbyB0cmVhdHMgaXQgYXMgYSBzaGVsbCBnbG9iIHBhdHRlcm5cblxuICAgICAgICAvLyBBZnRlciAyLjIyLjEgKGNvbXBhdGlibGUgYnV0IGNsZWFyZXIpXG4gICAgICAgIC8vID4gSWYgdGhlcmUgaXMgYSBzZXBhcmF0b3IgYXQgdGhlIGJlZ2lubmluZyBvciBtaWRkbGUgKG9yIGJvdGgpXG4gICAgICAgIC8vID4gb2YgdGhlIHBhdHRlcm4sIHRoZW4gdGhlIHBhdHRlcm4gaXMgcmVsYXRpdmUgdG8gdGhlIGRpcmVjdG9yeVxuICAgICAgICAvLyA+IGxldmVsIG9mIHRoZSBwYXJ0aWN1bGFyIC5naXRpZ25vcmUgZmlsZSBpdHNlbGYuXG4gICAgICAgIC8vID4gT3RoZXJ3aXNlIHRoZSBwYXR0ZXJuIG1heSBhbHNvIG1hdGNoIGF0IGFueSBsZXZlbCBiZWxvd1xuICAgICAgICAvLyA+IHRoZSAuZ2l0aWdub3JlIGxldmVsLlxuICAgICAgICA/ICcoPzpefFxcXFwvKSdcblxuICAgICAgICAvLyA+IE90aGVyd2lzZSwgR2l0IHRyZWF0cyB0aGUgcGF0dGVybiBhcyBhIHNoZWxsIGdsb2Igc3VpdGFibGUgZm9yXG4gICAgICAgIC8vID4gICBjb25zdW1wdGlvbiBieSBmbm1hdGNoKDMpXG4gICAgICAgIDogJ14nXG4gICAgfVxuICBdLFxuXG4gIC8vIHR3byBnbG9ic3RhcnNcbiAgW1xuICAgIC8vIFVzZSBsb29rYWhlYWQgYXNzZXJ0aW9ucyBzbyB0aGF0IHdlIGNvdWxkIG1hdGNoIG1vcmUgdGhhbiBvbmUgYCcvKionYFxuICAgIC9cXFxcXFwvXFxcXFxcKlxcXFxcXCooPz1cXFxcXFwvfCQpL2csXG5cbiAgICAvLyBaZXJvLCBvbmUgb3Igc2V2ZXJhbCBkaXJlY3Rvcmllc1xuICAgIC8vIHNob3VsZCBub3QgdXNlICcqJywgb3IgaXQgd2lsbCBiZSByZXBsYWNlZCBieSB0aGUgbmV4dCByZXBsYWNlclxuXG4gICAgLy8gQ2hlY2sgaWYgaXQgaXMgbm90IHRoZSBsYXN0IGAnLyoqJ2BcbiAgICAoXywgaW5kZXgsIHN0cikgPT4gaW5kZXggKyA2IDwgc3RyLmxlbmd0aFxuXG4gICAgICAvLyBjYXNlOiAvKiovXG4gICAgICAvLyA+IEEgc2xhc2ggZm9sbG93ZWQgYnkgdHdvIGNvbnNlY3V0aXZlIGFzdGVyaXNrcyB0aGVuIGEgc2xhc2ggbWF0Y2hlc1xuICAgICAgLy8gPiAgIHplcm8gb3IgbW9yZSBkaXJlY3Rvcmllcy5cbiAgICAgIC8vID4gRm9yIGV4YW1wbGUsIFwiYS8qKi9iXCIgbWF0Y2hlcyBcImEvYlwiLCBcImEveC9iXCIsIFwiYS94L3kvYlwiIGFuZCBzbyBvbi5cbiAgICAgIC8vICcvKiovJ1xuICAgICAgPyAnKD86XFxcXC9bXlxcXFwvXSspKidcblxuICAgICAgLy8gY2FzZTogLyoqXG4gICAgICAvLyA+IEEgdHJhaWxpbmcgYFwiLyoqXCJgIG1hdGNoZXMgZXZlcnl0aGluZyBpbnNpZGUuXG5cbiAgICAgIC8vICMyMTogZXZlcnl0aGluZyBpbnNpZGUgYnV0IGl0IHNob3VsZCBub3QgaW5jbHVkZSB0aGUgY3VycmVudCBmb2xkZXJcbiAgICAgIDogJ1xcXFwvLisnXG4gIF0sXG5cbiAgLy8gbm9ybWFsIGludGVybWVkaWF0ZSB3aWxkY2FyZHNcbiAgW1xuICAgIC8vIE5ldmVyIHJlcGxhY2UgZXNjYXBlZCAnKidcbiAgICAvLyBpZ25vcmUgcnVsZSAnXFwqJyB3aWxsIG1hdGNoIHRoZSBwYXRoICcqJ1xuXG4gICAgLy8gJ2FiYy4qLycgLT4gZ29cbiAgICAvLyAnYWJjLionICAtPiBza2lwIHRoaXMgcnVsZSxcbiAgICAvLyAgICBjb3ogdHJhaWxpbmcgc2luZ2xlIHdpbGRjYXJkIHdpbGwgYmUgaGFuZGVkIGJ5IFt0cmFpbGluZyB3aWxkY2FyZF1cbiAgICAvKF58W15cXFxcXSspKFxcXFxcXCopKyg/PS4rKS9nLFxuXG4gICAgLy8gJyouanMnIG1hdGNoZXMgJy5qcydcbiAgICAvLyAnKi5qcycgZG9lc24ndCBtYXRjaCAnYWJjJ1xuICAgIChfLCBwMSwgcDIpID0+IHtcbiAgICAgIC8vIDEuXG4gICAgICAvLyA+IEFuIGFzdGVyaXNrIFwiKlwiIG1hdGNoZXMgYW55dGhpbmcgZXhjZXB0IGEgc2xhc2guXG4gICAgICAvLyAyLlxuICAgICAgLy8gPiBPdGhlciBjb25zZWN1dGl2ZSBhc3Rlcmlza3MgYXJlIGNvbnNpZGVyZWQgcmVndWxhciBhc3Rlcmlza3NcbiAgICAgIC8vID4gYW5kIHdpbGwgbWF0Y2ggYWNjb3JkaW5nIHRvIHRoZSBwcmV2aW91cyBydWxlcy5cbiAgICAgIGNvbnN0IHVuZXNjYXBlZCA9IHAyLnJlcGxhY2UoL1xcXFxcXCovZywgJ1teXFxcXC9dKicpXG4gICAgICByZXR1cm4gcDEgKyB1bmVzY2FwZWRcbiAgICB9XG4gIF0sXG5cbiAgW1xuICAgIC8vIHVuZXNjYXBlLCByZXZlcnQgc3RlcCAzIGV4Y2VwdCBmb3IgYmFjayBzbGFzaFxuICAgIC8vIEZvciBleGFtcGxlLCBpZiBhIHVzZXIgZXNjYXBlIGEgJ1xcXFwqJyxcbiAgICAvLyBhZnRlciBzdGVwIDMsIHRoZSByZXN1bHQgd2lsbCBiZSAnXFxcXFxcXFxcXFxcKidcbiAgICAvXFxcXFxcXFxcXFxcKD89WyQufCorKCl7Xl0pL2csXG4gICAgKCkgPT4gRVNDQVBFXG4gIF0sXG5cbiAgW1xuICAgIC8vICdcXFxcXFxcXCcgLT4gJ1xcXFwnXG4gICAgL1xcXFxcXFxcL2csXG4gICAgKCkgPT4gRVNDQVBFXG4gIF0sXG5cbiAgW1xuICAgIC8vID4gVGhlIHJhbmdlIG5vdGF0aW9uLCBlLmcuIFthLXpBLVpdLFxuICAgIC8vID4gY2FuIGJlIHVzZWQgdG8gbWF0Y2ggb25lIG9mIHRoZSBjaGFyYWN0ZXJzIGluIGEgcmFuZ2UuXG5cbiAgICAvLyBgXFxgIGlzIGVzY2FwZWQgYnkgc3RlcCAzXG4gICAgLyhcXFxcKT9cXFsoW15cXF0vXSo/KShcXFxcKikoJHxcXF0pL2csXG4gICAgKG1hdGNoLCBsZWFkRXNjYXBlLCByYW5nZSwgZW5kRXNjYXBlLCBjbG9zZSkgPT4gbGVhZEVzY2FwZSA9PT0gRVNDQVBFXG4gICAgICAvLyAnXFxcXFtiYXJdJyAtPiAnXFxcXFxcXFxbYmFyXFxcXF0nXG4gICAgICA/IGBcXFxcWyR7cmFuZ2V9JHtjbGVhblJhbmdlQmFja1NsYXNoKGVuZEVzY2FwZSl9JHtjbG9zZX1gXG4gICAgICA6IGNsb3NlID09PSAnXSdcbiAgICAgICAgPyBlbmRFc2NhcGUubGVuZ3RoICUgMiA9PT0gMFxuICAgICAgICAgIC8vIEEgbm9ybWFsIGNhc2UsIGFuZCBpdCBpcyBhIHJhbmdlIG5vdGF0aW9uXG4gICAgICAgICAgLy8gJ1tiYXJdJ1xuICAgICAgICAgIC8vICdbYmFyXFxcXFxcXFxdJ1xuICAgICAgICAgID8gYFske3Nhbml0aXplUmFuZ2UocmFuZ2UpfSR7ZW5kRXNjYXBlfV1gXG4gICAgICAgICAgLy8gSW52YWxpZCByYW5nZSBub3RhdG9uXG4gICAgICAgICAgLy8gJ1tiYXJcXFxcXScgLT4gJ1tiYXJcXFxcXFxcXF0nXG4gICAgICAgICAgOiAnW10nXG4gICAgICAgIDogJ1tdJ1xuICBdLFxuXG4gIC8vIGVuZGluZ1xuICBbXG4gICAgLy8gJ2pzJyB3aWxsIG5vdCBtYXRjaCAnanMuJ1xuICAgIC8vICdhYicgd2lsbCBub3QgbWF0Y2ggJ2FiYydcbiAgICAvKD86W14qXSkkLyxcblxuICAgIC8vIFdURiFcbiAgICAvLyBodHRwczovL2dpdC1zY20uY29tL2RvY3MvZ2l0aWdub3JlXG4gICAgLy8gY2hhbmdlcyBpbiBbMi4yMi4xXShodHRwczovL2dpdC1zY20uY29tL2RvY3MvZ2l0aWdub3JlLzIuMjIuMSlcbiAgICAvLyB3aGljaCByZS1maXhlcyAjMjQsICMzOFxuXG4gICAgLy8gPiBJZiB0aGVyZSBpcyBhIHNlcGFyYXRvciBhdCB0aGUgZW5kIG9mIHRoZSBwYXR0ZXJuIHRoZW4gdGhlIHBhdHRlcm5cbiAgICAvLyA+IHdpbGwgb25seSBtYXRjaCBkaXJlY3Rvcmllcywgb3RoZXJ3aXNlIHRoZSBwYXR0ZXJuIGNhbiBtYXRjaCBib3RoXG4gICAgLy8gPiBmaWxlcyBhbmQgZGlyZWN0b3JpZXMuXG5cbiAgICAvLyAnanMqJyB3aWxsIG5vdCBtYXRjaCAnYS5qcydcbiAgICAvLyAnanMvJyB3aWxsIG5vdCBtYXRjaCAnYS5qcydcbiAgICAvLyAnanMnIHdpbGwgbWF0Y2ggJ2EuanMnIGFuZCAnYS5qcy8nXG4gICAgbWF0Y2ggPT4gL1xcLyQvLnRlc3QobWF0Y2gpXG4gICAgICAvLyBmb28vIHdpbGwgbm90IG1hdGNoICdmb28nXG4gICAgICA/IGAke21hdGNofSRgXG4gICAgICAvLyBmb28gbWF0Y2hlcyAnZm9vJyBhbmQgJ2Zvby8nXG4gICAgICA6IGAke21hdGNofSg/PSR8XFxcXC8kKWBcbiAgXVxuXVxuXG5jb25zdCBSRUdFWF9SRVBMQUNFX1RSQUlMSU5HX1dJTERDQVJEID0gLyhefFxcXFxcXC8pP1xcXFxcXCokL1xuY29uc3QgTU9ERV9JR05PUkUgPSAncmVnZXgnXG5jb25zdCBNT0RFX0NIRUNLX0lHTk9SRSA9ICdjaGVja1JlZ2V4J1xuY29uc3QgVU5ERVJTQ09SRSA9ICdfJ1xuXG5jb25zdCBUUkFJTElOR19XSUxEX0NBUkRfUkVQTEFDRVJTID0ge1xuICBbTU9ERV9JR05PUkVdIChfLCBwMSkge1xuICAgIGNvbnN0IHByZWZpeCA9IHAxXG4gICAgICAvLyAnXFxeJzpcbiAgICAgIC8vICcvKicgZG9lcyBub3QgbWF0Y2ggRU1QVFlcbiAgICAgIC8vICcvKicgZG9lcyBub3QgbWF0Y2ggZXZlcnl0aGluZ1xuXG4gICAgICAvLyAnXFxcXFxcLyc6XG4gICAgICAvLyAnYWJjLyonIGRvZXMgbm90IG1hdGNoICdhYmMvJ1xuICAgICAgPyBgJHtwMX1bXi9dK2BcblxuICAgICAgLy8gJ2EqJyBtYXRjaGVzICdhJ1xuICAgICAgLy8gJ2EqJyBtYXRjaGVzICdhYSdcbiAgICAgIDogJ1teL10qJ1xuXG4gICAgcmV0dXJuIGAke3ByZWZpeH0oPz0kfFxcXFwvJClgXG4gIH0sXG5cbiAgW01PREVfQ0hFQ0tfSUdOT1JFXSAoXywgcDEpIHtcbiAgICAvLyBXaGVuIGRvaW5nIGBnaXQgY2hlY2staWdub3JlYFxuICAgIGNvbnN0IHByZWZpeCA9IHAxXG4gICAgICAvLyAnXFxcXFxcLyc6XG4gICAgICAvLyAnYWJjLyonIERPRVMgbWF0Y2ggJ2FiYy8nICFcbiAgICAgID8gYCR7cDF9W14vXSpgXG5cbiAgICAgIC8vICdhKicgbWF0Y2hlcyAnYSdcbiAgICAgIC8vICdhKicgbWF0Y2hlcyAnYWEnXG4gICAgICA6ICdbXi9dKidcblxuICAgIHJldHVybiBgJHtwcmVmaXh9KD89JHxcXFxcLyQpYFxuICB9XG59XG5cbi8vIEBwYXJhbSB7cGF0dGVybn1cbmNvbnN0IG1ha2VSZWdleFByZWZpeCA9IHBhdHRlcm4gPT4gUkVQTEFDRVJTLnJlZHVjZShcbiAgKHByZXYsIFttYXRjaGVyLCByZXBsYWNlcl0pID0+XG4gICAgcHJldi5yZXBsYWNlKG1hdGNoZXIsIHJlcGxhY2VyLmJpbmQocGF0dGVybikpLFxuICBwYXR0ZXJuXG4pXG5cbmNvbnN0IGlzU3RyaW5nID0gc3ViamVjdCA9PiB0eXBlb2Ygc3ViamVjdCA9PT0gJ3N0cmluZydcblxuLy8gPiBBIGJsYW5rIGxpbmUgbWF0Y2hlcyBubyBmaWxlcywgc28gaXQgY2FuIHNlcnZlIGFzIGEgc2VwYXJhdG9yIGZvciByZWFkYWJpbGl0eS5cbmNvbnN0IGNoZWNrUGF0dGVybiA9IHBhdHRlcm4gPT4gcGF0dGVyblxuICAmJiBpc1N0cmluZyhwYXR0ZXJuKVxuICAmJiAhUkVHRVhfVEVTVF9CTEFOS19MSU5FLnRlc3QocGF0dGVybilcbiAgJiYgIVJFR0VYX0lOVkFMSURfVFJBSUxJTkdfQkFDS1NMQVNILnRlc3QocGF0dGVybilcblxuICAvLyA+IEEgbGluZSBzdGFydGluZyB3aXRoICMgc2VydmVzIGFzIGEgY29tbWVudC5cbiAgJiYgcGF0dGVybi5pbmRleE9mKCcjJykgIT09IDBcblxuY29uc3Qgc3BsaXRQYXR0ZXJuID0gcGF0dGVybiA9PiBwYXR0ZXJuXG4uc3BsaXQoUkVHRVhfU1BMSVRBTExfQ1JMRilcbi5maWx0ZXIoQm9vbGVhbilcblxuY2xhc3MgSWdub3JlUnVsZSB7XG4gIGNvbnN0cnVjdG9yIChcbiAgICBwYXR0ZXJuLFxuICAgIG1hcmssXG4gICAgYm9keSxcbiAgICBpZ25vcmVDYXNlLFxuICAgIG5lZ2F0aXZlLFxuICAgIHByZWZpeFxuICApIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuXG4gICAgdGhpcy5tYXJrID0gbWFya1xuICAgIHRoaXMubmVnYXRpdmUgPSBuZWdhdGl2ZVxuXG4gICAgZGVmaW5lKHRoaXMsICdib2R5JywgYm9keSlcbiAgICBkZWZpbmUodGhpcywgJ2lnbm9yZUNhc2UnLCBpZ25vcmVDYXNlKVxuICAgIGRlZmluZSh0aGlzLCAncmVnZXhQcmVmaXgnLCBwcmVmaXgpXG4gIH1cblxuICBnZXQgcmVnZXggKCkge1xuICAgIGNvbnN0IGtleSA9IFVOREVSU0NPUkUgKyBNT0RFX0lHTk9SRVxuXG4gICAgaWYgKHRoaXNba2V5XSkge1xuICAgICAgcmV0dXJuIHRoaXNba2V5XVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9tYWtlKE1PREVfSUdOT1JFLCBrZXkpXG4gIH1cblxuICBnZXQgY2hlY2tSZWdleCAoKSB7XG4gICAgY29uc3Qga2V5ID0gVU5ERVJTQ09SRSArIE1PREVfQ0hFQ0tfSUdOT1JFXG5cbiAgICBpZiAodGhpc1trZXldKSB7XG4gICAgICByZXR1cm4gdGhpc1trZXldXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX21ha2UoTU9ERV9DSEVDS19JR05PUkUsIGtleSlcbiAgfVxuXG4gIF9tYWtlIChtb2RlLCBrZXkpIHtcbiAgICBjb25zdCBzdHIgPSB0aGlzLnJlZ2V4UHJlZml4LnJlcGxhY2UoXG4gICAgICBSRUdFWF9SRVBMQUNFX1RSQUlMSU5HX1dJTERDQVJELFxuXG4gICAgICAvLyBJdCBkb2VzIG5vdCBuZWVkIHRvIGJpbmQgcGF0dGVyblxuICAgICAgVFJBSUxJTkdfV0lMRF9DQVJEX1JFUExBQ0VSU1ttb2RlXVxuICAgIClcblxuICAgIGNvbnN0IHJlZ2V4ID0gdGhpcy5pZ25vcmVDYXNlXG4gICAgICA/IG5ldyBSZWdFeHAoc3RyLCAnaScpXG4gICAgICA6IG5ldyBSZWdFeHAoc3RyKVxuXG4gICAgcmV0dXJuIGRlZmluZSh0aGlzLCBrZXksIHJlZ2V4KVxuICB9XG59XG5cbmNvbnN0IGNyZWF0ZVJ1bGUgPSAoe1xuICBwYXR0ZXJuLFxuICBtYXJrXG59LCBpZ25vcmVDYXNlKSA9PiB7XG4gIGxldCBuZWdhdGl2ZSA9IGZhbHNlXG4gIGxldCBib2R5ID0gcGF0dGVyblxuXG4gIC8vID4gQW4gb3B0aW9uYWwgcHJlZml4IFwiIVwiIHdoaWNoIG5lZ2F0ZXMgdGhlIHBhdHRlcm47XG4gIGlmIChib2R5LmluZGV4T2YoJyEnKSA9PT0gMCkge1xuICAgIG5lZ2F0aXZlID0gdHJ1ZVxuICAgIGJvZHkgPSBib2R5LnN1YnN0cigxKVxuICB9XG5cbiAgYm9keSA9IGJvZHlcbiAgLy8gPiBQdXQgYSBiYWNrc2xhc2ggKFwiXFxcIikgaW4gZnJvbnQgb2YgdGhlIGZpcnN0IFwiIVwiIGZvciBwYXR0ZXJucyB0aGF0XG4gIC8vID4gICBiZWdpbiB3aXRoIGEgbGl0ZXJhbCBcIiFcIiwgZm9yIGV4YW1wbGUsIGBcIlxcIWltcG9ydGFudCEudHh0XCJgLlxuICAucmVwbGFjZShSRUdFWF9SRVBMQUNFX0xFQURJTkdfRVhDQVBFRF9FWENMQU1BVElPTiwgJyEnKVxuICAvLyA+IFB1dCBhIGJhY2tzbGFzaCAoXCJcXFwiKSBpbiBmcm9udCBvZiB0aGUgZmlyc3QgaGFzaCBmb3IgcGF0dGVybnMgdGhhdFxuICAvLyA+ICAgYmVnaW4gd2l0aCBhIGhhc2guXG4gIC5yZXBsYWNlKFJFR0VYX1JFUExBQ0VfTEVBRElOR19FWENBUEVEX0hBU0gsICcjJylcblxuICBjb25zdCByZWdleFByZWZpeCA9IG1ha2VSZWdleFByZWZpeChib2R5KVxuXG4gIHJldHVybiBuZXcgSWdub3JlUnVsZShcbiAgICBwYXR0ZXJuLFxuICAgIG1hcmssXG4gICAgYm9keSxcbiAgICBpZ25vcmVDYXNlLFxuICAgIG5lZ2F0aXZlLFxuICAgIHJlZ2V4UHJlZml4XG4gIClcbn1cblxuY2xhc3MgUnVsZU1hbmFnZXIge1xuICBjb25zdHJ1Y3RvciAoaWdub3JlQ2FzZSkge1xuICAgIHRoaXMuX2lnbm9yZUNhc2UgPSBpZ25vcmVDYXNlXG4gICAgdGhpcy5fcnVsZXMgPSBbXVxuICB9XG5cbiAgX2FkZCAocGF0dGVybikge1xuICAgIC8vICMzMlxuICAgIGlmIChwYXR0ZXJuICYmIHBhdHRlcm5bS0VZX0lHTk9SRV0pIHtcbiAgICAgIHRoaXMuX3J1bGVzID0gdGhpcy5fcnVsZXMuY29uY2F0KHBhdHRlcm4uX3J1bGVzLl9ydWxlcylcbiAgICAgIHRoaXMuX2FkZGVkID0gdHJ1ZVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKGlzU3RyaW5nKHBhdHRlcm4pKSB7XG4gICAgICBwYXR0ZXJuID0ge1xuICAgICAgICBwYXR0ZXJuXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNoZWNrUGF0dGVybihwYXR0ZXJuLnBhdHRlcm4pKSB7XG4gICAgICBjb25zdCBydWxlID0gY3JlYXRlUnVsZShwYXR0ZXJuLCB0aGlzLl9pZ25vcmVDYXNlKVxuICAgICAgdGhpcy5fYWRkZWQgPSB0cnVlXG4gICAgICB0aGlzLl9ydWxlcy5wdXNoKHJ1bGUpXG4gICAgfVxuICB9XG5cbiAgLy8gQHBhcmFtIHtBcnJheTxzdHJpbmc+IHwgc3RyaW5nIHwgSWdub3JlfSBwYXR0ZXJuXG4gIGFkZCAocGF0dGVybikge1xuICAgIHRoaXMuX2FkZGVkID0gZmFsc2VcblxuICAgIG1ha2VBcnJheShcbiAgICAgIGlzU3RyaW5nKHBhdHRlcm4pXG4gICAgICAgID8gc3BsaXRQYXR0ZXJuKHBhdHRlcm4pXG4gICAgICAgIDogcGF0dGVyblxuICAgICkuZm9yRWFjaCh0aGlzLl9hZGQsIHRoaXMpXG5cbiAgICByZXR1cm4gdGhpcy5fYWRkZWRcbiAgfVxuXG4gIC8vIFRlc3Qgb25lIHNpbmdsZSBwYXRoIHdpdGhvdXQgcmVjdXJzaXZlbHkgY2hlY2tpbmcgcGFyZW50IGRpcmVjdG9yaWVzXG4gIC8vXG4gIC8vIC0gY2hlY2tVbmlnbm9yZWQgYGJvb2xlYW5gIHdoZXRoZXIgc2hvdWxkIGNoZWNrIGlmIHRoZSBwYXRoIGlzIHVuaWdub3JlZCxcbiAgLy8gICBzZXR0aW5nIGBjaGVja1VuaWdub3JlZGAgdG8gYGZhbHNlYCBjb3VsZCByZWR1Y2UgYWRkaXRpb25hbFxuICAvLyAgIHBhdGggbWF0Y2hpbmcuXG4gIC8vIC0gY2hlY2sgYHN0cmluZ2AgZWl0aGVyIGBNT0RFX0lHTk9SRWAgb3IgYE1PREVfQ0hFQ0tfSUdOT1JFYFxuXG4gIC8vIEByZXR1cm5zIHtUZXN0UmVzdWx0fSB0cnVlIGlmIGEgZmlsZSBpcyBpZ25vcmVkXG4gIHRlc3QgKHBhdGgsIGNoZWNrVW5pZ25vcmVkLCBtb2RlKSB7XG4gICAgbGV0IGlnbm9yZWQgPSBmYWxzZVxuICAgIGxldCB1bmlnbm9yZWQgPSBmYWxzZVxuICAgIGxldCBtYXRjaGVkUnVsZVxuXG4gICAgdGhpcy5fcnVsZXMuZm9yRWFjaChydWxlID0+IHtcbiAgICAgIGNvbnN0IHtuZWdhdGl2ZX0gPSBydWxlXG5cbiAgICAgIC8vICAgICAgICAgIHwgICAgICAgICAgIGlnbm9yZWQgOiB1bmlnbm9yZWRcbiAgICAgIC8vIC0tLS0tLS0tIHwgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBuZWdhdGl2ZSB8ICAgMDowICAgfCAgIDA6MSAgIHwgICAxOjAgICB8ICAgMToxXG4gICAgICAvLyAtLS0tLS0tLSB8IC0tLS0tLS0gfCAtLS0tLS0tIHwgLS0tLS0tLSB8IC0tLS0tLS0tXG4gICAgICAvLyAgICAgMCAgICB8ICBURVNUICAgfCAgVEVTVCAgIHwgIFNLSVAgICB8ICAgIFhcbiAgICAgIC8vICAgICAxICAgIHwgIFRFU1RJRiB8ICBTS0lQICAgfCAgVEVTVCAgIHwgICAgWFxuXG4gICAgICAvLyAtIFNLSVA6IGFsd2F5cyBza2lwXG4gICAgICAvLyAtIFRFU1Q6IGFsd2F5cyB0ZXN0XG4gICAgICAvLyAtIFRFU1RJRjogb25seSB0ZXN0IGlmIGNoZWNrVW5pZ25vcmVkXG4gICAgICAvLyAtIFg6IHRoYXQgbmV2ZXIgaGFwcGVuXG4gICAgICBpZiAoXG4gICAgICAgIHVuaWdub3JlZCA9PT0gbmVnYXRpdmUgJiYgaWdub3JlZCAhPT0gdW5pZ25vcmVkXG4gICAgICAgIHx8IG5lZ2F0aXZlICYmICFpZ25vcmVkICYmICF1bmlnbm9yZWQgJiYgIWNoZWNrVW5pZ25vcmVkXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1hdGNoZWQgPSBydWxlW21vZGVdLnRlc3QocGF0aClcblxuICAgICAgaWYgKCFtYXRjaGVkKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZ25vcmVkID0gIW5lZ2F0aXZlXG4gICAgICB1bmlnbm9yZWQgPSBuZWdhdGl2ZVxuXG4gICAgICBtYXRjaGVkUnVsZSA9IG5lZ2F0aXZlXG4gICAgICAgID8gVU5ERUZJTkVEXG4gICAgICAgIDogcnVsZVxuICAgIH0pXG5cbiAgICBjb25zdCByZXQgPSB7XG4gICAgICBpZ25vcmVkLFxuICAgICAgdW5pZ25vcmVkXG4gICAgfVxuXG4gICAgaWYgKG1hdGNoZWRSdWxlKSB7XG4gICAgICByZXQucnVsZSA9IG1hdGNoZWRSdWxlXG4gICAgfVxuXG4gICAgcmV0dXJuIHJldFxuICB9XG59XG5cbmNvbnN0IHRocm93RXJyb3IgPSAobWVzc2FnZSwgQ3RvcikgPT4ge1xuICB0aHJvdyBuZXcgQ3RvcihtZXNzYWdlKVxufVxuXG5jb25zdCBjaGVja1BhdGggPSAocGF0aCwgb3JpZ2luYWxQYXRoLCBkb1Rocm93KSA9PiB7XG4gIGlmICghaXNTdHJpbmcocGF0aCkpIHtcbiAgICByZXR1cm4gZG9UaHJvdyhcbiAgICAgIGBwYXRoIG11c3QgYmUgYSBzdHJpbmcsIGJ1dCBnb3QgXFxgJHtvcmlnaW5hbFBhdGh9XFxgYCxcbiAgICAgIFR5cGVFcnJvclxuICAgIClcbiAgfVxuXG4gIC8vIFdlIGRvbid0IGtub3cgaWYgd2Ugc2hvdWxkIGlnbm9yZSBFTVBUWSwgc28gdGhyb3dcbiAgaWYgKCFwYXRoKSB7XG4gICAgcmV0dXJuIGRvVGhyb3coYHBhdGggbXVzdCBub3QgYmUgZW1wdHlgLCBUeXBlRXJyb3IpXG4gIH1cblxuICAvLyBDaGVjayBpZiBpdCBpcyBhIHJlbGF0aXZlIHBhdGhcbiAgaWYgKGNoZWNrUGF0aC5pc05vdFJlbGF0aXZlKHBhdGgpKSB7XG4gICAgY29uc3QgciA9ICdgcGF0aC5yZWxhdGl2ZSgpYGQnXG4gICAgcmV0dXJuIGRvVGhyb3coXG4gICAgICBgcGF0aCBzaG91bGQgYmUgYSAke3J9IHN0cmluZywgYnV0IGdvdCBcIiR7b3JpZ2luYWxQYXRofVwiYCxcbiAgICAgIFJhbmdlRXJyb3JcbiAgICApXG4gIH1cblxuICByZXR1cm4gdHJ1ZVxufVxuXG5jb25zdCBpc05vdFJlbGF0aXZlID0gcGF0aCA9PiBSRUdFWF9URVNUX0lOVkFMSURfUEFUSC50ZXN0KHBhdGgpXG5cbmNoZWNrUGF0aC5pc05vdFJlbGF0aXZlID0gaXNOb3RSZWxhdGl2ZVxuXG4vLyBPbiB3aW5kb3dzLCB0aGUgZm9sbG93aW5nIGZ1bmN0aW9uIHdpbGwgYmUgcmVwbGFjZWRcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5jaGVja1BhdGguY29udmVydCA9IHAgPT4gcFxuXG5cbmNsYXNzIElnbm9yZSB7XG4gIGNvbnN0cnVjdG9yICh7XG4gICAgaWdub3JlY2FzZSA9IHRydWUsXG4gICAgaWdub3JlQ2FzZSA9IGlnbm9yZWNhc2UsXG4gICAgYWxsb3dSZWxhdGl2ZVBhdGhzID0gZmFsc2VcbiAgfSA9IHt9KSB7XG4gICAgZGVmaW5lKHRoaXMsIEtFWV9JR05PUkUsIHRydWUpXG5cbiAgICB0aGlzLl9ydWxlcyA9IG5ldyBSdWxlTWFuYWdlcihpZ25vcmVDYXNlKVxuICAgIHRoaXMuX3N0cmljdFBhdGhDaGVjayA9ICFhbGxvd1JlbGF0aXZlUGF0aHNcbiAgICB0aGlzLl9pbml0Q2FjaGUoKVxuICB9XG5cbiAgX2luaXRDYWNoZSAoKSB7XG4gICAgLy8gQSBjYWNoZSBmb3IgdGhlIHJlc3VsdCBvZiBgLmlnbm9yZXMoKWBcbiAgICB0aGlzLl9pZ25vcmVDYWNoZSA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuICAgIC8vIEEgY2FjaGUgZm9yIHRoZSByZXN1bHQgb2YgYC50ZXN0KClgXG4gICAgdGhpcy5fdGVzdENhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuICB9XG5cbiAgYWRkIChwYXR0ZXJuKSB7XG4gICAgaWYgKHRoaXMuX3J1bGVzLmFkZChwYXR0ZXJuKSkge1xuICAgICAgLy8gU29tZSBydWxlcyBoYXZlIGp1c3QgYWRkZWQgdG8gdGhlIGlnbm9yZSxcbiAgICAgIC8vICAgbWFraW5nIHRoZSBiZWhhdmlvciBjaGFuZ2VkLFxuICAgICAgLy8gICBzbyB3ZSBuZWVkIHRvIHJlLWluaXRpYWxpemUgdGhlIHJlc3VsdCBjYWNoZVxuICAgICAgdGhpcy5faW5pdENhY2hlKClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gbGVnYWN5XG4gIGFkZFBhdHRlcm4gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gdGhpcy5hZGQocGF0dGVybilcbiAgfVxuXG4gIC8vIEByZXR1cm5zIHtUZXN0UmVzdWx0fVxuICBfdGVzdCAob3JpZ2luYWxQYXRoLCBjYWNoZSwgY2hlY2tVbmlnbm9yZWQsIHNsaWNlcykge1xuICAgIGNvbnN0IHBhdGggPSBvcmlnaW5hbFBhdGhcbiAgICAgIC8vIFN1cHBvcnRzIG51bGxhYmxlIHBhdGhcbiAgICAgICYmIGNoZWNrUGF0aC5jb252ZXJ0KG9yaWdpbmFsUGF0aClcblxuICAgIGNoZWNrUGF0aChcbiAgICAgIHBhdGgsXG4gICAgICBvcmlnaW5hbFBhdGgsXG4gICAgICB0aGlzLl9zdHJpY3RQYXRoQ2hlY2tcbiAgICAgICAgPyB0aHJvd0Vycm9yXG4gICAgICAgIDogUkVUVVJOX0ZBTFNFXG4gICAgKVxuXG4gICAgcmV0dXJuIHRoaXMuX3QocGF0aCwgY2FjaGUsIGNoZWNrVW5pZ25vcmVkLCBzbGljZXMpXG4gIH1cblxuICBjaGVja0lnbm9yZSAocGF0aCkge1xuICAgIC8vIElmIHRoZSBwYXRoIGRvZXN0IG5vdCBlbmQgd2l0aCBhIHNsYXNoLCBgLmlnbm9yZXMoKWAgaXMgbXVjaCBlcXVpdmFsZW50XG4gICAgLy8gICB0byBgZ2l0IGNoZWNrLWlnbm9yZWBcbiAgICBpZiAoIVJFR0VYX1RFU1RfVFJBSUxJTkdfU0xBU0gudGVzdChwYXRoKSkge1xuICAgICAgcmV0dXJuIHRoaXMudGVzdChwYXRoKVxuICAgIH1cblxuICAgIGNvbnN0IHNsaWNlcyA9IHBhdGguc3BsaXQoU0xBU0gpLmZpbHRlcihCb29sZWFuKVxuICAgIHNsaWNlcy5wb3AoKVxuXG4gICAgaWYgKHNsaWNlcy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuX3QoXG4gICAgICAgIHNsaWNlcy5qb2luKFNMQVNIKSArIFNMQVNILFxuICAgICAgICB0aGlzLl90ZXN0Q2FjaGUsXG4gICAgICAgIHRydWUsXG4gICAgICAgIHNsaWNlc1xuICAgICAgKVxuXG4gICAgICBpZiAocGFyZW50Lmlnbm9yZWQpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9ydWxlcy50ZXN0KHBhdGgsIGZhbHNlLCBNT0RFX0NIRUNLX0lHTk9SRSlcbiAgfVxuXG4gIF90IChcbiAgICAvLyBUaGUgcGF0aCB0byBiZSB0ZXN0ZWRcbiAgICBwYXRoLFxuXG4gICAgLy8gVGhlIGNhY2hlIGZvciB0aGUgcmVzdWx0IG9mIGEgY2VydGFpbiBjaGVja2luZ1xuICAgIGNhY2hlLFxuXG4gICAgLy8gV2hldGhlciBzaG91bGQgY2hlY2sgaWYgdGhlIHBhdGggaXMgdW5pZ25vcmVkXG4gICAgY2hlY2tVbmlnbm9yZWQsXG5cbiAgICAvLyBUaGUgcGF0aCBzbGljZXNcbiAgICBzbGljZXNcbiAgKSB7XG4gICAgaWYgKHBhdGggaW4gY2FjaGUpIHtcbiAgICAgIHJldHVybiBjYWNoZVtwYXRoXVxuICAgIH1cblxuICAgIGlmICghc2xpY2VzKSB7XG4gICAgICAvLyBwYXRoL3RvL2EuanNcbiAgICAgIC8vIFsncGF0aCcsICd0bycsICdhLmpzJ11cbiAgICAgIHNsaWNlcyA9IHBhdGguc3BsaXQoU0xBU0gpLmZpbHRlcihCb29sZWFuKVxuICAgIH1cblxuICAgIHNsaWNlcy5wb3AoKVxuXG4gICAgLy8gSWYgdGhlIHBhdGggaGFzIG5vIHBhcmVudCBkaXJlY3RvcnksIGp1c3QgdGVzdCBpdFxuICAgIGlmICghc2xpY2VzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGNhY2hlW3BhdGhdID0gdGhpcy5fcnVsZXMudGVzdChwYXRoLCBjaGVja1VuaWdub3JlZCwgTU9ERV9JR05PUkUpXG4gICAgfVxuXG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5fdChcbiAgICAgIHNsaWNlcy5qb2luKFNMQVNIKSArIFNMQVNILFxuICAgICAgY2FjaGUsXG4gICAgICBjaGVja1VuaWdub3JlZCxcbiAgICAgIHNsaWNlc1xuICAgIClcblxuICAgIC8vIElmIHRoZSBwYXRoIGNvbnRhaW5zIGEgcGFyZW50IGRpcmVjdG9yeSwgY2hlY2sgdGhlIHBhcmVudCBmaXJzdFxuICAgIHJldHVybiBjYWNoZVtwYXRoXSA9IHBhcmVudC5pZ25vcmVkXG4gICAgICAvLyA+IEl0IGlzIG5vdCBwb3NzaWJsZSB0byByZS1pbmNsdWRlIGEgZmlsZSBpZiBhIHBhcmVudCBkaXJlY3Rvcnkgb2ZcbiAgICAgIC8vID4gICB0aGF0IGZpbGUgaXMgZXhjbHVkZWQuXG4gICAgICA/IHBhcmVudFxuICAgICAgOiB0aGlzLl9ydWxlcy50ZXN0KHBhdGgsIGNoZWNrVW5pZ25vcmVkLCBNT0RFX0lHTk9SRSlcbiAgfVxuXG4gIGlnbm9yZXMgKHBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGVzdChwYXRoLCB0aGlzLl9pZ25vcmVDYWNoZSwgZmFsc2UpLmlnbm9yZWRcbiAgfVxuXG4gIGNyZWF0ZUZpbHRlciAoKSB7XG4gICAgcmV0dXJuIHBhdGggPT4gIXRoaXMuaWdub3JlcyhwYXRoKVxuICB9XG5cbiAgZmlsdGVyIChwYXRocykge1xuICAgIHJldHVybiBtYWtlQXJyYXkocGF0aHMpLmZpbHRlcih0aGlzLmNyZWF0ZUZpbHRlcigpKVxuICB9XG5cbiAgLy8gQHJldHVybnMge1Rlc3RSZXN1bHR9XG4gIHRlc3QgKHBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGVzdChwYXRoLCB0aGlzLl90ZXN0Q2FjaGUsIHRydWUpXG4gIH1cbn1cblxuY29uc3QgZmFjdG9yeSA9IG9wdGlvbnMgPT4gbmV3IElnbm9yZShvcHRpb25zKVxuXG5jb25zdCBpc1BhdGhWYWxpZCA9IHBhdGggPT5cbiAgY2hlY2tQYXRoKHBhdGggJiYgY2hlY2tQYXRoLmNvbnZlcnQocGF0aCksIHBhdGgsIFJFVFVSTl9GQUxTRSlcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmNvbnN0IHNldHVwV2luZG93cyA9ICgpID0+IHtcbiAgLyogZXNsaW50IG5vLWNvbnRyb2wtcmVnZXg6IFwib2ZmXCIgKi9cbiAgY29uc3QgbWFrZVBvc2l4ID0gc3RyID0+IC9eXFxcXFxcXFxcXD9cXFxcLy50ZXN0KHN0cilcbiAgfHwgL1tcIjw+fFxcdTAwMDAtXFx1MDAxRl0rL3UudGVzdChzdHIpXG4gICAgPyBzdHJcbiAgICA6IHN0ci5yZXBsYWNlKC9cXFxcL2csICcvJylcblxuICBjaGVja1BhdGguY29udmVydCA9IG1ha2VQb3NpeFxuXG4gIC8vICdDOlxcXFxmb28nICAgICA8LSAnQzpcXFxcZm9vJyBoYXMgYmVlbiBjb252ZXJ0ZWQgdG8gJ0M6LydcbiAgLy8gJ2Q6XFxcXGZvbydcbiAgY29uc3QgUkVHRVhfVEVTVF9XSU5ET1dTX1BBVEhfQUJTT0xVVEUgPSAvXlthLXpdOlxcLy9pXG4gIGNoZWNrUGF0aC5pc05vdFJlbGF0aXZlID0gcGF0aCA9PlxuICAgIFJFR0VYX1RFU1RfV0lORE9XU19QQVRIX0FCU09MVVRFLnRlc3QocGF0aClcbiAgICB8fCBpc05vdFJlbGF0aXZlKHBhdGgpXG59XG5cblxuLy8gV2luZG93c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5pZiAoXG4gIC8vIERldGVjdCBgcHJvY2Vzc2Agc28gdGhhdCBpdCBjYW4gcnVuIGluIGJyb3dzZXJzLlxuICB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCdcbiAgJiYgcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJ1xuKSB7XG4gIHNldHVwV2luZG93cygpXG59XG5cbi8vIENPTU1PTkpTX0VYUE9SVFMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbm1vZHVsZS5leHBvcnRzID0gZmFjdG9yeVxuXG4vLyBBbHRob3VnaCBpdCBpcyBhbiBhbnRpLXBhdHRlcm4sXG4vLyAgIGl0IGlzIHN0aWxsIHdpZGVseSBtaXN1c2VkIGJ5IGEgbG90IG9mIGxpYnJhcmllcyBpbiBnaXRodWJcbi8vIFJlZjogaHR0cHM6Ly9naXRodWIuY29tL3NlYXJjaD9xPWlnbm9yZS5kZWZhdWx0JTI4JTI5JnR5cGU9Y29kZVxuZmFjdG9yeS5kZWZhdWx0ID0gZmFjdG9yeVxuXG5tb2R1bGUuZXhwb3J0cy5pc1BhdGhWYWxpZCA9IGlzUGF0aFZhbGlkXG5cbi8vIEZvciB0ZXN0aW5nIHB1cnBvc2VzXG5kZWZpbmUobW9kdWxlLmV4cG9ydHMsIFN5bWJvbC5mb3IoJ3NldHVwV2luZG93cycpLCBzZXR1cFdpbmRvd3MpXG4iLCAiLyoqXG4gKiBHaXQgd29ya3RyZWUgbGlmZWN5Y2xlIG1hbmFnZW1lbnQgZm9yIG1vbm9yZXBvIHdvcmtzcGFjZXMuXG4gKlxuICogQ3JlYXRlcyB3b3JrdHJlZXMgd2l0aCBzeW1saW5rZWQgbm9kZV9tb2R1bGVzLCBpZ25vcmVkIHBhdGhzLCBhbmRcbiAqIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMgc28gdGhlIHdvcmt0cmVlIGlzIGltbWVkaWF0ZWx5IHVzYWJsZSBmb3JcbiAqIGJ1aWxkcyBhbmQgdGVzdHMgd2l0aG91dCBhIHNlcGFyYXRlIGB5YXJuIGluc3RhbGxgLlxuICpcbiAqIFN1cHBvcnRzIGJvdGggYnJhbmNoLWJhc2VkIHdvcmt0cmVlcyAoZm9yIGltcGxlbWVudGF0aW9uIHdvcmspIGFuZFxuICogZGV0YWNoZWQgd29ya3RyZWVzIChmb3IgdmVyaWZ5aW5nIHN0YXRlIGF0IGEgdGFnIG9yIGNvbW1pdCkuXG4gKlxuICogQHN1bW1hcnkgR2l0IHdvcmt0cmVlIGNyZWF0aW9uIHdpdGggbW9ub3JlcG8gc3ltbGluayB3aXJpbmdcbiAqIEBtb2R1bGUgd29ya3RyZWVcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5pbXBvcnQgeyByZXNvbHZlV29ya3RyZWVEaXIsIHJlc29sdmVXb3JrdHJlZXNSb290IH0gZnJvbSAnLi9jYXJkcy1jb25maWcuanMnO1xuaW1wb3J0IHsgYXBwbHlXb3JrdHJlZUluY2x1ZGUgfSBmcm9tICcuL3dvcmt0cmVlSW5jbHVkZS5qcyc7XG5cbi8qKlxuICogVGhyb3duIHdoZW4gYSBwYXRoIGFyZ3VtZW50IGZhbGxzIG91dHNpZGUgdGhlIENhcmRzIHdvcmt0cmVlcyByb290LlxuICpcbiAqIFRoaXMgaXMgYSBwcm9ncmFtbWVyIGVycm9yIFx1MjAxNCB0aGUgY2FsbGVyIHN1cHBsaWVkIGEgcGF0aCB0aGF0IHdvdWxkIGFsbG93XG4gKiBkZXN0cnVjdGl2ZSBvcGVyYXRpb25zIG91dHNpZGUgdGhlIG1hbmFnZWQgd29ya3RyZWVzIGRpcmVjdG9yeS5cbiAqL1xuZXhwb3J0IGNsYXNzIFdvcmt0cmVlU2NvcGVFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ1dvcmt0cmVlU2NvcGVFcnJvcic7XG4gIH1cbn1cblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSk7XG5cbi8qKlxuICogVmFsaWRhdGVzIGEgYnJhbmNoIG5hbWUgYWdhaW5zdCB0aGUgQ0xJJ3Mgc2FmZSBzdWJzZXQuXG4gKlxuICogVGhlIG5hbWUgbXVzdCBzdGFydCB3aXRoIGFuIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXIgYW5kIG1heSB0aGVuIGluY2x1ZGVcbiAqIGFscGhhbnVtZXJpY3MsIHNsYXNoZXMsIHVuZGVyc2NvcmVzLCBvciBkYXNoZXMuXG4gKlxuICogQHBhcmFtIG5hbWUgLSBDYW5kaWRhdGUgYnJhbmNoIG5hbWUgc3VwcGxpZWQgYnkgdGhlIGNhbGxlci5cbiAqIEB0aHJvd3Mge0Vycm9yfSBXaGVuIHRoZSBicmFuY2ggbmFtZSBkb2VzIG5vdCBtYXRjaCB0aGUgc3VwcG9ydGVkIGZvcm1hdC5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLiBUaHJvd3Mgb24gaW52YWxpZCBpbnB1dC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQnJhbmNoTmFtZShuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgYnJhbmNoTmFtZVJlZ2V4ID0gL15bYS16QS1aMC05XVthLXpBLVowLTkvXy1dKiQvO1xuICBpZiAoIWJyYW5jaE5hbWVSZWdleC50ZXN0KG5hbWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvcjogSW52YWxpZCBicmFuY2ggbmFtZSBmb3JtYXQuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSByZWxhdGl2ZSBwYXRoIGlzIG5lc3RlZCB1bmRlciBhbnkga25vd24gcGFyZW50IHBhdGguXG4gKlxuICogVGhlIGNoZWNrIHdhbGtzIGFuY2VzdG9yIHNlZ21lbnRzIG9mIGBkaXJgIGFuZCByZXR1cm5zIHRydWUgb24gdGhlIGZpcnN0XG4gKiBtYXRjaCBpbiBgcGFyZW50U2V0YC5cbiAqXG4gKiBAcGFyYW0gZGlyIC0gUmVsYXRpdmUgcGF0aCB0byB0ZXN0LlxuICogQHBhcmFtIHBhcmVudFNldCAtIENhbmRpZGF0ZSBwYXJlbnQgZGlyZWN0b3JpZXMgcmVwcmVzZW50ZWQgYXMgcmVsYXRpdmUgcGF0aHMuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGRpcmAgaXMgbmVzdGVkIHVuZGVyIGEgcGF0aCBpbiBgcGFyZW50U2V0YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTmVzdGVkVW5kZXIoZGlyOiBzdHJpbmcsIHBhcmVudFNldDogU2V0PHN0cmluZz4pOiBib29sZWFuIHtcbiAgbGV0IGN1cnJlbnQgPSBkaXI7XG4gIHdoaWxlIChjdXJyZW50LmluY2x1ZGVzKCcvJykpIHtcbiAgICBjdXJyZW50ID0gY3VycmVudC5zdWJzdHJpbmcoMCwgY3VycmVudC5sYXN0SW5kZXhPZignLycpKTtcbiAgICBpZiAocGFyZW50U2V0LmhhcyhjdXJyZW50KSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHN5bWxpbmsgdGFyZ2V0IHBvaW50cyB0byBrbm93biBtb25vcmVwby1pbnRlcm5hbCBsb2NhdGlvbnMuXG4gKlxuICogSW50ZXJuYWwgdGFyZ2V0cyBhcmUgcHJlc2VydmVkIGFzIHJlbGF0aXZlIGxpbmtzIGR1cmluZyBub2RlX21vZHVsZXMgcmVyb3V0ZVxuICogc28gd29ya3NwYWNlIGxpbmtzIGtlZXAgd29ya2luZyBpbnNpZGUgYSB3b3JrdHJlZS5cbiAqXG4gKiBAcGFyYW0gdGFyZ2V0IC0gU3ltbGluayB0YXJnZXQgcmVhZCBmcm9tIHRoZSBzb3VyY2Ugbm9kZV9tb2R1bGVzIGVudHJ5LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIHRoZSB0YXJnZXQgc3RhcnRzIHdpdGggYW4gaW50ZXJuYWwgcHJlZml4LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRhcmdldC5zdGFydHNXaXRoKCcuLi8nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVXb3JrdHJlZVJlc3VsdCB7XG4gIGJyYW5jaDogc3RyaW5nO1xuICB3b3JrdHJlZTogc3RyaW5nO1xuICBiYXNlU2hhOiBzdHJpbmc7XG4gIGNvcGllZEZyb21JbmNsdWRlOiBudW1iZXI7XG4gIHJlcm91dGVkU3ltbGlua3M6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBFYXJseSByZXR1cm4gZnJvbSB7QGxpbmsgY3JlYXRlV29ya3RyZWV9IGF2YWlsYWJsZSBhcyBzb29uIGFzIGBnaXQgd29ya3RyZWUgYWRkYCBjb21wbGV0ZXMuXG4gKlxuICogYHBhdGhgIGlzIHRoZSB3b3JrdHJlZSBkaXJlY3RvcnksIHVzYWJsZSBpbW1lZGlhdGVseSAoZS5nLiBhcyBhIGBjd2RgIGZvciBzcGF3bmluZyBwcm9jZXNzZXMpLlxuICogYHNldHRsZWAgcmVzb2x2ZXMgd2hlbiB0aGUgcmVtYWluaW5nIHNldHVwIChzeW1saW5rcywgbm9kZV9tb2R1bGVzIHJlcm91dGluZywgZ2l0IGV4Y2x1ZGVzKVxuICogZmluaXNoZXMuIEVycm9ycyBpbiB0aGUgc2V0dGxlIHBoYXNlIHJlamVjdCB0aGUgcHJvbWlzZSBcdTIwMTQgdGhleSBhcmUgbmV2ZXIgc2lsZW50bHkgc3dhbGxvd2VkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVhcmx5V29ya3RyZWVSZXN1bHQge1xuICBwYXRoOiBzdHJpbmc7XG4gIHNldHRsZTogUHJvbWlzZTxDcmVhdGVXb3JrdHJlZVJlc3VsdD47XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbmQgY29uZmlndXJlcyBhIG5ldyBnaXQgd29ya3RyZWUuXG4gKlxuICogVGhlIHdvcmtmbG93IHZhbGlkYXRlcyB0aGUgcmVmLCBjcmVhdGVzIHRoZSB3b3JrdHJlZSwgbWlycm9ycyBleGlzdGluZyByb290XG4gKiBzeW1saW5rcywgc3ltbGlua3MgaWdub3JlZCBwYXRocywgcmVyb3V0ZXMgbm9kZV9tb2R1bGVzIGxpbmtzLCBhbmQgdXBkYXRlc1xuICogcGVyLXdvcmt0cmVlIGdpdCBleGNsdWRlcy5cbiAqXG4gKiBXaGVuIGByZWZgIGlzIGEgYnJhbmNoIG5hbWUsIHRoZSB3b3JrdHJlZSBjaGVja3Mgb3V0IHRoYXQgYnJhbmNoIChjcmVhdGluZ1xuICogaXQgaWYgbmVlZGVkKS4gV2hlbiBgcmVmYCBpcyBhIHRhZyBvciBjb21taXQgU0hBLCB0aGUgd29ya3RyZWUgaXMgY3JlYXRlZFxuICogaW4gZGV0YWNoZWQgSEVBRCBtb2RlLlxuICpcbiAqIEBwYXJhbSByZWYgLSBCcmFuY2ggbmFtZSwgdGFnIG5hbWUsIG9yIGNvbW1pdCBTSEEuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24uXG4gKiBAcGFyYW0gb3B0aW9ucy5jd2QgLSBXb3JraW5nIGRpcmVjdG9yeSB0byB1c2Ugd2hlbiBsb2NhdGluZyBnaXQgcm9vdHMuIERlZmF1bHRzIHRvIGBwcm9jZXNzLmN3ZCgpYC5cbiAqIEBwYXJhbSBvcHRpb25zLmNhcmRJZCAtIFdoZW4gcHJvdmlkZWQsIG1ha2VzIHRoZSB3b3JrdHJlZSBjYXJkLWJvdW5kOiB3cml0ZXMgYDx3b3JrdHJlZT4vLmNhcmRzL0NBUkRfSURgXG4gKiAgIHNvIHdvcmtzcGFjZSBnaXQgaG9va3MgY2FuIGF0dHJpYnV0ZSBjb21taXRzIHdpdGhvdXQgYW4gaW5oZXJpdGVkIGVudiB2YXIsIGFuZCBleGNsdWRlcyB0aGUgZmlsZVxuICogICBmcm9tIGBnaXQgc3RhdHVzYCB2aWEgdGhlIHBlci13b3JrdHJlZSBgaW5mby9leGNsdWRlYC4gT21pdHRpbmcgdGhpcyBvcHRpb24gbGVhdmVzIHRoZSB3b3JrdHJlZVxuICogICB1bmJvdW5kIFx1MjAxNCBob29rcyBmYWxsIGJhY2sgdG8gUElELWJhc2VkIHJlc29sdXRpb24uXG4gKiBAcmV0dXJucyBFYXJseSByZXN1bHQgd2l0aCBgcGF0aGAgYXZhaWxhYmxlIGltbWVkaWF0ZWx5IGFuZCBgc2V0dGxlYCByZXNvbHZpbmcgd2hlbiBzZXR1cCBjb21wbGV0ZXMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVXb3JrdHJlZShcbiAgcmVmOiBzdHJpbmcsXG4gIG9wdGlvbnM/OiB7IGN3ZD86IHN0cmluZzsgY2FyZElkPzogc3RyaW5nIH1cbik6IFByb21pc2U8RWFybHlXb3JrdHJlZVJlc3VsdD4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMob3B0aW9ucz8uY3dkID8/IHByb2Nlc3MuY3dkKCkpO1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIHRoaXMgaXMgYW4gZXhpc3RpbmcgcmVmIG9yIGEgbmV3IGJyYW5jaCBuYW1lLlxuICAvLyByZXNvbHZlUmVmVHlwZSB0aHJvd3MgZm9yIHVua25vd24gcmVmczsgYSB2YWxpZCBicmFuY2ggbmFtZSB0aGF0XG4gIC8vIGRvZXNuJ3QgZXhpc3QgeWV0IGlzIHRyZWF0ZWQgYXMgYSBuZXcgYnJhbmNoIHRvIGNyZWF0ZS5cbiAgbGV0IHJlZlR5cGU6ICdicmFuY2gnIHwgJ3RhZycgfCAnY29tbWl0JztcbiAgdHJ5IHtcbiAgICByZWZUeXBlID0gYXdhaXQgcmVzb2x2ZVJlZlR5cGUocmVwb1Jvb3QsIHJlZik7XG4gIH0gY2F0Y2gge1xuICAgIHZhbGlkYXRlQnJhbmNoTmFtZShyZWYpO1xuICAgIHJlZlR5cGUgPSAnYnJhbmNoJztcbiAgfVxuXG4gIGlmIChyZWZUeXBlID09PSAnYnJhbmNoJykge1xuICAgIHZhbGlkYXRlQnJhbmNoTmFtZShyZWYpO1xuICB9XG5cbiAgY29uc3Qgd29ya3RyZWVEaXIgPSByZXNvbHZlV29ya3RyZWVEaXIocmVwb1Jvb3QsIHJlZik7XG5cbiAgY29uc3Qgd29ya3RyZWVFeGlzdHMgPSBhd2FpdCBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290LCB3b3JrdHJlZURpcik7XG4gIGlmICh3b3JrdHJlZUV4aXN0cykge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3I6IFdvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGF0ICR7d29ya3RyZWVEaXJ9YCk7XG4gIH1cblxuICBhd2FpdCBjbGVhblN0YWxlV29ya3RyZWVEaXIocmVwb1Jvb3QsIHdvcmt0cmVlRGlyKTtcblxuICBpZiAocmVmVHlwZSA9PT0gJ2JyYW5jaCcpIHtcbiAgICBjb25zdCBzdGFydFBvaW50ID0gYXdhaXQgcmVzb2x2ZUhlYWQoc291cmNlUm9vdCk7XG4gICAgY29uc3QgYnJhbmNoRXhpc3RzID0gYXdhaXQgY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3QsIHJlZik7XG4gICAgYXdhaXQgYWRkV29ya3RyZWUoeyByZXBvUm9vdCwgd29ya3RyZWVEaXIsIGJyYW5jaE5hbWU6IHJlZiwgYnJhbmNoRXhpc3RzLCBzdGFydFBvaW50IH0pO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IGFkZERldGFjaGVkV29ya3RyZWUocmVwb1Jvb3QsIHdvcmt0cmVlRGlyLCByZWYpO1xuICB9XG5cbiAgLy8gVGhlIHdvcmt0cmVlIGRpcmVjdG9yeSBleGlzdHMgb24gZGlzayBcdTIwMTQgcmV0dXJuIGVhcmx5IHNvIGNhbGxlcnMgY2FuIHVzZVxuICAvLyB0aGUgcGF0aCAoZS5nLiBhcyBjd2QgZm9yIHNwYXduaW5nIHByb2Nlc3Nlcykgd2hpbGUgdGhlIHJlbWFpbmluZyBzZXR1cFxuICAvLyAoc3ltbGlua3MsIG5vZGVfbW9kdWxlcyByZXJvdXRpbmcsIGdpdCBleGNsdWRlcykgcnVucyBjb25jdXJyZW50bHkuXG4gIGNvbnN0IHNldHRsZSA9IChhc3luYyAoKTogUHJvbWlzZTxDcmVhdGVXb3JrdHJlZVJlc3VsdD4gPT4ge1xuICAgIGNvbnN0IGlnbm9yZWQgPSBhd2FpdCBkaXNjb3Zlcklnbm9yZWRQYXRocyhzb3VyY2VSb290KTtcbiAgICBhd2FpdCBjb3B5RXhpc3RpbmdTeW1saW5rcyhzb3VyY2VSb290LCB3b3JrdHJlZURpcik7XG5cbiAgICAvLyAuY2FyZHMgaXMgY29waWVkIHJhdGhlciB0aGFuIHN5bWxpbmtlZCBzbyBlYWNoIHdvcmt0cmVlIGdldHMgYW4gaW5kZXBlbmRlbnQgY29weVxuICAgIGNvbnN0IGZpbHRlcmVkSWdub3JlZDogSWdub3JlZFBhdGhzID0ge1xuICAgICAgZGlyZWN0b3JpZXM6IGlnbm9yZWQuZGlyZWN0b3JpZXMuZmlsdGVyKChkKSA9PiBkICE9PSAnLmNhcmRzJyAmJiAhZC5zdGFydHNXaXRoKCcuY2FyZHMvJykpLFxuICAgICAgZmlsZXM6IGlnbm9yZWQuZmlsZXMuZmlsdGVyKChmKSA9PiAhZi5zdGFydHNXaXRoKCcuY2FyZHMvJykpXG4gICAgfTtcbiAgICBhd2FpdCBzeW1saW5rSWdub3JlZFBhdGhzKHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIsIGlnbm9yZWQ6IGZpbHRlcmVkSWdub3JlZCB9KTtcbiAgICBhd2FpdCBjb3B5Q2FyZHNEaXJlY3Rvcnkoc291cmNlUm9vdCwgd29ya3RyZWVEaXIpO1xuXG4gICAgaWYgKG9wdGlvbnM/LmNhcmRJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAob3B0aW9ucy5jYXJkSWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY3JlYXRlV29ya3RyZWU6IGNhcmRJZCBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZycpO1xuICAgICAgfVxuICAgICAgYXdhaXQgd3JpdGVDYXJkQm91bmRGaWxlKHdvcmt0cmVlRGlyLCBvcHRpb25zLmNhcmRJZCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVyb3V0ZWRDb3VudCA9IGF3YWl0IHJlcm91dGVBbGxOb2RlTW9kdWxlcyh7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCByZXBvUm9vdCB9KTtcbiAgICBjb25zdCBjb3BpZWRGcm9tSW5jbHVkZSA9IGF3YWl0IGFwcGx5V29ya3RyZWVJbmNsdWRlKHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIgfSk7XG5cbiAgICBjb25zdCBhZGRpdGlvbmFsRXhjbHVkZXMgPSBvcHRpb25zPy5jYXJkSWQgIT09IHVuZGVmaW5lZCA/IFsnLmNhcmRzL0NBUkRfSUQnXSA6IFtdO1xuICAgIGNvbnN0IFssIGJhc2VTaGFdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgdXBkYXRlR2l0RXhjbHVkZSh7XG4gICAgICAgIHdvcmt0cmVlRGlyLFxuICAgICAgICByZXBvUm9vdCxcbiAgICAgICAgZGlyZWN0b3JpZXM6IGlnbm9yZWQuZGlyZWN0b3JpZXMsXG4gICAgICAgIGZpbGVzOiBpZ25vcmVkLmZpbGVzLFxuICAgICAgICBhZGRpdGlvbmFsRXhjbHVkZXNcbiAgICAgIH0pLFxuICAgICAgcmVzb2x2ZUhlYWQod29ya3RyZWVEaXIpXG4gICAgXSk7XG5cbiAgICBjb25zdCByZXN1bHQ6IENyZWF0ZVdvcmt0cmVlUmVzdWx0ID0ge1xuICAgICAgYnJhbmNoOiByZWYsXG4gICAgICB3b3JrdHJlZTogd29ya3RyZWVEaXIsXG4gICAgICBiYXNlU2hhLFxuICAgICAgY29waWVkRnJvbUluY2x1ZGUsXG4gICAgICByZXJvdXRlZFN5bWxpbmtzOiByZXJvdXRlZENvdW50XG4gICAgfTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pKCk7XG5cbiAgcmV0dXJuIHsgcGF0aDogd29ya3RyZWVEaXIsIHNldHRsZSB9O1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYSBDYXJkcy1tYW5hZ2VkIHdvcmt0cmVlIGFuZCBjbGVhbnMgdXAgaXRzIGdpdCByZWdpc3RyYXRpb24uXG4gKlxuICogU3RlcHM6XG4gKiAxLiBTY29wZSBndWFyZDogcmVqZWN0cyBwYXRocyBvdXRzaWRlIGByZXNvbHZlV29ya3RyZWVzUm9vdCgpYC5cbiAqIDIuIExvY2F0ZXMgYHJlcG9Sb290YCBieSByZWFkaW5nIGA8d29ya3RyZWVQYXRoPi8uZ2l0YCAoYSB3b3JrdHJlZSBmaWxlKS5cbiAqICAgIFJldHVybnMgaW1tZWRpYXRlbHkgd2hlbiB0aGUgZGlyZWN0b3J5IGlzIGFscmVhZHkgZ29uZSAoaWRlbXBvdGVudCkuXG4gKiAzLiBgZ2l0IHdvcmt0cmVlIHJlbW92ZSAtLWZvcmNlIDxwYXRoPmAgZnJvbSBgcmVwb1Jvb3RgLlxuICogNC4gU3dlZXBzIGFueSBsZWZ0b3ZlciBkaXJlY3Rvcnkgd2l0aCBgZnMucm1gLlxuICogNS4gYGdpdCB3b3JrdHJlZSBwcnVuZWAgdG8ga2VlcCB0aGUgcmVnaXN0cnkgY2xlYW4uXG4gKlxuICogQHBhcmFtIHdvcmt0cmVlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHdvcmt0cmVlIGRpcmVjdG9yeSB0byByZW1vdmUuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiBgd29ya3RyZWVQYXRoYCBpcyBvdXRzaWRlIHRoZSBDYXJkcyB3b3JrdHJlZXMgcm9vdCBvciBnaXQgb3BlcmF0aW9ucyBmYWlsLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlV29ya3RyZWUod29ya3RyZWVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKHR5cGVvZiB3b3JrdHJlZVBhdGggIT09ICdzdHJpbmcnIHx8IHdvcmt0cmVlUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgV29ya3RyZWVTY29wZUVycm9yKCdyZW1vdmVXb3JrdHJlZTogd29ya3RyZWVQYXRoIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nJyk7XG4gIH1cblxuICBjb25zdCB3b3JrdHJlZXNSb290ID0gcGF0aC5yZXNvbHZlKHJlc29sdmVXb3JrdHJlZXNSb290KCkpO1xuICBjb25zdCByZXNvbHZlZCA9IHBhdGgucmVzb2x2ZSh3b3JrdHJlZVBhdGgpO1xuXG4gIC8vIENhbm9uaWNhbGl6ZSB0byBmb2xsb3cgc3ltbGlua3MgYmVmb3JlIHRoZSBwcmVmaXggY2hlY2suXG4gIC8vIElmIHRoZSBwYXRoIGRvZXMgbm90IGV4aXN0IHlldCAoRU5PRU5UIGZyb20gcmVhbHBhdGgpLCBmYWxsIHRocm91Z2ggdG8gdGhlXG4gIC8vIGlkZW1wb3RlbnQgbm8tb3AgYXQgdGhlIC5naXQgbHN0YXQgc3RlcCBiZWxvdy5cbiAgbGV0IGNhbm9uaWNhbDogc3RyaW5nO1xuICB0cnkge1xuICAgIGNhbm9uaWNhbCA9IGF3YWl0IGZzLnJlYWxwYXRoKHJlc29sdmVkKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIGNhbm9uaWNhbCA9IHJlc29sdmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNhbm9uaWNhbC5zdGFydHNXaXRoKHdvcmt0cmVlc1Jvb3QgKyBwYXRoLnNlcCkpIHtcbiAgICB0aHJvdyBuZXcgV29ya3RyZWVTY29wZUVycm9yKGByZW1vdmVXb3JrdHJlZTogcGF0aCBpcyBvdXRzaWRlIHRoZSBDYXJkcyB3b3JrdHJlZXMgcm9vdDogJHtjYW5vbmljYWx9YCk7XG4gIH1cblxuICBjb25zdCBnaXRGaWxlUGF0aCA9IHBhdGguam9pbihyZXNvbHZlZCwgJy5naXQnKTtcbiAgbGV0IHJlcG9Sb290OiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChnaXRGaWxlUGF0aCk7XG4gICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoZ2l0RmlsZVBhdGgsICd1dGYtOCcpO1xuICAgICAgY29uc3QgZ2l0ZGlyUGF0aCA9IGNvbnRlbnQudHJpbSgpLnJlcGxhY2UoL15naXRkaXI6XFxzKi8sICcnKTtcbiAgICAgIGNvbnN0IG1haW5HaXREaXIgPSBnaXRkaXJQYXRoLnJlcGxhY2UoL1xcL3dvcmt0cmVlc1xcL1teL10rJC8sICcnKTtcbiAgICAgIHJlcG9Sb290ID0gbWFpbkdpdERpci5yZXBsYWNlKC9cXC9cXC5naXQkLywgJycpO1xuICAgIH0gZWxzZSBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgcmVwb1Jvb3QgPSByZXNvbHZlZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGByZW1vdmVXb3JrdHJlZTogdW5leHBlY3RlZCAuZ2l0IGVudHJ5IHR5cGUgYXQgJHtnaXRGaWxlUGF0aH1gKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdyZW1vdmUnLCAnLS1mb3JjZScsIHJlc29sdmVkXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xuXG4gIGF3YWl0IGZzLnJtKHJlc29sdmVkLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG5cbiAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdwcnVuZSddLCB7IGN3ZDogcmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIHN0YWxlIGRpcmVjdG9yeSByZW1uYW50cyBsZWZ0IGJ5IGEgY3Jhc2hlZCBwcmV2aW91cyBzZXNzaW9uLlxuICpcbiAqIEdpdCBkb2Vzbid0IHRyYWNrIHRoZSB3b3JrdHJlZSwgYnV0IHRoZSBkaXJlY3RvcnkgbWF5IHN0aWxsIGV4aXN0IG9uIGRpc2ssXG4gKiB3aGljaCBjYXVzZXMgYGdpdCB3b3JrdHJlZSBhZGRgIHRvIGZhaWwgd2l0aCBcImFscmVhZHkgZXhpc3RzXCIuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIEFic29sdXRlIHdvcmt0cmVlIHBhdGggYmVpbmcgY3JlYXRlZC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY2xlYW5TdGFsZVdvcmt0cmVlRGlyKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5hY2Nlc3Mod29ya3RyZWVEaXIpO1xuICAgIGF3YWl0IGZzLnJtKHdvcmt0cmVlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ3BydW5lJ10sIHsgY3dkOiByZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBHaXRSb290cyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBMb2NhdGVzIHRoZSBjdXJyZW50IGdpdCBzb3VyY2Ugcm9vdCBhbmQgcHJpbWFyeSByZXBvc2l0b3J5IHJvb3QuXG4gKlxuICogU3VwcG9ydHMgYm90aCBzdGFuZGFyZCBjaGVja291dHMgKGAuZ2l0YCBkaXJlY3RvcnkpIGFuZCB3b3JrdHJlZSBjaGVja291dHNcbiAqIChgLmdpdGAgZmlsZSBwb2ludGluZyBpbnRvIGAuZ2l0L3dvcmt0cmVlcy8uLi5gKS5cbiAqXG4gKiBAcGFyYW0gc3RhcnREaXIgLSBEaXJlY3Rvcnkgd2hlcmUgdXB3YXJkIHNlYXJjaCBiZWdpbnMuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiBubyBnaXQgcmVwb3NpdG9yeSBtYXJrZXIgaXMgZm91bmQuXG4gKiBAcmV0dXJucyBQYXRocyBmb3IgdGhlIGN1cnJlbnQgY2hlY2tvdXQgcm9vdCBhbmQgdGhlIHByaW1hcnkgcmVwbyByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEdpdFJvb3RzKHN0YXJ0RGlyOiBzdHJpbmcpOiBQcm9taXNlPEdpdFJvb3RzPiB7XG4gIGxldCBjdXJyZW50RGlyID0gcGF0aC5yZXNvbHZlKHN0YXJ0RGlyKTtcbiAgd2hpbGUgKGN1cnJlbnREaXIgIT09ICcvJykge1xuICAgIGNvbnN0IGdpdFBhdGggPSBwYXRoLmpvaW4oY3VycmVudERpciwgJy5naXQnKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChnaXRQYXRoKTtcbiAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdDogY3VycmVudERpclxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGNvbnN0IGdpdEZpbGVDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoZ2l0UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICAgIGNvbnN0IGdpdGRpckxpbmUgPSBnaXRGaWxlQ29udGVudC50cmltKCk7XG4gICAgICAgIGNvbnN0IGdpdGRpclBhdGggPSBnaXRkaXJMaW5lLnJlcGxhY2UoL15naXRkaXI6XFxzKi8sICcnKTtcbiAgICAgICAgY29uc3QgbWFpbkdpdERpciA9IGdpdGRpclBhdGgucmVwbGFjZSgvXFwvd29ya3RyZWVzXFwvW14vXSskLywgJycpO1xuICAgICAgICBjb25zdCByZXBvUm9vdCA9IG1haW5HaXREaXIucmVwbGFjZSgvXFwvXFwuZ2l0JC8sICcnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2VSb290OiBjdXJyZW50RGlyLFxuICAgICAgICAgIHJlcG9Sb290XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudERpciA9IHBhdGguZGlybmFtZShjdXJyZW50RGlyKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbiBhIGdpdCByZXBvc2l0b3J5Jyk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIEhFQUQgY29tbWl0IFNIQSBmb3IgYSByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAqXG4gKiBAcGFyYW0gY3dkIC0gUmVwb3NpdG9yeSBkaXJlY3RvcnkgcGFzc2VkIHRvIGBnaXQgcmV2LXBhcnNlIEhFQURgLlxuICogQHJldHVybnMgVHJpbW1lZCBjb21taXQgU0hBIHN0cmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVIZWFkKGN3ZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJ0hFQUQnXSwgeyBjd2QsIHRpbWVvdXQ6IDVfMDAwIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggaXMgYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggZ2l0LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSB3b3JrdHJlZSBwYXRoIGJlaW5nIGNyZWF0ZWQuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGdpdCB3b3JrdHJlZSBsaXN0YCBhbHJlYWR5IGNvbnRhaW5zIGB3b3JrdHJlZURpcmAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAnbGlzdCcsICctLXBvcmNlbGFpbiddLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG4gIGZvciAoY29uc3QgbGluZSBvZiBzdGRvdXQuc3BsaXQoJ1xcbicpKSB7XG4gICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnd29ya3RyZWUgJykgJiYgbGluZS5zbGljZSgnd29ya3RyZWUgJy5sZW5ndGgpID09PSB3b3JrdHJlZURpcikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGJyYW5jaCBhbHJlYWR5IGV4aXN0cyBpbiB0aGUgcmVwb3NpdG9yeS5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBCcmFuY2ggbmFtZSB0byBxdWVyeS5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiBhdCBsZWFzdCBvbmUgbWF0Y2hpbmcgbG9jYWwgYnJhbmNoIGlzIGxpc3RlZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrQnJhbmNoRXhpc3RzKHJlcG9Sb290OiBzdHJpbmcsIGJyYW5jaE5hbWU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydicmFuY2gnLCAnLS1saXN0JywgYnJhbmNoTmFtZV0sIHtcbiAgICBjd2Q6IHJlcG9Sb290LFxuICAgIHRpbWVvdXQ6IDMwXzAwMFxuICB9KTtcbiAgcmV0dXJuIHN0ZG91dC50cmltKCkubGVuZ3RoID4gMDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBnaXQgcmVmIGlzIGEgYnJhbmNoLCB0YWcsIG9yIGNvbW1pdCBTSEEuXG4gKlxuICogQ2hlY2tzIGxvY2FsIGJyYW5jaGVzIGZpcnN0LCB0aGVuIHRhZ3MsIHRoZW4gZmFsbHMgYmFjayB0byB2ZXJpZnlpbmdcbiAqIHRoZSByZWYgcmVzb2x2ZXMgYXMgYSBjb21taXQuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSByZWYgLSBUaGUgcmVmIHRvIGNsYXNzaWZ5LlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gdGhlIHJlZiBkb2VzIG5vdCByZXNvbHZlIHRvIGFueSBrbm93biBnaXQgb2JqZWN0LlxuICogQHJldHVybnMgVGhlIHJlZiB0eXBlOiBgJ2JyYW5jaCdgLCBgJ3RhZydgLCBvciBgJ2NvbW1pdCdgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVJlZlR5cGUocmVwb1Jvb3Q6IHN0cmluZywgcmVmOiBzdHJpbmcpOiBQcm9taXNlPCdicmFuY2gnIHwgJ3RhZycgfCAnY29tbWl0Jz4ge1xuICBjb25zdCBicmFuY2hFeGlzdHMgPSBhd2FpdCBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdCwgcmVmKTtcbiAgaWYgKGJyYW5jaEV4aXN0cykgcmV0dXJuICdicmFuY2gnO1xuXG4gIGNvbnN0IHsgc3Rkb3V0OiB0YWdPdXRwdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsndGFnJywgJy0tbGlzdCcsIHJlZl0sIHtcbiAgICBjd2Q6IHJlcG9Sb290LFxuICAgIHRpbWVvdXQ6IDMwXzAwMFxuICB9KTtcbiAgaWYgKHRhZ091dHB1dC50cmltKCkubGVuZ3RoID4gMCkgcmV0dXJuICd0YWcnO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydyZXYtcGFyc2UnLCAnLS12ZXJpZnknLCBgJHtyZWZ9Xntjb21taXR9YF0sIHtcbiAgICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgICB0aW1lb3V0OiA1XzAwMFxuICAgIH0pO1xuICAgIHJldHVybiAnY29tbWl0JztcbiAgfSBjYXRjaCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogJyR7cmVmfScgZG9lcyBub3QgcmVzb2x2ZSB0byBhIGJyYW5jaCwgdGFnLCBvciBjb21taXQuYCk7XG4gIH1cbn1cblxuaW50ZXJmYWNlIEFkZFdvcmt0cmVlT3B0aW9ucyB7XG4gIHJlcG9Sb290OiBzdHJpbmc7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIGJyYW5jaE5hbWU6IHN0cmluZztcbiAgYnJhbmNoRXhpc3RzOiBib29sZWFuO1xuICBzdGFydFBvaW50OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQWRkcyBhIGdpdCB3b3JrdHJlZSwgY3JlYXRpbmcgdGhlIGJyYW5jaCB3aGVuIG5lZWRlZC5cbiAqXG4gKiBVc2VzIGBnaXQgd29ya3RyZWUgYWRkIC1iYCBmb3IgbmV3IGJyYW5jaGVzIGFuZCBwbGFpbiBgZ2l0IHdvcmt0cmVlIGFkZGBcbiAqIHdoZW4gYXR0YWNoaW5nIHRvIGFuIGV4aXN0aW5nIGJyYW5jaC5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFdvcmt0cmVlIGNyZWF0aW9uIG9wdGlvbnMgYW5kIGJyYW5jaCBleGlzdGVuY2Ugc3RhdGUuXG4gKiBAcmV0dXJucyBObyB2YWx1ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZFdvcmt0cmVlKG9wdHM6IEFkZFdvcmt0cmVlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBhcmdzID0gb3B0cy5icmFuY2hFeGlzdHNcbiAgICA/IFsnd29ya3RyZWUnLCAnYWRkJywgb3B0cy53b3JrdHJlZURpciwgb3B0cy5icmFuY2hOYW1lXVxuICAgIDogWyd3b3JrdHJlZScsICdhZGQnLCAnLWInLCBvcHRzLmJyYW5jaE5hbWUsIG9wdHMud29ya3RyZWVEaXIsIG9wdHMuc3RhcnRQb2ludF07XG4gIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIGFyZ3MsIHsgY3dkOiBvcHRzLnJlcG9Sb290LCB0aW1lb3V0OiAzMF8wMDAgfSk7XG59XG5cbi8qKlxuICogQWRkcyBhIGdpdCB3b3JrdHJlZSBpbiBkZXRhY2hlZCBIRUFEIG1vZGUgYXQgdGhlIGdpdmVuIHJlZi5cbiAqXG4gKiBVc2VkIGZvciB0YWdzIGFuZCBjb21taXQgU0hBcyB3aGVyZSBubyBicmFuY2ggYXNzb2NpYXRpb24gaXMgbmVlZGVkLlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSBwYXRoIGZvciB0aGUgbmV3IHdvcmt0cmVlLlxuICogQHBhcmFtIHJlZiAtIFRhZyBuYW1lIG9yIGNvbW1pdCBTSEEgdG8gY2hlY2sgb3V0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkRGV0YWNoZWRXb3JrdHJlZShyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nLCByZWY6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ2FkZCcsICctLWRldGFjaCcsIHdvcmt0cmVlRGlyLCByZWZdLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG59XG5cbmludGVyZmFjZSBJZ25vcmVkUGF0aHMge1xuICBkaXJlY3Rvcmllczogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBEaXNjb3ZlcnMgaWdub3JlZCBmaWxlcyBhbmQgZGlyZWN0b3JpZXMgdW5kZXIgYSBzb3VyY2Ugcm9vdC5cbiAqXG4gKiBQYXRocyBhcmUgcmV0dXJuZWQgcmVsYXRpdmUgdG8gYHNvdXJjZVJvb3RgIGFuZCBgLndvcmt0cmVlc2AgY29udGVudCBpc1xuICogZmlsdGVyZWQgb3V0IHRvIGF2b2lkIHNlbGYtcmVmZXJlbnRpYWwgc3ltbGlua2luZy5cbiAqXG4gKiBAcGFyYW0gc291cmNlUm9vdCAtIFNvdXJjZSBjaGVja291dCByb290IHVzZWQgZm9yIGdpdCBkaXNjb3ZlcnkuXG4gKiBAcmV0dXJucyBTZXBhcmF0ZSBsaXN0cyBvZiBpZ25vcmVkIGRpcmVjdG9yaWVzIGFuZCBpZ25vcmVkIGZpbGVzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlzY292ZXJJZ25vcmVkUGF0aHMoc291cmNlUm9vdDogc3RyaW5nKTogUHJvbWlzZTxJZ25vcmVkUGF0aHM+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoXG4gICAgJ2dpdCcsXG4gICAgWyctQycsIHNvdXJjZVJvb3QsICdscy1maWxlcycsICctLWlnbm9yZWQnLCAnLS1leGNsdWRlLXN0YW5kYXJkJywgJy0tZGlyZWN0b3J5JywgJy0tb3RoZXJzJ10sXG4gICAgeyBjd2Q6IHNvdXJjZVJvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9XG4gICk7XG5cbiAgY29uc3QgaWdub3JlZFByZWZpeGVzID0gZ2V0SWdub3JlZFdvcmt0cmVlUHJlZml4ZXMoc291cmNlUm9vdCk7XG4gIGNvbnN0IGxpbmVzID0gc3Rkb3V0LnNwbGl0KCdcXG4nKS5maWx0ZXIoKGxpbmUpID0+IGxpbmUubGVuZ3RoID4gMCAmJiAhaXNJZ25vcmVkV29ya3RyZWVQYXRoKGxpbmUsIGlnbm9yZWRQcmVmaXhlcykpO1xuICBjb25zdCBkaXJlY3RvcmllcyA9IGxpbmVzLmZpbHRlcigobCkgPT4gbC5lbmRzV2l0aCgnLycpKS5tYXAoKGwpID0+IGwuc2xpY2UoMCwgLTEpKTtcbiAgY29uc3QgZmlsZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+ICFsLmVuZHNXaXRoKCcvJykpO1xuXG4gIHJldHVybiB7IGRpcmVjdG9yaWVzLCBmaWxlcyB9O1xufVxuXG4vKipcbiAqIENvcGllcyB0aGUgYC5jYXJkc2AgZGlyZWN0b3J5IGZyb20gdGhlIHNvdXJjZSByb290IGludG8gdGhlIHdvcmt0cmVlLlxuICpcbiAqIGAuY2FyZHNgIG5lZWRzIGFuIGluZGVwZW5kZW50IGNvcHkgcGVyIHdvcmt0cmVlIHJhdGhlciB0aGFuIGEgc3ltbGlua1xuICogc28gZWFjaCB3b3JrdHJlZSBjYW4gbW9kaWZ5IGl0cyBjYXJkcyBzdGF0ZSB3aXRob3V0IGFmZmVjdGluZyBvdGhlcnMuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdCBjb250YWluaW5nIGAuY2FyZHNgLlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gRGVzdGluYXRpb24gd29ya3RyZWUgcm9vdC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY29weUNhcmRzRGlyZWN0b3J5KHNvdXJjZVJvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsICcuY2FyZHMnKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5jcChzb3VyY2VQYXRoLCBwYXRoLmpvaW4od29ya3RyZWVEaXIsICcuY2FyZHMnKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBXcml0ZXMgdGhlIHBlci13b3JrdHJlZSBgLmNhcmRzL0NBUkRfSURgIG1hcmtlci5cbiAqXG4gKiBXb3Jrc3BhY2UgZ2l0IGhvb2tzIHJlYWQgdGhpcyBmaWxlICh2aWEgYGdpdCByZXYtcGFyc2UgLS1zaG93LXRvcGxldmVsYCB0aGVuXG4gKiBgPHJvb3Q+Ly5jYXJkcy9DQVJEX0lEYCkgdG8gYXR0cmlidXRlIGNvbW1pdHMgdG8gYSBjYXJkIHdpdGhvdXQgaW5oZXJpdGluZ1xuICogdGhlIGxlZ2FjeSBgQ0FSRF9JRGAgZW52aXJvbm1lbnQgdmFyaWFibGUuIFRoZSB0cmFpbGluZyBuZXdsaW5lIGlzIGludGVudGlvbmFsXG4gKiBcdTIwMTQgdGV4dC1tb2RlIHRvb2xzIGFuZCBgZ2l0IGRpZmZgIGV4cGVjdCBhIG5ld2xpbmUtdGVybWluYXRlZCBmaWxlLlxuICpcbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIEFic29sdXRlIHdvcmt0cmVlIHJvb3QuXG4gKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBpZGVudGlmaWVyIHRvIHJlY29yZC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gd3JpdGVDYXJkQm91bmRGaWxlKHdvcmt0cmVlRGlyOiBzdHJpbmcsIGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNhcmRzRGlyID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCAnLmNhcmRzJyk7XG4gIGF3YWl0IGZzLm1rZGlyKGNhcmRzRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgYXdhaXQgZnMud3JpdGVGaWxlKHBhdGguam9pbihjYXJkc0RpciwgJ0NBUkRfSUQnKSwgYCR7Y2FyZElkfVxcbmApO1xufVxuXG5pbnRlcmZhY2UgU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIGlnbm9yZWQ6IElnbm9yZWRQYXRocztcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQge1xuICBkaXJDb3VudDogbnVtYmVyO1xuICBmaWxlQ291bnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTeW1saW5rcyBpZ25vcmVkIGRpcmVjdG9yaWVzIGFuZCBmaWxlcyBmcm9tIHNvdXJjZSBjaGVja291dCBpbnRvIGEgd29ya3RyZWUuXG4gKlxuICogTmVzdGVkIGlnbm9yZWQgZGlyZWN0b3JpZXMgYXJlIGNvbGxhcHNlZCBzbyBvbmx5IHRvcC1sZXZlbCBpZ25vcmVkIGRpcmVjdG9yeVxuICogbGlua3MgYXJlIGNyZWF0ZWQuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUsIGFuZCBpZ25vcmVkIHBhdGggbGlzdHMuXG4gKiBAcmV0dXJucyBDb3VudHMgb2Ygc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgZGlyZWN0b3J5IGFuZCBmaWxlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0lnbm9yZWRQYXRocyhvcHRzOiBTeW1saW5rSWdub3JlZFBhdGhzT3B0aW9ucyk6IFByb21pc2U8U3ltbGlua0lnbm9yZWRQYXRoc1Jlc3VsdD4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0gPSBvcHRzO1xuICBjb25zdCBkaXJTZXQgPSBuZXcgU2V0KGlnbm9yZWQuZGlyZWN0b3JpZXMpO1xuICBjb25zdCBub25OZXN0ZWREaXJzID0gaWdub3JlZC5kaXJlY3Rvcmllcy5maWx0ZXIoKGRpcikgPT4gIWlzTmVzdGVkVW5kZXIoZGlyLCBkaXJTZXQpKTtcblxuICBjb25zdCBjcmVhdGVEaXJTeW1saW5rID0gYXN5bmMgKGRpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZGlyKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLmxzdGF0KHNvdXJjZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gbHN0YXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIGRpcik7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZGlyKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgY3JlYXRlRmlsZVN5bWxpbmsgPSBhc3luYyAoZmlsZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZmlsZSk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBmaWxlKTtcbiAgICAgIGNvbnN0IHBhcmVudERpciA9IHBhdGguZGlybmFtZShmaWxlKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZGlyUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZERpcnMubWFwKGNyZWF0ZURpclN5bWxpbmspKTtcbiAgY29uc3Qgbm9uTmVzdGVkRmlsZXMgPSBpZ25vcmVkLmZpbGVzLmZpbHRlcigoZmlsZSkgPT4gIWlzTmVzdGVkVW5kZXIoZmlsZSwgZGlyU2V0KSk7XG4gIGNvbnN0IGZpbGVSZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwobm9uTmVzdGVkRmlsZXMubWFwKGNyZWF0ZUZpbGVTeW1saW5rKSk7XG5cbiAgY29uc3QgZGlyQ291bnQgPSBkaXJSZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xuICBjb25zdCBmaWxlQ291bnQgPSBmaWxlUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcblxuICByZXR1cm4geyBkaXJDb3VudCwgZmlsZUNvdW50IH07XG59XG5cbi8qKlxuICogUmVwbGljYXRlcyByb290LWxldmVsIHN5bWxpbmtzIGZyb20gdGhlIHNvdXJjZSBjaGVja291dCBpbnRvIHRoZSB3b3JrdHJlZS5cbiAqXG4gKiBFeGlzdGluZyBkZXN0aW5hdGlvbiBlbnRyaWVzIGFyZSBsZWZ0IHVudG91Y2hlZC5cbiAqXG4gKiBAcGFyYW0gc291cmNlUm9vdCAtIFNvdXJjZSBjaGVja291dCByb290LlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gRGVzdGluYXRpb24gd29ya3RyZWUgcm9vdC5cbiAqIEByZXR1cm5zIE51bWJlciBvZiBzeW1saW5rcyBjcmVhdGVkIGluIHRoZSBkZXN0aW5hdGlvbiByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29weUV4aXN0aW5nU3ltbGlua3Moc291cmNlUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgZW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlUm9vdCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBpZ25vcmVkUm9vdEVudHJpZXMgPSBnZXRJZ25vcmVkV29ya3RyZWVSb290RW50cmllcyhzb3VyY2VSb290KTtcbiAgY29uc3Qgc3ltbGlua3MgPSBlbnRyaWVzLmZpbHRlcihcbiAgICAoZW50cnkpID0+IGVudHJ5LmlzU3ltYm9saWNMaW5rKCkgJiYgZW50cnkubmFtZSAhPT0gJy5naXQnICYmICFpZ25vcmVkUm9vdEVudHJpZXMuaGFzKGVudHJ5Lm5hbWUpXG4gICk7XG5cbiAgY29uc3QgY29weVN5bWxpbmsgPSBhc3luYyAobmFtZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIG5hbWUpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBmcy5sc3RhdChkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gZmFsc2U7IC8vIERlc3RpbmF0aW9uIGFscmVhZHkgZXhpc3RzXG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgc291cmNlTGlua1BhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgbmFtZSk7XG5cbiAgICAvLyBTa2lwIHNlbGYtcmVmZXJlbmNpbmcgc3ltbGlua3MgKHRhcmdldCByZXNvbHZlcyBiYWNrIHRvIHRoZSBzeW1saW5rIGl0c2VsZilcbiAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzb3VyY2VMaW5rUGF0aCk7XG4gICAgY29uc3QgcmVzb2x2ZWRUYXJnZXQgPSBwYXRoLnJlc29sdmUoc291cmNlUm9vdCwgdGFyZ2V0KTtcbiAgICBpZiAocmVzb2x2ZWRUYXJnZXQgPT09IHNvdXJjZUxpbmtQYXRoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VMaW5rUGF0aCwgZGVzdFBhdGgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChzeW1saW5rcy5tYXAoKGUpID0+IGNvcHlTeW1saW5rKGUubmFtZSkpKTtcbiAgcmV0dXJuIHJlc3VsdHMuZmlsdGVyKChyKSA9PiByKS5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGdldElnbm9yZWRXb3JrdHJlZVByZWZpeGVzKHNvdXJjZVJvb3Q6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcHJlZml4ZXMgPSBuZXcgU2V0PHN0cmluZz4oWycud29ya3RyZWVzJ10pO1xuICBjb25zdCB3b3JrdHJlZXNSb290ID0gcGF0aC5yZXNvbHZlKHJlc29sdmVXb3JrdHJlZXNSb290KCkpO1xuICBjb25zdCByZWxhdGl2ZVJvb3QgPSBwYXRoLnJlbGF0aXZlKHNvdXJjZVJvb3QsIHdvcmt0cmVlc1Jvb3QpO1xuXG4gIGlmICghcmVsYXRpdmVSb290LnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZVJvb3QpKSB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVJlbGF0aXZlUGF0aChyZWxhdGl2ZVJvb3QpO1xuICAgIGlmIChub3JtYWxpemVkLmxlbmd0aCA+IDApIHtcbiAgICAgIHByZWZpeGVzLmFkZChub3JtYWxpemVkKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gWy4uLnByZWZpeGVzXTtcbn1cblxuZnVuY3Rpb24gZ2V0SWdub3JlZFdvcmt0cmVlUm9vdEVudHJpZXMoc291cmNlUm9vdDogc3RyaW5nKTogU2V0PHN0cmluZz4ge1xuICBjb25zdCBlbnRyaWVzID0gbmV3IFNldDxzdHJpbmc+KFsnLndvcmt0cmVlcyddKTtcblxuICBmb3IgKGNvbnN0IHByZWZpeCBvZiBnZXRJZ25vcmVkV29ya3RyZWVQcmVmaXhlcyhzb3VyY2VSb290KSkge1xuICAgIGNvbnN0IFtyb290RW50cnldID0gcHJlZml4LnNwbGl0KCcvJyk7XG4gICAgaWYgKHJvb3RFbnRyeSkge1xuICAgICAgZW50cmllcy5hZGQocm9vdEVudHJ5KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZW50cmllcztcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplUmVsYXRpdmVQYXRoKHJlbGF0aXZlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlbGF0aXZlUGF0aFxuICAgIC5zcGxpdChwYXRoLnNlcClcbiAgICAuZmlsdGVyKChzZWdtZW50KSA9PiBzZWdtZW50Lmxlbmd0aCA+IDAgJiYgc2VnbWVudCAhPT0gJy4nKVxuICAgIC5qb2luKCcvJyk7XG59XG5cbmZ1bmN0aW9uIGlzSWdub3JlZFdvcmt0cmVlUGF0aChjYW5kaWRhdGU6IHN0cmluZywgaWdub3JlZFByZWZpeGVzOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICBjb25zdCBub3JtYWxpemVkQ2FuZGlkYXRlID0gY2FuZGlkYXRlLnJlcGxhY2UoL1xcLyQvLCAnJyk7XG4gIHJldHVybiBpZ25vcmVkUHJlZml4ZXMuc29tZShcbiAgICAocHJlZml4KSA9PiBub3JtYWxpemVkQ2FuZGlkYXRlID09PSBwcmVmaXggfHwgbm9ybWFsaXplZENhbmRpZGF0ZS5zdGFydHNXaXRoKGAke3ByZWZpeH0vYClcbiAgKTtcbn1cblxuaW50ZXJmYWNlIFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMge1xuICBzb3VyY2VOb2RlTW9kdWxlczogc3RyaW5nO1xuICBkZXN0Tm9kZU1vZHVsZXM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBNaXJyb3JzIGEgbm9kZV9tb2R1bGVzIHRyZWUgaW50byB0aGUgd29ya3RyZWUgdXNpbmcgc3ltbGlua3MuXG4gKlxuICogSW50ZXJuYWwgd29ya3NwYWNlIGxpbmtzIGtlZXAgdGhlaXIgb3JpZ2luYWwgcmVsYXRpdmUgdGFyZ2V0cyB3aGlsZSBleHRlcm5hbFxuICogbGlua3MgYW5kIG5vbi1saW5rIGVudHJpZXMgYXJlIHJlcHJlc2VudGVkIGFzIHN5bWxpbmtzIHRvIHNvdXJjZSBwYXRocy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFNvdXJjZSBhbmQgZGVzdGluYXRpb24gbm9kZV9tb2R1bGVzIGRpcmVjdG9yaWVzLlxuICogQHJldHVybnMgQ291bnQgb2YgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzIHJlY3JlYXRlZCBieSB0YXJnZXQgcGF0aC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VOb2RlTW9kdWxlcywgZGVzdE5vZGVNb2R1bGVzIH0gPSBvcHRzO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMubHN0YXQoc291cmNlTm9kZU1vZHVsZXMpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkZXN0U3RhdHMgPSBhd2FpdCBmcy5sc3RhdChkZXN0Tm9kZU1vZHVsZXMpO1xuICAgIGlmIChkZXN0U3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgYXdhaXQgZnMudW5saW5rKGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMubWtkaXIoZGVzdE5vZGVNb2R1bGVzLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VOb2RlTW9kdWxlcywgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBjb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbnRyaWVzLm1hcChhc3luYyAoZW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VOb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihkZXN0Tm9kZU1vZHVsZXMsIGVudHJ5Lm5hbWUpO1xuXG4gICAgICBpZiAoZW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzb3VyY2VQYXRoKTtcbiAgICAgICAgaWYgKGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldCkpIHtcbiAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHRhcmdldCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgZW50cnkubmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgY29uc3Qgc2NvcGVDb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICBzY29wZUVudHJpZXMubWFwKGFzeW5jIChzY29wZUVudHJ5KTogUHJvbWlzZTxudW1iZXI+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlU291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVEZXN0UGF0aCA9IHBhdGguam9pbihkZXN0UGF0aCwgc2NvcGVFbnRyeS5uYW1lKTtcblxuICAgICAgICAgICAgaWYgKHNjb3BlRW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzY29wZVNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNjb3BlU291cmNlUGF0aCwgc2NvcGVEZXN0UGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHNjb3BlQ291bnRzLnJlZHVjZSgoc3VtLCBjKSA9PiBzdW0gKyBjLCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9KVxuICApO1xuXG4gIHJldHVybiBjb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZUFsbE5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZXJvdXRlcyByb290IGFuZCBwZXItcGFja2FnZSBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogVGhlIG9wZXJhdGlvbiBpcyBza2lwcGVkIHdoZW4gdGhlIHJlcG9zaXRvcnkgaGFzIG5vIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QsIGFuZCByZXBvIHJvb3QuXG4gKiBAcmV0dXJucyBUb3RhbCBudW1iZXIgb2YgcmVjcmVhdGVkIGludGVybmFsIHdvcmtzcGFjZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVBbGxOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSA9IG9wdHM7XG5cbiAgbGV0IHBhY2thZ2VKc29uOiB7IHdvcmtzcGFjZXM/OiBzdHJpbmdbXSB9O1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhdGguam9pbihyZXBvUm9vdCwgJ3BhY2thZ2UuanNvbicpLCAndXRmLTgnKTtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGlmICghcGFja2FnZUpzb24ud29ya3NwYWNlcykge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgbGV0IHRvdGFsQ291bnQgPSAwO1xuXG4gIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICBzb3VyY2VOb2RlTW9kdWxlczogcGF0aC5qb2luKHNvdXJjZVJvb3QsICdub2RlX21vZHVsZXMnKSxcbiAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbih3b3JrdHJlZURpciwgJ25vZGVfbW9kdWxlcycpXG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VzRGlyID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsICdwYWNrYWdlcycpO1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VFbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihwYWNrYWdlc0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGFja2FnZUVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIGNvbnN0IHBrZ05vZGVNb2R1bGVzID0gcGF0aC5qb2luKHBhY2thZ2VzRGlyLCBlbnRyeS5uYW1lLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0V4aXN0cyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGZzLmxzdGF0KHBrZ05vZGVNb2R1bGVzKTtcbiAgICAgICAgICBub2RlTW9kdWxlc0V4aXN0cyA9IHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGVNb2R1bGVzRXhpc3RzKSB7XG4gICAgICAgICAgY29uc3QgZGVzdFBhY2thZ2VEaXIgPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsICdwYWNrYWdlcycsIGVudHJ5Lm5hbWUpO1xuICAgICAgICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RQYWNrYWdlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICB0b3RhbENvdW50ICs9IGF3YWl0IHJlcm91dGVOb2RlTW9kdWxlcyh7XG4gICAgICAgICAgICBzb3VyY2VOb2RlTW9kdWxlczogcGtnTm9kZU1vZHVsZXMsXG4gICAgICAgICAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbihkZXN0UGFja2FnZURpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG90YWxDb3VudDtcbn1cblxuaW50ZXJmYWNlIFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zIHtcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG4gIGFkZGl0aW9uYWxFeGNsdWRlcz86IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIEFwcGVuZHMgc3ltbGlua2VkIGlnbm9yZWQgcGF0aHMgdG8gdGhlIHdvcmt0cmVlLXNwZWNpZmljIGdpdCBleGNsdWRlIGZpbGUuXG4gKlxuICogQWxzbyBlbmFibGVzIGBleHRlbnNpb25zLndvcmt0cmVlQ29uZmlnYCBhbmQgc2V0cyB3b3JrdHJlZS1sb2NhbFxuICogYGNvcmUuZXhjbHVkZXNGaWxlYCBzbyBnaXQgc3RhdHVzIGluIHRoZSB3b3JrdHJlZSBpZ25vcmVzIGluamVjdGVkIGxpbmtzLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gV29ya3RyZWUgcGF0aCwgcmVwbyByb290LCBhbmQgaWdub3JlZCBwYXRoIGNhbmRpZGF0ZXMuXG4gKiBAcmV0dXJucyBObyB2YWx1ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUdpdEV4Y2x1ZGUob3B0czogVXBkYXRlR2l0RXhjbHVkZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyB3b3JrdHJlZURpciwgcmVwb1Jvb3QsIGRpcmVjdG9yaWVzLCBmaWxlcywgYWRkaXRpb25hbEV4Y2x1ZGVzIH0gPSBvcHRzO1xuXG4gIGNvbnN0IHsgc3Rkb3V0OiBnaXREaXIgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ3Jldi1wYXJzZScsICctLWdpdC1kaXInXSwge1xuICAgIHRpbWVvdXQ6IDVfMDAwXG4gIH0pO1xuICBjb25zdCBleGNsdWRlUGF0aCA9IHBhdGguam9pbihnaXREaXIudHJpbSgpLCAnaW5mbycsICdleGNsdWRlJyk7XG4gIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShleGNsdWRlUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGxpbmVzID0gWycjIFN5bWxpbmtzIGNyZWF0ZWQgYnkgaW5zdGFudC13b3JrdHJlZSddO1xuXG4gIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdG9yaWVzKSB7XG4gICAgaWYgKCFkaXIpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZGlyKSk7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkgbGluZXMucHVzaChkaXIpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCFmaWxlKSBjb250aW51ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChwYXRoLmpvaW4od29ya3RyZWVEaXIsIGZpbGUpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGZpbGUpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGFkZGl0aW9uYWxFeGNsdWRlcykge1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgYWRkaXRpb25hbEV4Y2x1ZGVzKSB7XG4gICAgICBpZiAoZW50cnkpIGxpbmVzLnB1c2goZW50cnkpO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IGZzLmFwcGVuZEZpbGUoZXhjbHVkZVBhdGgsIGAke2xpbmVzLmpvaW4oJ1xcbicpfVxcbmApO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHJlcG9Sb290LCAnY29uZmlnJywgJ2V4dGVuc2lvbnMud29ya3RyZWVDb25maWcnLCAndHJ1ZSddLCB7IHRpbWVvdXQ6IDVfMDAwIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgYGNyZWF0ZS13b3JrdHJlZTogZmFpbGVkIHRvIHNldCB3b3JrdHJlZUNvbmZpZyBleHRlbnNpb246ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICApO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJy1DJywgd29ya3RyZWVEaXIsICdjb25maWcnLCAnLS13b3JrdHJlZScsICdjb3JlLmV4Y2x1ZGVzRmlsZScsIGV4Y2x1ZGVQYXRoXSwge1xuICAgICAgdGltZW91dDogNV8wMDBcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBjcmVhdGUtd29ya3RyZWU6IGZhaWxlZCB0byBzZXQgY29yZS5leGNsdWRlc0ZpbGU6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICApO1xuICB9XG59XG4iLCAiLyoqXG4gKiBTaGFyZWQgQ2FyZHMgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgaGVscGVycy5cbiAqXG4gKiBLZWVwcyBnbG9iYWwgQ2FyZHMgcGF0aCByZXNvbHV0aW9uIGNvbnNpc3RlbnQgYWNyb3NzIHBhY2thZ2VzIHRoYXQgbmVlZCB0b1xuICogcmVhZCBvciBzdGFnZSB1c2VyLXNjb3BlZCBDYXJkcy1tYW5hZ2VkIGFzc2V0cy5cbiAqXG4gKiBAc3VtbWFyeSBTaGFyZWQgQ2FyZHMgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgaGVscGVyc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnbm9kZTpvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5cbi8qKiBOYW1lIG9mIHRoZSBDYXJkcyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS4gKi9cbmV4cG9ydCBjb25zdCBDQVJEU19ESVJfTkFNRSA9ICcuY2FyZHMnO1xuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBDYXJkcyBnbG9iYWwgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgdXNpbmcgdGhlIHN0YW5kYXJkIGZhbGxiYWNrIGNoYWluLlxuICpcbiAqIFJlc29sdXRpb24gb3JkZXI6XG4gKiAxLiBgJENBUkRTX0hPTUVgXG4gKiAyLiBgJFhER19EQVRBX0hPTUUvLmNhcmRzYFxuICogMy4gYCRYREdfQ09ORklHX0hPTUUvLmNhcmRzYFxuICogNC4gYH4vLmNhcmRzYFxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIENhcmRzIGdsb2JhbCBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVHbG9iYWxDYXJkc0NvbmZpZ0RpcigpOiBzdHJpbmcge1xuICBjb25zdCBjYXJkc0hvbWUgPSBwcm9jZXNzLmVudlsnQ0FSRFNfSE9NRSddO1xuICBpZiAoY2FyZHNIb21lKSB7XG4gICAgcmV0dXJuIGNhcmRzSG9tZTtcbiAgfVxuXG4gIGNvbnN0IHhkZ0RhdGFIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19EQVRBX0hPTUUnXTtcbiAgaWYgKHhkZ0RhdGFIb21lKSB7XG4gICAgcmV0dXJuIHBhdGguam9pbih4ZGdEYXRhSG9tZSwgQ0FSRFNfRElSX05BTUUpO1xuICB9XG5cbiAgY29uc3QgeGRnQ29uZmlnSG9tZSA9IHByb2Nlc3MuZW52WydYREdfQ09ORklHX0hPTUUnXTtcbiAgaWYgKHhkZ0NvbmZpZ0hvbWUpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHhkZ0NvbmZpZ0hvbWUsIENBUkRTX0RJUl9OQU1FKTtcbiAgfVxuXG4gIHJldHVybiBwYXRoLmpvaW4oaG9tZWRpcigpLCBDQVJEU19ESVJfTkFNRSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgc3RhYmxlLCB1bmlxdWUgaWRlbnRpZmllciBmb3IgYSByZXBvc2l0b3J5IHJvb3QgcGF0aC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IHJvb3QuXG4gKiBAcmV0dXJucyBBIHNob3J0IHN0YWJsZSBoYXNoICg4IGNoYXJzKSBwcmVmaXhlZCB3aXRoIHRoZSBkaXJlY3RvcnkgbmFtZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlUmVwb0lkKHJlcG9Sb290OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBkaXJOYW1lID0gcGF0aC5iYXNlbmFtZShyZXBvUm9vdCk7XG4gIGNvbnN0IGhhc2ggPSBjcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUocmVwb1Jvb3QpLmRpZ2VzdCgnaGV4Jykuc2xpY2UoMCwgOCk7XG4gIHJldHVybiBgJHtkaXJOYW1lfS0ke2hhc2h9YDtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgc2hhcmVkIHJvb3QgdGhhdCBzdG9yZXMgQ2FyZHMtbWFuYWdlZCB3b3JrdHJlZXMuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgd29ya3RyZWUgcm9vdCBkaXJlY3RvcnkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlV29ya3RyZWVzUm9vdCgpOiBzdHJpbmcge1xuICBjb25zdCBvdmVycmlkZVJvb3QgPSBwcm9jZXNzLmVudlsnQ0FSRFNfV09SS1RSRUVTX0RJUiddO1xuICBpZiAob3ZlcnJpZGVSb290KSB7XG4gICAgcmV0dXJuIG92ZXJyaWRlUm9vdDtcbiAgfVxuXG4gIHJldHVybiBwYXRoLmpvaW4ocmVzb2x2ZUdsb2JhbENhcmRzQ29uZmlnRGlyKCksICd3b3JrdHJlZXMnKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgY2VudHJhbGl6ZWQgd29ya3RyZWUgZGlyZWN0b3J5IGZvciBhIGdpdmVuIHJlcG9zaXRvcnkgYW5kIHJlZi5cbiAqXG4gKiBQYXRoIHBhdHRlcm46IGAkQ0FSRFNfSE9NRS93b3JrdHJlZXMvPHJlcG8taWQ+LzxyZWY+YFxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHJlcG9zaXRvcnkgcm9vdC5cbiAqIEBwYXJhbSByZWYgLSBHaXQgcmVmZXJlbmNlIChicmFuY2gsIHRhZywgb3IgU0hBKS5cbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIHdvcmt0cmVlIGRpcmVjdG9yeS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVXb3JrdHJlZURpcihyZXBvUm9vdDogc3RyaW5nLCByZWY6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHJlcG9JZCA9IGdlbmVyYXRlUmVwb0lkKHJlcG9Sb290KTtcbiAgcmV0dXJuIHBhdGguam9pbihyZXNvbHZlV29ya3RyZWVzUm9vdCgpLCByZXBvSWQsIHJlZik7XG59XG4iLCAiLyoqXG4gKiBBcHBsaWVzIGAud29ya3RyZWVpbmNsdWRlYCBjb3B5IHJ1bGVzIGFmdGVyIHRoZSBzeW1saW5rLXJlcm91dGUgcGFzcy5cbiAqXG4gKiBSZWFkcyBhIGdpdGlnbm9yZS1zeW50YXggZmlsZSBhdCBgPHNvdXJjZVJvb3Q+Ly53b3JrdHJlZWluY2x1ZGVgLCBpbnRlcnNlY3RzXG4gKiBpdHMgcGF0dGVybnMgd2l0aCBwYXRocyBhbHJlYWR5IGdpdGlnbm9yZWQgKHZpYSBgZ2l0IGNoZWNrLWlnbm9yZSAtLXN0ZGluYCksXG4gKiBhbmQgY29waWVzIG1hdGNoaW5nIGZpbGVzL3N5bWxpbmtzIGludG8gdGhlIHdvcmt0cmVlLCBwcmVzZXJ2aW5nIG1vZGUgYml0c1xuICogYW5kIHN5bWxpbmtzLWFzLXN5bWxpbmtzLlxuICpcbiAqIEBzdW1tYXJ5IGAud29ya3RyZWVpbmNsdWRlYCBjb3B5IHN0ZXAgZm9yIHdvcmt0cmVlIGNyZWF0aW9uXG4gKiBAbW9kdWxlIHdvcmt0cmVlSW5jbHVkZVxuICovXG5cbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB0eXBlIHsgRGlyZW50IH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCBpZ25vcmUgZnJvbSAnaWdub3JlJztcblxuLyoqXG4gKiBUaHJvd24gd2hlbiB0aGUgYC53b3JrdHJlZWluY2x1ZGVgIHByb2Nlc3Npbmcgc3RlcCBmYWlscy5cbiAqXG4gKiBUaGUgQ0xJIG1hcHMgdGhpcyBjbGFzcyB0byBleGl0IGNvZGUgMyBzbyBjYWxsZXJzIGNhbiBkaXN0aW5ndWlzaCBpbmNsdWRlLWZpbGVcbiAqIGZhaWx1cmVzIGZyb20gZ2VuZXJhbCB3b3JrdHJlZS1jcmVhdGlvbiBmYWlsdXJlcyAoZXhpdCBjb2RlIDIpLlxuICovXG5leHBvcnQgY2xhc3MgV29ya3RyZWVJbmNsdWRlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIG92ZXJyaWRlIG5hbWUgPSAnV29ya3RyZWVJbmNsdWRlRXJyb3InO1xufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IHdhbGtzIGEgZGlyZWN0b3J5IGFuZCByZXR1cm5zIHJlbGF0aXZlIHBhdGhzIG9mIGFsbCBub24tZGlyZWN0b3J5XG4gKiBlbnRyaWVzLCBleGNsdWRpbmcgYC5naXRgIGFuZCBgLndvcmt0cmVlc2AgZGlyZWN0b3JpZXMuXG4gKlxuICogQHBhcmFtIHJvb3REaXIgLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByb290IGRpcmVjdG9yeSB0byB3YWxrLlxuICogQHBhcmFtIHJlbERpciAtIFJlbGF0aXZlIHBhdGggZnJvbSByb290RGlyIHRvIGN1cnJlbnQgZGlyZWN0b3J5ICh1c2VkIGluIHJlY3Vyc2lvbikuXG4gKiBAcmV0dXJucyBBcnJheSBvZiByZWxhdGl2ZSBwYXRocyB0byBmaWxlcyBhbmQgc3ltbGlua3MuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHdhbGtEaXIocm9vdERpcjogc3RyaW5nLCByZWxEaXIgPSAnJyk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgY29uc3QgYWJzRGlyID0gcmVsRGlyID8gcGF0aC5qb2luKHJvb3REaXIsIHJlbERpcikgOiByb290RGlyO1xuICBsZXQgZW50cmllczogRGlyZW50W107XG4gIHRyeSB7XG4gICAgZW50cmllcyA9IChhd2FpdCBmcy5yZWFkZGlyKGFic0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlLCBlbmNvZGluZzogJ3V0ZjgnIH0pKSBhcyB1bmtub3duIGFzIERpcmVudFtdO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCByZXN1bHRzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBjb25zdCBuYW1lID0gZW50cnkubmFtZSBhcyB1bmtub3duIGFzIHN0cmluZztcbiAgICBjb25zdCByZWxQYXRoID0gcmVsRGlyID8gYCR7cmVsRGlyfS8ke25hbWV9YCA6IG5hbWU7XG4gICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGlmIChuYW1lID09PSAnLmdpdCcgfHwgbmFtZSA9PT0gJy53b3JrdHJlZXMnKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gYXdhaXQgd2Fsa0Rpcihyb290RGlyLCByZWxQYXRoKTtcbiAgICAgIHJlc3VsdHMucHVzaCguLi5jaGlsZHJlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdHMucHVzaChyZWxQYXRoKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbi8qKlxuICogUnVucyBgZ2l0IGNoZWNrLWlnbm9yZSAtLXN0ZGluIC16YCBmb3IgYSBiYXRjaCBvZiBwYXRocyBpbiBgY3dkYC5cbiAqXG4gKiBSZXR1cm5zIHRoZSBzdWJzZXQgb2YgYGNhbmRpZGF0ZXNgIHRoYXQgYXJlIGdpdGlnbm9yZWQuXG4gKiBFeGl0IGNvZGUgMSB3aXRoIGVtcHR5IHN0ZG91dCBtZWFucyBub3RoaW5nIG1hdGNoZWQgXHUyMDE0IG5vdCBhbiBlcnJvci5cbiAqIEFueSBvdGhlciBub24temVybyBjb2RlIHRocm93cyBgV29ya3RyZWVJbmNsdWRlRXJyb3JgLlxuICpcbiAqIEBwYXJhbSBjd2QgLSBEaXJlY3RvcnkgdG8gcnVuIGdpdCBjaGVjay1pZ25vcmUgZnJvbS5cbiAqIEBwYXJhbSBjYW5kaWRhdGVzIC0gUmVsYXRpdmUgcGF0aHMgdG8gY2hlY2suXG4gKiBAcmV0dXJucyBBcnJheSBvZiBnaXRpZ25vcmVkIHJlbGF0aXZlIHBhdGhzLlxuICovXG5hc3luYyBmdW5jdGlvbiBnaXRJZ25vcmVkUGF0aHMoY3dkOiBzdHJpbmcsIGNhbmRpZGF0ZXM6IHN0cmluZ1tdKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBpZiAoY2FuZGlkYXRlcy5sZW5ndGggPT09IDApIHJldHVybiBbXTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oJ2dpdCcsIFsnY2hlY2staWdub3JlJywgJy0tc3RkaW4nLCAnLXonXSwge1xuICAgICAgY3dkLFxuICAgICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICAgIH0pO1xuXG4gICAgY29uc3Qgc3Rkb3V0Q2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xuICAgIGNvbnN0IHN0ZGVyckNodW5rczogQnVmZmVyW10gPSBbXTtcblxuICAgIGNoaWxkLnN0ZG91dC5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiBzdGRvdXRDaHVua3MucHVzaChjaHVuaykpO1xuICAgIGNoaWxkLnN0ZGVyci5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiBzdGRlcnJDaHVua3MucHVzaChjaHVuaykpO1xuXG4gICAgY2hpbGQub24oJ2Nsb3NlJywgKGNvZGUpID0+IHtcbiAgICAgIGNvbnN0IHN0ZG91dCA9IEJ1ZmZlci5jb25jYXQoc3Rkb3V0Q2h1bmtzKS50b1N0cmluZygndXRmOCcpO1xuICAgICAgY29uc3Qgc3RkZXJyID0gQnVmZmVyLmNvbmNhdChzdGRlcnJDaHVua3MpLnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICByZXNvbHZlKHN0ZG91dCA/IHN0ZG91dC5zcGxpdCgnXFwwJykuZmlsdGVyKEJvb2xlYW4pIDogW10pO1xuICAgICAgfSBlbHNlIGlmIChjb2RlID09PSAxKSB7XG4gICAgICAgIC8vIE5vIHBhdGhzIG1hdGNoZWQgXHUyMDE0IG5vdCBhbiBlcnJvclxuICAgICAgICByZXNvbHZlKFtdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlamVjdChuZXcgV29ya3RyZWVJbmNsdWRlRXJyb3IoYGdpdCBjaGVjay1pZ25vcmUgZmFpbGVkIChleGl0ICR7U3RyaW5nKGNvZGUpfSk6ICR7c3RkZXJyfWApKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNoaWxkLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIHJlamVjdChuZXcgV29ya3RyZWVJbmNsdWRlRXJyb3IoYGdpdCBjaGVjay1pZ25vcmUgc3Bhd24gZmFpbGVkOiAke2Vyci5tZXNzYWdlfWAsIHsgY2F1c2U6IGVyciB9KSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBzdGRpbkRhdGEgPSBjYW5kaWRhdGVzLmpvaW4oJ1xcMCcpO1xuICAgIGNoaWxkLnN0ZGluLndyaXRlKHN0ZGluRGF0YSwgJ3V0ZjgnKTtcbiAgICBjaGlsZC5zdGRpbi5lbmQoKTtcbiAgfSk7XG59XG5cbi8qKlxuICogQXBwbGllcyBgLndvcmt0cmVlaW5jbHVkZWAgY29weSBydWxlcyB0byBhIGZyZXNobHktY3JlYXRlZCB3b3JrdHJlZS5cbiAqXG4gKiAxLiBSZWFkcyBgPHNvdXJjZVJvb3Q+Ly53b3JrdHJlZWluY2x1ZGVgIChnaXRpZ25vcmUgc3ludGF4KSB1c2luZyB0aGUgYGlnbm9yZWAgbGlicmFyeS5cbiAqIDIuIFdhbGtzIHRoZSBzb3VyY2UgdHJlZSBhbmQgY29sbGVjdHMgcGF0aHMgdGhhdCBtYXRjaCB0aGUgaW5jbHVkZSBwYXR0ZXJucy5cbiAqIDMuIEludGVyc2VjdHMgd2l0aCBnaXRpZ25vcmVkIHBhdGhzIGJ5IHBpcGluZyBjYW5kaWRhdGVzIHRocm91Z2ggYGdpdCBjaGVjay1pZ25vcmUgLS1zdGRpbmAuXG4gKiA0LiBDb3BpZXMgZWFjaCBtYXRjaGVkIHBhdGggaW50byBgd29ya3RyZWVEaXJgLCBwcmVzZXJ2aW5nIG1vZGUgYml0cyBhbmRcbiAqICAgIHJlcHJlc2VudGluZyBzeW1saW5rcyBhcyBzeW1saW5rcyByYXRoZXIgdGhhbiBkZXJlZmVyZW5jaW5nIHRoZW0uXG4gKlxuICogUmV0dXJucyB0aGUgY291bnQgb2YgZmlsZXMgY29waWVkLiBUaHJvd3Mge0BsaW5rIFdvcmt0cmVlSW5jbHVkZUVycm9yfSBvblxuICogcGFyc2UsIHdhbGssIG9yIGNvcHkgZmFpbHVyZS5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIE9wdGlvbnMgZm9yIHRoZSBpbmNsdWRlIHN0ZXAuXG4gKiBAcGFyYW0gb3B0cy5zb3VyY2VSb290IC0gU291cmNlIGNoZWNrb3V0IHJvb3QgY29udGFpbmluZyBgLndvcmt0cmVlaW5jbHVkZWAuXG4gKiBAcGFyYW0gb3B0cy53b3JrdHJlZURpciAtIERlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QuXG4gKiBAcmV0dXJucyBDb3VudCBvZiBmaWxlcyBjb3BpZWQgZnJvbSB0aGUgaW5jbHVkZSBsaXN0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwbHlXb3JrdHJlZUluY2x1ZGUob3B0czogeyBzb3VyY2VSb290OiBzdHJpbmc7IHdvcmt0cmVlRGlyOiBzdHJpbmcgfSk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIgfSA9IG9wdHM7XG5cbiAgLy8gU3RlcCAxOiBSZWFkIC53b3JrdHJlZWluY2x1ZGVcbiAgbGV0IGluY2x1ZGVDb250ZW50OiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgaW5jbHVkZUNvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShwYXRoLmpvaW4oc291cmNlUm9vdCwgJy53b3JrdHJlZWluY2x1ZGUnKSwgJ3V0ZjgnKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb247XG4gICAgaWYgKGVyci5jb2RlID09PSAnRU5PRU5UJykgcmV0dXJuIDA7XG4gICAgdGhyb3cgbmV3IFdvcmt0cmVlSW5jbHVkZUVycm9yKGBGYWlsZWQgdG8gcmVhZCAud29ya3RyZWVpbmNsdWRlOiAke2Vyci5tZXNzYWdlfWAsIHsgY2F1c2U6IGVycm9yIH0pO1xuICB9XG5cbiAgLy8gU3RlcCAyOiBQYXJzZSB3aXRoIGlnbm9yZSBsaWJyYXJ5XG4gIGNvbnN0IGlnID0gaWdub3JlKCkuYWRkKGluY2x1ZGVDb250ZW50KTtcblxuICAvLyBTdGVwIDM6IFdhbGsgc291cmNlIHRyZWVcbiAgY29uc3QgYWxsUGF0aHMgPSBhd2FpdCB3YWxrRGlyKHNvdXJjZVJvb3QpO1xuXG4gIC8vIEZpbHRlciB0byBwYXRocyBtYXRjaGluZyB0aGUgaW5jbHVkZSBwYXR0ZXJuc1xuICBjb25zdCBpbmNsdWRlZFBhdGhzID0gYWxsUGF0aHMuZmlsdGVyKChwKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBpZy5pZ25vcmVzKHApO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKGluY2x1ZGVkUGF0aHMubGVuZ3RoID09PSAwKSByZXR1cm4gMDtcblxuICAvLyBTdGVwIDQ6IEludGVyc2VjdCB3aXRoIGdpdGlnbm9yZWQgcGF0aHNcbiAgY29uc3QgZ2l0SWdub3JlZCA9IGF3YWl0IGdpdElnbm9yZWRQYXRocyhzb3VyY2VSb290LCBpbmNsdWRlZFBhdGhzKTtcbiAgY29uc3QgZ2l0SWdub3JlZFNldCA9IG5ldyBTZXQoZ2l0SWdub3JlZCk7XG5cbiAgY29uc3QgY29weVNldCA9IGluY2x1ZGVkUGF0aHMuZmlsdGVyKChwKSA9PiBnaXRJZ25vcmVkU2V0LmhhcyhwKSk7XG5cbiAgaWYgKGNvcHlTZXQubGVuZ3RoID09PSAwKSByZXR1cm4gMDtcblxuICAvLyBTdGVwIDU6IENvcHkgZWFjaCBwYXRoXG4gIGxldCBjb3VudCA9IDA7XG4gIGZvciAoY29uc3QgcmVsUGF0aCBvZiBjb3B5U2V0KSB7XG4gICAgY29uc3Qgc3JjQWJzID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIHJlbFBhdGgpO1xuICAgIGNvbnN0IGRlc3RBYnMgPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIHJlbFBhdGgpO1xuXG4gICAgbGV0IHN0YXQ6IEF3YWl0ZWQ8UmV0dXJuVHlwZTx0eXBlb2YgZnMubHN0YXQ+PjtcbiAgICB0cnkge1xuICAgICAgc3RhdCA9IGF3YWl0IGZzLmxzdGF0KHNyY0Ficyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbjtcbiAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VOT0VOVCcpIGNvbnRpbnVlO1xuICAgICAgdGhyb3cgbmV3IFdvcmt0cmVlSW5jbHVkZUVycm9yKGBGYWlsZWQgdG8gc3RhdCAke3JlbFBhdGh9OiAke2Vyci5tZXNzYWdlfWAsIHsgY2F1c2U6IGVycm9yIH0pO1xuICAgIH1cblxuICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShkZXN0QWJzKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBXb3JrdHJlZUluY2x1ZGVFcnJvcihgRmFpbGVkIHRvIGNyZWF0ZSBwYXJlbnQgZGlyZWN0b3J5IGZvciAke3JlbFBhdGh9OiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gLCB7XG4gICAgICAgIGNhdXNlOiBlcnJvclxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gYXdhaXQgZnMucmVhZGxpbmsoc3JjQWJzKTtcbiAgICAgICAgYXdhaXQgZnMuc3ltbGluayh0YXJnZXQsIGRlc3RBYnMpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhyb3cgbmV3IFdvcmt0cmVlSW5jbHVkZUVycm9yKGBGYWlsZWQgdG8gcmVjcmVhdGUgc3ltbGluayAke3JlbFBhdGh9OiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gLCB7XG4gICAgICAgICAgY2F1c2U6IGVycm9yXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5jb3B5RmlsZShzcmNBYnMsIGRlc3RBYnMpO1xuICAgICAgICBhd2FpdCBmcy5jaG1vZChkZXN0QWJzLCBzdGF0Lm1vZGUgJiAwbzc3NzcpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhyb3cgbmV3IFdvcmt0cmVlSW5jbHVkZUVycm9yKGBGYWlsZWQgdG8gY29weSAke3JlbFBhdGh9OiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gLCB7IGNhdXNlOiBlcnJvciB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb3VudCsrO1xuICB9XG5cbiAgcmV0dXJuIGNvdW50O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBhY2Nlc3MgdG8gQ2xhdWRlIENvZGUncyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHV0aWxpdGllc1xuICogZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAqXG4gKiAjIyBFbnZpcm9ubWVudCBWYXJpYWJsZXNcbiAqXG4gKiBDbGF1ZGUgQ29kZSBzZXRzIHRoZXNlIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aGVuIHJ1bm5pbmcgaG9va3M6XG4gKlxuICogfCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHwgQXZhaWxhYmxlIEluIHxcbiAqIHwtLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfUFJPSkVDVF9ESVJgIHwgQWJzb2x1dGUgcGF0aCB0byBwcm9qZWN0IHJvb3QgfCBBbGwgaG9va3MgfFxuICogfCBgQ0xBVURFX0VOVl9GSUxFYCB8IFBhdGggdG8gZmlsZSBmb3IgcGVyc2lzdGluZyBlbnYgdmFycyB8IFNlc3Npb25TdGFydCBvbmx5IHxcbiAqIHwgYENMQVVERV9DT0RFX1JFTU9URWAgfCBgXCJ0cnVlXCJgIGlmIHJ1bm5pbmcgcmVtb3RlbHkgfCBBbGwgaG9va3MgfFxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGdldFByb2plY3REaXIsIHBlcnNpc3RFbnZWYXIsIGlzUmVtb3RlRW52aXJvbm1lbnQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEdldCBwcm9qZWN0IGRpcmVjdG9yeVxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqXG4gKiAvLyBDaGVjayBpZiBydW5uaW5nIHJlbW90ZWx5XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIEhhbmRsZSByZW1vdGUtc3BlY2lmaWMgbG9naWNcbiAqIH1cbiAqXG4gKiAvLyBJbiBTZXNzaW9uU3RhcnQgaG9vazogcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCAnc2VjcmV0LWtleScpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1leGVjdXRpb24tZGV0YWlsc1xuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwibm9kZTpmc1wiO1xuLyoqXG4gKiBDbGF1ZGUgQ29kZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcy5cbiAqXG4gKiBUaGVzZSBhcmUgdGhlIGVudmlyb25tZW50IHZhcmlhYmxlcyB0aGF0IENsYXVkZSBDb2RlIHNldHMgd2hlbiBydW5uaW5nIGhvb2tzLlxuICovXG5leHBvcnQgY29uc3QgQ0xBVURFX0VOVl9WQVJTID0ge1xuICAgIC8qKlxuICAgICAqIEFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gICAgICogQXZhaWxhYmxlIGluIGFsbCBob29rcy5cbiAgICAgKi9cbiAgICBQUk9KRUNUX0RJUjogXCJDTEFVREVfUFJPSkVDVF9ESVJcIixcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIGEgZmlsZSB3aGVyZSBTZXNzaW9uU3RhcnQgaG9va3MgY2FuIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICAgICAqIFZhcmlhYmxlcyB3cml0dGVuIHRvIHRoaXMgZmlsZSB3aWxsIGJlIGF2YWlsYWJsZSBpbiBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICAgICAqIE9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAgICAgKi9cbiAgICBFTlZfRklMRTogXCJDTEFVREVfRU5WX0ZJTEVcIixcbiAgICAvKipcbiAgICAgKiBTZXQgdG8gXCJ0cnVlXCIgd2hlbiBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICAgICAqIE5vdCBzZXQgb3IgZW1wdHkgd2hlbiBydW5uaW5nIGluIGxvY2FsIENMSSBlbnZpcm9ubWVudC5cbiAgICAgKi9cbiAgICBSRU1PVEU6IFwiQ0xBVURFX0NPREVfUkVNT1RFXCIsXG59O1xuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBwcm9qZWN0IGRpcmVjdG9yeS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3Qgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gKiBUaGUgdmFsdWUgY29tZXMgZnJvbSB0aGUgYENMQVVERV9QUk9KRUNUX0RJUmAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gKiBAcmV0dXJucyBUaGUgcHJvamVjdCBkaXJlY3RvcnkgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICogaWYgKHByb2plY3REaXIpIHtcbiAqICAgY29uc3QgY29uZmlnUGF0aCA9IGAke3Byb2plY3REaXJ9Ly5jbGF1ZGUvY29uZmlnLmpzb25gO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0RGlyKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUFJPSkVDVF9ESVJdO1xufVxuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBlbnYgZmlsZSBwYXRoIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy4gVGhlIHBhdGggcG9pbnRzIHRvIGEgZmlsZVxuICogd2hlcmUgeW91IGNhbiB3cml0ZSBzaGVsbCBleHBvcnQgc3RhdGVtZW50cyB0byBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMgaW4gdGhlIHNlc3Npb24uXG4gKiBAcmV0dXJucyBUaGUgZW52IGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXQgKG5vdCBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICogaWYgKGVudkZpbGUpIHtcbiAqICAgLy8gV2UncmUgaW4gYSBTZXNzaW9uU3RhcnQgaG9vayBhbmQgY2FuIHBlcnNpc3QgZW52IHZhcnNcbiAqICAgcGVyc2lzdEVudlZhcignTVlfVkFSJywgJ215LXZhbHVlJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudkZpbGVQYXRoKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuRU5WX0ZJTEVdO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGhvb2sgaXMgcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAqXG4gKiBSZW1vdGUgZW52aXJvbm1lbnRzIG1heSBoYXZlIGRpZmZlcmVudCBjYXBhYmlsaXRpZXMgb3IgcmVzdHJpY3Rpb25zXG4gKiBjb21wYXJlZCB0byBsb2NhbCBDTEkgZW52aXJvbm1lbnRzLlxuICogQHJldHVybnMgdHJ1ZSBpZiBydW5uaW5nIHJlbW90ZWx5LCBmYWxzZSBpZiBydW5uaW5nIGxvY2FsbHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIFVzZSB3ZWItY29tcGF0aWJsZSBhcHByb2FjaGVzXG4gKiB9IGVsc2Uge1xuICogICAvLyBDYW4gdXNlIGxvY2FsIENMSSBmZWF0dXJlc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlbW90ZUVudmlyb25tZW50KCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUkVNT1RFXSA9PT0gXCJ0cnVlXCI7XG59XG4vKipcbiAqIFBlcnNpc3RzIGFuIGVudmlyb25tZW50IHZhcmlhYmxlIGZvciB1c2UgaW4gc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd3JpdGVzIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudCB0byB0aGUgYENMQVVERV9FTlZfRklMRWAsXG4gKiB3aGljaCBDbGF1ZGUgQ29kZSBzb3VyY2VzIGJlZm9yZSBydW5uaW5nIGJhc2ggY29tbWFuZHMuIFRoaXMgYWxsb3dzXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgdG8gY29uZmlndXJlIHRoZSBlbnZpcm9ubWVudCBmb3IgdGhlIGVudGlyZSBzZXNzaW9uLlxuICpcbiAqICoqSW1wb3J0YW50Kio6IFRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyBpbiBTZXNzaW9uU3RhcnQgaG9va3Mgd2hlcmVcbiAqIGBDTEFVREVfRU5WX0ZJTEVgIGlzIHNldC4gSW4gb3RoZXIgaG9va3MsIGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKiBAcGFyYW0gbmFtZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgdmFsdWUgKHdpbGwgYmUgc2hlbGwtZXNjYXBlZClcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCwgcGVyc2lzdEVudlZhciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0KSA9PiB7XG4gKiAgIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCBwcm9jZXNzLmVudi5NWV9BUElfS0VZID8/ICdkZWZhdWx0Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ1BBVEgnLCBgJHtwcm9jZXNzLmVudi5QQVRIfTouL25vZGVfbW9kdWxlcy8uYmluYCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcGVyc2lzdGluZy1lbnZpcm9ubWVudC12YXJpYWJsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpIHtcbiAgICBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAgICBpZiAoZW52RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInBlcnNpc3RFbnZWYXIgY2FuIG9ubHkgYmUgdXNlZCBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFwiICsgXCJDTEFVREVfRU5WX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldC5cIik7XG4gICAgfVxuICAgIC8vIFNoZWxsLWVzY2FwZSB0aGUgdmFsdWUgdG8gaGFuZGxlIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgIGNvbnN0IGVzY2FwZWRWYWx1ZSA9IGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpO1xuICAgIC8vIFdyaXRlIHRoZSBleHBvcnQgc3RhdGVtZW50XG4gICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gYGV4cG9ydCAke25hbWV9PSR7ZXNjYXBlZFZhbHVlfVxcbmA7XG4gICAgZnMuYXBwZW5kRmlsZVN5bmMoZW52RmlsZSwgZXhwb3J0U3RhdGVtZW50LCBcInV0Zi04XCIpO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZS5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYHBlcnNpc3RFbnZWYXJgIGZvciBzZXR0aW5nXG4gKiBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gYSBzaW5nbGUgY2FsbC5cbiAqIEBwYXJhbSB2YXJzIC0gT2JqZWN0IG1hcHBpbmcgdmFyaWFibGUgbmFtZXMgdG8gdmFsdWVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwZXJzaXN0RW52VmFycyh7XG4gKiAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICBERUJVRzogJ2ZhbHNlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXJzKHZhcnMpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModmFycykpIHtcbiAgICAgICAgcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSk7XG4gICAgfVxufVxuLyoqXG4gKiBFc2NhcGVzIGEgdmFsdWUgZm9yIHNhZmUgdXNlIGluIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudC5cbiAqXG4gKiBVc2VzIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZXMgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXMuXG4gKiBUaGlzIHByZXZlbnRzIHNoZWxsIGluamVjdGlvbiBhbmQgaGFuZGxlcyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gZXNjYXBlXG4gKiBAcmV0dXJucyBUaGUgc2hlbGwtZXNjYXBlZCB2YWx1ZSAod2l0aCBxdW90ZXMpXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSkge1xuICAgIC8vIFVzZSBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGUgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXNcbiAgICAvLyAndmFsdWUnIC0+ICd2YWwnXFwnJ3VlJyBmb3IgdmFsdWVzIGNvbnRhaW5pbmcgc2luZ2xlIHF1b3Rlc1xuICAgIGNvbnN0IGVzY2FwZWQgPSB2YWx1ZS5yZXBsYWNlKC8nL2csIFwiJ1xcXFwnJ1wiKTtcbiAgICByZXR1cm4gYCcke2VzY2FwZWR9J2A7XG59XG4iLCAiLyoqXG4gKiBIb29rIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMgdGhhdCBoYW5kbGU6XG4gKiAtIElucHV0IHR5cGUgbmFycm93aW5nIGJhc2VkIG9uIGhvb2sgZXZlbnQgdHlwZVxuICogLSBPdXRwdXQgdHlwZSBlbmZvcmNlbWVudCB2aWEgcmV0dXJuIHR5cGVzXG4gKiAtIEVycm9yIHdyYXBwaW5nIHdpdGggYXV0b21hdGljIGxvZ2dpbmdcbiAqIC0gTG9nZ2VyIGNvbnRleHQgaW5qZWN0aW9uXG4gKlxuICogRWFjaCBmYWN0b3J5IGFjY2VwdHMgYSBIb29rQ29uZmlnIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dCBzZXR0aW5ncyxcbiAqIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0aGUgcnVudGltZSBpbnZva2VzIHdoZW4gdGhlIGhvb2sgZmlsZSBleGVjdXRlcy5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBHZW5lcmljIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIGhvb2sgZmFjdG9yeSBmdW5jdGlvbiBmb3IgYSBzcGVjaWZpYyBob29rIHR5cGUuXG4gKlxuICogVGhpcyBpcyB0aGUgaW50ZXJuYWwgaW1wbGVtZW50YXRpb24gdXNlZCBieSBhbGwgdHlwZWQgZmFjdG9yaWVzLlxuICogSXQgd3JhcHMgdGhlIGhhbmRsZXIgd2l0aCBlcnJvciBjYXRjaGluZyBhbmQgbG9nZ2luZy5cbiAqIEBwYXJhbSBob29rRXZlbnROYW1lIC0gVGhlIGhvb2sgZXZlbnQgbmFtZVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvblxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byB3cmFwXG4gKiBAcmV0dXJucyBBIHdyYXBwZWQgaG9vayBmdW5jdGlvblxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tGdW5jdGlvbihob29rRXZlbnROYW1lLCBjb25maWcsIGhhbmRsZXIpIHtcbiAgICBjb25zdCBob29rRm4gPSBhc3luYyAoaW5wdXQsIGNvbnRleHQpID0+IHtcbiAgICAgICAgLy8gRGVsZWdhdGUgZXJyb3IgaGFuZGxpbmcgdG8gdGhlIHJ1bnRpbWUgLSBqdXN0IGV4ZWN1dGUgdGhlIGhhbmRsZXJcbiAgICAgICAgLy8gVGhlIHJ1bnRpbWUgd2lsbCBjYXRjaCBlcnJvcnMsIGxvZyB0aGVtLCBhbmQgcmV0dXJuIGFwcHJvcHJpYXRlIG91dHB1dFxuICAgICAgICByZXR1cm4gYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gICAgfTtcbiAgICAvLyBBdHRhY2ggbWV0YWRhdGEgZm9yIHJ1bnRpbWUgaW5zcGVjdGlvblxuICAgIGhvb2tGbi5ob29rRXZlbnROYW1lID0gaG9va0V2ZW50TmFtZTtcbiAgICBob29rRm4ubWF0Y2hlciA9IGNvbmZpZy5tYXRjaGVyO1xuICAgIGhvb2tGbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gICAgcmV0dXJuIGhvb2tGbjtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZVRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUZhaWx1cmVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZUZhaWx1cmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE5vdGlmaWNhdGlvbiBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIE5vdGlmaWNhdGlvbiBob29rIGhhbmRsZXIuXG4gKlxuICogTm90aWZpY2F0aW9uIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBzZW5kcyBhIG5vdGlmaWNhdGlvbiwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gZXh0ZXJuYWwgc3lzdGVtc1xuICogLSBMb2cgaW1wb3J0YW50IGV2ZW50c1xuICogLSBUcmlnZ2VyIGN1c3RvbSBhbGVydGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYG5vdGlmaWNhdGlvbl90eXBlYFxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IG5vdGlmaWNhdGlvbkhvb2ssIG5vdGlmaWNhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIFNsYWNrXG4gKiBleHBvcnQgZGVmYXVsdCBub3RpZmljYXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05vdGlmaWNhdGlvbiByZWNlaXZlZCcsIHtcbiAqICAgICB0eXBlOiBpbnB1dC5ub3RpZmljYXRpb25fdHlwZSxcbiAqICAgICB0aXRsZTogaW5wdXQudGl0bGVcbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBzZW5kU2xhY2tNZXNzYWdlKGlucHV0LnRpdGxlID8/ICdOb3RpZmljYXRpb24nLCBpbnB1dC5tZXNzYWdlKTtcbiAqXG4gKiAgIHJldHVybiBub3RpZmljYXRpb25PdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNub3RpZmljYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmaWNhdGlvbkhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIk5vdGlmaWNhdGlvblwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVXNlclByb21wdFN1Ym1pdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFVzZXJQcm9tcHRTdWJtaXQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MgZmlyZSB3aGVuIGEgdXNlciBzdWJtaXRzIGEgcHJvbXB0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFkZCBhZGRpdGlvbmFsIGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIExvZyB1c2VyIGludGVyYWN0aW9uc1xuICogLSBWYWxpZGF0ZSBvciB0cmFuc2Zvcm0gcHJvbXB0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgcHJvbXB0IHN1Ym1pc3Npb25zXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdXNlclByb21wdFN1Ym1pdEhvb2ssIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBwcm9qZWN0IGNvbnRleHQgdG8gZXZlcnkgcHJvbXB0XG4gKiBleHBvcnQgZGVmYXVsdCB1c2VyUHJvbXB0U3VibWl0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5kZWJ1ZygnVXNlciBwcm9tcHQgc3VibWl0dGVkJywgeyBwcm9tcHRMZW5ndGg6IGlucHV0LnByb21wdC5sZW5ndGggfSk7XG4gKlxuICogICBjb25zdCBwcm9qZWN0Q29udGV4dCA9IGF3YWl0IGdldFByb2plY3RDb250ZXh0KCk7XG4gKlxuICogICByZXR1cm4gdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IHByb2plY3RDb250ZXh0XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN1c2VycHJvbXB0c3VibWl0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VyUHJvbXB0U3VibWl0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVXNlclByb21wdFN1Ym1pdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvblN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvblN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBzdGFydHMgb3IgcmVzdGFydHMsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluaXRpYWxpemUgc2Vzc2lvbiBzdGF0ZVxuICogLSBJbmplY3QgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogLSBTZXQgdXAgbG9nZ2luZyBvciBtb25pdG9yaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3N0YXJ0dXAnLCAncmVzdW1lJywgJ2NsZWFyJywgJ2NvbXBhY3QnKVxuICpcbiAqICoqQ29udGV4dCoqOiBTZXNzaW9uU3RhcnQgaG9va3MgcmVjZWl2ZSBhbiBleHRlbmRlZCBjb250ZXh0IHdpdGggYHBlcnNpc3RFbnZWYXJgXG4gKiBhbmQgYHBlcnNpc3RFbnZWYXJzYCBmdW5jdGlvbnMgZm9yIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHsgbWF0Y2hlcjogJ3N0YXJ0dXAnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTmV3IHNlc3Npb24gc3RhcnRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgY3dkOiBpbnB1dC5jd2RcbiAqICAgfSk7XG4gKlxuICogICAvLyBTZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ2RldmVsb3BtZW50Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0RFQlVHJywgJ3RydWUnKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBTZXQgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2VcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBwZXJzaXN0RW52VmFycyB9KSA9PiB7XG4gKiAgIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICAgIERFQlVHOiAnZmFsc2UnXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25zdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvblN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvblN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uRW5kIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvbkVuZCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvbkVuZCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIGVuZHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgc2Vzc2lvbiByZXNvdXJjZXNcbiAqIC0gTG9nIHNlc3Npb24gbWV0cmljc1xuICogLSBQZXJzaXN0IHNlc3Npb24gc3RhdGVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGByZWFzb25gICh0aGUgZXhpdCByZWFzb24gc3RyaW5nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25FbmRIb29rLCBzZXNzaW9uRW5kT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgc2Vzc2lvbiBlbmQgYW5kIGNsZWFuIHVwXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uRW5kSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXNzaW9uIGVuZGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICByZWFzb246IGlucHV0LnJlYXNvblxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IGNsZWFudXBTZXNzaW9uUmVzb3VyY2VzKGlucHV0LnNlc3Npb25faWQpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uZW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uRW5kSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvbkVuZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3AgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGlzIGFib3V0IHRvIHN0b3AsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN0b3AgYW5kIHJlcXVpcmUgYWRkaXRpb25hbCBhY3Rpb25cbiAqIC0gQ29uZmlybSB0aGUgdXNlciB3YW50cyB0byBzdG9wXG4gKiAtIENsZWFuIHVwIHJlc291cmNlcyBiZWZvcmUgc3RvcHBpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3RvcEhvb2ssIHN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIHN0b3AgaWYgdGhlcmUgYXJlIHBlbmRpbmcgY2hhbmdlc1xuICogZXhwb3J0IGRlZmF1bHQgc3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBjb25zdCBwZW5kaW5nQ2hhbmdlcyA9IGF3YWl0IGNoZWNrUGVuZGluZ0NoYW5nZXMoKTtcbiAqXG4gKiAgIGlmIChwZW5kaW5nQ2hhbmdlcy5sZW5ndGggPiAwKSB7XG4gKiAgICAgbG9nZ2VyLndhcm4oJ0Jsb2NraW5nIHN0b3AgZHVlIHRvIHBlbmRpbmcgY2hhbmdlcycsIHtcbiAqICAgICAgIGNvdW50OiBwZW5kaW5nQ2hhbmdlcy5sZW5ndGhcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICogICAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgICByZWFzb246IGBUaGVyZSBhcmUgJHtwZW5kaW5nQ2hhbmdlcy5sZW5ndGh9IHVuY29tbWl0dGVkIGNoYW5nZXNgLFxuICogICAgICAgc3lzdGVtTWVzc2FnZTogJ1BsZWFzZSBjb21taXQgb3IgZGlzY2FyZCBjaGFuZ2VzIGJlZm9yZSBzdG9wcGluZydcbiAqICAgICB9KTtcbiAqICAgfVxuICpcbiAqICAgbG9nZ2VyLmluZm8oJ0FwcHJvdmluZyBzdG9wJyk7XG4gKiAgIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0b3BGYWlsdXJlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3RvcEZhaWx1cmUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3BGYWlsdXJlIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBlbmNvdW50ZXJzIGFuIGVycm9yIHdoaWxlIHN0b3BwaW5nXG4gKiAoZS5nLiwgQVBJIGVycm9ycywgYXV0aGVudGljYXRpb24gZmFpbHVyZXMsIHJhdGUgbGltaXRzKSwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBMb2cgc3RvcCBmYWlsdXJlIGV2ZW50cyBhbmQgZXJyb3IgZGV0YWlsc1xuICogLSBBbGVydCBvbiB1bmV4cGVjdGVkIHNlc3Npb24gdGVybWluYXRpb24gZXJyb3JzXG4gKiAtIE9ic2VydmUgd2hhdCBlcnJvciBjYXVzZWQgdGhlIGZhaWx1cmVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZmFpbHVyZSBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdG9wRmFpbHVyZUhvb2ssIHN0b3BGYWlsdXJlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBzdG9wRmFpbHVyZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuZXJyb3IoJ1Nlc3Npb24gc3RvcHBlZCBkdWUgdG8gZXJyb3InLCB7XG4gKiAgICAgZXJyb3I6IGlucHV0LmVycm9yLFxuICogICAgIGRldGFpbHM6IGlucHV0LmVycm9yX2RldGFpbHNcbiAqICAgfSk7XG4gKiAgIHJldHVybiBzdG9wRmFpbHVyZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BmYWlsdXJlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wRmFpbHVyZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN0b3BGYWlsdXJlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdGFydCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCAoQWdlbnQgdG9vbCkgc3RhcnRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluamVjdCBjb250ZXh0IGZvciB0aGUgc3ViYWdlbnRcbiAqIC0gTG9nIHN1YmFnZW50IGludm9jYXRpb25zXG4gKiAtIENvbmZpZ3VyZSBzdWJhZ2VudCBiZWhhdmlvclxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdGFydEhvb2ssIHN1YmFnZW50U3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBjb250ZXh0IGZvciBleHBsb3JlIHN1YmFnZW50c1xuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdGFydEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdFeHBsb3JlIHN1YmFnZW50IHN0YXJ0aW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMgYW5kIGNvbnZlbnRpb25zJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RhcnRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN1YmFnZW50U3RvcCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdG9wIGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IGNvbXBsZXRlcyBvciBzdG9wcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBCbG9jayB0aGUgc3ViYWdlbnQgZnJvbSBzdG9wcGluZ1xuICogLSBQcm9jZXNzIHN1YmFnZW50IHJlc3VsdHNcbiAqIC0gQ2xlYW4gdXAgc3ViYWdlbnQgcmVzb3VyY2VzXG4gKiAtIExvZyBzdWJhZ2VudCBjb21wbGV0aW9uXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0b3BIb29rLCBzdWJhZ2VudFN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIGV4cGxvcmUgc3ViYWdlbnRzIGlmIHRhc2sgaW5jb21wbGV0ZVxuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdG9wSG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1N1YmFnZW50IHN0b3BwaW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIC8vIEJsb2NrIGlmIHRyYW5zY3JpcHQgc2hvd3MgaW5jb21wbGV0ZSB3b3JrXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0b3BPdXRwdXQoe1xuICogICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgIHJlYXNvbjogJ1BsZWFzZSB2ZXJpZnkgZXhwbG9yYXRpb24gaXMgY29tcGxldGUnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1YmFnZW50U3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RvcFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUHJlQ29tcGFjdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFByZUNvbXBhY3QgaG9vayBoYW5kbGVyLlxuICpcbiAqIFByZUNvbXBhY3QgaG9va3MgZmlyZSBiZWZvcmUgY29udGV4dCBjb21wYWN0aW9uIG9jY3VycywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBQcmVzZXJ2ZSBpbXBvcnRhbnQgaW5mb3JtYXRpb24gYmVmb3JlIGNvbXBhY3Rpb25cbiAqIC0gTG9nIGNvbXBhY3Rpb24gZXZlbnRzXG4gKiAtIE1vZGlmeSBjdXN0b20gaW5zdHJ1Y3Rpb25zIGZvciB0aGUgY29tcGFjdGVkIGNvbnRleHRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ21hbnVhbCcsICdhdXRvJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVDb21wYWN0SG9vaywgcHJlQ29tcGFjdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIGNvbXBhY3Rpb24gZXZlbnRzIGFuZCBwcmVzZXJ2ZSBjb250ZXh0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdDb250ZXh0IGNvbXBhY3Rpb24gdHJpZ2dlcmVkJywge1xuICogICAgIHRyaWdnZXI6IGlucHV0LnRyaWdnZXIsXG4gKiAgICAgaGFzQ3VzdG9tSW5zdHJ1Y3Rpb25zOiBpbnB1dC5jdXN0b21faW5zdHJ1Y3Rpb25zICE9PSBudWxsXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIE9ubHkgaGFuZGxlIG1hbnVhbCBjb21wYWN0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7IG1hdGNoZXI6ICdtYW51YWwnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTWFudWFsIGNvbXBhY3Rpb24gcmVxdWVzdGVkJyk7XG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcHJlY29tcGFjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlQ29tcGFjdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlByZUNvbXBhY3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFBvc3RDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUG9zdENvbXBhY3QgaG9vayBoYW5kbGVyLlxuICpcbiAqIFBvc3RDb21wYWN0IGhvb2tzIGZpcmUgYWZ0ZXIgY29udGV4dCBjb21wYWN0aW9uIGNvbXBsZXRlcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBPYnNlcnZlIHRoZSBjb21wYWN0aW9uIHN1bW1hcnkgYW5kIGRldGFpbHNcbiAqIC0gTG9nIGNvbXBhY3Rpb24gZXZlbnRzXG4gKiAtIFJlYWN0IHRvIHRoZSBuZXcgY29tcGFjdGVkIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdtYW51YWwnLCAnYXV0bycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcG9zdENvbXBhY3RIb29rLCBwb3N0Q29tcGFjdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcG9zdENvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiBjb21wbGV0ZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBzdW1tYXJ5OiBpbnB1dC5jb21wYWN0X3N1bW1hcnlcbiAqICAgfSk7XG4gKiAgIHJldHVybiBwb3N0Q29tcGFjdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Bvc3Rjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0Q29tcGFjdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RDb21wYWN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uUmVxdWVzdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBlcm1pc3Npb25SZXF1ZXN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQZXJtaXNzaW9uRGVuaWVkIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUGVybWlzc2lvbkRlbmllZCBob29rIGhhbmRsZXIuXG4gKlxuICogUGVybWlzc2lvbkRlbmllZCBob29rcyBmaXJlIHdoZW4gYSBwZXJtaXNzaW9uIHJlcXVlc3QgaXMgZGVuaWVkIChlaXRoZXIgYnkgdGhlXG4gKiB1c2VyIG9yIGJ5IGEgUGVybWlzc2lvblJlcXVlc3QgaG9vayksIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gTG9nIHBlcm1pc3Npb24gZGVuaWFscyBmb3IgYXVkaXRpbmdcbiAqIC0gUmVhY3QgdG8gZGVuaWVkIHRvb2wgZXhlY3V0aW9uc1xuICogLSBPcHRpb25hbGx5IHJlcXVlc3QgYSByZXRyeSB2aWEgdGhlIG91dHB1dFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRvb2xfbmFtZWBcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwZXJtaXNzaW9uRGVuaWVkSG9vaywgcGVybWlzc2lvbkRlbmllZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIGFsbCBwZXJtaXNzaW9uIGRlbmlhbHNcbiAqIGV4cG9ydCBkZWZhdWx0IHBlcm1pc3Npb25EZW5pZWRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1Blcm1pc3Npb24gZGVuaWVkJywge1xuICogICAgIHRvb2xOYW1lOiBpbnB1dC50b29sX25hbWUsXG4gKiAgICAgcmVhc29uOiBpbnB1dC5yZWFzb25cbiAqICAgfSk7XG4gKiAgIHJldHVybiBwZXJtaXNzaW9uRGVuaWVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcGVybWlzc2lvbmRlbmllZFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGVybWlzc2lvbkRlbmllZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBlcm1pc3Npb25EZW5pZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNldHVwIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2V0dXAgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNldHVwIGhvb2tzIGZpcmUgZHVyaW5nIGluaXRpYWxpemF0aW9uIG9yIG1haW50ZW5hbmNlLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENvbmZpZ3VyZSBpbml0aWFsIHNlc3Npb24gc3RhdGVcbiAqIC0gUGVyZm9ybSBzZXR1cCB0YXNrcyBiZWZvcmUgdGhlIHNlc3Npb24gc3RhcnRzXG4gKiAtIEFkZCBjb250ZXh0IGZvciBtYWludGVuYW5jZSBvcGVyYXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdpbml0JyBvciAnbWFpbnRlbmFuY2UnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNldHVwSG9vaywgc2V0dXBPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEhhbmRsZSBhbGwgc2V0dXAgZXZlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzZXR1cEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2V0dXAgdHJpZ2dlcmVkJywgeyB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyIH0pO1xuICogICByZXR1cm4gc2V0dXBPdXRwdXQoe30pO1xuICogfSk7XG4gKlxuICogLy8gT25seSBoYW5kbGUgaW5pdGlhbGl6YXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7IG1hdGNoZXI6ICdpbml0JyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0luaXRpYWxpemluZyBzZXNzaW9uJyk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7XG4gKiAgICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1Nlc3Npb24gaW5pdGlhbGl6ZWQgd2l0aCBjdXN0b20gY29uZmlndXJhdGlvbidcbiAqICAgICB9XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXR1cFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXR1cFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGVhbW1hdGVJZGxlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGVhbW1hdGVJZGxlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBUZWFtbWF0ZUlkbGUgaG9va3MgZmlyZSB3aGVuIGEgdGVhbW1hdGUgaW4gYSB0ZWFtIGlzIGFib3V0IHRvIGdvIGlkbGUsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFzc2lnbiB3b3JrIHRvIGlkbGUgdGVhbW1hdGVzXG4gKiAtIExvZyB0ZWFtIGFjdGl2aXR5XG4gKiAtIENvb3JkaW5hdGUgbXVsdGktYWdlbnQgd29ya2Zsb3dzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0ZWFtbWF0ZSBpZGxlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRlYW1tYXRlSWRsZUhvb2ssIHRlYW1tYXRlSWRsZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHdoZW4gdGVhbW1hdGVzIGdvIGlkbGVcbiAqIGV4cG9ydCBkZWZhdWx0IHRlYW1tYXRlSWRsZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnVGVhbW1hdGUgZ29pbmcgaWRsZScsIHtcbiAqICAgICB0ZWFtbWF0ZU5hbWU6IGlucHV0LnRlYW1tYXRlX25hbWUsXG4gKiAgICAgdGVhbU5hbWU6IGlucHV0LnRlYW1fbmFtZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0ZWFtbWF0ZWlkbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRlYW1tYXRlSWRsZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRlYW1tYXRlSWRsZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGFza0NyZWF0ZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBUYXNrQ3JlYXRlZCBob29rIGhhbmRsZXIuXG4gKlxuICogVGFza0NyZWF0ZWQgaG9va3MgZmlyZSB3aGVuIGEgbmV3IHRhc2sgaXMgY3JlYXRlZCBhbmQgYXNzaWduZWQgdG8gYSB0ZWFtbWF0ZSxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gT2JzZXJ2ZSB0YXNrIGNyZWF0aW9uIGV2ZW50c1xuICogLSBMb2cgdGFzayBhc3NpZ25tZW50cyBmb3IgYXVkaXRpbmdcbiAqIC0gUmVhY3QgdG8gbmV3IHdvcmsgYmVpbmcgYXNzaWduZWRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHRhc2sgY3JlYXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGFza0NyZWF0ZWRIb29rLCB0YXNrQ3JlYXRlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHRhc2sgY3JlYXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHRhc2tDcmVhdGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUYXNrIGNyZWF0ZWQnLCB7XG4gKiAgICAgdGFza0lkOiBpbnB1dC50YXNrX2lkLFxuICogICAgIHRhc2tTdWJqZWN0OiBpbnB1dC50YXNrX3N1YmplY3RcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gdGFza0NyZWF0ZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0YXNrY3JlYXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFza0NyZWF0ZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJUYXNrQ3JlYXRlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGFza0NvbXBsZXRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFRhc2tDb21wbGV0ZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRhc2tDb21wbGV0ZWQgaG9va3MgZmlyZSB3aGVuIGEgdGFzayBpcyBiZWluZyBtYXJrZWQgYXMgY29tcGxldGVkLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBWZXJpZnkgdGFzayBjb21wbGV0aW9uXG4gKiAtIExvZyB0YXNrIG1ldHJpY3NcbiAqIC0gVHJpZ2dlciBmb2xsb3ctdXAgYWN0aW9uc1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgdGFzayBjb21wbGV0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRhc2tDb21wbGV0ZWRIb29rLCB0YXNrQ29tcGxldGVkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgdGFzayBjb21wbGV0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCB0YXNrQ29tcGxldGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUYXNrIGNvbXBsZXRlZCcsIHtcbiAqICAgICB0YXNrSWQ6IGlucHV0LnRhc2tfaWQsXG4gKiAgICAgdGFza1N1YmplY3Q6IGlucHV0LnRhc2tfc3ViamVjdFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0YXNrQ29tcGxldGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdGFza2NvbXBsZXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFza0NvbXBsZXRlZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRhc2tDb21wbGV0ZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVsaWNpdGF0aW9uIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIEVsaWNpdGF0aW9uIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBFbGljaXRhdGlvbiBob29rcyBmaXJlIHdoZW4gYW4gTUNQIHNlcnZlciByZXF1ZXN0cyB1c2VyIGlucHV0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFjY2VwdCwgZGVjbGluZSwgb3IgY2FuY2VsIGVsaWNpdGF0aW9uIHJlcXVlc3RzIHByb2dyYW1tYXRpY2FsbHlcbiAqIC0gUHJvdmlkZSBzdHJ1Y3R1cmVkIGZvcm0gaW5wdXQgb3IgVVJMLWJhc2VkIGF1dGggcmVzcG9uc2VzXG4gKiAtIExvZyBvciBhdWRpdCBlbGljaXRhdGlvbiByZXF1ZXN0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgZWxpY2l0YXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZWxpY2l0YXRpb25Ib29rLCBlbGljaXRhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZWxpY2l0YXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0VsaWNpdGF0aW9uIHJlcXVlc3QnLCB7IHNlcnZlcjogaW5wdXQubWNwX3NlcnZlcl9uYW1lIH0pO1xuICogICByZXR1cm4gZWxpY2l0YXRpb25PdXRwdXQoe1xuICogICAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBhY3Rpb246ICdhY2NlcHQnLCBjb250ZW50OiB7IGFwcHJvdmVkOiB0cnVlIH0gfVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjZWxpY2l0YXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsaWNpdGF0aW9uSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiRWxpY2l0YXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVsaWNpdGF0aW9uUmVzdWx0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIEVsaWNpdGF0aW9uUmVzdWx0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBFbGljaXRhdGlvblJlc3VsdCBob29rcyBmaXJlIHdpdGggdGhlIHJlc3VsdCBvZiBhbiBNQ1AgZWxpY2l0YXRpb24gcmVxdWVzdCxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gT2JzZXJ2ZSBlbGljaXRhdGlvbiBvdXRjb21lc1xuICogLSBNb2RpZnkgdGhlIHJlc3VsdCBiZWZvcmUgaXQgaXMgcmV0dXJuZWQgdG8gdGhlIE1DUCBzZXJ2ZXJcbiAqIC0gTG9nIGVsaWNpdGF0aW9uIGNvbXBsZXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBlbGljaXRhdGlvbiByZXN1bHQgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZWxpY2l0YXRpb25SZXN1bHRIb29rLCBlbGljaXRhdGlvblJlc3VsdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZWxpY2l0YXRpb25SZXN1bHRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0VsaWNpdGF0aW9uIHJlc3VsdCcsIHsgYWN0aW9uOiBpbnB1dC5hY3Rpb24gfSk7XG4gKiAgIHJldHVybiBlbGljaXRhdGlvblJlc3VsdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2VsaWNpdGF0aW9ucmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGljaXRhdGlvblJlc3VsdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIkVsaWNpdGF0aW9uUmVzdWx0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25maWdDaGFuZ2UgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBDb25maWdDaGFuZ2UgaG9vayBoYW5kbGVyLlxuICpcbiAqIENvbmZpZ0NoYW5nZSBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgY29uZmlndXJhdGlvbiBjaGFuZ2VzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIHNldHRpbmdzIGZpbGUgY2hhbmdlc1xuICogLSBMb2cgb3IgYXVkaXQgY29uZmlndXJhdGlvbiBjaGFuZ2VzXG4gKiAtIEFwcGx5IGN1c3RvbSBsb2dpYyB3aGVuIHNldHRpbmdzIGFyZSB1cGRhdGVkXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3VzZXJfc2V0dGluZ3MnLCAncHJvamVjdF9zZXR0aW5ncycsIGV0Yy4pXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgY29uZmlnQ2hhbmdlSG9vaywgY29uZmlnQ2hhbmdlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBjb25maWdDaGFuZ2VIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbmZpZyBjaGFuZ2VkJywgeyBzb3VyY2U6IGlucHV0LnNvdXJjZSwgZmlsZTogaW5wdXQuZmlsZV9wYXRoIH0pO1xuICogICByZXR1cm4gY29uZmlnQ2hhbmdlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjY29uZmlnY2hhbmdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25maWdDaGFuZ2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJDb25maWdDaGFuZ2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluc3RydWN0aW9uc0xvYWRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBJbnN0cnVjdGlvbnNMb2FkZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIEluc3RydWN0aW9uc0xvYWRlZCBob29rcyBmaXJlIHdoZW4gYSBDTEFVREUubWQgb3Igc2ltaWxhciBpbnN0cnVjdGlvbnMgZmlsZVxuICogaXMgbG9hZGVkLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIGluc3RydWN0aW9ucyBiZWluZyBhcHBsaWVkXG4gKiAtIExvZyB3aGljaCBpbnN0cnVjdGlvbiBmaWxlcyBhcmUgYWN0aXZlXG4gKiAtIE9ic2VydmUgdGhlIGluc3RydWN0aW9uIGxvYWRpbmcgaGllcmFyY2h5XG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBpbnN0cnVjdGlvbiBsb2FkIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGluc3RydWN0aW9uc0xvYWRlZEhvb2ssIGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgaW5zdHJ1Y3Rpb25zTG9hZGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdJbnN0cnVjdGlvbnMgbG9hZGVkJywgeyBmaWxlOiBpbnB1dC5maWxlX3BhdGgsIHR5cGU6IGlucHV0Lm1lbW9yeV90eXBlIH0pO1xuICogICByZXR1cm4gaW5zdHJ1Y3Rpb25zTG9hZGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaW5zdHJ1Y3Rpb25zbG9hZGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnN0cnVjdGlvbnNMb2FkZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJJbnN0cnVjdGlvbnNMb2FkZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFdvcmt0cmVlQ3JlYXRlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgV29ya3RyZWVDcmVhdGUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFdvcmt0cmVlQ3JlYXRlIGhvb2tzIGZpcmUgd2hlbiBhIGdpdCB3b3JrdHJlZSBpcyBjcmVhdGVkLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFNldCB1cCB3b3JrdHJlZS1zcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gKiAtIExvZyB3b3JrdHJlZSBjcmVhdGlvbiBldmVudHNcbiAqIC0gSW5pdGlhbGl6ZSB3b3JrdHJlZSByZXNvdXJjZXNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHdvcmt0cmVlIGNyZWF0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHdvcmt0cmVlQ3JlYXRlSG9vaywgd29ya3RyZWVDcmVhdGVPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHdvcmt0cmVlQ3JlYXRlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdXb3JrdHJlZSBjcmVhdGVkJywgeyBuYW1lOiBpbnB1dC5uYW1lIH0pO1xuICogICByZXR1cm4gd29ya3RyZWVDcmVhdGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN3b3JrdHJlZWNyZWF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gd29ya3RyZWVDcmVhdGVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJXb3JrdHJlZUNyZWF0ZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gV29ya3RyZWVSZW1vdmUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBXb3JrdHJlZVJlbW92ZSBob29rIGhhbmRsZXIuXG4gKlxuICogV29ya3RyZWVSZW1vdmUgaG9va3MgZmlyZSB3aGVuIGEgZ2l0IHdvcmt0cmVlIGlzIHJlbW92ZWQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgd29ya3RyZWUtc3BlY2lmaWMgcmVzb3VyY2VzXG4gKiAtIExvZyB3b3JrdHJlZSByZW1vdmFsIGV2ZW50c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgd29ya3RyZWUgcmVtb3ZhbCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB3b3JrdHJlZVJlbW92ZUhvb2ssIHdvcmt0cmVlUmVtb3ZlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCB3b3JrdHJlZVJlbW92ZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnV29ya3RyZWUgcmVtb3ZlZCcsIHsgcGF0aDogaW5wdXQud29ya3RyZWVfcGF0aCB9KTtcbiAqICAgcmV0dXJuIHdvcmt0cmVlUmVtb3ZlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjd29ya3RyZWVyZW1vdmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdvcmt0cmVlUmVtb3ZlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiV29ya3RyZWVSZW1vdmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEN3ZENoYW5nZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBDd2RDaGFuZ2VkIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBDd2RDaGFuZ2VkIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSdzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkgY2hhbmdlcyxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUmVhY3QgdG8gZGlyZWN0b3J5IGNoYW5nZXMgd2l0aGluIGEgc2Vzc2lvblxuICogLSBVcGRhdGUgZmlsZSB3YXRjaGVycyBvciBlbnZpcm9ubWVudCBzdGF0ZVxuICogLSBSZXR1cm4gYHdhdGNoUGF0aHNgIHZpYSBgaG9va1NwZWNpZmljT3V0cHV0YCB0byByZWdpc3RlciBwYXRocyBmb3IgRmlsZUNoYW5nZWQgZXZlbnRzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBjd2QgY2hhbmdlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGN3ZENoYW5nZWRIb29rLCBjd2RDaGFuZ2VkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBjd2RDaGFuZ2VkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdXb3JraW5nIGRpcmVjdG9yeSBjaGFuZ2VkJywgeyBmcm9tOiBpbnB1dC5vbGRfY3dkLCB0bzogaW5wdXQubmV3X2N3ZCB9KTtcbiAqICAgcmV0dXJuIGN3ZENoYW5nZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNjd2RjaGFuZ2VkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjd2RDaGFuZ2VkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiQ3dkQ2hhbmdlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRmlsZUNoYW5nZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBGaWxlQ2hhbmdlZCBob29rIGhhbmRsZXIuXG4gKlxuICogRmlsZUNoYW5nZWQgaG9va3MgZmlyZSB3aGVuIGEgd2F0Y2hlZCBmaWxlIGNoYW5nZXMgb24gZGlzaywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBSZWFjdCB0byBmaWxlIHN5c3RlbSBjaGFuZ2VzIGR1cmluZyBhIHNlc3Npb25cbiAqIC0gSW52YWxpZGF0ZSBjYWNoZXMgb3IgcmVsb2FkIGNvbmZpZ3VyYXRpb25cbiAqIC0gUmV0dXJuIGB3YXRjaFBhdGhzYCB2aWEgYGhvb2tTcGVjaWZpY091dHB1dGAgdG8gdXBkYXRlIHRoZSBzZXQgb2Ygd2F0Y2hlZCBwYXRoc1xuICpcbiAqIFRoZSBpbnB1dCBgZXZlbnRgIGZpZWxkIGluZGljYXRlcyB0aGUgdHlwZSBvZiBjaGFuZ2U6XG4gKiAtIGAnY2hhbmdlJ2AgLSBGaWxlIGNvbnRlbnRzIGNoYW5nZWRcbiAqIC0gYCdhZGQnYCAtIEZpbGUgd2FzIGNyZWF0ZWRcbiAqIC0gYCd1bmxpbmsnYCAtIEZpbGUgd2FzIGRlbGV0ZWRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIGZpbGUgY2hhbmdlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGZpbGVDaGFuZ2VkSG9vaywgZmlsZUNoYW5nZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGZpbGVDaGFuZ2VkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdGaWxlIGNoYW5nZWQnLCB7IHBhdGg6IGlucHV0LmZpbGVfcGF0aCwgZXZlbnQ6IGlucHV0LmV2ZW50IH0pO1xuICogICByZXR1cm4gZmlsZUNoYW5nZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNmaWxlY2hhbmdlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsZUNoYW5nZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJGaWxlQ2hhbmdlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuIiwgIi8qKlxuICogTG9nZ2VyIHN5c3RlbSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBsb2dnaW5nIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBvcHRpb25hbCBmaWxlIG91dHB1dC5cbiAqIFRoZSBsb2dnZXIgaXMgKipzaWxlbnQgYnkgZGVmYXVsdCoqIHRvIGF2b2lkIGludGVyZmVyaW5nIHdpdGggaG9vayBwcm90b2NvbFxuICogKHN0ZG91dCBpcyByZXNlcnZlZCBmb3IgSlNPTiByZXNwb25zZXMsIHN0ZGVyciBtYXkgY29uZmxpY3Qgd2l0aCBDbGF1ZGUgQ29kZSkuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFtcImRlYnVnXCIsIFwiaW5mb1wiLCBcIndhcm5cIiwgXCJlcnJvclwiXTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBMb2dnZXIgZm9yIENsYXVkZSBDb2RlIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiAjIyBLZXkgQmVoYXZpb3JzXG4gKlxuICogfCBDb25maWd1cmF0aW9uIHwgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IE5vIGNvbmZpZyAoZGVmYXVsdCkgfCAqKlNpbGVudCoqIC0gbm8gb3V0cHV0IGFueXdoZXJlIHxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCBlbnYgdmFyIHwgQXBwZW5kIEpTT04gbGluZXMgdG8gZmlsZSB8XG4gKiB8IGAub24obGV2ZWwsIGhhbmRsZXIpYCByZWdpc3RlcmVkIHwgRXZlbnRzIGRlbGl2ZXJlZCB0byBoYW5kbGVycyBvbmx5IHxcbiAqIHwgTXVsdGlwbGUgZGVzdGluYXRpb25zIHwgQWxsIGRlc3RpbmF0aW9ucyByZWNlaXZlIGV2ZW50cyB8XG4gKlxuICogIyMgSW1wb3J0YW50IE5vdGVzXG4gKlxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3Rkb3V0KiogKHJlc2VydmVkIGZvciBKU09OIGhvb2sgcmVzcG9uc2UpXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRlcnIqKiAobWF5IGludGVyZmVyZSB3aXRoIENsYXVkZSBDb2RlIGVycm9yIGhhbmRsaW5nKVxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgZm9ybWF0IGZvciBlYXN5IHBhcnNpbmdcbiAqIC0gYC5vbihsZXZlbCwgaGFuZGxlcilgIHJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb25cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIHZhbGlkYXRlIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAgICovXG4gICAgaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG4gICAgLyoqXG4gICAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAgICovXG4gICAgbG9nRmlsZVBhdGggPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAgICovXG4gICAgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRIb29rVHlwZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRJbnB1dDtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gICAgICpcbiAgICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgICAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gZXhwbGljaXQgY29uZmlnLCBvciBieSByZWFkaW5nIHRoZSBjb25maWd1cmVkIGVudiB2YXJcbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyAoY29uZmlnLmxvZ0VudlZhciA/IHByb2Nlc3MuZW52W2NvbmZpZy5sb2dFbnZWYXJdIDogdW5kZWZpbmVkKSA/PyBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZGVidWcobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJkZWJ1Z1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGluZm8gbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmluZm8oJ1Nlc3Npb24gc3RhcnRlZCcsIHsgc291cmNlOiAnc3RhcnR1cCcsIHNlc3Npb25JZDogJ2FiYzEyMycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgaW5mbyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImluZm9cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICB3YXJuKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2FyblwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCByZWFzb246ICdlbXB0eSBjb21tYW5kJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBlcnJvcihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImVycm9yXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICAgKlxuICAgICAqIFVzZSB0aGlzIG1ldGhvZCB3aGVuIGxvZ2dpbmcgY2F1Z2h0IGV4Y2VwdGlvbnMgdG8gY2FwdHVyZSB0aGUgZnVsbFxuICAgICAqIGVycm9yIGNvbnRleHQgaW5jbHVkaW5nIG5hbWUsIG1lc3NhZ2UsIHN0YWNrIHRyYWNlLCBhbmQgY2F1c2UgY2hhaW4uXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHRyeSB7XG4gICAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgICAqICAgfSk7XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGxvZ0Vycm9yKGVycm9yLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKlxuICAgICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgICAqIHVuc3Vic2NyaWJlKCk7XG4gICAgICogYGBgXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgICAqXG4gICAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBvbihsZXZlbCwgaGFuZGxlcikge1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc2V0Q29udGV4dChob29rVHlwZSwgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICAgKlxuICAgICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBjbGVhckNvbnRleHQoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgICAqIGZpbGUgbG9nZ2luZyAoYnV0IGRvZXNuJ3QgY2xvc2UgZXhpc3RpbmcgZmlsZSBoYW5kbGUgaW1tZWRpYXRlbHkpLlxuICAgICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2xhdWRlLWhvb2tzLmxvZycpO1xuICAgICAqXG4gICAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBzZXRMb2dGaWxlKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChjbG9zZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYFtjbGF1ZGUtY29kZS1ob29rc10gRmFpbGVkIHRvIGNsb3NlIGxvZyBmaWxlOiAke1N0cmluZyhjbG9zZUVycm9yKX1cXG5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgKiB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoY2xvc2VFcnJvcikge1xuICAgICAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBbY2xhdWRlLWNvZGUtaG9va3NdIEZhaWxlZCB0byBjbG9zZSBsb2cgZmlsZTogJHtTdHJpbmcoY2xvc2VFcnJvcil9XFxuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICAgKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICAgKi9cbiAgICBoYXNEZXN0aW5hdGlvbnMoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaGFuZGxlcnMgb2YgdGhpcy5oYW5kbGVycy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGhhbmRsZXJzLnNpemUgPiAwKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICAgIH1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICAgKi9cbiAgICBlbWl0KGxldmVsLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICAgKi9cbiAgICBkZWxpdmVyRXZlbnQoZXZlbnQpIHtcbiAgICAgICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGhhbmRsZXJFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBMb2cgaGFuZGxlciBlcnJvcjogJHtTdHJpbmcoaGFuZGxlckVycm9yKX1cXG5gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICAgKi9cbiAgICB3cml0ZVRvRmlsZShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgICAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKHdyaXRlRXJyb3IpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nIGFmdGVyIGEgd3JpdGUgZmFpbHVyZSB0byBhdm9pZCByZXBlYXRlZCBlcnJvcnNcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBMb2cgZmlsZSB3cml0ZSBmYWlsZWQ6ICR7U3RyaW5nKHdyaXRlRXJyb3IpfVxcbmApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZSgpIHtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBcImFcIik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBleHRyYWN0RXJyb3JJbmZvKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93bkVycm9yXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9O1xuICAgIH1cbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGlzIHBhc3NlZCB0byBob29rIGhhbmRsZXJzIHZpYSBjb250ZXh0IGZvciBjb252ZW5pZW5jZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbi8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19FTlZfVkFSIGlzIHNldCB1bmNvbmRpdGlvbmFsbHkgYnkgdGhlIC0tbG9nLWVudi12YXIgYmFubmVyXG4vLyBiZWZvcmUgdGhpcyBtb2R1bGUgaW5pdGlhbGlzZXMuIElmIGFic2VudCwgZmFsbCBiYWNrIHRvIHRoZSBkZWZhdWx0IGVudiB2YXIgbmFtZS5cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKHtcbiAgICBsb2dFbnZWYXI6IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19FTlZfVkFSID8/IFwiQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVcIixcbn0pO1xuIiwgIi8qKlxuICogT3V0cHV0IHR5cGVzIGFuZCBidWlsZGVycyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZS1zYWZlIG91dHB1dCBidWlsZGVyIGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMuIEVhY2ggYnVpbGRlclxuICogYWNjZXB0cyBvcHRpb25zIHRoYXQgbWF0Y2ggdGhlIHdpcmUgZm9ybWF0IGV4cGVjdGVkIGJ5IENsYXVkZSBDb2RlLCB3aXRoIHR5cGVzXG4gKiBkZXJpdmVkIGZyb20gdGhlIENsYXVkZSBBZ2VudCBTREsncyBgU3luY0hvb2tKU09OT3V0cHV0YCB0eXBlLlxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKiBAbW9kdWxlXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4aXQgQ29kZSBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIHwgRXhpdCBDb2RlIHwgTmFtZSB8IFdoZW4gVXNlZCB8IENsYXVkZSBDb2RlIEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLXwtLS0tLS18LS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxuICogfCAwIHwgU3VjY2VzcyB8IEhhbmRsZXIgcmV0dXJucyBub3JtYWxseSB8IENvbnRpbnVlLCBwYXJzZSBzdGRvdXQgYXMgSlNPTiB8XG4gKiB8IDEgfCBFcnJvciB8IEludmFsaWQgaW5wdXQsIG5vbi1ibG9ja2luZyBlcnJvciB8IE5vbi1ibG9ja2luZywgc3RkZXJyIHRvIHVzZXIgb25seSB8XG4gKiB8IDIgfCBCbG9jayB8IEhhbmRsZXIgdGhyb3dzIE9SIGBzdG9wUmVhc29uYCBzZXQgfCBCbG9ja2luZywgc3RkZXJyIHNob3duIHRvIENsYXVkZSB8XG4gKi9cbmV4cG9ydCBjb25zdCBFWElUX0NPREVTID0ge1xuICAgIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIENsYXVkZSBDb2RlIHBhcnNlcyBzdGRvdXQgYXMgSlNPTi4gKi9cbiAgICBTVUNDRVNTOiAwLFxuICAgIC8qKiBOb24tYmxvY2tpbmcgZXJyb3Igb2NjdXJyZWQgKGUuZy4sIGludmFsaWQgaW5wdXQpLiBzdGRlcnIgc2hvd24gdG8gdXNlciBvbmx5LiAqL1xuICAgIEVSUk9SOiAxLFxuICAgIC8qKiBIYW5kbGVyIHRocmV3IGV4Y2VwdGlvbiBPUiBibG9ja2luZyBhY3Rpb24gcmVxdWVzdGVkLiBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlLiAqL1xuICAgIEJMT0NLOiAyLFxufTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE91dHB1dCBCdWlsZGVyIEZhY3Rvcmllc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IGhhdmUgaG9va1NwZWNpZmljT3V0cHV0IHdpdGggYSBob29rRXZlbnROYW1lIGRpc2NyaW1pbmF0b3IuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCB7IGhvb2tTcGVjaWZpY091dHB1dCwgLi4ucmVzdCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3Qgc3Rkb3V0ID0gaG9va1NwZWNpZmljT3V0cHV0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8geyAuLi5yZXN0LCBob29rU3BlY2lmaWNPdXRwdXQ6IHsgaG9va0V2ZW50TmFtZTogaG9va1R5cGUsIC4uLmhvb2tTcGVjaWZpY091dHB1dCB9IH1cbiAgICAgICAgICAgIDogcmVzdDtcbiAgICAgICAgcmV0dXJuIHsgX3R5cGU6IGhvb2tUeXBlLCBzdGRvdXQgfTtcbiAgICB9O1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IG9ubHkgdXNlIENvbW1vbk9wdGlvbnMgKHNpbXBsZSBwYXNzdGhyb3VnaCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgdXNlIGRlY2lzaW9uLWJhc2VkIG9wdGlvbnMgKFN0b3AsIFN1YmFnZW50U3RvcCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgZXhpdC1jb2RlLWJhc2VkIGhvb2tzIChUZWFtbWF0ZUlkbGUsIFRhc2tDb21wbGV0ZWQpLlxuICpcbiAqIFRoZXNlIGhvb2tzIGRvbid0IHVzZSBKU09OIGRlY2lzaW9uIGNvbnRyb2wgKG5vIENvbW1vbk9wdGlvbnMpLlxuICogVGhlIG9ubHkgb3B0aW9uIGlzIGBzdGRlcnJgIFx1MjAxNCB3aGVuIHByZXNlbnQsIGl0IHRyaWdnZXJzIGV4aXQgY29kZSAyIChCTE9DSykuXG4gKiBTdGRvdXQgYWx3YXlzIHJlY2VpdmVzIGB7fWAgKGVtcHR5IEpTT04gb2JqZWN0KS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuICh7IHN0ZGVyciB9ID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiB7fSxcbiAgICAgICAgLi4uKHN0ZGVyciAhPT0gdW5kZWZpbmVkID8geyBzdGRlcnIgfSA6IHt9KSxcbiAgICB9KTtcbn1cbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZVRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZVRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRvb2wgZXhlY3V0aW9uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyB9XG4gKiB9KTtcbiAqXG4gKiAvLyBEZW55IHdpdGggcmVhc29uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnZGVueScsXG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uUmVhc29uOiAnRGFuZ2Vyb3VzIGNvbW1hbmQgZGV0ZWN0ZWQnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEFsbG93IHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycsXG4gKiAgICAgdXBkYXRlZElucHV0OiB7IGNvbW1hbmQ6ICdscyAtbGEnIH1cbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZVRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlByZVRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFmdGVyIGEgZmlsZSByZWFkXG4gKiBwb3N0VG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRmlsZSBjb250YWlucyBzZW5zaXRpdmUgZGF0YSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlRmFpbHVyZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RyeSB1c2luZyBhIGRpZmZlcmVudCBhcHByb2FjaCdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVXNlclByb21wdFN1Ym1pdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVXNlclByb21wdFN1Ym1pdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVGhpcyBwcm9qZWN0IHVzZXMgVHlwZVNjcmlwdCBzdHJpY3QgbW9kZSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlVzZXJQcm9tcHRTdWJtaXRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25TdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvblN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IEpTT04uc3RyaW5naWZ5KHsgcHJvamVjdDogJ215LXByb2plY3QnIH0pXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uU3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNlc3Npb25TdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25FbmQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25FbmRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uRW5kT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJTZXNzaW9uRW5kXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGhlIHN0b3BcbiAqIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggcmVhc29uXG4gKiBzdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1RoZXJlIGFyZSB1bmNvbW1pdHRlZCBjaGFuZ2VzJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3RvcFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN0b3BGYWlsdXJlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc3RvcEZhaWx1cmVPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdG9wRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiU3RvcEZhaWx1cmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1Rhc2sgbm90IGNvbXBsZXRlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBOb3RpZmljYXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIE5vdGlmaWNhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWJvdXQgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdOb3RpZmljYXRpb24gZm9yd2FyZGVkIHRvIFNsYWNrICNhbGVydHMgY2hhbm5lbCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU3VwcHJlc3MgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHsgc3VwcHJlc3NPdXRwdXQ6IHRydWUgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvbk91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiTm90aWZpY2F0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlQ29tcGFjdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlQ29tcGFjdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQcmVDb21wYWN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdENvbXBhY3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RDb21wYWN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0Q29tcGFjdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQb3N0Q29tcGFjdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25SZXF1ZXN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQZXJtaXNzaW9uUmVxdWVzdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQXV0by1hcHByb3ZlXG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7IGJlaGF2aW9yOiAnYWxsb3cnIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1hcHByb3ZlIHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnYWxsb3cnLFxuICogICAgICAgdXBkYXRlZElucHV0OiB7IGZpbGVfcGF0aDogJy9zYWZlL3BhdGgnIH1cbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tZGVueVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdkZW55JyxcbiAqICAgICAgIG1lc3NhZ2U6ICdOb3QgYWxsb3dlZCcsXG4gKiAgICAgICBpbnRlcnJ1cHQ6IHRydWVcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEZhbGwgdGhyb3VnaCB0byBub3JtYWwgcHJvbXB0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uUmVxdWVzdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25EZW5pZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBlcm1pc3Npb25EZW5pZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIExvZyBhbmQgYWxsb3cgcmV0cnlcbiAqIHBlcm1pc3Npb25EZW5pZWRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcmV0cnk6IHRydWUgfVxuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhvdXQgcmV0cnlcbiAqIHBlcm1pc3Npb25EZW5pZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwZXJtaXNzaW9uRGVuaWVkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uRGVuaWVkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2V0dXAgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNldHVwT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBkdXJpbmcgc2V0dXBcbiAqIHNldHVwT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdQcm9qZWN0IGluaXRpYWxpemVkIHdpdGggY3VzdG9tIHNldHRpbmdzJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIHNldHVwT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2V0dXBPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNldHVwXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVGVhbW1hdGVJZGxlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBUZWFtbWF0ZUlkbGVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRlYW1tYXRlIHRvIGdvIGlkbGVcbiAqIHRlYW1tYXRlSWRsZU91dHB1dCh7fSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCBmZWVkYmFja1xuICogdGVhbW1hdGVJZGxlT3V0cHV0KHsgc3RkZXJyOiAnQ29udGludWUgd29ya2luZzogdW5maW5pc2hlZCB0YXNrcyByZW1haW4uJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdGVhbW1hdGVJZGxlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUV4aXRDb2RlT3V0cHV0QnVpbGRlcihcIlRlYW1tYXRlSWRsZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRhc2tDcmVhdGVkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBUYXNrQ3JlYXRlZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGFzayBjcmVhdGlvblxuICogdGFza0NyZWF0ZWRPdXRwdXQoe30pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggZmVlZGJhY2tcbiAqIHRhc2tDcmVhdGVkT3V0cHV0KHsgc3RkZXJyOiAnQ2Fubm90IGNyZWF0ZSB0YXNrOiBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkcy4nIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0YXNrQ3JlYXRlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoXCJUYXNrQ3JlYXRlZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRhc2tDb21wbGV0ZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFRhc2tDb21wbGV0ZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRhc2sgY29tcGxldGlvblxuICogdGFza0NvbXBsZXRlZE91dHB1dCh7fSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCBmZWVkYmFja1xuICogdGFza0NvbXBsZXRlZE91dHB1dCh7IHN0ZGVycjogJ0Nhbm5vdCBjb21wbGV0ZTogdGVzdHMgYXJlIGZhaWxpbmcuJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdGFza0NvbXBsZXRlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoXCJUYXNrQ29tcGxldGVkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgRWxpY2l0YXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBbiBFbGljaXRhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWNjZXB0IHRoZSBlbGljaXRhdGlvblxuICogZWxpY2l0YXRpb25PdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgYWN0aW9uOiAnYWNjZXB0JywgY29udGVudDogeyB1c2VybmFtZTogJ2FsaWNlJyB9IH1cbiAqIH0pO1xuICpcbiAqIC8vIERlY2xpbmUgdGhlIGVsaWNpdGF0aW9uXG4gKiBlbGljaXRhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBhY3Rpb246ICdkZWNsaW5lJyB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZWxpY2l0YXRpb25PdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIkVsaWNpdGF0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgRWxpY2l0YXRpb25SZXN1bHQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBbiBFbGljaXRhdGlvblJlc3VsdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogZWxpY2l0YXRpb25SZXN1bHRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlbGljaXRhdGlvblJlc3VsdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiRWxpY2l0YXRpb25SZXN1bHRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBDb25maWdDaGFuZ2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIENvbmZpZ0NoYW5nZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uZmlnQ2hhbmdlT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgY29uZmlnQ2hhbmdlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJDb25maWdDaGFuZ2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBJbnN0cnVjdGlvbnNMb2FkZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBbiBJbnN0cnVjdGlvbnNMb2FkZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCA9IFxuLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJJbnN0cnVjdGlvbnNMb2FkZWRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBXb3JrdHJlZUNyZWF0ZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgV29ya3RyZWVDcmVhdGVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHdvcmt0cmVlQ3JlYXRlT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgd29ya3RyZWVDcmVhdGVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIldvcmt0cmVlQ3JlYXRlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgV29ya3RyZWVSZW1vdmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFdvcmt0cmVlUmVtb3ZlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB3b3JrdHJlZVJlbW92ZU91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHdvcmt0cmVlUmVtb3ZlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJXb3JrdHJlZVJlbW92ZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEN3ZENoYW5nZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIEN3ZENoYW5nZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFJldHVybiBhZGRpdGlvbmFsIHBhdGhzIHRvIHdhdGNoIGFmdGVyIHRoZSBjd2QgY2hhbmdlXG4gKiBjd2RDaGFuZ2VkT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgd2F0Y2hQYXRoczogWycvbmV3L3BhdGgvdG8vd2F0Y2gnXVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIGN3ZENoYW5nZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBjd2RDaGFuZ2VkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJDd2RDaGFuZ2VkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgRmlsZUNoYW5nZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIEZpbGVDaGFuZ2VkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBVcGRhdGUgdGhlIHNldCBvZiB3YXRjaGVkIHBhdGhzXG4gKiBmaWxlQ2hhbmdlZE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHdhdGNoUGF0aHM6IFsnL3BhdGgvdG8vd2F0Y2gnLCAnL2Fub3RoZXIvcGF0aCddXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFNpbXBsZSBwYXNzdGhyb3VnaFxuICogZmlsZUNoYW5nZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBmaWxlQ2hhbmdlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiRmlsZUNoYW5nZWRcIik7XG4iLCAiLyoqXG4gKiBSdW50aW1lIG1vZHVsZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogSGFuZGxlcyBzdGRpbi9zdGRvdXQvZXhpdCBjb2RlIHNlbWFudGljcyBmb3IgY29tcGlsZWQgaG9vayBleGVjdXRpb24uXG4gKiBUaGlzIG1vZHVsZSBpcyB0aGUgY29yZSBvcmNoZXN0cmF0b3IgdGhhdDpcbiAqIC0gUmVhZHMgSlNPTiBmcm9tIHN0ZGluICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIC0gSW52b2tlcyB0aGUgaG9vayBoYW5kbGVyXG4gKiAtIFdyaXRlcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiAtIE1hbmFnZXMgZXhpdCBjb2Rlc1xuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGEgY29tcGlsZWQgaG9vayBmaWxlXG4gKiBpbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL3J1bnRpbWUnO1xuICogaW1wb3J0IG15SG9vayBmcm9tICcuL215LWhvb2suanMnO1xuICpcbiAqIGV4ZWN1dGUobXlIb29rKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gZnJvbSBcIi4vZW52LmpzXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi9sb2dnZXIuanNcIjtcbmltcG9ydCB7IEVYSVRfQ09ERVMgfSBmcm9tIFwiLi9vdXRwdXRzLmpzXCI7XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdGRpbi9TdGRvdXQgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogUmVhZHMgYWxsIGRhdGEgZnJvbSBzdGRpbi5cbiAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21wbGV0ZSBzdGRpbiBjb250ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlYWRTdGRpbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBjaHVua3MgPSBbXTtcbiAgICAgICAgLy8gU2V0IGVuY29kaW5nIGZpcnN0IHRvIGVuc3VyZSBkYXRhIGV2ZW50cyByZWNlaXZlIHN0cmluZ3NcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5zZXRFbmNvZGluZyhcInV0Zi04XCIpO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShjaHVua3Muam9pbihcIlwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZXJyb3JcIiwgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbi8qKlxuICogUGFyc2VzIHN0ZGluIEpTT04gaW5wdXQuXG4gKiBAcGFyYW0gc3RkaW5Db250ZW50IC0gUmF3IHN0ZGluIGNvbnRlbnRcbiAqIEByZXR1cm5zIFBhcnNlZCBpbnB1dCAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEpTT04gaXMgbWFsZm9ybWVkXG4gKi9cbmZ1bmN0aW9uIHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpIHtcbiAgICAvLyBQYXJzZSBKU09OIC0gaW5wdXQgdXNlcyB3aXJlIGZvcm1hdCAoc25ha2VfY2FzZSkgZGlyZWN0bHlcbiAgICBjb25zdCByYXdJbnB1dCA9IEpTT04ucGFyc2Uoc3RkaW5Db250ZW50KTtcbiAgICByZXR1cm4gcmF3SW5wdXQ7XG59XG4vKipcbiAqIFdyaXRlcyBob29rIG91dHB1dCB0byBzdGRvdXQuXG4gKlxuICogT3V0cHV0IHVzZXMgY2FtZWxDYXNlIGtleXMgcGVyIENsYXVkZSBDb2RlIGhvb2sgc3BlY2lmaWNhdGlvbi5cbiAqIEBwYXJhbSBvdXRwdXQgLSBUaGUgaG9vayBvdXRwdXQgdG8gd3JpdGVcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLW91dHB1dC1zdHJ1Y3R1cmVcbiAqL1xuZnVuY3Rpb24gd3JpdGVTdGRvdXQob3V0cHV0KSB7XG4gICAgLy8gT3V0cHV0IHVzZXMgY2FtZWxDYXNlIC0gbm8gdHJhbnNmb3JtYXRpb24gbmVlZGVkXG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkob3V0cHV0KSk7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFcnJvciBIYW5kbGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIGVycm9yIG91dHB1dCBmb3IgbWFsZm9ybWVkIHN0ZGluIEpTT04uXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgcGFyc2UgZXJyb3JcbiAqIEByZXR1cm5zIEhvb2tPdXRwdXQgd2l0aCBlbXB0eSBzdGRvdXRcbiAqL1xuZnVuY3Rpb24gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpIHtcbiAgICBsb2dnZXIuZXJyb3IoYEludmFsaWQgSlNPTiBpbnB1dDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgcmV0dXJuIHsgc3Rkb3V0OiB7fSB9O1xufVxuLyoqXG4gKiBXcml0ZXMgaGFuZGxlciBlcnJvciBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBjb2RlIDIuXG4gKlxuICogV2hlbiBhIGhvb2sgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uOlxuICogLSBTdGFja3RyYWNlICh3aXRoIHNvdXJjZW1hcHMgaWYgYXZhaWxhYmxlKSBpcyBvdXRwdXQgdG8gc3RkZXJyXG4gKiAtIFByb2Nlc3MgZXhpdHMgd2l0aCBjb2RlIDIgKEJMT0NLKVxuICogLSBObyBKU09OIGlzIG91dHB1dCB0byBzdGRvdXRcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gYnkgdGhlIGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKSB7XG4gICAgLy8gV3JpdGUgc3RhY2sgdHJhY2UgdG8gc3RkZXJyIChzb3VyY2VtYXBzIGFyZSBhcHBsaWVkIGF1dG9tYXRpY2FsbHkgYnkgTm9kZS5qcylcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlfVxcbmApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7U3RyaW5nKGVycm9yKX1cXG5gKTtcbiAgICB9XG4gICAgLy8gTG9nIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIGxvZ2dlci5lcnJvcihgSG9vayBoYW5kbGVyIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAvLyBDbGVhciBsb2dnZXIgY29udGV4dCBhbmQgY2xvc2VcbiAgICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgLy8gRXhpdCB3aXRoIGNvZGUgMiAoQkxPQ0spIC0gbm8gSlNPTiBvdXRwdXRcbiAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5CTE9DSyk7XG59XG4vKipcbiAqIENvbnZlcnRzIGEgU3BlY2lmaWNIb29rT3V0cHV0IHRvIEhvb2tPdXRwdXQgZm9yIHdpcmUgZm9ybWF0LlxuICpcbiAqIFNwZWNpZmljSG9va091dHB1dCB0eXBlcyBoYXZlOiB7IF90eXBlLCBzdGRvdXQsIHN0ZGVycj8gfVxuICogSG9va091dHB1dCBoYXM6IHsgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgc3Rkb3V0OiB7IGhvb2tTcGVjaWZpY091dHB1dDogeyAuLi4gfSB9IH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCkge1xuICAgIGNvbnN0IHsgc3Rkb3V0LCBzdGRlcnIgfSA9IHNwZWNpZmljT3V0cHV0O1xuICAgIHJldHVybiBzdGRlcnIgIT09IHVuZGVmaW5lZCA/IHsgc3Rkb3V0LCBzdGRlcnIgfSA6IHsgc3Rkb3V0IH07XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGVjdXRlIEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4ZWN1dGVzIGEgaG9vayBoYW5kbGVyIHdpdGggZnVsbCBydW50aW1lIG9yY2hlc3RyYXRpb24uXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCB0aGF0IGNvbXBpbGVkIGhvb2tzIHVzZS4gV2hlbiBhIGNvbXBpbGVkIGhvb2tcbiAqIHJ1bnMgYXMgYSBDTEk6XG4gKlxuICogMS4gUmVhZHMgYWxsIHN0ZGluXG4gKiAyLiBQYXJzZXMgSlNPTiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAzLiBTZXRzIHVwIGxvZ2dlciBjb250ZXh0IChob29rVHlwZSwgaW5wdXQpXG4gKiA0LiBDYWxscyBoYW5kbGVyIHdpdGggaW5wdXQgYW5kIGNvbnRleHQgKGxvZ2dlcilcbiAqIDUuIEhhbmRsZXMgYW55IGVycm9ycywgbG9ncyB0aGVtXG4gKiA2LiBXcml0ZXMgSlNPTiB0byBzdGRvdXRcbiAqIDcuIENsb3NlcyBsb2dnZXJcbiAqIDguIEV4aXRzIHdpdGggYXBwcm9wcmlhdGUgY29kZVxuICogQHBhcmFtIGhvb2tGbiAtIFRoZSBob29rIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgKGZyb20gaG9vayBmYWN0b3J5KVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCB7IHByZVRvb2xVc2VIb29rLCBwcmVUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBjb25zdCBteUhvb2sgPSBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShob29rRm4pIHtcbiAgICBsZXQgb3V0cHV0O1xuICAgIHRyeSB7XG4gICAgICAgIC8vIFJlYWQgYW5kIHBhcnNlIHN0ZGluXG4gICAgICAgIGxldCBzdGRpbkNvbnRlbnQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGRpbkNvbnRlbnQgPSBhd2FpdCByZWFkU3RkaW4oKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcmVhZCBzdGRpblwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBQYXJzZSBhbmQgdHJhbnNmb3JtIGlucHV0XG4gICAgICAgIGxldCBpbnB1dDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlucHV0ID0gcGFyc2VTdGRpbklucHV0KHN0ZGluQ29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsIFwiRmFpbGVkIHRvIHBhcnNlIHN0ZGluIEpTT05cIik7XG4gICAgICAgICAgICBvdXRwdXQgPSBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0XG4gICAgICAgIGNvbnN0IGhvb2tFdmVudE5hbWUgPSBob29rRm4uaG9va0V2ZW50TmFtZTtcbiAgICAgICAgbG9nZ2VyLnNldENvbnRleHQoaG9va0V2ZW50TmFtZSwgaW5wdXQpO1xuICAgICAgICAvLyBCdWlsZCBjb250ZXh0IC0gU2Vzc2lvblN0YXJ0IGhvb2tzIGdldCBleHRlbmRlZCBjb250ZXh0IHdpdGggcGVyc2lzdEVudlZhclxuICAgICAgICBjb25zdCBjb250ZXh0ID0gaG9va0V2ZW50TmFtZSA9PT0gXCJTZXNzaW9uU3RhcnRcIiA/IHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IDogeyBsb2dnZXIgfTtcbiAgICAgICAgLy8gRXhlY3V0ZSBoYW5kbGVyXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzcGVjaWZpY091dHB1dCA9IGF3YWl0IGhvb2tGbihpbnB1dCwgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoc3BlY2lmaWNPdXRwdXQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZXIgdGhyZXcgLSBvdXRwdXQgc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBjb2RlIDJcbiAgICAgICAgICAgIC8vIFRoaXMgY2FsbCBuZXZlciByZXR1cm5zIChwcm9jZXNzLmV4aXQpXG4gICAgICAgICAgICBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZpbmFsbHkge1xuICAgICAgICAvLyBXcml0ZSBvdXRwdXQgaWYgd2UgaGF2ZSBpdFxuICAgICAgICBpZiAob3V0cHV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdyaXRlU3Rkb3V0KG91dHB1dC5zdGRvdXQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIENsZWFuIHVwIGxvZ2dlciAoc2luZ2xlIGNsZWFudXAgcGF0aClcbiAgICAgICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gRXhpdC1jb2RlIEJMT0NLOiB1bmxpa2UgaGFuZGxlciB0aHJvdyAobm8gc3Rkb3V0KSwgdGhpcyBwYXRoIHN0aWxsIHdyaXRlc1xuICAgICAgICAvLyBzdHJ1Y3R1cmVkIEpTT04gdG8gc3Rkb3V0IChhcyBlbXB0eSB7fSkgYWxvbmdzaWRlIHRoZSBzdGRlcnIgbWVzc2FnZS5cbiAgICAgICAgLy8gVGhlIGNhbGxlciBjb250cm9scyBzdGRlcnIgZm9ybWF0dGluZyAobm8gYXBwZW5kZWQgbmV3bGluZSkuXG4gICAgICAgIGlmIChvdXRwdXQ/LnN0ZGVyciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShvdXRwdXQuc3RkZXJyKTtcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkJMT0NLKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBFeGl0IHdpdGggc3VjY2VzcyAoaGFuZGxlciBlcnJvcnMgZXhpdCB2aWEgaGFuZGxlSGFuZGxlckVycm9yIHdpdGggY29kZSAyKVxuICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9XG59XG4iLCAiLyoqXG4gKiBXb3JrdHJlZUNyZWF0ZSBob29rIHRoYXQgY3JlYXRlcyBhIENhcmRzLW1hbmFnZWQgZ2l0IHdvcmt0cmVlLlxuICpcbiAqIEZhaWxzIGNsb3NlZDogYW55IGVycm9yIG9uIHRoZSBjcmVhdGUgcGF0aCBpcyByZXRocm93biBzbyB0aGUgcnVudGltZSBleGl0c1xuICogbm9uLXplcm8gYW5kIHRoZSBoYXJuZXNzIGFib3J0cyBsYXVuY2guIFRoZSB3b3JrdHJlZSBwYXRoIGlzIHJldHVybmVkIG9ubHlcbiAqIGFmdGVyIGBzZXR0bGVgIHJlc29sdmVzLCBlbnN1cmluZyBzeW1saW5rcyBhbmQgbm9kZV9tb2R1bGVzIHJlcm91dGluZyBhcmVcbiAqIGNvbXBsZXRlIGJlZm9yZSB0aGUgYWdlbnQgdXNlcyB0aGUgZGlyZWN0b3J5LlxuICpcbiAqIEBzdW1tYXJ5IFdvcmt0cmVlQ3JlYXRlIGhvb2sgZm9yIENhcmRzLW1hbmFnZWQgd29ya3RyZWVzXG4gKiBAbW9kdWxlIHdvcmt0cmVlLWNyZWF0ZVxuICovXG5cbmltcG9ydCB7IGNyZWF0ZVdvcmt0cmVlIH0gZnJvbSAnQGNhcmRzL3Nkay93b3JrdHJlZSc7XG5pbXBvcnQgeyB3b3JrdHJlZUNyZWF0ZUhvb2ssIHdvcmt0cmVlQ3JlYXRlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcblxuZXhwb3J0IGRlZmF1bHQgd29ya3RyZWVDcmVhdGVIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICBjb25zdCBjYXJkSWQgPSBwcm9jZXNzLmVudlsnQ0FSRF9JRCddIHx8IHVuZGVmaW5lZDtcblxuICBsb2dnZXIuaW5mbygnV29ya3RyZWVDcmVhdGUnLCB7XG4gICAgZXZlbnQ6ICdXb3JrdHJlZUNyZWF0ZScsXG4gICAgbmFtZTogaW5wdXQubmFtZSxcbiAgICBjd2Q6IGlucHV0LmN3ZCxcbiAgICBjYXJkSWQ6IGNhcmRJZCA/PyBudWxsXG4gIH0pO1xuXG4gIGNvbnN0IHsgcGF0aDogd29ya3RyZWVQYXRoLCBzZXR0bGUgfSA9IGF3YWl0IGNyZWF0ZVdvcmt0cmVlKGlucHV0Lm5hbWUsIHtcbiAgICBjd2Q6IGlucHV0LmN3ZCxcbiAgICAuLi4oY2FyZElkICE9PSB1bmRlZmluZWQgPyB7IGNhcmRJZCB9IDoge30pXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNldHRsZTtcblxuICBsb2dnZXIuaW5mbygnV29ya3RyZWVDcmVhdGUgY29tcGxldGUnLCB7XG4gICAgZXZlbnQ6ICdXb3JrdHJlZUNyZWF0ZScsXG4gICAgbmFtZTogaW5wdXQubmFtZSxcbiAgICB3b3JrdHJlZVBhdGgsXG4gICAgY2FyZElkOiBjYXJkSWQgPz8gbnVsbCxcbiAgICBlbGFwc2VkTXM6IERhdGUubm93KCkgLSBzdGFydCxcbiAgICByZXN1bHRcbiAgfSk7XG5cbiAgcmV0dXJuIHdvcmt0cmVlQ3JlYXRlT3V0cHV0KHtcbiAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAgICAgIGhvb2tFdmVudE5hbWU6ICdXb3JrdHJlZUNyZWF0ZScsXG4gICAgICB3b3JrdHJlZVBhdGhcbiAgICB9XG4gIH0gYXMgUGFyYW1ldGVyczx0eXBlb2Ygd29ya3RyZWVDcmVhdGVPdXRwdXQ+WzBdKTtcbn0pO1xuIiwgImltcG9ydCBob29rIGZyb20gJy4vd29ya3RyZWUtY3JlYXRlLnRzJztcbmltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICcuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi93b3Jrc3BhY2Uvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMnO1xuXG5leGVjdXRlKGhvb2spO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFDQSxhQUFTLFVBQVcsU0FBUztBQUMzQixhQUFPLE1BQU0sUUFBUSxPQUFPLElBQ3hCLFVBQ0EsQ0FBQyxPQUFPO0FBQUEsSUFDZDtBQUVBLFFBQU0sWUFBWTtBQUNsQixRQUFNLFFBQVE7QUFDZCxRQUFNLFFBQVE7QUFDZCxRQUFNLFNBQVM7QUFDZixRQUFNLHdCQUF3QjtBQUM5QixRQUFNLG1DQUFtQztBQUN6QyxRQUFNLDRDQUE0QztBQUNsRCxRQUFNLHFDQUFxQztBQUMzQyxRQUFNLHNCQUFzQjtBQVU1QixRQUFNLDBCQUEwQjtBQUVoQyxRQUFNLDRCQUE0QjtBQUVsQyxRQUFNLFFBQVE7QUFHZCxRQUFJLGlCQUFpQjtBQUVyQixRQUFJLE9BQU8sV0FBVyxhQUFhO0FBQ2pDLHVCQUFpQixPQUFPLElBQUksYUFBYTtBQUFBLElBQzNDO0FBQ0EsUUFBTSxhQUFhO0FBRW5CLFFBQU0sU0FBUyxDQUFDLFFBQVEsS0FBSyxVQUFVO0FBQ3JDLGFBQU8sZUFBZSxRQUFRLEtB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aUJBQWlCLEVBQUUsUUFBUSxlQUFlLGVBQWUsSUFBSSxFQUFFLE9BQU87QUFFeEcsUUFBSTtBQUNBLFlBQU0saUJBQWlCLE1BQU0sT0FBTyxPQUFPLE9BQU87QUFDbEQsVUFBSSxtQkFBbUIsTUFBTTtBQUN6QixpQkFBUyxvQkFBb0IsY0FBYztBQUFBLE1BQy9DO0FBQUEsSUFDSixTQUNPLE9BQU87QUFHVix5QkFBbUIsS0FBSztBQUFBLElBQzVCO0FBQUEsRUFDSixVQUNBO0FBRUksUUFBSSxXQUFXLFFBQVc7QUFDdEIsa0JBQVksT0FBTyxNQUFNO0FBQUEsSUFDN0I7QUFFQSxXQUFPLGFBQWE7QUFDcEIsV0FBTyxNQUFNO0FBSWIsUUFBSSxRQUFRLFdBQVcsUUFBVztBQUM5QixjQUFRLE9BQU8sTUFBTSxPQUFPLE1BQU07QUFDbEMsY0FBUSxLQUFLLFdBQVcsS0FBSztBQUFBLElBQ2pDO0FBRUEsWUFBUSxLQUFLLFdBQVcsT0FBTztBQUFBLEVBQ25DO0FBQ0o7OztBQzVNQSxJQUFPLDBCQUFRLG1CQUFtQixDQUFDLEdBQUcsT0FBTyxPQUFPLEVBQUUsUUFBQUMsUUFBTyxNQUFNO0FBQ2pFLFFBQU0sUUFBUSxLQUFLLElBQUk7QUFDdkIsUUFBTSxTQUFTLFFBQVEsSUFBSSxTQUFTLEtBQUs7QUFFekMsRUFBQUEsUUFBTyxLQUFLLGtCQUFrQjtBQUFBLElBQzVCLE9BQU87QUFBQSxJQUNQLE1BQU0sTUFBTTtBQUFBLElBQ1osS0FBSyxNQUFNO0FBQUEsSUFDWCxRQUFRLFVBQVU7QUFBQSxFQUNwQixDQUFDO0FBRUQsUUFBTSxFQUFFLE1BQU0sY0FBYyxPQUFPLElBQUksTUFBTSxlQUFlLE1BQU0sTUFBTTtBQUFBLElBQ3RFLEtBQUssTUFBTTtBQUFBLElBQ1gsR0FBSSxXQUFXLFNBQVksRUFBRSxPQUFPLElBQUksQ0FBQztBQUFBLEVBQzNDLENBQUM7QUFFRCxRQUFNLFNBQVMsTUFBTTtBQUVyQixFQUFBQSxRQUFPLEtBQUssMkJBQTJCO0FBQUEsSUFDckMsT0FBTztBQUFBLElBQ1AsTUFBTSxNQUFNO0FBQUEsSUFDWjtBQUFBLElBQ0EsUUFBUSxVQUFVO0FBQUEsSUFDbEIsV0FBVyxLQUFLLElBQUksSUFBSTtBQUFBLElBQ3hCO0FBQUEsRUFDRixDQUFDO0FBRUQsU0FBTyxxQkFBcUI7QUFBQSxJQUMxQixvQkFBb0I7QUFBQSxNQUNsQixlQUFlO0FBQUEsTUFDZjtBQUFBLElBQ0Y7QUFBQSxFQUNGLENBQStDO0FBQ2pELENBQUM7OztBQzdDRCxRQUFRLHVCQUFJOyIsCiAgIm5hbWVzIjogWyJwYXRoIiwgImZzIiwgInBhdGgiLCAicGF0aCIsICJyZXNvbHZlIiwgImlnbm9yZSIsICJmcyIsICJkaXJuYW1lIiwgInJlc29sdmUiLCAibG9nZ2VyIl0KfQo=
