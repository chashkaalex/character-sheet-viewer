import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(__dirname, '../../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_SERVER_DIR = path.join(ROOT_DIR, 'dist', 'server');

function collectFilesRecursively(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Step 1.1b: Single-File GAS Server Bundle & Prefix Cleanup', () => {
  test('1. No source files in src/ use legacy artificial alphabetical load-order prefixes (00_ or _)', () => {
    const allSrcFiles = collectFilesRecursively(SRC_DIR);
    const prefixedFiles = allSrcFiles
      .map(f => path.relative(ROOT_DIR, f))
      .filter(relPath => {
        const base = path.basename(relPath);
        return base.startsWith('00_') || base.startsWith('_');
      });

    expect(prefixedFiles).toEqual([]);
  });

  test('2. Build outputs a single clasp-uploadable dist/server/code.gs bundle that executes cleanly in a GAS-like VM context', () => {
    execSync('node build/build.js', { cwd: ROOT_DIR, stdio: 'pipe' });

    expect(fs.existsSync(DIST_SERVER_DIR)).toBe(true);
    const serverFiles = collectFilesRecursively(DIST_SERVER_DIR);
    const gsFiles = serverFiles.filter(f => f.endsWith('.gs'));

    // Should be a single bundled .gs file
    expect(gsFiles.map(f => path.relative(DIST_SERVER_DIR, f))).toEqual(['code.gs']);

    const bundleCode = fs.readFileSync(gsFiles[0], 'utf8');

    // Execute inside an isolated V8 VM context simulating Google Apps Script global scope
    const gasContext: Record<string, any> = {
      console,
      Logger: { log: () => {} },
      DocumentApp: {},
      HtmlService: {},
      PropertiesService: {
        getScriptProperties: () => ({ getProperty: () => null }),
        getUserProperties: () => ({ getProperty: () => null, setProperty: () => {} })
      },
      Session: {
        getActiveUser: () => ({ getEmail: () => 'test@example.com' }),
        getEffectiveUser: () => ({ getEmail: () => 'test@example.com' })
      },
      SpreadsheetApp: {},
      DriveApp: {},
      Utilities: {},
      UrlFetchApp: {},
      CacheService: {
        getScriptCache: () => ({ get: () => null, put: () => {} })
      },
      ScriptApp: {
        getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/test/exec' })
      }
    };

    vm.createContext(gasContext);
    expect(() => {
      vm.runInContext(bundleCode, gasContext, { filename: 'code.gs' });
    }).not.toThrow();

    // Verify all required top-level GAS entry functions are exposed on global scope
    const requiredEntryPoints = [
      'doGet',
      'include',
      'GetAppVersion',
      'GetCharacterByDocId',
      'GetCharacterRepByDocId',
      'UpdateHp',
      'AddStatusToCharacter',
      'RemoveStatusFromCharacter',
      'RemoveAllStatusesFromCharacter',
      'OnRoundsElapsed',
      'OnPrepareSpell',
      'OnCastSpell',
      'OnReplenishClassSpellSlots',
      'OnUseAction',
      'OnMoveAction',
      'OnUseNumberAction',
      'PostRollToRolz',
      'MoveInventoryItem',
      'UsePotion',
      'SetPinnedSpecialAttack',
      'SetSkillFilterPreference',
      'SetSpellLayoutPreference'
    ];

    for (const fnName of requiredEntryPoints) {
      expect(typeof gasContext[fnName]).toBe('function');
    }

    // Verify GetAppVersion() works when invoked in the GAS VM
    const version = gasContext.GetAppVersion();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });
});
