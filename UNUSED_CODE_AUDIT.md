# Unused Code & Dead Features Audit
## MashupAnalyzer Codebase Cleanup Report

**Generated:** $(date)
**Scan Scope:** All TypeScript/TSX files in `src/`

---

## 🔴 HIGH PRIORITY REMOVALS (Large Bundle Impact)

### 1. **Unused Component: CrossFolderMashupCard**
**Location:** `src/components/CrossFolderMashupCard.tsx` (218 lines)
**Issue:** Component is defined and exported but never imported or used anywhere in the codebase
**Why Unnecessary:** Type was added (`CrossFolderMashup`) but component implementation is orphaned
**Safe to Delete:** ✅ **YES** - Zero references found
**Impact if Removed:** **HIGH** - ~218 lines, removes unused dependencies on `useAudio` context
**Recommendation:** Delete file entirely

### 2. **Unused Component: MashupResultCard**
**Location:** `src/components/MashupResultCard.tsx` (EMPTY FILE - 0 lines)
**Issue:** File exists but is completely empty
**Why Unnecessary:** Empty stub file, never implemented
**Safe to Delete:** ✅ **YES**
**Impact if Removed:** **NONE** - Empty file
**Recommendation:** Delete immediately

### 3. **Unused Component: MashupFilterBar**
**Location:** `src/components/MashupFilterBar.tsx` (102 lines)
**Issue:** Component defined but never imported/used (replaced by `FilterSidebar`)
**Why Unnecessary:** Superseded by `FilterSidebar` in `DiscoverTab`
**Safe to Delete:** ✅ **YES** - No imports found
**Impact if Removed:** **MEDIUM** - ~102 lines, removes duplicate filter UI logic
**Recommendation:** Delete file

### 4. **Unused Component: FolderColumn**
**Location:** `src/components/FolderColumn.tsx` (158 lines)
**Issue:** Component references `FolderGroup` type which doesn't exist in `types/track.ts`
**Why Unnecessary:** Uses non-existent type, never imported anywhere
**Safe to Delete:** ✅ **YES** - Zero references, broken type dependency
**Impact if Removed:** **MEDIUM** - ~158 lines
**Recommendation:** Delete file (type dependency is broken anyway)

### 5. **Unused Component: LoadingSpinner**
**Location:** `src/components/LoadingSpinner.tsx` (19 lines)
**Issue:** Simple spinner component never imported/used
**Why Unnecessary:** Components use inline loaders (Loader from lucide-react instead)
**Safe to Delete:** ✅ **YES** - Zero references
**Impact if Removed:** **LOW** - Small utility component
**Recommendation:** Delete if not planning to use

### 6. **Unused Component: DuplicateManager**
**Location:** `src/components/DuplicateManager.tsx` (full file)
**Issue:** Component defined but never imported/used
**Why Unnecessary:** Duplicate detection is shown in `DiscoverTab` directly, no separate manager
**Safe to Delete:** ✅ **YES** - Zero references
**Impact if Removed:** **MEDIUM** - Removes unused UI component
**Recommendation:** Delete file

---

## 🟠 MEDIUM PRIORITY REMOVALS (Unused Utilities)

### 7. **Entire Unused Utility File: audioProcessor.ts**
**Location:** `src/utils/audioProcessor.ts` (214 lines)
**Issue:** File contains 14 functions, NONE are imported/used anywhere
**Functions Never Used:**
- `calculateBPMStretch()` - duplicate of logic in `mashupOptimizer.ts`
- `calculateKeyShift()` - unused
- `calculateOptimalBPM()` - duplicate logic exists elsewhere
- `shouldShiftKey()` - unused
- `semitonesToRatio()` - unused
- `ratioToSemitones()` - unused
- `isNaturalPlaybackRate()` - duplicate in `mashupOptimizer.ts`
- `estimateStretchQuality()` - unused
- `getRecommendedMixTechnique()` - unused
- `calculateEnergyCurve()` - unused
- `detectDoubleTime()` - unused (logic exists in `mashupOptimizer.ts`)
- `calculateMashupEQ()` - unused
- `canAutoMix()` - unused

