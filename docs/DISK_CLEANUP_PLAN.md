# DISK CLEANUP ANALYSIS
## Created: Session 93 - January 26, 2026
## Goal: Free up 12GB for Xcode

---

## CURRENT STATE
- **Free Space:** 8.2GB
- **Needed:** 12GB for Xcode
- **Must Free:** ~5GB minimum

---

## 🟢 SAFE TO DELETE IMMEDIATELY (~4GB)

| What | Size | Why Safe |
|------|------|----------|
| `~/.npm` (npm cache) | 1.1GB | Rebuilds automatically |
| `~/Library/Caches/Google` | 910MB | Chrome cache, rebuilds |
| `~/Library/Caches/com.anthropic.claudefordesktop.ShipIt` | 491MB | Claude update cache |
| `~/Library/Caches/Homebrew` | 113MB | Brew cache |
| `~/.Trash` | 72MB | Already deleted files |
| `~/Desktop/whale/.next` | 330MB | Build cache, rebuilds |
| `~/Desktop/jc/.next` | 58MB | Build cache |

**Command to run:**
```bash
rm -rf ~/.npm
rm -rf ~/Library/Caches/Google
rm -rf ~/Library/Caches/com.anthropic.claudefordesktop.ShipIt
rm -rf ~/Library/Caches/Homebrew
rm -rf ~/.Trash/*
rm -rf ~/Desktop/whale/.next
rm -rf ~/Desktop/jc/.next
```

---

## 🟡 ARCHIVE TO EXTERNAL/CLOUD THEN DELETE (~4GB)

### ESSENTIAL - BACKED UP ON GITHUB ✅
| Folder | Size | Git Remote |
|--------|------|------------|
| `whale/` | 2.0GB | github.com/Tredoux555/whale-class.git ✅ |
| `jeffy-mvp/` | 1.1GB | github.com/Tredoux555/jeffy-commerce.git ✅ |

**These are safe - code is on GitHub. Only node_modules takes space.**

### NEED BACKUP FIRST - NO GIT ⚠️
| Folder | Size | What It Is |
|--------|------|------------|
| `jc/` | 1.1GB | Old Jeffy version? No git. |
| `gardian-connect/` | 1.2GB | Expo app. No git. |
| `guardian-pwa/` | 170MB | PWA version. No git. |
| `School/` | 1.4GB | School documents? |
| `Music/` | 1.0GB | Music files |
| `Old Projects/` | 781MB | Archive |
| `Montessori AMS Submission/` | 685MB | AMS certification docs |
| `Parents Meetings/` | 230MB | Meeting documents |

---

## 🔴 ESSENTIAL - DO NOT DELETE

| Folder | Why Essential |
|--------|---------------|
| `whale/` | MAIN PROJECT - keep but clean node_modules |
| `jeffy-mvp/` | ACTIVE PROJECT - keep but clean node_modules |
| `Montessori AMS Submission/` | Certification documents! |
| `Business Documents/` | Legal/business docs |

---

## RECOMMENDED CLEANUP PLAN

### PHASE 1: Safe Deletes (4GB)
```bash
# Run these commands:
rm -rf ~/.npm
rm -rf ~/Library/Caches/Google
rm -rf ~/Library/Caches/com.anthropic.claudefordesktop.ShipIt
rm -rf ~/Library/Caches/Homebrew
rm -rf ~/.Trash/*
rm -rf ~/Desktop/whale/.next
rm -rf ~/Desktop/jc/.next
```

### PHASE 2: Backup then Delete (~3GB)
1. Copy these to iCloud/Google Drive/External:
   - `jc/` (probably old - check first)
   - `gardian-connect/`
   - `guardian-pwa/`
   - `Old Projects/`
   - `Music/` and `Music 2/`

2. After backup confirmed, delete them

### PHASE 3: Clean node_modules in unused projects
```bash
rm -rf ~/Desktop/jc/node_modules          # 571MB
rm -rf ~/Desktop/gardian-connect/node_modules  # 423MB
rm -rf ~/Desktop/guardian-pwa/node_modules     # 169MB
```

---

## SPACE RECOVERY SUMMARY

| Action | Space Freed |
|--------|-------------|
| Phase 1 (caches) | ~3GB |
| Phase 2 (backups) | ~3GB |
| Phase 3 (node_modules) | ~1.2GB |
| **TOTAL** | **~7GB** |

Combined with 8.2GB free = **15GB available** ✅

---

## AFTER CLEANUP

You'll have enough space for Xcode (12GB).

To reinstall node_modules later:
```bash
cd ~/Desktop/whale && npm install
cd ~/Desktop/jeffy-mvp && npm install
```
