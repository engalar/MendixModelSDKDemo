//@ts-nocheck
import { resolve } from "path";
import * as t from "@babel/types";
import * as fs from "fs";
import * as path from "path";
import { parse } from "@babel/parser";
import generator from "@babel/generator";
import traverse from "@babel/traverse";

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

function getModuleName(superClass: t.Expression): string | null {
    if (t.isMemberExpression(superClass) && t.isIdentifier(superClass.object)) {
        return superClass.object.name;
    }
    return null;
}

function getSuperClassName(superClass: t.Expression): string {
    if (t.isMemberExpression(superClass) && t.isIdentifier(superClass.property)) {
        return superClass.property.name;
    }
    if (t.isIdentifier(superClass)) {
        return superClass.name;
    }
    throw new Error("Invalid superClass type");
}

function extractInterfaces(tsAst: any): void {
    traverse(tsAst, {
        TSInterfaceDeclaration(path) {
            allInterfaces.add(path.node.id.name);
        },
    });
}

function extractClassInfo(jsAst: any, tsAst: any): void {
    traverse(jsAst, {
        ClassDeclaration(path) {
            const className = path.node.id.name;

            // Extract inheritance info
            if (path.node.superClass) {
                allInheritanceInfo[className] = {
                    module: getModuleName(path.node.superClass),
                    superClass: getSuperClassName(path.node.superClass),
                };
            }

            // Initialize class info
            classInfoCache[className] = {
                properties: [],
                required: [],
                versionInfo: {},
                structureTypeName: "",
            };

            // Extract properties
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
                                                let type = t.isIdentifier(args[0]) ? args[0].name : "";
                                                let reference = false;
                                                let isList = false;
                                                let enumValues = undefined;
                                                let defaultValue, primitiveTypeEnum;

                                                if (propertyType.includes("Reference")) {
                                                    reference = true;
                                                }

                                                if (propertyType.includes("Enum")) {
                                                    const enumName = propertyType === "EnumProperty" && t.isIdentifier(args[4]) ? args[4].name : t.isIdentifier(args[0]) ? args[0].name : "";
                                                    const enumDefinition = findEnumDefinition(tsAst, enumName);
                                                    if (enumDefinition) {
                                                        enumValues = enumDefinition.members;
                                                    }
                                                    type = t.isIdentifier(args[0]) ? args[0].name : "";
                                                    reference = false;
                                                }

                                                if (propertyType.includes("List")) {
                                                    isList = true;
                                                }

                                                if (propertyType === "PrimitiveProperty") {
                                                    if (t.isStringLiteral(args[3]) || t.isBooleanLiteral(args[3]) || t.isNumericLiteral(args[3])) {
                                                        defaultValue = args[3].value;
                                                    } else if (t.isUnaryExpression(args[3]) && args[3].prefix && t.isNumericLiteral(args[3].argument)) {
                                                        defaultValue = args[3].operator === '-' ? args[3].argument.value * -1 : args[3].argument.value;
                                                    } else if (t.isObjectExpression(args[3]) && t.isMemberExpression(args[4]) && t.isIdentifier(args[4].property) && ["Color", "Size", "Point"].includes(args[4].property.name)) {
                                                        defaultValue = args[3].properties.reduce((obj, prop) => {
                                                            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key) && t.isNumericLiteral(prop.value)) {
                                                                obj[prop.key.name] = prop.value.value;
                                                            }
                                                            return obj;
                                                        }, {} as Record<string, number>);
                                                    } else if (t.isNullLiteral(args[3])) {
                                                        defaultValue = null;
                                                    }

                                                    if (t.isMemberExpression(args[4]) && t.isMemberExpression(args[4].object) && t.isIdentifier(args[4].object.property) && args[4].object.property.name === "PrimitiveTypeEnum") {
                                                        primitiveTypeEnum = t.isIdentifier(args[4].property) ? args[4].property.name : "";
                                                    }
                                                }

                                                classInfoCache[className].properties.push({
                                                    name: propertyName,
                                                    internalName: internalName,
                                                    propertyType,
                                                    type,
                                                    reference,
                                                    isList,
                                                    defaultValue,
                                                    primitiveTypeEnum,
                                                    enum: propertyType.includes("Enum"),
                                                    enumValues,
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

            // Extract structureTypeName and versionInfo
            const classBody = path.getNextSibling();
            if (classBody && t.isExpressionStatement(classBody.node)) {
                const expression = classBody.node.expression;
                if (t.isAssignmentExpression(expression)) {
                    const left = expression.left;
                    const right = expression.right;

                    if (
                        t.isMemberExpression(left) &&
                        t.isIdentifier(left.property)
                    ) {
                        if (left.property.name === "structureTypeName" && t.isStringLiteral(right)) {
                            classInfoCache[className].structureTypeName = right.value;
                        } else if (left.property.name === "versionInfo" && t.isNewExpression(right)) {
                            classInfoCache[className].versionInfo = extractVersionInfoFromExpression(right);
                        }
                    }
                }
            }
        },
    });
}

