const fs = require('node:fs');
const path = require('node:path');
const ts = require('../frontend/node_modules/typescript');
const { root, entries } = require('./scope.cjs');
const cache = new Map();
function ranges(file) {
  if (cache.has(file)) return cache.get(file);
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const list = [];
  function visit(node) {
    if (ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isGetAccessorDeclaration(node)) {
      list.push({
        name: ts.isConstructorDeclaration(node) ? 'constructor' : node.name?.getText(source),
        start: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        end: source.getLineAndCharacterOfPosition(node.end).line + 1,
      });
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  cache.set(file, list);
  return list;
}
function classify(file, line) {
  const entry = entries[file];
  if (!entry) return { features: [], relation: /\.(test.js|spec.ts)$/.test(file) ? 'test' : 'outside', method: null };
  const sourceText = fs.readFileSync(path.join(root, file), 'utf8');
  function assigned(features, method = null) {
    return { features, relation: !features.length ? 'outside' : features.length > 1 ? 'shared' : 'direct', method };
  }
  for (const override of entry.lineOverrides || []) {
    if (line && sourceText.split(/\r?\n/)[line - 1]?.includes(override.text)) return assigned(override.features, 'declaración');
  }
  for (const block of entry.blocks || []) {
    const start = sourceText.indexOf(block.start);
    const end = sourceText.indexOf(block.end, start + block.start.length);
    if (start < 0 || end < 0) throw new Error(`Scope marker changed: ${file}: ${block.start}`);
    const startLine = sourceText.slice(0, start).split('\n').length;
    const endLine = sourceText.slice(0, end + block.end.length).split('\n').length;
    if (line && line >= startLine && line <= endLine) return assigned(block.features, 'bloque delimitado');
  }
  const range = /\.[jt]s$/.test(file) && line ? ranges(file).find(r => line >= r.start && line <= r.end) : null;
  const method = range?.name || null;
  const features = method && Object.hasOwn(entry.methods, method) ? entry.methods[method] : method && entry.onlyMethods ? [] : entry.defaults;
  return assigned(features, method);
}
module.exports = { classify, ranges };
