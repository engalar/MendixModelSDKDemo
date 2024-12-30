// src/tools/js/extractor.ts
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { DoubleUnderscoreStrategy } from './strategies/DoubleUnderscoreStrategy';
import { ConstructorVisitor } from './visitors/ConstructorVisitor';

export function extractDoubleUnderscoreProperties(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['classProperties'],
  });

  const visitor = new ConstructorVisitor();
  traverse(ast, {
    ClassMethod(path) {
      visitor.visit(path);
    },
  });

  const strategy = new DoubleUnderscoreStrategy();
  return strategy.extract(visitor.getProperties());
}