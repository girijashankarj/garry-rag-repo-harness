# GitHub Token Permissions Guide

## Required Permissions for This Project

### Quick Answer

**Default (Public Repos Only):**

- ✅ `public_repo` scope (Classic Token)
- ✅ OR `Public repositories: Read-only` (Fine-grained Token)
- **Note**: Only public repositories are indexed by default

**For Private Repos (Optional):**

- ✅ `repo` scope (Classic Token) - Full repository access
- ✅ OR `Repositories: Read-only` (Fine-grained Token)
- **Note**: Requires `includePrivate: true` in `rag.config.json`

---

## Detailed Permission Breakdown

### What This Project Does

1. **Fetches Repository Lists**
   - `GET /users/{username}/repos` - List user's repos
   - `GET /orgs/{org}/repos` - List org's repos
   - `GET /repos/{owner}/{repo}` - Get repo details

2. **Fetches Pull Request Data**
   - `GET /repos/{owner}/{repo}/pulls` - List PRs
   - `GET /repos/{owner}/{repo}/pulls/{number}/files` - Get PR files

3. **Clones Repositories**
   - `git clone` - Clones repos (needs read access)

4. **GitHub Actions Deployment**
   - Deploys to GitHub Pages (uses built-in GITHUB_TOKEN)

---

## Option 1: Classic Personal Access Token (PAT)

### For Public Repos Only

**Required Scopes:**

- ✅ `public_repo` - Access public repositories

**Steps:**

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: `RAG Repo Harness`
4. Expiration: Choose (90 days recommended)
5. **Select scope:**
   - ✅ `public_repo` (Access public repositories)
6. Click "Generate token"
7. Copy token (starts with `ghp_`)

**What this allows:**

- ✅ List public repositories
- ✅ Read public repository contents
- ✅ List pull requests (public repos)
- ✅ Read PR files (public repos)
- ❌ Cannot access private repos

---

### For Private Repos

**Required Scopes:**

- ✅ `repo` - Full control of private repositories

**Steps:**

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: `RAG Repo Harness`
4. Expiration: Choose (90 days recommended)
5. **Select scope:**
   - ✅ `repo` (Full control of private repositories)
     - This includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`, `security_events`
6. Click "Generate token"
7. Copy token (starts with `ghp_`)

**What this allows:**

- ✅ List all repositories (public + private)
- ✅ Read repository contents (public + private)
- ✅ List pull requests (all repos)
- ✅ Read PR files (all repos)
- ⚠️ **Warning:** This gives full read access to private repos

---

## Option 2: Fine-Grained Personal Access Token (Recommended)

### For Public Repos Only

**Required Permissions:**

| Resource                   | Permission | Reason                          |
| -------------------------- | ---------- | ------------------------------- |
| **Repository permissions** |            |                                 |
| Contents                   | Read-only  | Read repo contents, clone repos |
| Metadata                   | Read-only  | Read repo metadata (automatic)  |
| Pull requests              | Read-only  | List PRs and read PR files      |

**Steps:**

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Fine-grained token"
3. Name: `RAG Repo Harness`
4. Expiration: Choose (90 days recommended)
5. **Repository access:**
   - Select "All repositories" OR specific repos
6. **Repository permissions:**
   - ✅ Contents: **Read-only**
   - ✅ Metadata: **Read-only** (automatic)
   - ✅ Pull requests: **Read-only**
7. Click "Generate token"
8. Copy token (starts with `ghp_`)

---

### For Private Repos

**Required Permissions:**

| Resource                   | Permission | Reason                          |
| -------------------------- | ---------- | ------------------------------- |
| **Repository permissions** |            |                                 |
| Contents                   | Read-only  | Read repo contents, clone repos |
| Metadata                   | Read-only  | Read repo metadata (automatic)  |
| Pull requests              | Read-only  | List PRs and read PR files      |

**Steps:**

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Fine-grained token"
3. Name: `RAG Repo Harness`
4. Expiration: Choose (90 days recommended)
5. **Repository access:**
   - Select "All repositories" (for all repos)
   - OR select specific repositories
6. **Repository permissions:**
   - ✅ Contents: **Read-only**
   - ✅ Metadata: **Read-only** (automatic)
   - ✅ Pull requests: **Read-only**
7. Click "Generate token"
8. Copy token (starts with `ghp_`)

**Note:** Fine-grained tokens can access private repos with read-only permissions (more secure than classic `repo` scope).

---

## Comparison: Classic vs Fine-Grained

| Feature           | Classic Token              | Fine-Grained Token                |
| ----------------- | -------------------------- | --------------------------------- |
| **Public repos**  | `public_repo` scope        | Contents: Read-only               |
| **Private repos** | `repo` scope (full access) | Contents: Read-only (more secure) |
| **Granularity**   | Broad scopes               | Per-repository permissions        |
| **Security**      | Good                       | Better (least privilege)          |
| **Recommended**   | ✅ Works fine              | ✅ **Recommended**                |

---

## Minimal Permissions Checklist

### ✅ Required (Must Have)

- [x] **Contents: Read-only** - To clone and read files
- [x] **Pull requests: Read-only** - To fetch PR data
- [x] **Metadata: Read-only** - Automatic, needed for API calls

### ❌ NOT Required (Don't Select)

- [ ] `repo:status` - Not needed
- [ ] `repo_deployment` - Not needed
- [ ] `admin:repo_hook` - Not needed
- [ ] `write:packages` - Not needed
- [ ] `delete_repo` - Not needed
- [ ] `workflow` - Not needed (GitHub Actions uses its own token)

---

## API Endpoints Used & Required Permissions

### Repository Endpoints

| Endpoint                  | Method | Required Permission     |
| ------------------------- | ------ | ----------------------- |
| `/users/{username}/repos` | GET    | `public_repo` or `repo` |
| `/orgs/{org}/repos`       | GET    | `public_repo` or `repo` |
| `/repos/{owner}/{repo}`   | GET    | `public_repo` or `repo` |

### Pull Request Endpoints

| Endpoint                                     | Method | Required Permission     |
| -------------------------------------------- | ------ | ----------------------- |
| `/repos/{owner}/{repo}/pulls`                | GET    | `public_repo` or `repo` |
| `/repos/{owner}/{repo}/pulls/{number}/files` | GET    | `public_repo` or `repo` |

**Note:** All endpoints are **read-only** - no write permissions needed.

---

## Recommended Setup

### For Most Users (Public Repos)

**Fine-Grained Token:**

```
Name: RAG Repo Harness
Expiration: 90 days
Repository access: All repositories
Permissions:
  ✅ Contents: Read-only
  ✅ Pull requests: Read-only
  ✅ Metadata: Read-only (automatic)
