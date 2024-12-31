import { parse } from '@babel/parser';
import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';


const code = `
class ValidationRule extends internal.Element<IModel> {
        get containerAsEntity(): Entity;
        get attribute(): IAttribute;
        set attribute(newValue: IAttribute);
        get attributeQualifiedName(): string;
        get errorMessage(): texts.Text;
        get ruleInfo(): RuleInfo;
}
class UniqueRuleInfo extends RuleInfo {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsValidationRule(): ValidationRule;
        constructor(model: internal.AbstractModel, structureTypeName: string, id: string, isPartial: boolean, unit: internal.ModelUnit, container: internal.AbstractElement);
        static createIn(container: ValidationRule): UniqueRuleInfo;
        static create(model: IModel): UniqueRuleInfo;
    }        
interface IStringAttributeType extends IAttributeType {
        readonly model: IModel;
        readonly containerAsAttribute: IAttribute;
        readonly containerAsEntityKeyPart: IEntityKeyPart;
        readonly containerAsODataKeyPart: rest.IODataKeyPart;
        asLoaded(): StringAttributeType;
        load(callback: (element: StringAttributeType) => void, forceRefresh?: boolean): void;
        load(forceRefresh?: boolean): Promise<StringAttributeType>;
    }
    class StringAttributeType extends AttributeType implements IStringAttributeType {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsMessageAttribute(): businessevents.MessageAttribute;
        get containerAsPublishedMessageAttribute(): businessevents.PublishedMessageAttribute;
        get containerAsAttribute(): Attribute;
        get containerAsEntityKeyPart(): EntityKeyPart;
        get containerAsTensorMappingElement(): mlmappings.TensorMappingElement;
        get containerAsODataKeyPart(): rest.ODataKeyPart;
        get length(): number;
        set length(newValue: number);
        constructor(model: internal.AbstractModel, structureTypeName: string, id: string, isPartial: boolean, unit: internal.ModelUnit, container: internal.AbstractElement);
        static createIn(container: Attribute): StringAttributeType;
        static createInMessageAttributeUnderAttributeType(container: businessevents.MessageAttribute): StringAttributeType;
        static createInPublishedMessageAttributeUnderAttributeType(container: businessevents.PublishedMessageAttribute): StringAttributeType;
        static createInAttributeUnderType(container: Attribute): StringAttributeType;
        static createInEntityKeyPartUnderType(container: EntityKeyPart): StringAttributeType;
        static createInTensorMappingElementUnderAttributeType(container: mlmappings.TensorMappingElement): StringAttributeType;
        static createInODataKeyPartUnderType(container: rest.ODataKeyPart): StringAttributeType;
        static create(model: IModel): StringAttributeType;
    }
`;

