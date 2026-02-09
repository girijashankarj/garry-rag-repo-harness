# Security Documentation

## Overview

This document covers security analysis for the RAG Repo Harness project, including token security, attack vectors, and best practices.

---

## Token Security Summary

| Context                    | Security Rating | Status                                          |
| -------------------------- | --------------- | ----------------------------------------------- |
| **Local Environment**      | 🟢 **SECURE**   | Token only in memory, never persisted           |
| **GitHub Repository**      | 🟢 **SECURE**   | Token stored as encrypted secret, never in code |
| **Generated Output Files** | 🟢 **SECURE**   | Token never included in kb.json or any output   |
| **Public Pages Hosting**   | 🟢 **SECURE**   | Token never exposed to browser/client           |
| **Network Calls**          | 🟢 **SECURE**   | HTTPS encrypted, token in secure headers only   |
| **Code Injection**         | 🟢 **SECURE**   | Token never in browser, no injection points     |

**Overall Security Rating: 🟢 EXCELLENT (5/5)**

---

## Token Usage & Storage

### How Token is Used

1. **Storage**: Environment variable `ACTION_TOKEN`
2. **Usage**: Only in HTTP Authorization headers
3. **Scope**: Build-time only (never at runtime)
4. **Exposure**: Zero exposure points

### Security Measures

- ✅ Token never in config files (`rag.config.json`)
- ✅ Token never in repository code
- ✅ Token never in output files (`kb.json`)
- ✅ Token never exposed to browser
- ✅ Token stored as encrypted GitHub secret
- ✅ Error messages sanitized to prevent leaks
- ✅ GitHub Actions auto-masks secrets in logs

---

## Attack Vector Analysis

### 1. Network Interception

**Risk:** 🟢 **VERY LOW**

- ✅ HTTPS/TLS encryption protects all API calls
- ✅ Certificate validation prevents MITM attacks
- ✅ Token only in Authorization header (standard practice)

### 2. Code Injection

**Risk:** 🟢 **ZERO**

- ✅ Token never in browser code
- ✅ No user input affects token
- ✅ Static site = no server-side execution
- ✅ No dynamic code execution

### 3. Supply Chain Attacks

**Risk:** 🟡 **LOW**

- ✅ Use reputable dependencies
- ✅ Run `npm audit` regularly
- ✅ Lock dependencies (`package-lock.json`)

### 4. Environment Variable Access

**Risk:** 🟢 **VERY LOW**

- ✅ Process isolation
- ✅ Token only read once, stored in variable
- ✅ Short-lived processes

### 5. Memory Dumps

**Risk:** 🟡 **LOW**

- ✅ Requires physical/root access
- ✅ Token cleared when process ends
- ✅ Never written to disk

---

## Token Permissions Required

### Fine-Grained Token (Recommended)

- **Contents:** Read-only
- **Pull requests:** Read-only
- **Metadata:** Read-only (automatic)

### Classic Token (Alternative)

- **Public repos:** `public_repo` scope
- **Private repos:** `repo` scope (only if `includePrivate: true`)

**Note**: By default, only public repositories are indexed. Private repos require `includePrivate: true` in `rag.config.json` and a token with `repo` scope.

See [TOKEN-PERMISSIONS.md](./TOKEN-PERMISSIONS.md) in this directory for detailed setup instructions.

---

## Security Best Practices

### ✅ Current Implementation

- [x] Token never in config files
- [x] Token never in code
- [x] Token never in output files
- [x] Token never in browser
- [x] HTTPS encryption
- [x] Error message sanitization
- [x] Secret scanning

### 🔒 Recommendations

1. Use fine-grained tokens with minimal permissions
2. Set token expiration (90 days recommended)
3. Rotate tokens periodically
4. Monitor token usage in GitHub
5. Enable 2FA on GitHub account
6. Use branch protection
7. Run `npm audit` regularly

---

## Verification Commands

```bash
# Verify no tokens in code
npm run verify:security

# Check output files
grep -r "ghp_" dist/ 2>/dev/null || echo "✅ No tokens in output"

# Audit dependencies
npm audit
```

---

## Conclusion

Your token implementation follows security best practices with multiple layers of protection. The token is secure and protected from common attack vectors.
