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

// src/worktree.ts
import { execFile } from "node:child_process";
import * as fs2 from "node:fs/promises";
import * as path3 from "node:path";
import { promisify } from "node:util";

// src/cards-config.ts
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
function resolveWorktreeDir(repoRoot, ref2) {
  const repoId = generateRepoId(repoRoot);
  return path.join(resolveWorktreesRoot(), repoId, ref2);
}

// src/worktreeInclude.ts
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

// src/worktree.ts
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
async function createWorktree(ref2, options) {
  const { sourceRoot, repoRoot } = await findGitRoots(options?.cwd ?? process.cwd());
  let refType;
  try {
    refType = await resolveRefType(repoRoot, ref2);
  } catch {
    validateBranchName(ref2);
    refType = "branch";
  }
  if (refType === "branch") {
    validateBranchName(ref2);
  }
  const worktreeDir = resolveWorktreeDir(repoRoot, ref2);
  const worktreeExists = await checkWorktreeExists(repoRoot, worktreeDir);
  if (worktreeExists) {
    throw new Error(`Error: Worktree already exists at ${worktreeDir}`);
  }
  await cleanStaleWorktreeDir(repoRoot, worktreeDir);
  if (refType === "branch") {
    const startPoint = await resolveHead(sourceRoot);
    const branchExists = await checkBranchExists(repoRoot, ref2);
    await addWorktree({ repoRoot, worktreeDir, branchName: ref2, branchExists, startPoint });
  } else {
    await addDetachedWorktree(repoRoot, worktreeDir, ref2);
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
      branch: ref2,
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
async function resolveRefType(repoRoot, ref2) {
  const branchExists = await checkBranchExists(repoRoot, ref2);
  if (branchExists) return "branch";
  const { stdout: tagOutput } = await execFileAsync("git", ["tag", "--list", ref2], {
    cwd: repoRoot,
    timeout: 3e4
  });
  if (tagOutput.trim().length > 0) return "tag";
  try {
    await execFileAsync("git", ["rev-parse", "--verify", `${ref2}^{commit}`], {
      cwd: repoRoot,
      timeout: 5e3
    });
    return "commit";
  } catch {
    throw new Error(`Error: '${ref2}' does not resolve to a branch, tag, or commit.`);
  }
}
async function addWorktree(opts) {
  const args2 = opts.branchExists ? ["worktree", "add", opts.worktreeDir, opts.branchName] : ["worktree", "add", "-b", opts.branchName, opts.worktreeDir, opts.startPoint];
  await execFileAsync("git", args2, { cwd: opts.repoRoot, timeout: 3e4 });
}
async function addDetachedWorktree(repoRoot, worktreeDir, ref2) {
  await execFileAsync("git", ["worktree", "add", "--detach", worktreeDir, ref2], {
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
async function writeCardBoundFile(worktreeDir, cardId2) {
  const cardsDir = path3.join(worktreeDir, ".cards");
  await fs2.mkdir(cardsDir, { recursive: true });
  await fs2.writeFile(path3.join(cardsDir, "CARD_ID"), `${cardId2}
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

// src/bin/create-worktree.ts
var USAGE = "Usage: create-worktree [--card-id <id>] <branch|tag|sha>\n";
var args = process.argv.slice(2);
var cardId;
var ref;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    process.stdout.write(USAGE);
    process.exit(0);
  } else if (arg === "--card-id") {
    const next = args[i + 1];
    if (!next) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    cardId = next;
    i++;
  } else if (arg.startsWith("--card-id=")) {
    cardId = arg.slice("--card-id=".length);
  } else if (ref === void 0) {
    ref = arg;
  } else {
    process.stderr.write(USAGE);
    process.exit(2);
  }
}
if (!ref) {
  process.stderr.write(USAGE);
  process.exit(2);
}
if (cardId !== void 0 && cardId.length === 0) {
  process.stderr.write("Error: --card-id requires a non-empty value\n");
  process.exit(2);
}
createWorktree(ref, cardId !== void 0 ? { cardId } : void 0).then(({ settle }) => settle).then((result) => {
  process.stdout.write(`${JSON.stringify(result)}
`);
}).catch((error) => {
  if (error instanceof WorktreeIncludeError) {
    process.stderr.write(`${error.message}
`);
    process.exit(3);
  }
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}
`);
  process.exit(2);
});