function findEnumDefinition(tsAst: any, enumName: string): { name: string; members: string[] } | null {
    let foundEnum = null;

    traverse(tsAst, {
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

function extractVersionInfoFromExpression(expression: t.NewExpression): Record<string, any> {
    const versionInfo: Record<string, any> = {};
    if (expression.arguments.length > 0 && t.isObjectExpression(expression.arguments[0])) {
        const propertiesObject = expression.arguments[0].properties.find(
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
                                    const innerPropValue: Record<string, boolean> = {};
                                    innerProp.value.properties.forEach(innerMostProp => {
                                        if (t.isObjectProperty(innerMostProp) && t.isIdentifier(innerMostProp.key) && t.isBooleanLiteral(innerMostProp.value)) {
                                            innerPropValue[innerMostProp.key.name] = innerMostProp.value.value;
                                        }
                                    });
                                    versionInfo[propName][innerPropName] = innerPropValue;
                                }
                            }
                        });
                    }
                }
            });
        }
    }
    return versionInfo;
}

function isEnumClass(path: any): boolean {
    return (
        path.node.superClass &&
        t.isMemberExpression(path.node.superClass) &&
        t.isIdentifier(path.node.superClass.property) &&
        path.node.superClass.property.name === "AbstractEnum"
    );
}

function extractEnumValues(path: any): string[] {
    const members: string[] = [];
    path.traverse({
        ClassProperty(memberPath) {
            if (
                memberPath.node.static &&
                t.isIdentifier(memberPath.node.key)
            ) {
                members.push(memberPath.node.key.name);
            }
        },
    });
    return members;
}

function buildClassDefinition(classInfo: ClassInfo, inheritanceInfo: InheritanceInfo): ClassDefinition {
    const classDefinition: ClassDefinition = {
        type: "object",
        properties: {
            "$ID": {
                "$ref": "../common.schema.json#/definitions/Identifiable"
            },
            "$Type": {
                "type": "string",
                "const": classInfo.structureTypeName || ""
            }
        },
        required: ["$ID", "$Type"],
    };

    if (inheritanceInfo && inheritanceInfo.superClass !== "internal.Element") {
        if (inheritanceInfo.module) {
            classDefinition.allOf = [{
                $merge: {
                    source: {
                        $ref: `${inheritanceInfo.module}.schema.json#/definitions/${inheritanceInfo.superClass}`
                    },
                    with: {
                        $Type: {
                            type: "string",
                            const: classInfo.structureTypeName
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
                            const: classInfo.structureTypeName
                        }
                    }
                }
            }];
        }
    }

    // Add properties to the class definition
    for (const propInfo of classInfo.properties) {
        const propertyName = propInfo.internalName;
        const versionInfo = classInfo.versionInfo;

        // Skip deleted properties
        if (versionInfo && versionInfo[propertyName] && versionInfo[propertyName].deleted) {
            continue;
        }

        // Determine the property type
        const propertyType = determineType(propInfo, allInheritanceInfo);

        // Add the property to the class definition
        classDefinition.properties[propertyName] = propertyType;

        // Mark the property as required if needed
        if (
            versionInfo &&
            versionInfo[propertyName] &&
            versionInfo[propertyName].required?.currentValue === true
        ) {
            classDefinition.required.push(propertyName);
        }
    }

    return classDefinition;
}

