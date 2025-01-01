import { traverse, types as t } from '@babel/core';
function extractMemberExpression(memberExpr: t.MemberExpression): string {
    let objectName: string;
    if (t.isIdentifier(memberExpr.object)) {
        objectName = memberExpr.object.name;
    } else if (t.isMemberExpression(memberExpr.object)) {
        // 递归处理嵌套的 MemberExpression
        objectName = extractMemberExpression(memberExpr.object);
    } else {
        objectName = 'unknown';
    }

    const propertyName = t.isIdentifier(memberExpr.property) ? memberExpr.property.name : 'unknown';
    return `${objectName}.${propertyName}`;
}
function extractNamespaceDetails(ast: t.Node) {
    const result: Record<string, any> = {};

    traverse(ast, {
        ExportNamedDeclaration(path) {
            if (t.isTSModuleDeclaration(path.node.declaration) && t.isIdentifier(path.node.declaration.id)) {
                const namespaceName = path.node.declaration.id.name;
                result[namespaceName] = { interfaces: {}, classes: {} };

                // Traverse the namespace body
                path.traverse({
                    TSInterfaceDeclaration(interfacePath) {
                        const interfaceName = interfacePath.node.id.name;
                        result[namespaceName].interfaces[interfaceName] = {
                            extends: interfacePath.node.extends?.map(ext => {
                                if (t.isTSExpressionWithTypeArguments(ext)) {
                                    if (t.isIdentifier(ext.expression)) {
                                        return ext.expression.name;
                                    }
                                    if (t.isTSQualifiedName(ext.expression)) {
                                        if (t.isIdentifier(ext.expression.left) && t.isIdentifier(ext.expression.right)) {
                                            return ext.expression.left.name + "." + ext.expression.right.name;
                                        }
                                    }
                                }
                                throw new Error(`Unknown type in extends of interface ${interfaceName}`);
                            }) || [],
                            properties: interfacePath.node.body.body
                                .filter(member => t.isTSPropertySignature(member))
                                .map(member => ({
                                    name: t.isIdentifier(member.key) ? member.key.name : (() => {
                                        throw new Error(`Unknown key type in interface ${interfaceName}`);
                                    })(),
                                    type: getTypeAnnotation(member.typeAnnotation)
                                }))
                        };
                    },
                    ClassDeclaration(path) {
                        const className = path.node.id.name;
                        const extendClassList = [];
                        let params = '';
                        if (t.isTSTypeParameterInstantiation(path.node.superTypeParameters)) {
                            const tp = path.node.superTypeParameters;
                            params = tp.params.map(p => {
                                if (t.isTSTypeReference(p) && t.isIdentifier(p.typeName)) {
                                    return p.typeName.name
                                }
                            }).join(',')
                        }
                        if (t.isIdentifier(path.node.superClass)) {
                            extendClassList.push(path.node.superClass.name);
                        } else if (t.isMemberExpression(path.node.superClass)) {
                            const sc = path.node.superClass as t.MemberExpression;
                            if (t.isMemberExpression(sc.object)) {
                                const scObject = sc.object as t.MemberExpression;
                                extendClassList.push(extractMemberExpression((scObject)));
                            } else if (t.isIdentifier(sc.object) && t.isIdentifier(sc.property)) {
                                let superClass = `${(sc.object as t.Identifier).name}.${(sc.property as t.Identifier).name}`;
                                if (params) {
                                    superClass = `${superClass}<${params}>`;
                                }
                                extendClassList.push(superClass);
                            }
                        } else if (t.isTSQualifiedName(path.node.superClass)) {
                            let superClass;
                            const sc = path.node.superClass;
                            if (t.isIdentifier(sc)) {
                                superClass = (sc as t.Identifier).name;
                            } else if (t.isTSQualifiedName(sc) && t.isIdentifier((sc as t.TSQualifiedName).left)) {
                                const qualification = sc as t.TSQualifiedName;

                                superClass = `${(qualification.left as t.Identifier).name}.${qualification.right.name}`;
                            }
                            if (!superClass) {
                                throw new Error(`Unknown superClass type in class ${className}`);
                            }
                            extendClassList.push(superClass);
                        }
                        result[namespaceName].classes[className] = {
                            extends: extendClassList,
                            implements: path.node.implements
                                ?.filter(impl => t.isTSExpressionWithTypeArguments(impl))
                                .map(impl => {
                                    if (t.isIdentifier(impl.expression)) {
                                        return impl.expression.name;
                                    }
                                    throw new Error(`Unknown implements type in class ${className}`);
                                }) || [],
                            properties: path.node.body.body
                                .filter(member => t.isClassProperty(member) || t.isMethod(member))
                                .map(member => ({
                                    name: t.isIdentifier(member.key) ? member.key.name : (() => {
                                        throw new Error(`Unknown key type in class ${className}`);
                                    })(),
                                    type: getTypeAnnotation(
                                        //@ts-ignore
                                        t.isClassProperty(member) ? member.typeAnnotation :
                                            t.isMethod(member) ? member.returnType : null
                                    )
                                }))
                        };
                    }
                });
            }
        }
    });

    return result;
}

function getTypeAnnotation(typeAnnotation: t.TSTypeAnnotation | t.TSType | null): string {
    if (!typeAnnotation) throw new Error('Missing type annotation');
    if (t.isTSTypeAnnotation(typeAnnotation)) {
        return getTypeAnnotation(typeAnnotation.typeAnnotation);
    }
    if (t.isTSTypeReference(typeAnnotation)) {
        if (t.isIdentifier(typeAnnotation.typeName)) {
            return typeAnnotation.typeName.name;
        }
        if (t.isTSQualifiedName(typeAnnotation.typeName)) {
            let typeParams = [];
            if (t.isTSTypeParameterInstantiation(typeAnnotation.typeParameters)) {
                typeAnnotation.typeParameters.params.forEach(c => {
                    if (t.isTSTypeReference(c)) {
                        if (t.isIdentifier(c.typeName)) {
                            typeParams.push(c.typeName.name);
                        }
                    }
                })
            }
            if (t.isIdentifier(typeAnnotation.typeName.left) && t.isIdentifier(typeAnnotation.typeName.right)) {
                return `${typeAnnotation.typeName.left.name}.${typeAnnotation.typeName.right.name}${typeParams.length > 0 ? `<${typeParams.join(',')}>` : ''}`;
            }
        }
    }
    throw new Error('Unknown type annotation');// internal.IList<ICodeActionParameter>
}

export default extractNamespaceDetails;