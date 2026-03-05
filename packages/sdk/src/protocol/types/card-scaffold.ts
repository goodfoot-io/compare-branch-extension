/**
 * Scaffolding constants written into every new card repository.
 *
 * @summary Card repository scaffold templates
 * @module types/card-scaffold
 */

/**
 * General-purpose `.gitignore` written into every new card repository.
 *
 * Covers common artifacts from JavaScript/TypeScript, Python, Rust, Go, C/C++,
 * Java, and general IDE/OS tooling so that card repos stay clean regardless of
 * the language used in the linked workspace.
 */
export const CARD_GITIGNORE = `# --- JavaScript / TypeScript ---
node_modules/
dist/
build/
out/
*.tsbuildinfo
.eslintcache
*.js.map

# --- Python ---
__pycache__/
*.py[cod]
*.egg-info/
.eggs/
*.egg
.venv/
venv/
env/
.mypy_cache/
.ruff_cache/
.pytest_cache/

# --- Rust ---
target/
Cargo.lock
*.rlib

# --- Go ---
bin/
pkg/

# --- C / C++ ---
*.o
*.obj
*.so
*.dylib
*.dll
*.a
*.lib
*.out

# --- Java / JVM ---
*.class
*.jar
*.war
*.ear
.gradle/
build/

# --- IDE / Editor ---
.idea/
.vscode/
*.swp
*.swo
*~
.project
.classpath
.settings/

# --- OS ---
.DS_Store
Thumbs.db
desktop.ini

# --- Logs & temp ---
*.log
!streams/**/*.log
!attachment/**/*.log
tmp/
temp/
.cache/

# --- Environment / secrets ---
.env
.env.*
!.env.example
`;
