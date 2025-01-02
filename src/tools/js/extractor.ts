import * as parser from '@babel/parser';
import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { DoubleUnderscoreStrategy } from './strategies/DoubleUnderscoreStrategy';
import { ConstructorVisitor } from './visitors/ConstructorVisitor';
import { getTypeAnnotation } from '../typing2';


export function extractTypingInfo(code: string) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
  });

  const result: {
    interface: Record<string, { superClass: string | null; properties: Record<string, string> }>;
    clz: Record<string, { superClass: string | null; properties: Record<string, string> }>;
    typeAliases: Record<string, string>;
  } = {
    interface: {},
    clz: {},
    typeAliases: {},
  };

  traverse(ast, {
    // 处理接口
    TSInterfaceDeclaration(path: NodePath<t.TSInterfaceDeclaration>) {
      const interfaceName = path.node.id.name;
      let superClass;
      const properties: Record<string, string> = {};
      if (path.node.extends?.length === 1) {//"TSExpressionWithTypeArguments"
        const exp = path.node.extends?.[0]?.expression;//"TSQualifiedName"
        if (t.isTSQualifiedName(exp) && t.isIdentifier(exp.left) && t.isIdentifier(exp.right)) {
          superClass = `${exp.left.name}.${exp.right.name}`;

          path.traverse({
            TSPropertySignature(innerPath: NodePath<t.TSPropertySignature>) {
              const propertyName = (innerPath.node.key as t.Identifier).name;
              const propertyType = getTypeAnnotation(innerPath.node.typeAnnotation);
              properties[propertyName] = propertyType;
            },
          });

          result.interface[interfaceName] = {
            superClass,
            properties,
          };
        }
        return;
      }
      debugger


    },

    // 处理类
    ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
      const className = path.node.id?.name || 'AnonymousClass';
      const superClass = (path.node.superClass as t.Identifier)?.name || null;
      const properties: Record<string, string> = {};

      path.traverse({
        ClassProperty(innerPath: NodePath<t.ClassProperty>) {
          const propertyName = (innerPath.node.key as t.Identifier).name;
          if (t.isTSTypeAnnotation(innerPath.node.typeAnnotation)) {
            const propertyType = getTypeAnnotation(innerPath.node.typeAnnotation);
            properties[propertyName] = propertyType;
          } else {
            debugger
          }
        },
        ClassMethod(innerPath: NodePath<t.ClassMethod>) {
          if (innerPath.node.kind === 'get' || innerPath.node.kind === 'set') {
            const propertyName = (innerPath.node.key as t.Identifier).name;
            debugger
            const propertyType = "";
            properties[propertyName] = propertyType;
          }
        },
      });

      result.clz[className] = {
        superClass,
        properties,
      };
    },

    // 处理类型别名
    TSTypeAliasDeclaration(path: NodePath<t.TSTypeAliasDeclaration>) {
      const aliasName = path.node.id.name;
      const aliasType = getTypeAnnotation(path.node.typeAnnotation);
      result.typeAliases[aliasName] = aliasType;
    },
  });

  return result;
}


export function extractPropertiesAndEnums(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['classProperties'],
  });

  let moduleName = "";
  const enumClasses = [];

  // 提取双下划线属性
  const constructorVisitor = new ConstructorVisitor();
  traverse(ast, {
    ClassMethod(path) {
      constructorVisitor.visit(path);
    },
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
      }
    }
    , ClassDeclaration(path) {
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
  const doubleUnderscoreProperties = new DoubleUnderscoreStrategy().extract(constructorVisitor.getProperties());


  return {
    doubleUnderscoreProperties,
    enumClasses,
  };
}

export //#region 提取版本信息
  function extractVersionInfo(className: string, jsAst: any): Record<string, any> {
  let versionInfo: Record<string, any> = {};

  traverse(jsAst, {
    ExpressionStatement(path) {
      const expression = path.node.expression;
      if (
        t.isAssignmentExpression(expression) &&
        t.isMemberExpression(expression.left) &&
        t.isIdentifier(expression.left.object, { name: className }) &&
        t.isIdentifier(expression.left.property, { name: "versionInfo" }) &&
        t.isNewExpression(expression.right) &&
        t.isMemberExpression(expression.right.callee) &&
        t.isIdentifier(expression.right.callee.property, { name: "StructureVersionInfo" })
      ) {
        const args = expression.right.arguments;
        if (args.length > 0 && t.isObjectExpression(args[0])) {
          const propertiesObject = args[0].properties.find(
            (prop) => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: "properties" })
          );

          //@ts-ignore
          if (propertiesObject && t.isObjectExpression(propertiesObject.value)) {
            //@ts-ignore
            propertiesObject.value.properties.forEach((prop) => {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                const propName = prop.key.name;
                versionInfo[propName] = {};
                if (t.isObjectExpression(prop.value)) {
                  prop.value.properties.forEach((innerProp) => {
                    if (
                      t.isObjectProperty(innerProp) &&
                      t.isIdentifier(innerProp.key)
                    ) {
                      const innerPropName = innerProp.key.name;
                      if (t.isStringLiteral(innerProp.value)) {
                        versionInfo[propName][innerPropName] = innerProp.value.value;
                      } else if (t.isObjectExpression(innerProp.value)) {
                        const innerPropValue: Record<string, boolean> = {};
                        innerProp.value.properties.forEach(innerMostProp => {
                          if (t.isObjectProperty(innerMostProp) && t.isIdentifier(innerMostProp.key) && t.isBooleanLiteral(innerMostProp.value)) {
                            innerPropValue[innerMostProp.key.name] = innerMostProp.value.value
                          }
                        })
                        versionInfo[propName][innerPropName] = innerPropValue;
                      }
                    }
                  });
                }
              }
            });
          }
        }
      }
    },
  });

  console.log(`Extracted version info for ${className}: ${JSON.stringify(versionInfo, null, 2)}`);
  return versionInfo;
}
//#endregion