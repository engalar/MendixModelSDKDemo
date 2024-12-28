import { resolve } from "path";

const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const t = require("@babel/types");
const fs = require("fs");
const path = require("path");

async function extractInterfaces(dtsCode: string): Promise<Set<string>> {
    const dtsAst = parser.parse(dtsCode, {
        sourceType: "module",
        plugins: ["typescript"],
    });

    const interfaceSet = new Set<string>();

    traverse(dtsAst, {
        TSInterfaceDeclaration(path) {
            interfaceSet.add(path.node.id.name);
        },
    });

    return interfaceSet;
}

// 新增函数：提取类的继承信息
async function extractInheritanceInfo(jsCode: string): Promise<{ [className: string]: { module: string, superClass: string } }> {
    const jsAst = parser.parse(jsCode, {
        sourceType: "module",
        plugins: ["typescript"],
    });

    const inheritanceInfo = {};

    traverse(jsAst, {
        ClassDeclaration(path) {
            const className = path.node.id.name;
            if (path.node.superClass && path.node.superClass.object && path.node.superClass.object.name !== 'internal') {
                if (t.isMemberExpression(path.node.superClass) && t.isIdentifier(path.node.superClass.object) && t.isIdentifier(path.node.superClass.property)) {
                    inheritanceInfo[className] = { module: path.node.superClass.object.name, superClass: path.node.superClass.property.name };
                } else if (t.isMemberExpression(path.node.superClass) && t.isMemberExpression(path.node.superClass.object) && t.isIdentifier(path.node.superClass.object.property) && t.isIdentifier(path.node.superClass.property)) {
                    inheritanceInfo[className] = { module: path.node.superClass.object.property.name, superClass: path.node.superClass.property.name };
                }
            }
            if (t.isIdentifier(path.node.superClass)) {
                inheritanceInfo[className] = { module: null, superClass: path.node.superClass.name };
            }
        },
    });

    return inheritanceInfo;
}