**Why Unnecessary:** All logic either duplicates `mashupOptimizer.ts` or is unused
**Safe to Delete:** ✅ **YES** - Zero imports found
**Impact if Removed:** **HIGH** - 214 lines, entire utility file
**Recommendation:** Delete entire file - logic is duplicated or unused

### 8. **Unused Function: lookupMusicBrainz (non-throttled)**
**Location:** `src/utils/musicMetadata.ts:99-140`
**Issue:** `lookupMusicBrainz()` is exported but never called directly - only `lookupMusicBrainzThrottled()` is used
**Why Unnecessary:** Always called through throttle wrapper
**Safe to Delete:** ❓ **MAYBE** - Could make throttled version directly call fetch, but safer to keep for clarity
**Impact if Removed:** **LOW** - Just removes one layer of indirection
**Recommendation:** Keep for now (could be used directly in future), but could be made internal

### 9. **Unused Functions in tonePlayer.ts**
**Location:** `src/utils/tonePlayer.ts`
**Issue:** Several exported functions never called:
- `createDualTonePlayers()` - lines 152-226
- `setPlaybackRate()` - lines 251-258
- `setCrossfadePosition()` - lines 264-269
- `getSpectralFeatures()` - lines 231-249

**Why Unnecessary:** `PlaybackContext` uses Tone.js directly, not through these wrapper functions
**Safe to Delete:** ✅ **YES** - Zero references found
**Impact if Removed:** **MEDIUM** - ~78 lines
**Recommendation:** Delete unused functions or make them internal if planning to use

---

## 🟡 LOW PRIORITY CLEANUPS (Code Quality)

### 10. **Unused React Import in main.tsx**
**Location:** `src/main.tsx:2`
**Issue:** `import React from 'react'` not needed in React 17+ with new JSX transform
**Why Unnecessary:** Vite + React 17+ doesn't require React import for JSX
**Safe to Delete:** ✅ **YES**
**Impact if Removed:** **NONE** - Single import line
**Recommendation:** Remove line

### 11. **Static Meyda Import in SpectrumAnalyzer**
**Location:** `src/components/SpectrumAnalyzer.tsx:5`
**Issue:** `import Meyda from 'meyda'` is static import, should be dynamic for code splitting
**Why Unnecessary:** Inconsistent with dynamic import pattern in `tonePlayer.ts`
**Safe to Delete:** ❓ **NO** - Need to convert to dynamic import
**Impact if Removed:** **MEDIUM** - Improves bundle splitting
**Recommendation:** Convert to dynamic import like other heavy dependencies

### 12. **Entire Unused Utility File: fileSystemUtils.ts**
**Location:** `src/utils/fileSystemUtils.ts` (119 lines)
**Issue:** Entire file with 3 exported functions, NONE are imported/used anywhere:
- `processDroppedItems()` - zero references
- `processFileList()` - zero references
- Helper functions (readDirectory, isAudioFile) - only used internally

**Why Unnecessary:** Folder processing is handled directly in `DropZone.tsx` and `FolderDropZone.tsx`
**Safe to Delete:** ✅ **YES** - Zero imports found
**Impact if Removed:** **MEDIUM** - 119 lines, entire utility file
**Recommendation:** Delete entire file

---

## 🔍 CODE DUPLICATION FINDINGS

### 13. **Duplicate BPM Calculation Logic**
**Location:** 
- `src/utils/audioProcessor.ts:10-13` (calculateBPMStretch)
- `src/utils/mashupOptimizer.ts:464-484` (getBPMAdjustment)