function determineType(propInfo: PropertyInfo, allInheritanceInfo: Record<string, InheritanceInfo>): any {
    const { propertyType, type, internalName, primitiveTypeEnum, defaultValue, enumValues } = propInfo;

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
            if (defaultValue !== undefined) {
                return { ...primitiveTypeMap[primitiveTypeEnum], default: defaultValue };
            } else {
                return primitiveTypeMap[primitiveTypeEnum];
            }
        }
    }

    // Handle EnumProperty and EnumListProperty
    if (propertyType.includes("Enum")) {
        if (propertyType === "EnumListProperty") {
            return { type: "array", items: { type: "string", enum: enumValues } };
        } else {
            return { type: "string", enum: enumValues };
        }
    }

    // Handle reference properties
    if (propertyType.includes("Reference") || propertyType.includes("Part")) {
        let refType = null;
        let typeName = type;

        if (propertyType === "ByIdReferenceProperty") {
            refType = {
                type: "string",
                description: `ByIdReferenceProperty: ${transformRef(typeName)}; Unique identifier.`,
            };
        } else if (propertyType.startsWith("ByNameReference")) {
            const subClasses = findSubClasses(typeName, allInheritanceInfo);
            refType = {
                type: "string",
                description: `${propertyType}: ${[typeName, ...subClasses].map(transformRef).join(" or ")}`,
            };
        } else if (propertyType === "LocalByNameReferenceProperty") {
            refType = { type: "string" };
        } else if (propertyType === "PartListProperty" || propertyType === "PartProperty") {
            const subClasses = findSubClasses(typeName, allInheritanceInfo);
            if (subClasses.length > 0) {
                const withSubclassesTypeName = `${typeName}WithSubclasses`;
                return {
                    type: "array",
                    items: { $ref: `#/definitions/${withSubclassesTypeName}` },
                };
            } else {
                refType = { $ref: transformRef(typeName) };
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

function transformRef(input: string): string {
    const pattern = /^(?:([a-zA-Z]+)\$)?([a-zA-Z0-9]+)$/; // Match "{module_name}${class_name}" or "{class_name}"
    const match = input.match(pattern);

    if (!match) {
        throw new Error("Invalid input format");
    }

    const moduleName = match[1]; // module_name is optional
    const className = match[2]; // class_name is required

    if (moduleName) {
        return `${moduleName.toLowerCase()}.schema.json#/definitions/${className}`;
    } else {
        const inheritanceInfo = allInheritanceInfo[className];
        if (inheritanceInfo && inheritanceInfo.module) {
            return `${inheritanceInfo.module.toLowerCase()}.schema.json#/definitions/${className}`;
        } else {
            return `#/definitions/${className}`;
        }
    }
}

function findSubClasses(className: string, allInheritanceInfo: Record<string, InheritanceInfo>): string[] {
    const subClasses: string[] = [];

    for (const [subClass, info] of Object.entries(allInheritanceInfo)) {
        if (info.superClass === className) {
            subClasses.push(subClass);
        }
    }

    return subClasses;
}

async function main(): Promise<void> {
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

    for (const baseName in filePairs) {
        const pair = filePairs[baseName];
        const jsCode = fs.readFileSync(path.join(genDir, pair.js), "utf-8");
        const tsCode = fs.readFileSync(path.join(genDir, pair.ts), "utf-8");

        let jsAst = parse(jsCode, { sourceType: "module", plugins: ["typescript"] });
        let tsAst = parse(tsCode, { sourceType: "module", plugins: ["typescript"] });

        extractInterfaces(tsAst);
        extractClassInfo(jsAst, tsAst);

        // Release AST
        jsAst = null;
        tsAst = null;
    }

    const schema = generateSchema();
    const schemaFileName = path.join(schemaDir, "schema.json");
    fs.writeFileSync(schemaFileName, JSON.stringify(schema, null, 2));
    console.log(`Schema saved to: ${schemaFileName}`);
}
function generateSchema(): Schema {
    const schema: Schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        definitions: {},
    };

    // Iterate over all classes in the cache
    for (const [className, classInfo] of Object.entries(classInfoCache)) {
        const inheritanceInfo = allInheritanceInfo[className];

        // Build the class definition
        const classDefinition = buildClassDefinition(classInfo, inheritanceInfo);

        // Add the class definition to the schema
        schema.definitions[className] = classDefinition;

        // If the class has subclasses, create a "WithSubclasses" definition
        const subClasses = findSubClasses(className, allInheritanceInfo);
        if (subClasses.length > 0) {
            const withSubclassesDefinition: ClassDefinition = {
                type: "object",
                properties: {
                    $Type: {
                        type: "string",
                        const: classInfo.structureTypeName,
                    },
                },
                required: ["$Type"],
                allOf: [
                    {
                        $merge: {
                            source: {
                                $ref: `#/definitions/${className}`,
                            },
                            with: {
                                $Type: {
                                    type: "string",
                                    const: classInfo.structureTypeName,
                                },
                            },
                        },
                    },
                    {
                        oneOf: subClasses.map((subClass) => ({
                            $ref: `#/definitions/${subClass}`,
                        })),
                    },
                ],
            };
            schema.definitions[`${className}WithSubclasses`] = withSubclassesDefinition;
        }
    }

    return schema;
}
main().catch(console.error);