async function extractSchema(jsCode, dtsCode, interfaceSet, allInheritanceInfo) {
    const jsAst = parser.parse(jsCode, {
        sourceType: "module",
        plugins: ["typescript"],
    });

    const dtsAst = parser.parse(dtsCode, {
        sourceType: "module",
        plugins: ["typescript"],
    });

    const schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "definitions": {},
    };

    const classToProperties = {};
    const classToRequired = {};
    const classToVersionInfo = {};
    const classToStructureTypeName = {};

    // Helper function to determine the type
    async function determineType(propInfo, dtsAst) {
        const { propertyType, type, internalName, primitiveTypeEnum, defaultValue } = propInfo;

        const primitiveTypeMap = {
            Integer: { type: "integer" },
            String: { type: "string" },
            Boolean: { type: "boolean" },
            Double: { type: "number" }, // Assuming Double maps to number
            DateTime: { type: "string", format: "date-time" },
            Guid: { $ref: "../common.schema.json#/definitions/GUID" },
            Point: { $ref: "../common.schema.json#/definitions/Point" },
            Size: { $ref: "../common.schema.json#/definitions/Size" },
            Color: { $ref: "../common.schema.json#/definitions/Color" },
            Blob: { type: "string", contentEncoding: "base64" }
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
        let targetTypeName = (await findRefType(type, internalName)).replace('internal$', '');
        let _rightType = targetTypeName.includes("$") ? targetTypeName.split('$')[1] : targetTypeName;

        if (interfaceSet.has(_rightType)) {
            _rightType = _rightType.slice(1);
        }

        if (targetTypeName.includes("$")) {
            targetTypeName = `${targetTypeName.split('$')[0]}$${_rightType}`;
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
        function transformRef(input) {
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
                    description: `ByIdReferenceProperty: ${transformRef(targetTypeName)};Unique identifier. use for placeholer uniqe identifier for human readable name and later will replace with guid by model sdk`
                };
            } else if (propertyType.startsWith("ByNameReference")) {
                refType = {
                    type: "string",
                    description: `${propertyType}: ${transformRef(targetTypeName)}`
                }
            } else if (propertyType === "LocalByNameReferenceProperty") {
                refType = { type: "string" };
            } else if (propertyType === "PartListProperty" || propertyType === "PartProperty") {
                refType = {
                    $ref: transformRef(targetTypeName)
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

        async function findRefType(typeName: string, internalName: string): Promise<string> {
            return new Promise((resolve, reject) => {
                traverse(dtsAst, {
                    ClassDeclaration(path) {
                        if (path.node.id.name === typeName) {
                            const propList = path.node.body.body.filter(n => n.kind == 'get' && !n.static && n.type == "TSDeclareMethod" && n.key.name == internalName).map(n => n.returnType.typeAnnotation);
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
                },
                    () => reject(`can not find ${typeName}.${internalName} in .d.ts`)
                );
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
            // Consider if you want to represent array types differently, e.g., "Array<elementType>" or "elementType[]"
            // For now, we'll just return the elementType
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
    }

    // Helper function to extract version info
    function extractVersionInfo(className, jsAst) {
        let versionInfo = {};

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

                        if (propertiesObject && t.isObjectExpression(propertiesObject.value)) {
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
                                                    const innerPropValue = {};
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

        return versionInfo;
    }

    // Helper function to extract structure type name
    function extractStructureTypeName(className, jsAst) {
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

        return structureTypeName;
    }

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
                                                    const enumName = propertyType === "EnumProperty" ? args[4].name : args[0].name;
                                                    const enumDefinition = findEnumDefinition(
                                                        dtsAst,
                                                        enumName
                                                    );
                                                    if (enumDefinition) {
                                                        enumValues = enumDefinition.members;
                                                    }
                                                    type = args[0].name;
                                                    reference = false;
                                                }

                                                if (propertyType.includes("List")) {
                                                    isList = true;
                                                }

                                                if (propertyType == "PrimitiveProperty") {
                                                    // String Boolean Number
                                                    if (["StringLiteral", "BooleanLiteral", "NumericLiteral"].includes(args[3].type)) {
                                                        defaultValue = args[3].value;
                                                    }

                                                    // Number -1
                                                    else if (args[3].type == "UnaryExpression" && args[3].prefix && args[3].argument.type == "NumericLiteral") { defaultValue = args[3].operator == '-' ? args[3].argument.value * -1 : args[3].argument.value }

                                                    // Color
                                                    else if (t.isMemberExpression(args[4]) && ["Color", "Size", "Point"].includes(args[4].property.name)) {
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
                                                        args[4].object.property.name == "PrimitiveTypeEnum"
                                                    ) {//internal.PrimitiveTypeEnum.Guid
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

    // Helper function to find enum definition in dtsAst
    function findEnumDefinition(dtsAst, enumName) {
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
        return foundEnum;
    }

    // Then, traverse the TS AST to build the schema based on class properties and version info
    const tasks = [];
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
                const classDefinition: {
                    type: string;
                    properties: {
                        $ID: { $ref: string };
                        $Type: { type: string; const: any };
                    };
                    required: string[];
                    allOf?: { $ref: string }[];
                } = {
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
                if (inheritanceInfo && inheritanceInfo.superClass !== "internal.Element") {
                    if (inheritanceInfo.module) {
                        classDefinition.allOf = [{
                            "$ref": `${inheritanceInfo.module}.schema.json#/definitions/${inheritanceInfo.superClass}`
                        }];
                    } else {
                        classDefinition.allOf = [{
                            "$ref": `#/definitions/${inheritanceInfo.superClass}`
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

    return schema;
}

async function main() {
    const genDir = "node_modules/mendixmodelsdk/src/gen";
    const schemaDir = "schemas/gen";

    // 确保 schema 目录存在
    fs.mkdirSync(schemaDir, { recursive: true });

    const files = fs.readdirSync(genDir);
    const filePairs: { [key: string]: { js: string; ts: string } } = {}; // 移除 ts 的可选属性

    // 遍历 .js 文件并构建 baseName
    for (const file of files) {
        const ext = path.extname(file);

        // 只处理 .js 文件
        if (ext === ".js" && !file.startsWith("all-model-classes") && !file.startsWith("base-model")) {
            const baseName = path.basename(file, ext);
            filePairs[baseName] = { js: file, ts: baseName + '.d.ts' }; // 直接拼接 .ts 文件名
        }
    }

    // 收集所有 .ts 文件中的接口
    let allInterfaces = new Set<string>();
    for (const baseName in filePairs) {
        const pair = filePairs[baseName];
        // 直接读取 ts 文件，无需判断是否存在
        const tsCode = fs.readFileSync(path.join(genDir, pair.ts), "utf-8");
        const interfaces = await extractInterfaces(tsCode);
        allInterfaces = new Set([...allInterfaces, ...interfaces]);
    }

    // 收集所有 .js 文件中的继承信息
    let allInheritanceInfo = {};
    for (const baseName in filePairs) {
        const pair = filePairs[baseName];
        const jsCode = fs.readFileSync(path.join(genDir, pair.js), "utf-8");
        const inheritanceInfo = await extractInheritanceInfo(jsCode);
        allInheritanceInfo = { ...allInheritanceInfo, ...inheritanceInfo };
    }

    // 处理每个文件对
    for (const baseName in filePairs) {
        const pair = filePairs[baseName];
        // 直接读取 js 和 ts 文件，无需判断是否存在
        const jsCode = fs.readFileSync(path.join(genDir, pair.js), "utf-8");
        const tsCode = fs.readFileSync(path.join(genDir, pair.ts), "utf-8");

        const schema = await extractSchema(jsCode, tsCode, allInterfaces, allInheritanceInfo);

        const schemaFileName = path.join(schemaDir, `${baseName}.schema.json`);
        fs.writeFileSync(schemaFileName, JSON.stringify(schema, null, 2));
        console.log(`Schema saved to: ${schemaFileName}`);
    }
}

main().catch(console.error);