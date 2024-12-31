import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { DoubleUnderscoreStrategy } from './strategies/DoubleUnderscoreStrategy';
import { EnumStrategy } from './strategies/EnumStrategy';
import { ConstructorVisitor } from './visitors/ConstructorVisitor';
import { EnumVisitor } from './visitors/EnumVisitor';

export function extractPropertiesAndEnums(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['classProperties'],
  });

  // 提取双下划线属性
  const constructorVisitor = new ConstructorVisitor();
  traverse(ast, {
    ClassMethod(path) {
      constructorVisitor.visit(path);
    },
  });
  const doubleUnderscoreProperties = new DoubleUnderscoreStrategy().extract(constructorVisitor.getProperties());

  // 提取枚举类
  let moduleName = '';
  const enumClasses = [];

  // 查找最外层的 IIFE 并提取模块名称
  traverse(ast, {
    ExpressionStatement(path) {
      const { expression } = path.node;
      if (
        expression.type === 'CallExpression' &&
        expression.callee.type === 'FunctionExpression'
      ) {
        const iifeArguments = expression.arguments;
        const firstArgument = iifeArguments[0];
        if (firstArgument.type === "AssignmentExpression" && firstArgument.left.type === 'Identifier') {
          moduleName = firstArgument.left.name;
        } else if (firstArgument.type === 'Identifier') {
          moduleName = firstArgument.name;
        }
        path.stop();
      }
    },
  });

  // 提取类信息
  traverse(ast, {
    ClassDeclaration(path) {
      if (path.node.id.type === 'Identifier') {
        const className = path.node.id.name;
        const parentClass = path.node.superClass;

        let parentClassName;

        if (parentClass) {
          if (parentClass.type === 'Identifier') {
            parentClassName = parentClass.name;
          } else if (parentClass.type === 'MemberExpression' && parentClass.property.type === 'Identifier' && parentClass.object.type === 'Identifier') {
            // 处理 MemberExpression，例如 internal.AbstractEnum
            const objectName = parentClass.object.name; // internal
            const propertyName = parentClass.property.name; // AbstractEnum
            parentClassName = `${objectName}.${propertyName}`;
          }
        }

        // 提取枚举值
        const entries: string[] = [];
        path.parentPath.traverse({
          AssignmentExpression(innerPath) {
            if (
              innerPath.node.left.type === 'MemberExpression' &&
              innerPath.node.left.object.type === 'Identifier' &&
              innerPath.node.left.object.name === className &&
              innerPath.node.left.property.type === 'Identifier'
            ) {
              entries.push(innerPath.node.left.property.name);
            }
          },
        });

        // 拼接完整类名
        const fullClassName = moduleName ? `${moduleName}.${className}` : className;

        enumClasses.push({
          className: fullClassName,
          parentClass: parentClassName,
          entries,
          module: moduleName,
        });
      }
    },
  });

  return {
    doubleUnderscoreProperties,
    enumClasses,
  };
}