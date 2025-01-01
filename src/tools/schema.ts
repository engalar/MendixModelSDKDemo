import * as t from "@babel/types";
import * as fs from "fs";
import * as path from "path";
import { parse, ParseResult } from "@babel/parser";
import generator from "@babel/generator";
import traverse, { NodePath } from "@babel/traverse";
import { ClassDeclaration } from "@babel/types";

export interface InheritanceInfo {
    module: string | null;
    superClass: string;
}
interface ClassDefinition {
    type: "object";
    properties: {
        $ID: {
            $ref: string;
        };
        $Type: {
            type: "string";
            const: string;
            description?: string;
        };
        [key: string]: any;
    };
    required: string[];
    allOf?: Array<{
        $merge?: {
            source: {
                $ref: string;
            };
            with: {
                $Type: {
                    type: "string";
                    const: string;
                };
            };
        };
        $ref?: string;
    }>;
}

export interface PropertyInfo {
    name: string;
    internalName: string;
    propertyType: string;
    type: string;
    reference: boolean;
    isList: boolean;
    defaultValue?: any;
    primitiveTypeEnum?: string;
    enum?: boolean;
    enumValues?: string[];
}

export interface ClassInfo {
    properties: PropertyInfo[];
    required: string[];
    versionInfo: Record<string, any>;
    structureTypeName: string;
    enumValues?: string[]; // Added to fix the enumValues error
}

export interface Schema {
    $schema: string;
    definitions: Record<string, any>;
}
const allInterfaces = new Set<string>();
const allInheritanceInfo: Record<string, InheritanceInfo> = {};
const classInfoCache: Record<string, ClassInfo> = {};

// 查找目标类型的所有子类
export function findSubClasses(className: string, dtsAst: any): string[] {
    const subClasses: string[] = [];

    traverse(dtsAst, {
        ClassDeclaration(path) {
            if (
                path.node.superClass &&
                t.isIdentifier(path.node.superClass) &&
                path.node.superClass.name === className
            ) {
                subClasses.push(path.node.id.name);
            }
        },
    });

    return subClasses;
}

export async function extractInterfaces(dtsCode: string): Promise<Set<string>> {
    const dtsAst = parse(dtsCode, {
        sourceType: "module",
        plugins: ["typescript"],
    });

    const interfaceSet = new Set<string>();

    traverse(dtsAst, {
        TSInterfaceDeclaration(path) {
            interfaceSet.add(path.node.id.name);
        },
    });

    console.log(`Extracted interfaces: ${Array.from(interfaceSet).join(", ")}`);
    return interfaceSet;
}

export function parseCode(jsCode: string) {
    return parse(jsCode, {
        sourceType: "module",
        plugins: ["typescript"],
    });
}

export function extractInheritanceInfoFromClass(path: NodePath<ClassDeclaration>, inheritanceInfo: Record<string, InheritanceInfo>) {
    const className = path.node.id.name;
    const superClass = path.node.superClass;

    if (t.isMemberExpression(superClass) && t.isIdentifier(superClass.object) && t.isIdentifier(superClass.property)) {
        // case: class BusinessEventService extends projects.Document {}
        const moduleName = superClass.object.name;
        inheritanceInfo[className] = { module: moduleName === "internal" ? null : superClass.object.name, superClass: moduleName === "internal" ? null : superClass.property.name };
    } else if (t.isMemberExpression(superClass) && t.isMemberExpression(superClass.object) && t.isIdentifier(superClass.object.object) && t.isIdentifier(superClass.object.property) && t.isIdentifier(superClass.property)) {
        // case: class BusinessEventService extends projects_1.projects.Document {}
        // return projects.Document
        inheritanceInfo[className] = { module: superClass.object.property.name, superClass: superClass.property.name };
    }
    else if (t.isIdentifier(superClass)) {
        inheritanceInfo[className] = { module: null, superClass: superClass.name };
    }
}

