# Coverage Badge Options

This project supports multiple coverage badge approaches:

## Current Setup

### 1. GitHub Actions Badge (Current)
```markdown
[![Test Coverage](https://github.com/2389-research/journal-mcp/actions/workflows/coverage.yml/badge.svg)](https://github.com/2389-research/journal-mcp/actions/workflows/coverage.yml)
```
- ✅ Shows if tests are passing/failing
- ✅ No setup required
- ✅ Updates automatically on push
- ❌ Doesn't show coverage percentage

### 2. Static Coverage Badge (Current)
```markdown
[![Coverage](https://img.shields.io/badge/coverage-86.8%25-brightgreen)](https://github.com/2389-research/journal-mcp/actions)
```
- ✅ Shows exact coverage percentage
- ✅ Color-coded (red < 40%, orange < 60%, yellow < 80%, green ≥ 80%)
- ❌ Requires manual updates
- ✅ No external services required

## Alternative Options

### 3. Codecov Badge (Future)
If you want automatic coverage percentage updates:

1. Sign up at https://codecov.io
2. Connect your GitHub repo
3. Add to README:
```markdown
[![codecov](https://codecov.io/gh/2389-research/journal-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/2389-research/journal-mcp)
```

### 4. Dynamic Gist Badge (Future)
For auto-updating without external services:

1. Create a GitHub Gist
2. Add `GIST_SECRET` and `GIST_ID` to repo secrets
3. Update `.github/workflows/coverage.yml` to use `schneegans/dynamic-badges-action`

## Usage

Run coverage locally:
```bash
npm run test:coverage
```

The GitHub Actions workflow runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` branch
