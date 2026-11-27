import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

describe('GAS Entry Points Synchronization', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const buildJsPath = path.join(rootDir, 'build/build.js');
  const gasServerPath = path.join(rootDir, 'src/server/services/gas_server.ts');
  const clientTsDir = path.join(rootDir, 'src/client/ts');

  function getGasEntryFunctionsFromBuildJs(): string[] {
    const content = fs.readFileSync(buildJsPath, 'utf-8');
    const match = content.match(/const GAS_ENTRY_FUNCTIONS\s*=\s*\[([\s\S]*?)\];/);
    if (!match) {
      throw new Error('Could not find GAS_ENTRY_FUNCTIONS in build/build.js');
    }
    return Array.from(match[1].matchAll(/'([^']+)'/g)).map(m => m[1]);
  }

  function getExportedFunctionsFromGasServer(): string[] {
    const content = fs.readFileSync(gasServerPath, 'utf-8');
    const exported = new Set<string>();

    for (const m of content.matchAll(/export\s+function\s+(\w+)/g)) {
      exported.add(m[1]);
    }
    for (const m of content.matchAll(/export\s*\{([\s\S]*?)\}/g)) {
      for (const item of m[1].split(',')) {
        const name = item.trim();
        if (name) exported.add(name);
      }
    }
    return Array.from(exported);
  }

  function getClientTsFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getClientTsFiles(fullPath));
      } else if (entry.name.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  function isGoogleScriptRunBase(node: ts.Expression): boolean {
    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === 'run' &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'script'
    ) {
      const root = node.expression.expression;
      // Matches `google.script.run` or `(window as any).google.script.run`
      if (ts.isIdentifier(root) && root.text === 'google') {
        return true;
      }
      if (ts.isPropertyAccessExpression(root) && root.name.text === 'google') {
        return true;
      }
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const helperName = node.expression.name.text;
      if (
        helperName === 'withSuccessHandler' ||
        helperName === 'withFailureHandler' ||
        helperName === 'withUserObject'
      ) {
        return isGoogleScriptRunBase(node.expression.expression);
      }
    }
    return false;
  }

  function getGoogleScriptRunCalls(): string[] {
    const calls = new Set<string>();
    const files = getClientTsFiles(clientTsDir);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          const methodName = node.expression.name.text;
          if (
            methodName !== 'withSuccessHandler' &&
            methodName !== 'withFailureHandler' &&
            methodName !== 'withUserObject' &&
            isGoogleScriptRunBase(node.expression.expression)
          ) {
            calls.add(methodName);
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }

    return Array.from(calls);
  }

  test('every function exported in gas_server.ts is registered in GAS_ENTRY_FUNCTIONS in build/build.js', () => {
    const gasEntries = new Set(getGasEntryFunctionsFromBuildJs());
    const exported = getExportedFunctionsFromGasServer();
    const missing = exported.filter(fn => !gasEntries.has(fn));
    expect(missing).toEqual([]);
  });

  test('every google.script.run method called by client TS is in GAS_ENTRY_FUNCTIONS (including OnLongRest)', () => {
    const gasEntries = new Set(getGasEntryFunctionsFromBuildJs());
    const clientCalls = getGoogleScriptRunCalls();
    expect(clientCalls).toContain('OnLongRest');
    const missing = clientCalls.filter(fn => !gasEntries.has(fn));
    expect(missing).toEqual([]);
  });
});