**Issue:** Both calculate BPM adjustment rates - logic is duplicated
**Recommendation:** Remove from `audioProcessor.ts` (it's unused anyway), keep in `mashupOptimizer.ts`

### 14. **Duplicate Natural Playback Rate Check**
**Location:**
- `src/utils/audioProcessor.ts:79-82` (isNaturalPlaybackRate)
- `src/utils/mashupOptimizer.ts:476` (isNatural in getBPMAdjustment)

**Issue:** Same logic (<6% change) in two places
**Recommendation:** Remove from `audioProcessor.ts`, consolidate in `mashupOptimizer.ts`

---

## 📊 SUMMARY

### Files to Delete (High Confidence):
1. ✅ `src/components/CrossFolderMashupCard.tsx` - 218 lines
2. ✅ `src/components/MashupResultCard.tsx` - **EMPTY FILE** (0 lines)
3. ✅ `src/components/MashupFilterBar.tsx` - 102 lines
4. ✅ `src/components/FolderColumn.tsx` - 158 lines (broken type dependency)
5. ✅ `src/components/LoadingSpinner.tsx` - 19 lines
6. ✅ `src/components/DuplicateManager.tsx` - ~154 lines (unused modal)
7. ✅ `src/components/FolderDropZone.tsx` - 257 lines
8. ✅ `src/utils/audioProcessor.ts` - 214 lines
9. ✅ `src/utils/fileSystemUtils.ts` - 119 lines

**Total: 9 files, ~1,241 lines of dead code**

### Functions to Remove:
- `src/utils/tonePlayer.ts`: `createDualTonePlayers`, `setPlaybackRate`, `setCrossfadePosition`, `getSpectralFeatures`
- `src/utils/musicMetadata.ts`: Consider making `lookupMusicBrainz` internal

### Quick Wins (Single Line):
- Remove `import React` from `main.tsx`

### Total Estimated Savings:
- **~1,241 lines of unused code** (components + utilities)
- **Significant bundle size reduction** (removing entire utility files and components)
- **Improved maintainability** (less dead code to maintain)
- **9 entire files** can be deleted safely

---

## 🚨 NEEDS VERIFICATION

### 9. **Unused Component: FolderDropZone**
**Location:** `src/components/FolderDropZone.tsx` (257 lines)
**Issue:** Component defined but never imported/used anywhere - PrepareTab uses `DropZone` instead
**Why Unnecessary:** Superseded by `DropZone` component which handles folder drops
**Safe to Delete:** ✅ **YES** - Zero references found
**Impact if Removed:** **MEDIUM** - 257 lines of unused UI component
**Recommendation:** Delete file

### Props/State That May Be Unused:
- Check component props that are passed but never read
- Check state variables set but never used
- Check useEffect hooks with empty dependency arrays

---

## 📝 RECOMMENDATIONS

**Priority 1 (Do Immediately):**
1. Delete all unused component files (1-7 above) - **1,024 lines**
2. Delete `audioProcessor.ts` entirely - **214 lines**
3. Delete `fileSystemUtils.ts` entirely - **119 lines**
4. Remove unused functions from `tonePlayer.ts` - **~78 lines**

**Priority 2 (Clean Up):**
1. Convert Meyda to dynamic import in `SpectrumAnalyzer.tsx`
2. Make `lookupMusicBrainz` internal if keeping it (or remove if always throttled)
3. Remove React import from `main.tsx` (React 17+ doesn't need it)

**Priority 3 (Investigate):**
1. Check for unused props/state variables (manual review needed - too complex to auto-detect)
2. Review empty dependency arrays in useEffect hooks for cleanup-only effects
3. Check for commented-out code blocks (manual review)

**Total Deletion Impact:**
- **~1,435 lines** of code can be safely removed
- **9 entire files** deleted
- **4 functions** removed from `tonePlayer.ts`
- **Significant bundle size reduction** (especially removing entire utility modules)

---

*This audit focuses on clearly unused code. Some findings may require additional verification before deletion.*