describe('base test extract typing', () => {
    it('should extract class name and its inheritance', () => {
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['typescript'],
        });

        const classInfo: Array<{ className: string; superClass: string }> = [];

        traverse(ast, {
            ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
                const className = path.node.id?.name || 'unknown';
                let superClass = 'unknown';
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
                    superClass = path.node.superClass.name;
                } else if (t.isMemberExpression(path.node.superClass)) {
                    const sc = path.node.superClass as t.MemberExpression;
                    if (t.isMemberExpression(sc.object)) {
                        const scObject = sc.object as t.MemberExpression;
                        superClass = extractMemberExpression((scObject));
                    } else if (t.isIdentifier(sc.object) && t.isIdentifier(sc.property)) {
                        superClass = `${(sc.object as t.Identifier).name}.${(sc.property as t.Identifier).name}`;
                        if (params) {
                            superClass = `${superClass}<${params}>`;
                        }
                    }
                } else if (t.isTSQualifiedName(path.node.superClass)) {
                    const sc = path.node.superClass;
                    if (t.isIdentifier(sc)) {
                        superClass = (sc as t.Identifier).name;
                    } else if (t.isTSQualifiedName(sc) && t.isIdentifier((sc as t.TSQualifiedName).left)) {
                        const qualification = sc as t.TSQualifiedName;

                        superClass = `${(qualification.left as t.Identifier).name}.${qualification.right.name}`;
                    } else if (t.isTSTypeParameterInstantiation(sc)) {
                        // Handle generic types if needed
                        superClass = 'unknown';
                    }
                } else if (t.isTSTypeParameterInstantiation(path.node.superClass)) {
                    // Handle generic types if needed
                    superClass = 'unknown';
                }
                if (superClass === 'unknown') {
                    throw new Error('Invalid superClass type');
                }

                classInfo.push({ className, superClass });
            }
        });

        expect(classInfo).toEqual([
            { className: 'ValidationRule', superClass: 'internal.Element<IModel>' },
            { className: 'UniqueRuleInfo', superClass: 'RuleInfo' },
            { className: 'StringAttributeType', superClass: 'AttributeType' },
        ]);

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
    });
    it('extract get properties', () => {
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['typescript'],
        });
        const getters: { name: string; type: string }[] = [];

        traverse(ast, {
            TSDeclareMethod(path) {
                if (path.node.kind === 'get') {
                    const methodName = (path.node.key as t.Identifier).name;
                    const returnType = (path.node.returnType as t.TSTypeAnnotation).typeAnnotation;
                    const typeString = generateTypeString(returnType);
                    getters.push({ name: methodName, type: typeString });
                }
            }
        });

        expect(getters).toEqual([
            { name: 'containerAsEntity', type: 'Entity' },
            { name: 'attribute', type: 'IAttribute' },
            { name: 'attributeQualifiedName', type: 'string' },
            { name: 'errorMessage', type: 'texts.Text' },
            { name: 'ruleInfo', type: 'RuleInfo' },
            { name: 'containerAsValidationRule', type: 'ValidationRule' },
            { name: 'containerAsMessageAttribute', type: 'businessevents.MessageAttribute' },
            { name: 'containerAsPublishedMessageAttribute', type: 'businessevents.PublishedMessageAttribute' },
            { name: 'containerAsAttribute', type: 'Attribute' },
            { name: 'containerAsEntityKeyPart', type: 'EntityKeyPart' },
            { name: 'containerAsTensorMappingElement', type: 'mlmappings.TensorMappingElement' },
            { name: 'containerAsODataKeyPart', type: 'rest.ODataKeyPart' },
            { name: 'length', type: 'number' },
        ])
    });
    it('extract getters group by class or interface', () => {
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['typescript'],
        });

        const gettersByClassOrInterface: { [key: string]: { name: string; type: string }[] } = {};

        traverse(ast, {
            ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
                const className = path.node.id?.name || 'unknown';
                gettersByClassOrInterface[className] = [];

                path.traverse({
                    ClassMethod(classMethodPath: NodePath<t.ClassMethod>) {
                        if (classMethodPath.node.kind === 'get') {
                            const methodName = (classMethodPath.node.key as t.Identifier).name;
                            const returnType = classMethodPath.node.returnType as t.TSTypeAnnotation | null;
                            if (returnType) {
                                const typeString = generateTypeString(returnType.typeAnnotation);
                                gettersByClassOrInterface[className].push({ name: methodName, type: typeString });
                            }
                        }
                    }
                });
            },
            TSInterfaceDeclaration(path: NodePath<t.TSInterfaceDeclaration>) {
                const interfaceName = path.node.id.name;
                gettersByClassOrInterface[interfaceName] = [];

                path.traverse({
                    TSDeclareMethod(declareMethodPath: NodePath<t.TSDeclareMethod>) {
                        if (declareMethodPath.node.kind === 'get') {
                            const methodName = (declareMethodPath.node.key as t.Identifier).name;
                            const returnType = declareMethodPath.node.returnType as t.TSTypeAnnotation | null;
                            if (returnType) {
                                const typeString = generateTypeString(returnType.typeAnnotation);
                                gettersByClassOrInterface[interfaceName].push({ name: methodName, type: typeString });
                            }
                        }
                    }
                });
            }
        });

        expect(gettersByClassOrInterface).toEqual({
            ValidationRule: [
                { name: 'containerAsEntity', type: 'Entity' },
                { name: 'attribute', type: 'IAttribute' },
                { name: 'attributeQualifiedName', type: 'string' },
                { name: 'errorMessage', type: 'texts.Text' },
                { name: 'ruleInfo', type: 'RuleInfo' },
            ],
            UniqueRuleInfo: [
                { name: 'containerAsValidationRule', type: 'ValidationRule' },
            ],
            IStringAttributeType: [
                { name: 'model', type: 'IModel' },
                { name: 'containerAsAttribute', type: 'IAttribute' },
                { name: 'containerAsEntityKeyPart', type: 'IEntityKeyPart' },
                { name: 'containerAsODataKeyPart', type: 'rest.IODataKeyPart' },
            ],
            StringAttributeType: [
                { name: 'containerAsMessageAttribute', type: 'businessevents.MessageAttribute' },
                { name: 'containerAsPublishedMessageAttribute', type: 'businessevents.PublishedMessageAttribute' },
                { name: 'containerAsAttribute', type: 'Attribute' },
                { name: 'containerAsEntityKeyPart', type: 'EntityKeyPart' },
                { name: 'containerAsTensorMappingElement', type: 'mlmappings.TensorMappingElement' },
                { name: 'containerAsODataKeyPart', type: 'rest.ODataKeyPart' },
                { name: 'length', type: 'number' },
            ],
        });
    });
});


function generateTypeString(typeAnnotation: t.TSType): string {
    if (t.isTSTypeReference(typeAnnotation)) {
        return generateTypeName(typeAnnotation.typeName);
    } else if (t.isTSStringKeyword(typeAnnotation)) {
        return 'string';
    } else if (t.isTSNumberKeyword(typeAnnotation)) {
        return 'number';
    } else if (t.isTSBooleanKeyword(typeAnnotation)) {
        return 'boolean';
    } else if (t.isTSAnyKeyword(typeAnnotation)) {
        return 'any';
    } else if (t.isTSUnionType(typeAnnotation)) {
        return typeAnnotation.types.map(generateTypeString).join(' | ');
    } else if (t.isTSArrayType(typeAnnotation)) {
        return `${generateTypeString(typeAnnotation.elementType)}[]`;
    } else {
        return 'unknown';
    }
}

function generateTypeName(typeName: t.TSEntityName): string {
    if (t.isIdentifier(typeName)) {
        return typeName.name;
    } else if (t.isTSQualifiedName(typeName)) {
        return `${generateTypeName(typeName.left)}.${typeName.right.name}`;
    } else {
        return 'unknown';
    }
}