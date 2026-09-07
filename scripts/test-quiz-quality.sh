#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
quiz_test_dir=$(mktemp -d)
trap 'rm -rf "$quiz_test_dir"' EXIT
./node_modules/.bin/tsc lib/quiz-quality.ts --outDir "$quiz_test_dir" --module commonjs --target es2020 --skipLibCheck --strict
QUIZ_QUALITY_MODULE="$quiz_test_dir/quiz-quality.js" node --test tests/quiz-quality.test.cjs
