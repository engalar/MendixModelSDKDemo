const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const fs = require("fs");

function extractSchema(jsCode, dtsCode) {
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
    function determineType(propInfo) {
        const type = propInfo.type;
        const internalName = propInfo.internalName;

        const typeMap = {
            String: { type: "string" },
            Boolean: { type: "boolean" },
            Integer: { type: "integer" },
            Guid: { type: "string", format: "uuid" },
            Blob: { type: "string", contentEncoding: "base64" },
            DateTime: { type: "string", format: "date-time" },
        };

        let schemaType = typeMap[type];
        if (schemaType) {
            return schemaType;
        }
        // Handle references based on property type
        if (propInfo.reference) {
            if (propInfo.isList) {
                return { type: "array", items: { $ref: `#/definitions/${type}` } };
            } else {
                return { $ref: `#/definitions/${type}` };
            }
        }
        if (propInfo.enum) {
            return { type: "string", enum: propInfo.enumValues };
        }

        return { type: "string" }; // Default to string if type is unknown
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
                                                    propertyType === "PartListProperty") &&
                                                args.length >= 3 &&
                                                t.isStringLiteral(args[2])
                                            ) {
                                                const internalName = args[2].value;
                                                let type = args[0].name;
                                                let reference = false;
                                                let isList = false;
                                                let enumValues = undefined;

                                                // Handle specific types based on property type
                                                if (propertyType === "ByNameReferenceProperty") {
                                                    type = args[3].value;
                                                    reference = true;
                                                } else if (propertyType === "ByNameReferenceListProperty") {
                                                    type = args[4].value;
                                                    reference = true;
                                                    isList = true;
                                                } else if (propertyType === "EnumProperty") {
                                                    // Extract enum values from the corresponding enum in the dts
                                                    const enumName = args[4].name;
                                                    const enumDefinition = findEnumDefinition(
                                                        dtsAst,
                                                        enumName
                                                    );
                                                    if (enumDefinition) {
                                                        enumValues = enumDefinition.members;
                                                    }
                                                    type = args[0].name;
                                                    reference = false;
                                                } else if (propertyType === "PartProperty") {
                                                    type = args[0].name;
                                                    reference = true;
                                                } else if (propertyType === "PartListProperty") {
                                                    type = args[0].name;
                                                    reference = true;
                                                    isList = true;
                                                }

                                                classToProperties[className].push({
                                                    name: propertyName,
                                                    internalName: internalName,
                                                    type: type,
                                                    reference: reference,
                                                    isList: isList,
                                                    enum: propertyType === "EnumProperty",
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
    traverse(dtsAst, {
        TSDeclareMethod(path) {
            if (
                t.isIdentifier(path.node.key) &&
                path.node.key.name === "constructor"
            ) {
                const className = path.findParent(t.isClassDeclaration).node.id.name;
                if (classToProperties[className]) {
                    schema.definitions[className] = {
                        type: "object",
                        properties: {
                            "$ID": {
                                "$ref": "common.schema.json#/definitions/Identifiable"
                            },
                            "$Type": {
                                "type": "string",
                                "const": classToStructureTypeName[className] ? classToStructureTypeName[className] : ""
                            }
                        },
                        required: ["$ID", "$Type"],
                    };

                    classToProperties[className].forEach((propInfo) => {
                        const propertyName = propInfo.internalName;
                        const versionInfo = classToVersionInfo[className];

                        // Check if the property is marked as deleted
                        if (versionInfo && versionInfo[propertyName] && versionInfo[propertyName].deleted) {
                            return; // Skip deleted properties
                        }

                        const propertyType = determineType(propInfo);

                        schema.definitions[className].properties[propertyName] = propertyType;

                        // Check if the property is required
                        if (
                            versionInfo &&
                            versionInfo[propertyName] &&
                            versionInfo[propertyName].required?.currentValue === true
                        ) {
                            schema.definitions[className].required.push(propertyName);
                        }
                    });
                }
            }
        },
    });

    return schema;
}

const jsCode = fs.readFileSync("node_modules/mendixmodelsdk/src/gen/domainmodels.js", "utf-8");
const dtsCode = fs.readFileSync("node_modules/mendixmodelsdk/src/gen/domainmodels.d.ts", "utf-8");

const schema = extractSchema(jsCode, dtsCode);

console.log(JSON.stringify(schema, null, 2));