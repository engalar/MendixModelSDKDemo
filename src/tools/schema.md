# 算法描述
### 优化后的算法描述

1. **初始化**：

2. **单次扫描与信息提取**：
   - 遍历 `genDir` 目录下的所有文件，找到每个 `.js` 文件及其对应的 `.d.ts` 文件。
   - 对于每个文件对（`.js` 和 `.d.ts`）：
     - 读取 `.js` 和 `.d.ts` 文件内容。
     - 使用 `@babel/parser` 分别解析 `.js` 和 `.d.ts` 文件，生成对应的 AST（抽象语法树）。
     - **提取接口信息**：从 `.d.ts` 文件的 AST 中提取所有接口名称，并添加到 `allInterfaces` 集合中。
     - **提取类信息**：从 `.js` 文件的 AST 中提取类的继承信息、属性、`structureTypeName` 和版本信息，并存储在 `classInfoCache` 中。
     - **提取枚举信息**：从 `.d.ts` 文件的 AST 中查找枚举定义，并存储在 `classInfoCache` 中。
     - **释放 AST**：在提取完所有信息后，立即释放 AST 以节省内存。

3. **生成 Schema**：
   - 遍历 `classInfoCache` 中的每个类：
     - 根据缓存中的信息，生成该类的 JSON Schema。
     - 将生成的 Schema 写入对应的 `.schema.json` 文件中。

---

### 关键优化点

1. **合并提取逻辑**：
   - 在遍历类声明时，直接提取继承信息、`structureTypeName` 和版本信息，避免重新扫描 AST。

2. **利用代码结构**：
   - 由于生成的 JavaScript 代码中，类声明、`structureTypeName` 声明和版本信息是相邻的，可以在遍历类声明时直接提取这些信息。

3. **单次扫描**：
   - 每个文件只读取和解析一次，避免重复的 I/O 操作和解析开销。

4. **按需缓存**：
   - 只缓存必要的信息（接口、继承信息、类属性、版本信息等），而不是缓存整个 AST，减少内存占用。

5. **增量释放**：
   - 在提取完所有信息后，立即释放 AST，避免内存堆积。

---

### 优化后的伪代码

```javascript
const allInterfaces = new Set();
const allInheritanceInfo = {};
const classInfoCache = {};

// 单次扫描与信息提取
for (const file of files) {
    const jsCode = fs.readFileSync(jsFilePath);
    const tsCode = fs.readFileSync(tsFilePath);
    const jsAst = parse(jsCode);
    const tsAst = parse(tsCode);

    // 提取接口信息
    extractInterfaces(tsAst, allInterfaces);

    // 提取类信息（继承信息、属性、structureTypeName、版本信息）
    extractClassInfo(jsAst, classInfoCache);

    // 提取枚举信息
    extractEnumDefinitions(tsAst, classInfoCache);

    // 释放 AST
    jsAst = null;
    tsAst = null;
}

// 生成 Schema
for (const className in classInfoCache) {
    const schema = generateSchema(classInfoCache[className], allInterfaces, allInheritanceInfo);
    fs.writeFileSync(`${className}.schema.json`, JSON.stringify(schema));
}
```

---

### 详细步骤

#### 1. **提取接口信息**
```javascript
function extractInterfaces(tsAst, allInterfaces) {
    traverse(tsAst, {
        TSInterfaceDeclaration(path) {
            allInterfaces.add(path.node.id.name);
        },
    });
}
```

#### 2. **提取类信息（继承信息、属性、structureTypeName、版本信息）**
```javascript
function extractClassInfo(jsAst, classInfoCache) {
    traverse(jsAst, {
        ClassDeclaration(path) {
            const className = path.node.id.name;

            // 提取继承信息
            if (path.node.superClass) {
                allInheritanceInfo[className] = {
                    module: getModuleName(path.node.superClass),
                    superClass: getSuperClassName(path.node.superClass),
                };
            }

            // 提取属性
            classInfoCache[className] = {
                properties: extractProperties(path),
            };

            // 提取 structureTypeName 和版本信息
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
                        if (left.property.name === "structureTypeName") {
                            classInfoCache[className].structureTypeName = right.value;
                        } else if (left.property.name === "versionInfo") {
                            classInfoCache[className].versionInfo = extractVersionInfoFromExpression(right);
                        }
                    }
                }
            }
        },
    });
}
```

#### 3. **提取枚举信息**
```javascript
function extractEnumDefinitions(tsAst, classInfoCache) {
    traverse(tsAst, {
        ClassDeclaration(path) {
            if (isEnumClass(path)) {
                const className = path.node.id.name;
                classInfoCache[className].enumValues = extractEnumValues(path);
            }
        },
    });
}
```

#### 4. **生成 Schema**
```javascript
function generateSchema(classInfo, allInterfaces, allInheritanceInfo) {
    const schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        definitions: {},
    };

    for (const className in classInfo) {
        const classDefinition = buildClassDefinition(classInfo[className], allInheritanceInfo[className]);
        schema.definitions[className] = classDefinition;
    }

    return schema;
}
```

---

### 总结

通过合并提取逻辑，利用生成的 JavaScript 代码的结构特性，在遍历类声明时直接提取继承信息、`structureTypeName` 和版本信息，避免了重新扫描 AST，显著提高了性能。同时，保持单次扫描和按需缓存的优化策略，进一步减少了内存占用。
