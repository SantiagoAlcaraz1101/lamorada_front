// Comprobación independiente asistida. No se etiqueta este script como medición manual.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('../frontend/node_modules/typescript');
const { root, sourceFiles } = require('./scope.cjs');
const evidence = path.join(root, 'quality/evidence/rubrica-2026-09-14');
const revisions = JSON.parse(fs.readFileSync(path.join(evidence, 'before/revisions.json')));
function inspect(file, code) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const imports = new Set(); const functions = [];
  function walk(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) imports.add(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'require' && ts.isStringLiteral(node.arguments[0])) imports.add(node.arguments[0].text);
    if ((ts.isFunctionLike(node) || ts.isGetAccessorDeclaration(node)) && node.body) {
      const decisions = [];
      function count(child) {
        if (child !== node && ts.isFunctionLike(child)) return;
        let decision;
        if (ts.isIfStatement(child)) decision = 'if';
        else if (ts.isForStatement(child) || ts.isForOfStatement(child) || ts.isForInStatement(child) || ts.isWhileStatement(child) || ts.isDoStatement(child)) decision = 'loop';
        else if (ts.isConditionalExpression(child)) decision = '?:';
        else if (ts.isCaseClause(child)) decision = 'case';
        else if (ts.isBinaryExpression(child) && child.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) decision = '&&';
        else if (ts.isBinaryExpression(child) && child.operatorToken.kind === ts.SyntaxKind.BarBarToken) decision = '||';
        else if (ts.isBinaryExpression(child) && child.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) decision = '??';
        if (decision) decisions.push({ line: source.getLineAndCharacterOfPosition(child.getStart(source)).line + 1, decision });
        ts.forEachChild(child, count);
      }
      count(node);
      functions.push({ name: node.name?.getText(source) || (ts.isConstructorDeclaration(node) ? 'constructor' : '<callback>'), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, end: source.getLineAndCharacterOfPosition(node.end).line + 1, v: 1 + decisions.length, decisions });
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  const topLevelDecisions = [];
  function topLevel(node) {
    if (ts.isFunctionLike(node)) return;
    if (ts.isConditionalExpression(node)) topLevelDecisions.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, decision: '?:' });
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
      topLevelDecisions.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, decision: node.operatorToken.getText(source) });
    }
    ts.forEachChild(node, topLevel);
  }
  topLevel(source);
  // Inventario léxico local: líneas con tokens no triviales; conserva delimitadores.
  const codeLines = new Set();
  function tokenLines(node) {
    const children = node.getChildren(source);
    if (children.length) { for (const child of children) tokenLines(child); return; }
    if (node.kind === ts.SyntaxKind.EndOfFileToken || node.kind === ts.SyntaxKind.SyntaxList || node.kind >= ts.SyntaxKind.FirstJSDocNode) return;
    const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const end = source.getLineAndCharacterOfPosition(Math.max(node.getStart(source), node.end - 1)).line + 1;
    for (let line = start; line <= end; line++) codeLines.add(line);
  }
  tokenLines(source);
  return { file, moduleDependencies: [...imports], ce: imports.size, tokenLines: [...codeLines].sort((a,b) => a-b), nclocLocal: codeLines.size, complexityLocal: functions.reduce((sum, f) => sum + f.v, topLevelDecisions.length), topLevelDecisions, functions };
}
const result = { generatedAt: new Date().toISOString(), method: 'Recuento AST asistido; no sustituye hoja de cálculo razonada por inspección. V=1+if+bucles+case+ternarios+&&+||+??; callbacks separados; no cuenta catch ni optional chaining. Ce cuenta módulos importados, no CBO de clases.', before: [], after: [] };
for (const file of sourceFiles.filter(f => /\.[jt]s$/.test(f))) {
  const [pkg, ...parts] = file.split('/');
  const old = execFileSync('git', ['-C', path.join(root, pkg), 'show', revisions[pkg] + ':' + parts.join('/')], { encoding: 'utf8' });
  result.before.push(inspect(file, old)); result.after.push(inspect(file, fs.readFileSync(path.join(root, file), 'utf8')));
}
fs.writeFileSync(path.join(evidence, 'inventario-independiente.json'), JSON.stringify(result, null, 2) + '\n');
for (const stage of ['before','after']) {
  console.log(stage, result[stage].filter(r => /post-service|cart.component.ts|product.component.ts|user-service/.test(r.file)).map(r => ({file:r.file,ncloc:r.nclocLocal,v:r.complexityLocal,ce:r.ce})));
}