```

### For Private Repos

**Fine-Grained Token:**

```
Name: RAG Repo Harness
Expiration: 90 days
Repository access: All repositories (or select specific ones)
Permissions:
  ✅ Contents: Read-only
  ✅ Pull requests: Read-only
  ✅ Metadata: Read-only (automatic)
```

**OR Classic Token:**

```
Scope: repo (Full control of private repositories)
```

---

## Security Best Practices

### 1. Use Fine-Grained Tokens (Recommended)

- ✅ More granular permissions
- ✅ Can limit to specific repositories
- ✅ Read-only access (can't modify repos)

### 2. Set Expiration Date

- ✅ Rotate tokens regularly (90 days recommended)
- ✅ Reduces risk if token is compromised

### 3. Limit Repository Access

- ✅ Fine-grained: Select only needed repos
- ✅ Classic: Use `public_repo` if only public repos

### 4. Monitor Token Usage

- ✅ Check GitHub Settings → Developer settings → Personal access tokens
- ✅ Review "Last used" dates
- ✅ Revoke if suspicious activity

### 5. Use Different Tokens

- ✅ One token for this project
- ✅ Different tokens for other projects
- ✅ Easier to revoke if compromised

---

## Token Setup Checklist

### Step 1: Create Token

- [ ] Go to GitHub token settings
- [ ] Choose Classic or Fine-grained (Fine-grained recommended)
- [ ] Set expiration date (90 days)
- [ ] Select minimal required permissions
- [ ] Generate and copy token

### Step 2: Configure Locally

- [ ] Set environment variable: `export ACTION_TOKEN=ghp_your_token`
- [ ] Test: `echo $ACTION_TOKEN` (should show token)
- [ ] Add to shell profile for persistence (optional)

### Step 3: Configure GitHub Actions

- [ ] Go to repository → Settings → Secrets and variables → Actions
- [ ] Add secret: Name `ACTION_TOKEN`, Value: your token
- [ ] Verify workflow uses `${{ secrets.ACTION_TOKEN }}`

### Step 4: Test

- [ ] Run `npm run build:kb` locally
- [ ] Verify repos are fetched
- [ ] Verify PR data is fetched
- [ ] Check GitHub Actions workflow runs successfully

---

## Troubleshooting

### Error: "Rate limited"

**Cause:** No token or token without proper permissions
**Solution:** Add `ACTION_TOKEN` with `public_repo` or `repo` scope

### Error: "Repository not found"

**Cause:** Token doesn't have access to private repos
**Solution:** Use `repo` scope (classic) or Contents: Read-only (fine-grained)

### Error: "Insufficient permissions"

**Cause:** Token missing required scopes
**Solution:** Ensure token has `public_repo` (public) or `repo` (private) scope

### Error: "403 Forbidden"

**Cause:** Token expired or revoked
**Solution:** Generate new token and update `ACTION_TOKEN`

---

## Summary

### Minimum Required Permissions

**Public Repos:**

- Classic: `public_repo`
- Fine-grained: `Contents: Read-only` + `Pull requests: Read-only`

**Private Repos:**

- Classic: `repo`
- Fine-grained: `Contents: Read-only` + `Pull requests: Read-only`

### Recommended Token

**Fine-Grained Token with:**

- ✅ Contents: Read-only
- ✅ Pull requests: Read-only
- ✅ Repository access: All repositories (or specific ones)
- ✅ Expiration: 90 days

This gives you the **minimum permissions needed** while maintaining security! 🔒