export async function extractInheritanceInfo(jsAst: ParseResult<t.File>): Promise<Record<string, InheritanceInfo>> {
    const inheritanceInfo: Record<string, InheritanceInfo> = {};

    traverse(jsAst, {
        ClassDeclaration(path) {
            extractInheritanceInfoFromClass(path, inheritanceInfo);
        },
    });

    console.log(`Extracted inheritance info: ${JSON.stringify(inheritanceInfo, null, 2)}`);
    return inheritanceInfo;
}

export async function extractSchema(
    jsCode: string,
    dtsCode: string,
    interfaceSet: Set<string>,
    allInheritanceInfo: Record<string, InheritanceInfo>
): Promise<Schema> {
    const jsAst = parse(jsCode, {
        sourceType: "module",
        plugins: ["typescript"],
    });

    const dtsAst = parse(dtsCode, {
        sourceType: "module",
        plugins: ["typescript"],
    });

    const schema: Schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        definitions: {},
    };

    const classToProperties: Record<string, PropertyInfo[]> = {};
    const classToRequired: Record<string, string[]> = {};
    const classToVersionInfo: Record<string, Record<string, any>> = {};
    const classToStructureTypeName: Record<string, string> = {};

    //#region Helper functions and traversal logic



    // 生成 WithSubclasses 类型
    function generateWithSubclassesType(
        className: string,
        subClasses: string[]
    ): any {
        const oneOf = subClasses.map((subClass) => ({
            $ref: `#/definitions/${subClass}`,
        }));

        // 添加父类本身
        oneOf.unshift({
            $ref: `#/definitions/${className}`,
        });

        return {
            type: "object",
            oneOf: oneOf,
        };
    }

    // 确定属性类型
    async function determineType(
        propInfo: PropertyInfo,
        dtsAst: any
    ): Promise<any> {
        const { propertyType, type, internalName, primitiveTypeEnum, defaultValue } = propInfo;

        const primitiveTypeMap: Record<string, any> = {
            Integer: { type: "integer" },
            String: { type: "string" },
            Boolean: { type: "boolean" },
            Double: { type: "number" }, // Assuming Double maps to number
            DateTime: { type: "string", format: "date-time" },
            Guid: { $ref: "../common.schema.json#/definitions/GUID" },
            Point: { $ref: "../common.schema.json#/definitions/Point" },
            Size: { $ref: "../common.schema.json#/definitions/Size" },
            Color: { $ref: "../common.schema.json#/definitions/Color" },
            Blob: { type: "string", contentEncoding: "base64" },
        };

        // Handle PrimitiveProperty types directly
        if (propertyType === "PrimitiveProperty") {
            if (primitiveTypeMap[primitiveTypeEnum]) {
                if (defaultValue != undefined) {
                    return { ...primitiveTypeMap[primitiveTypeEnum], default: defaultValue };
                } else {
                    return primitiveTypeMap[primitiveTypeEnum];
                }
            }
        }

        let targetTypeName = (await findRefType(type, internalName)).replace("internal$", "");
        let _rightType = targetTypeName.includes("$") ? targetTypeName.split("$")[1] : targetTypeName;

        if (interfaceSet.has(_rightType)) {
            _rightType = _rightType.slice(1);
        }

        if (targetTypeName.includes("$")) {
            targetTypeName = `${targetTypeName.split("$")[0]}$${_rightType}`;
        } else {
            targetTypeName = _rightType;
        }

        // Handle EnumProperty and EnumListProperty
        if (propertyType.includes("Enum")) {
            if (propertyType === "EnumListProperty") {
                return { type: "array", items: { type: "string", enum: propInfo.enumValues } };
            } else {
                return { type: "string", enum: propInfo.enumValues };
            }
        }

        // Handle reference properties
        function transformRef(input: string): string {
            const pattern = /^(?:([a-zA-Z]+)\$)?([a-zA-Z]+)$/; // 匹配 "{module_name}${class_name}" 和 "{class_name}"
            const match = input.match(pattern);

            if (!match) {
                throw new Error("Invalid input format");
            }

            const moduleName = match[1]; // module_name 可选
            const className = match[2]; // class_name 必须

            if (moduleName) {
                return `${moduleName.toLowerCase()}.schema.json#/definitions/${className}`;
            } else {
                return `#/definitions/${className}`;
            }
        }

        if (propertyType.includes("Reference") || propertyType.includes("Part")) {
            let refType = null;
            let typeName = type;

            if (propertyType === "ByIdReferenceProperty") {
                refType = {
                    type: "string",
                    description: `ByIdReferenceProperty: ${transformRef(targetTypeName)};Unique identifier. use for placeholer uniqe identifier for human readable name and later will replace with guid by model sdk`,
                };
            } else if (propertyType.startsWith("ByNameReference")) {
                // 检查是否存在子类
                const subClasses = findSubClasses(targetTypeName, dtsAst);
                refType = {
                    type: "string",
                    description: `${propertyType}: ${[targetTypeName, ...subClasses].map(transformRef).join(" or ")}`,
                };
            } else if (propertyType === "LocalByNameReferenceProperty") {
                refType = { type: "string" };
            } else if (propertyType === "PartListProperty" || propertyType === "PartProperty") {
                const subClasses = findSubClasses(targetTypeName, dtsAst);
                if (subClasses.length > 0) {
                    // 如果目标类型有子类，生成 WithSubclasses 类型
                    const withSubclassesTypeName = `${targetTypeName}WithSubclasses`;
                    schema.definitions[withSubclassesTypeName] = generateWithSubclassesType(targetTypeName, subClasses);

                    refType = {
                        $ref: `#/definitions/${withSubclassesTypeName}`,
                    };
                } else {
                    refType = {
                        $ref: transformRef(targetTypeName),
                    };
                }
            }

            if (refType) {
                if (propertyType.includes("List")) {
                    return { type: "array", items: refType };
                } else {
                    return refType;
                }
            }
        }

        return { type: "string" }; // Default to string if type is unknown or unhandled
    }

    async function findRefType(typeName: string, internalName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            traverse(dtsAst, {
                ClassDeclaration(path) {
                    const classNode = path.node;
                    if (t.isIdentifier(classNode.id) && classNode.id.name === typeName) {
                        const propList = classNode.body.body.filter(n => t.isTSDeclareMethod(n) && n.kind == 'get' && !n.static && t.isIdentifier(n.key) && n.key.name == internalName).map(n => ((n as t.TSDeclareMethod).returnType as t.TSTypeAnnotation).typeAnnotation);
                        for (const p of propList) {
                            const result = processTypeAnnotation(p);
                            if (result) {
                                path.stop();
                                resolve(result);
                                return;
                            }
                        }
                        path.stop();
                        resolve(undefined);
                    }
                }
            }
            );
            reject(`can not find ${typeName}.${internalName} in .d.ts`)
        });
    }

    function processTypeAnnotation(p: any): string | undefined {
        switch (p.type) {
            case "TSTypeReference":
                return processTSTypeReference(p);
            case "TSBooleanKeyword":
                return "Boolean";
            case "TSStringKeyword":
                return "String";
            case "TSNumberKeyword":
                return "Number";
            case "TSArrayType":
                return processTSArrayType(p);
            case "TSUnionType":
                return processTSUnionType(p);
            default:
                return undefined;
        }
    }

    function processTSTypeReference(p: any): string | undefined {
        if (p.typeParameters) {
            const typeParam = p.typeParameters.params[0];
            let innerType = processTypeAnnotation(typeParam);
            if (!innerType) return undefined;

            if (p.typeName.type === "TSQualifiedName") {
                innerType = `${p.typeName.left.name}$${innerType}`;
            }
            return innerType;
        } else {
            if (p.typeName.type === "TSQualifiedName") {
                return `${p.typeName.left.name}$${p.typeName.right.name}`;
            } else if (p.typeName.type === "Identifier") {
                return p.typeName.name;
            }
        }
        return undefined;
    }

    function processTSArrayType(p: any): string | undefined {
        const elementType = processTypeAnnotation(p.elementType);
        return elementType;
    }

    function processTSUnionType(p: any): string | undefined {
        const isNullable = p.types.some(t => t.type === "TSNullKeyword");
        const nonNullType = p.types.find(t => t.type !== "TSNullKeyword");

        if (isNullable && nonNullType) {
            return processTypeAnnotation(nonNullType);
        }
        return undefined;
    }
    //#endregion

    //#region 提取版本信息
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


    //#region 提取结构类型名称
    function extractStructureTypeName(className: string, jsAst: any): string {
        let structureTypeName = "";

        traverse(jsAst, {
            ExpressionStatement(path) {
                const expression = path.node.expression;
                if (
                    t.isAssignmentExpression(expression) &&
                    t.isMemberExpression(expression.left) &&
                    t.isIdentifier(expression.left.object, { name: className }) &&
                    t.isIdentifier(expression.left.property, { name: "structureTypeName" }) &&
                    t.isStringLiteral(expression.right)
                ) {
                    structureTypeName = expression.right.value;
                }
            },
        });

        console.log(`Extracted structure type name for ${className}: ${structureTypeName}`);
        return structureTypeName;
    }
    //#endregion

    //#region 查找枚举定义
    function findEnumDefinition(dtsAst: any, enumName: string): { name: string; members: string[] } | null {
        let foundEnum = null;

        traverse(dtsAst, {
            ClassDeclaration(path) {
                if (
                    path.node.id.name === enumName &&
                    path.node.superClass &&
                    t.isMemberExpression(path.node.superClass) &&
                    t.isIdentifier(path.node.superClass.property) &&
                    path.node.superClass.property.name === "AbstractEnum"
                ) {
                    foundEnum = {
                        name: enumName,
                        members: [],
                    };
                    path.traverse({
                        ClassProperty(memberPath) {
                            if (
                                memberPath.node.static &&
                                t.isIdentifier(memberPath.node.key)
                            ) {
                                foundEnum.members.push(memberPath.node.key.name);
                            }
                        },
                    });
                    path.stop();
                }
            },
        });

        console.log(`Found enum definition for ${enumName}: ${JSON.stringify(foundEnum, null, 2)}`);
        return foundEnum;
    }
    //#endregion


    //#region 遍历逻辑
    // First, traverse the JS AST to find class constructors, their properties, version info, and structure type names
    traverse(jsAst, {
        ClassDeclaration(path) {
            const className = path.node.id.name;
            classToProperties[className] = [];
            classToRequired[className] = [];
            classToVersionInfo[className] = extractVersionInfo(className, jsAst);
            classToStructureTypeName[className] = extractStructureTypeName(className, jsAst);

            path.traverse({
                ClassMethod(methodPath) {
                    if (methodPath.node.kind === "constructor") {
                        methodPath.traverse({
                            AssignmentExpression(assignPath) {
                                const left = assignPath.node.left;
                                if (
                                    t.isMemberExpression(left) &&
                                    t.isThisExpression(left.object) &&
                                    t.isIdentifier(left.property) &&
                                    left.property.name.startsWith("__")
                                ) {
                                    const propertyName = left.property.name;
                                    const right = assignPath.node.right;

                                    if (t.isNewExpression(right)) {
                                        const args = right.arguments;
                                        const callee = right.callee;

                                        if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
                                            const propertyType = callee.property.name;

                                            if (
                                                (propertyType === "PrimitiveProperty" ||
                                                    propertyType === "EnumProperty" ||
                                                    propertyType === "ByNameReferenceProperty" ||
                                                    propertyType === "ByNameReferenceListProperty" ||
                                                    propertyType === "PartProperty" ||
                                                    propertyType === "PartListProperty" ||
                                                    propertyType === "PrimitiveListProperty" ||
                                                    propertyType === "EnumListProperty" ||
                                                    propertyType === "LocalByNameReferenceProperty") &&
                                                args.length >= 3 &&
                                                t.isStringLiteral(args[2])
                                            ) {
                                                const internalName = args[2].value;
                                                //@ts-ignore
                                                let type = args[0].name;
                                                let reference = false;
                                                let isList = false;
                                                let enumValues = undefined;
                                                let defaultValue, primitiveTypeEnum;

                                                // Handle specific types based on property type
                                                if (propertyType.includes("Reference")) {
                                                    reference = true;
                                                }

                                                if (propertyType.includes("Enum")) {
                                                    // Extract enum values from the corresponding enum in the dts
                                                    //@ts-ignore
                                                    const enumName = propertyType === "EnumProperty" ? args[4].name : args[0].name;
                                                    const enumDefinition = findEnumDefinition(dtsAst, enumName);
                                                    if (enumDefinition) {
                                                        enumValues = enumDefinition.members;
                                                    }
                                                    //@ts-ignore
                                                    type = args[0].name;
                                                    reference = false;
                                                }

                                                if (propertyType.includes("List")) {
                                                    isList = true;
                                                }

                                                if (propertyType == "PrimitiveProperty") {
                                                    // String Boolean Number
                                                    if (["StringLiteral", "BooleanLiteral", "NumericLiteral"].includes(args[3].type)) {
                                                        //@ts-ignore
                                                        defaultValue = args[3].value;
                                                    }

                                                    // Number -1
                                                    else if (args[3].type == "UnaryExpression" && args[3].prefix && args[3].argument.type == "NumericLiteral") { defaultValue = args[3].operator == '-' ? args[3].argument.value * -1 : args[3].argument.value }

                                                    // Color
                                                    //@ts-ignore
                                                    else if (t.isMemberExpression(args[4]) && ["Color", "Size", "Point"].includes(args[4].property.name)) {
                                                        //@ts-ignore
                                                        defaultValue = args[3].properties.reduce((obj, prop) => {
                                                            if (prop.key.type === 'Identifier' && prop.value.type === 'NumericLiteral') {
                                                                obj[prop.key.name] = prop.value.value;
                                                            }
                                                            return obj;
                                                        }, {});
                                                    }

                                                    else if (args[3].type == "NullLiteral") { defaultValue = null } else {
                                                        const code = generator(assignPath.node).code;
                                                        debugger
                                                    }

                                                    if (args[4].type == "MemberExpression" && args[4].object.type == "MemberExpression" &&
                                                        //@ts-ignore
                                                        args[4].object.property.name == "PrimitiveTypeEnum"
                                                    ) {//internal.PrimitiveTypeEnum.Guid
                                                        //@ts-ignore
                                                        primitiveTypeEnum = args[4].property.name;//Guid
                                                    }
                                                }

                                                classToProperties[className].push({
                                                    name: propertyName,
                                                    internalName: internalName,
                                                    propertyType,
                                                    type: type,
                                                    reference: reference,
                                                    isList: isList,
                                                    defaultValue, primitiveTypeEnum,
                                                    enum: propertyType.includes("Enum"),
                                                    enumValues: enumValues,
                                                });
                                            }
                                        }
                                    }
                                }
                            },
                        });
                    }
                },
            });
        },
    });

    // Then, traverse the TS AST to build the schema based on class properties and version info
    const tasks: any[] = [];
    traverse(dtsAst, {
        TSDeclareMethod(path) {
            tasks.push(path);
        },
    });

    await Promise.all(tasks.map(async (path) => {
        if (
            t.isIdentifier(path.node.key) &&
            path.node.key.name === "constructor"
        ) {
            const className = path.findParent(t.isClassDeclaration).node.id.name;
            if (classToProperties[className]) {
                const classDefinition: ClassDefinition = {
                    type: "object",
                    properties: {
                        "$ID": {
                            "$ref": "../common.schema.json#/definitions/Identifiable"
                        },
                        "$Type": {
                            "type": "string",
                            "const": classToStructureTypeName[className] ? classToStructureTypeName[className] : ""
                        }
                    },
                    required: ["$ID", "$Type"],
                };

                // 如果有父类，且父类不是"internal.Element"，则添加allOf
                const inheritanceInfo = allInheritanceInfo[className];
                if (inheritanceInfo && inheritanceInfo.superClass) {
                    if (!classToStructureTypeName[className]) {
                        throw new Error(`class ${className} not found in classToStructureTypeName`);
                    }
                    const structureTypeName = classToStructureTypeName[className];
                    if (inheritanceInfo.module) {
                        classDefinition.allOf = [{
                            $merge: {
                                source: {
                                    $ref: `${inheritanceInfo.module}.schema.json#/definitions/${inheritanceInfo.superClass}`
                                },
                                with: {
                                    $Type: {
                                        type: "string",
                                        const: structureTypeName
                                    }
                                }
                            }
                        }];
                    } else {
                        classDefinition.allOf = [{
                            $merge: {
                                source: {
                                    $ref: `#/definitions/${inheritanceInfo.superClass}`
                                },
                                with: {
                                    $Type: {
                                        type: "string",
                                        const: structureTypeName
                                    }
                                }
                            }
                        }];
                    }
                }

                schema.definitions[className] = classDefinition;

                await Promise.all(classToProperties[className].map(async (propInfo) => {
                    const propertyName = propInfo.internalName;
                    const versionInfo = classToVersionInfo[className];

                    // Check if the property is marked as deleted
                    if (versionInfo && versionInfo[propertyName] && versionInfo[propertyName].deleted) {
                        return; // Skip deleted properties, correctly exits the inner map callback
                    }

                    const propertyType = await determineType(propInfo, dtsAst);

                    schema.definitions[className].properties[propertyName] = propertyType;

                    // Check if the property is required
                    if (
                        versionInfo &&
                        versionInfo[propertyName] &&
                        versionInfo[propertyName].required?.currentValue === true
                    ) {
                        schema.definitions[className].required.push(propertyName);
                    }
                }));
            }
        }
    }));
    //#endregion


    //#endregion

    console.log(`Generated schema for ${Object.keys(schema.definitions).length} classes`);
    return schema;
}

