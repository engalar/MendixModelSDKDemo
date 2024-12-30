#!/bin/bash

# 定义项目根目录和源代码目录
PROJECT_ROOT="."
SRC_DIR="$PROJECT_ROOT/src/tools/js"

# 创建目录结构
mkdir -p "$SRC_DIR/strategies"
mkdir -p "$SRC_DIR/visitors"
mkdir -p "$PROJECT_ROOT/test"

# 创建策略模式文件（如果不存在）
if [ ! -f "$SRC_DIR/strategies/DoubleUnderscoreStrategy.js" ]; then
  cat <<EOL > "$SRC_DIR/strategies/DoubleUnderscoreStrategy.js"
class DoubleUnderscoreStrategy {
  extract(properties) {
    return properties.filter(prop => prop.startsWith('__'));
  }
}

module.exports = DoubleUnderscoreStrategy;
EOL
fi

# 创建访问者模式文件（如果不存在）
if [ ! -f "$SRC_DIR/visitors/ConstructorVisitor.js" ]; then
  cat <<EOL > "$SRC_DIR/visitors/ConstructorVisitor.js"
const t = require('@babel/types');

class ConstructorVisitor {
  constructor() {
    this.properties = [];
  }

  visit(node) {
    if (t.isClassMethod(node) && node.kind === 'constructor') {
      this.traverseConstructor(node);
    }
  }

  traverseConstructor(node) {
    node.body.body.forEach(statement => {
      if (t.isExpressionStatement(statement) && t.isAssignmentExpression(statement.expression)) {
        const { left } = statement.expression;
        if (t.isMemberExpression(left) && t.isThisExpression(left.object)) {
          this.properties.push(left.property.name);
        }
      }
    });
  }

  getProperties() {
    return this.properties;
  }
}

module.exports = ConstructorVisitor;
EOL
fi

# 创建主逻辑文件（如果不存在）
if [ ! -f "$SRC_DIR/extractor.js" ]; then
  cat <<EOL > "$SRC_DIR/extractor.js"
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const DoubleUnderscoreStrategy = require('./strategies/DoubleUnderscoreStrategy');
const ConstructorVisitor = require('./visitors/ConstructorVisitor');

function extractDoubleUnderscoreProperties(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['classProperties'],
  });

  const visitor = new ConstructorVisitor();
  traverse(ast, {
    ClassMethod(path) {
      visitor.visit(path.node);
    },
  });

  const strategy = new DoubleUnderscoreStrategy();
  return strategy.extract(visitor.getProperties());
}

module.exports = { extractDoubleUnderscoreProperties };
EOL
fi

# 创建测试文件（如果不存在）
if [ ! -f "$PROJECT_ROOT/test/extractor.test.js" ]; then
  cat <<EOL > "$PROJECT_ROOT/test/extractor.test.js"
const { extractDoubleUnderscoreProperties } = require('../src/tools/js/extractor');

describe('extractDoubleUnderscoreProperties', () => {
  it('should extract properties starting with double underscore from class constructor', () => {
    const code = \`
      class MyClass {
        constructor() {
          this.__privateProp = 42;
          this.publicProp = 24;
          this.__anotherPrivateProp = 'secret';
        }
      }
    \`;

    const result = extractDoubleUnderscoreProperties(code);
    expect(result).toEqual(['__privateProp', '__anotherPrivateProp']);
  });

  it('should handle classes without any double underscore properties', () => {
    const code = \`
      class MyClass {
        constructor() {
          this.publicProp = 24;
        }
      }
    \`;

    const result = extractDoubleUnderscoreProperties(code);
    expect(result).toEqual([]);
  });

  it('should handle empty classes', () => {
    const code = \`
      class MyClass {
      }
    \`;

    const result = extractDoubleUnderscoreProperties(code);
    expect(result).toEqual([]);
  });
});
EOL
fi

echo "TDD 文件结构创建完成！"