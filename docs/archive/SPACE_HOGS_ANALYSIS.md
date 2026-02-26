# SPACE HOGS FOUND

## TOTAL: ~110GB in Library alone!

---

## 🔴 BIG ONES (safe to clean)

| What | Size | What it is | Safe? |
|------|------|------------|-------|
| **iPhone Backup** | 65GB | MobileSync - old backup from Nov 15 | ✅ If backed up to iCloud |
| **mediaanalysisd** | 12GB | Apple photo analysis cache | ✅ Rebuilds |
| **Claude vm_bundles** | 10GB | Claude computer use VMs | ✅ Rebuilds |
| **Cursor globalStorage** | 8GB | Cursor AI cache | ✅ Rebuilds |
| **CoreSimulator** | 6GB | iOS Simulator data | ✅ Rebuilds with Xcode |
| **Downloads** | 4.5GB | Old downloads | ⚠️ Review first |

**POTENTIAL SAVINGS: ~100GB+**

---

## CLEANUP COMMANDS

### 1. iPhone Backup (65GB) - BIGGEST WIN
```bash
# Check if you need it first!
# If your iPhone backs up to iCloud, you don't need this
rm -rf ~/Library/Application\ Support/MobileSync/Backup/
```

### 2. Apple Photo Analysis Cache (12GB)
```bash
rm -rf ~/Library/Containers/com.apple.mediaanalysisd
# macOS will rebuild this automatically
```

### 3. Claude VM Bundles (10GB)
```bash
rm -rf ~/Library/Application\ Support/Claude/vm_bundles
# Rebuilds when you use computer use feature
```

### 4. Cursor Cache (8GB)
```bash
rm -rf ~/Library/Application\ Support/Cursor/User/globalStorage
rm -rf ~/Library/Application\ Support/Cursor/CachedData
# Will rebuild, may lose some AI context
```

### 5. iOS Simulator Data (6GB)
```bash
rm -rf ~/Library/Developer/CoreSimulator
# Will be recreated when you install Xcode
```

### 6. Downloads cleanup (4.5GB)
Review manually - has Video, Whale Class, Documents folders

---

## RECOMMENDED ORDER

1. **iPhone Backup** → 65GB freed (if you use iCloud backup)
2. **Cursor cache** → 8GB freed
3. **Claude VMs** → 10GB freed
4. **Photo analysis** → 12GB freed
5. **CoreSimulator** → 6GB freed (will reinstall with Xcode anyway)

**TOTAL POSSIBLE: ~100GB**

---

## ⚠️ WARNINGS

- iPhone backup: Only delete if your phone backs up to iCloud
- Cursor: You'll lose AI conversation context
- Claude: Computer use will need to re-download VMs