export async function main(): Promise<void> {
    const genDir = "node_modules/mendixmodelsdk/src/gen";
    const schemaDir = "schemas/gen";

    fs.mkdirSync(schemaDir, { recursive: true });

    const files = fs.readdirSync(genDir);
    const filePairs: Record<string, { js: string; ts: string }> = {};

    for (const file of files) {
        const ext = path.extname(file);
        if (ext === ".js" && !file.startsWith("all-model-classes") && !file.startsWith("base-model")) {
            const baseName = path.basename(file, ext);
            filePairs[baseName] = { js: file, ts: baseName + '.d.ts' };
        }
    }

    let allInterfaces = new Set<string>();
    for (const baseName in filePairs) {
        const pair = filePairs[baseName];
        const tsCode = fs.readFileSync(path.join(genDir, pair.ts), "utf-8");
        const interfaces = await extractInterfaces(tsCode);
        allInterfaces = new Set([...allInterfaces, ...interfaces]);
    }

    let allInheritanceInfo: Record<string, InheritanceInfo> = {};
    for (const baseName in filePairs) {
        const pair = filePairs[baseName];
        const jsCode = fs.readFileSync(path.join(genDir, pair.js), "utf-8");
        const inheritanceInfo = await extractInheritanceInfo(parseCode(jsCode));
        allInheritanceInfo = { ...allInheritanceInfo, ...inheritanceInfo };
    }

    for (const baseName in filePairs) {
        const pair = filePairs[baseName];
        const jsCode = fs.readFileSync(path.join(genDir, pair.js), "utf-8");
        const tsCode = fs.readFileSync(path.join(genDir, pair.ts), "utf-8");

        const schema = await extractSchema(jsCode, tsCode, allInterfaces, allInheritanceInfo);

        const schemaFileName = path.join(schemaDir, `${baseName}.schema.json`);
        fs.writeFileSync(schemaFileName, JSON.stringify(schema, null, 2));
        console.log(`Schema saved to: ${schemaFileName}`);
    }
}

if (process.argv[2] === "gen") {
    main().catch(console.error);
}