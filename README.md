在node_modules/mendixmodelsdk/src/gen下有一批模块代码（排除all-model-classes和base-model），每个模块包含两个文件，实现文件（{module_name}.js）和类型声明文件（{module_name}.d.ts）。
我需要提取所有模块的信息，并转换进而生成json schema（每个模块对应一个，命名为schemas/gen/{module_name}.schema.json，而公共部分放入common.schema.json）。

# 实现文件
## 提取规则
### 模块
模块的命名空间nameSpace=moduleName
在命名空间下定义有普通类，提取其类名(qualifiedClassName)和继承(qualifiedSuperClassName)以及实现(qualifiedImplementName)，全部要求为Qualified名。

### 常规类
在qualifiedClassName的构造方法下有若干双下划线开头的属性初始化语句，提取其propertyName和属性实例类qualifiedPropertyClassName，属性默认值propertyDefaultValue，属性值类型propertyValueQualifiedType。示例语句this.__{propertyName} = new {qualifiedPropertyClassName}({qualifiedClassName}, this, "{propertyName}", {propertyDefaultValue}, {qualifiedPropertyClassName})。
当然qualifiedPropertyClassName有好几种，每一种都有不同的处理策略。

### 属性
#### PrimitiveProperty
this.__description = new internal.PrimitiveProperty(AppServiceAction, this, "description", "", internal.PrimitiveTypeEnum.String);

export declare enum PrimitiveTypeEnum {
    Integer = 0,
    String = 1,
    Boolean = 2,
    Double = 3,
    DateTime = 4,
    Guid = 5,
    Point = 6,
    Size = 7,
    Color = 8,
    Blob = 9
}
#### ByNameReferenceProperty
            this.__microflow = new internal.ByNameReferenceProperty(AppServiceAction, this, "microflow", null, "Microflows$Microflow");
#### PartListProperty
            this.__parameters = new internal.PartListProperty(AppServiceAction, this, "parameters", []);
#### PartProperty
            this.__actionReturnType = new internal.PartProperty(AppServiceAction, this, "actionReturnType", null, true);
### 枚举类
枚举类在当前上下文下是一个普通类，只是因为继承自internal.AbstractEnum。
如
class AggregateFunction extends internal.AbstractEnum {}
AggregateFunction.None = new AggregateFunction("None", {});
AggregateFunction.Average = new AggregateFunction("Average", {});

则提取到枚举类AggregateFunction，它有两个条目None和Average。通常条目定义在相邻的枚举类定义姊妹节点进行

### structureTypeName
在常规类定义的下一姊妹AST节点有一个
{qualifiedClassName}.structureTypeName = "structureTypeName";
### versionInfo
在structureTypeName定义的下一姊妹AST节点有一个
以类名qualifiedClassName为EntityCapabilities为例

EntityCapabilities.versionInfo = new exports.StructureVersionInfo({
    introduced: "8.12.0",
    deleted: "9.0.1",
    deletionMessage: null,
    properties: {
        countable: {
            public: {
                currentValue: true,
                changedIn: ["8.14.0"]
            },
            type: {
                deleted: "7.9.0",
                deletionMessage: "Use property 'parameterType' instead"
            }
        }
    },
    public: {
        currentValue: true
    }
}, internal.StructureType.Element);

识别相关的deleted标记，第一个表示当前类删除，第二个表示名为type的属性删除。
### required

### 继承

### 多态
propertyName的schema类型有几类
原始类型：如string boolean等原始类型
固定类型：如Position、Size、Color等著名类型，提前在common.schema.json中定义好再引用。
常规类类型：提取到的常规类
id引用类型：本质是string，但通过id指向的是属性$ID相同的对象。
name引用类型：同id引用，不过指向的是属性name相同的对象
多态引用类型：根据提取到的继承关系，指向父类型，但实际上它的所有子孙也是可以的。

## 转换规则
module_name所在模块提取到的qualifiedClassName（过滤掉deleted标记的）及其属性propertyName（过滤掉deleted标记的）放入
qualifiedClassName经过转换逻辑转换后得到defineName
{module_name}.schema.json
```json
{
    "definitions":{
        "{defineName}": {
            "type": "object",
            "properties": {
                "$ID": {
                    "$ref": "common.schema.json#/definitions/Identifiable"
                },
                "$Type": {
                    "type": "string",
                    "enum": ["{structureTypeName}"]
                },
                "{propertyName}": // propertyType
            },
            "required": [
                "$ID",
                "$Type",
                // required propertyName
            ],
            "allOf": [
                {
                    "$merge": {
                        "source": {
                        "$ref": "{module_name}.schema.json#/definitions/{superClassName}"
                        },
                        "with": {
                            "$Type": {
                                "type": "string",
                                "const": "{structureTypeName}"
                            }
                        }
                    }
                }
            ]
        }
    }
}
```
# 类型声明文件
类型声明文件是在typescript源码编译生成实现文件后产生的对应typing文件，我们可从中提取出额外的需要的信息。

# 算法实现

### **分阶段处理的算法架构设计**

#### **1. 主流程设计**
主流程分为两个阶段：提取阶段和转换阶段。

```typescript
class MainProcess {
    private inputModule: InputModule;
    private extractionModule: ExtractionModule;
    private transformationModule: TransformationModule;
    private outputModule: OutputModule;
    private commonModule: CommonModule;

    constructor() {
        // 初始化各个模块
        this.inputModule = new InputModule();
        this.extractionModule = new ExtractionModule();
        this.transformationModule = new TransformationModule();
        this.outputModule = new OutputModule();
        this.commonModule = new CommonModule();
    }

    async run() {
        // 1. 读取模块文件列表
        const moduleFiles = this.inputModule.readModuleFiles();

        // 2. 提取阶段：逐个模块懒加载并提取信息
        const extractedInfos: ExtractedInfo[] = [];
        for (const file of moduleFiles) {
            // 懒加载：按需解析实现文件和类型声明文件
            const implementationInfo = await this.inputModule.parseImplementation(file.implementationPath);
            const declarationInfo = await this.inputModule.parseDeclaration(file.declarationPath);

            // 提取信息
            const extractedInfo = this.extractionModule.extract(implementationInfo, declarationInfo);
            extractedInfos.push(extractedInfo);
        }

        // 3. 转换阶段：在所有提取完成后，统一进行转换
        const transformedSchemas = this.transformationModule.transformAll(extractedInfos);

        // 4. 处理公共部分
        const commonSchema = this.commonModule.process(extractedInfos);

        // 5. 写入文件
        transformedSchemas.forEach((schema, index) => {
            const moduleName = moduleFiles[index].name;
            this.outputModule.write(`schemas/gen/${moduleName}.schema.json`, schema);
        });
        this.outputModule.write('common.schema.json', commonSchema);
    }
}
```

---

#### **2. 分阶段处理的实现**

1. **提取阶段**：
   - 逐个模块懒加载并提取信息，将提取结果暂存到 `extractedInfos` 数组中。
   - 示例实现：
     ```typescript
     const extractedInfos: ExtractedInfo[] = [];
     for (const file of moduleFiles) {
         const implementationInfo = await this.inputModule.parseImplementation(file.implementationPath);
         const declarationInfo = await this.inputModule.parseDeclaration(file.declarationPath);
         const extractedInfo = this.extractionModule.extract(implementationInfo, declarationInfo);
         extractedInfos.push(extractedInfo);
     }
     ```

2. **转换阶段**：
   - 在所有提取完成后，调用 `transformationModule.transformAll` 方法统一进行转换。
   - 示例实现：
     ```typescript
     class TransformationModule {
         transformAll(extractedInfos: ExtractedInfo[]): JsonSchema[] {
             return extractedInfos.map(extractedInfo => this.transform(extractedInfo));
         }

         private transform(extractedInfo: ExtractedInfo): JsonSchema {
             // 转换逻辑
             return { /* 转换后的 JSON Schema */ };
         }
     }
     ```

---

#### **3. 模块之间的数据流动**

1. **输入模块**：
   - 输入：模块文件的路径。
   - 输出：按需解析后的实现文件内容（`ImplementationInfo`）和类型声明文件内容（`DeclarationInfo`）。

2. **提取模块**：
   - 输入：解析后的实现文件内容（`ImplementationInfo`）和类型声明文件内容（`DeclarationInfo`）。
   - 输出：提取到的模块信息（`ExtractedInfo`）。

3. **转换模块**：
   - 输入：所有提取到的模块信息（`ExtractedInfo[]`）。
   - 输出：转换后的 JSON Schema 数组（`JsonSchema[]`）。

4. **公共模块**：
   - 输入：所有提取到的模块信息（`ExtractedInfo[]`）。
   - 输出：公共部分的 JSON Schema（`CommonSchema`）。

5. **输出模块**：
   - 输入：转换后的 JSON Schema 数组（`JsonSchema[]`）和公共部分的 JSON Schema（`CommonSchema`）。
   - 输出：生成的 `schemas/gen/{module_name}.schema.json` 和 `common.schema.json` 文件。

---

#### **4. 数据结构的定义**

数据结构与之前的设计保持一致：

```typescript
// 解析后的实现文件内容
interface ImplementationInfo {
    moduleName: string;
    content: any; // 具体内容根据解析器实现决定
}

// 解析后的类型声明文件内容
interface DeclarationInfo {
    moduleName: string;
    content: any; // 具体内容根据解析器实现决定
}

// 提取到的模块信息
interface ExtractedInfo {
    moduleName: string;
    classes: ClassInfo[];
    enums: EnumInfo[];
    properties: PropertyInfo[];
    versionInfo: VersionInfo[];
    // 其他提取到的信息
}

// 转换后的 JSON Schema
interface JsonSchema {
    definitions: {
        [defineName: string]: {
            type: string;
            properties: {
                [propertyName: string]: any;
            };
            required: string[];
            allOf?: any[];
        };
    };
}

// 公共部分的 JSON Schema
interface CommonSchema {
    definitions: {
        [defineName: string]: any;
    };
}
```

---

#### **5. 处理有歧义的地方**

对于有歧义的地方，仍然通过抽象接口的具体实现来处理。例如：

1. **属性类型的处理**：
   - 在提取模块中，调用 `IPropertyProcessor` 的具体实现来处理不同类型的属性。

2. **多态引用的处理**：
   - 在转换模块中，调用 `IPolymorphicProcessor` 的具体实现来处理多态引用类型。

3. **版本信息的解析**：
   - 在提取模块中，调用 `IVersionInfoProcessor` 的具体实现来解析版本信息。

4. **required 属性的确定**：
   - 在转换模块中，调用 `IRequiredProcessor` 的具体实现来确定必填属性。

5. **枚举类的条目提取**：
   - 在提取模块中，调用 `IEnumProcessor` 的具体实现来提取枚举类及其条目。

6. **JSON Schema 的生成规则**：
   - 在转换模块中，调用 `ISchemaGenerator` 的具体实现来生成 JSON Schema。

7. **类型声明文件的补充信息**：
   - 在提取模块中，调用 `ISupplementalInfoProcessor` 的具体实现来提取并补充额外信息。

---

#### **6. 示例调用**

```typescript
const mainProcess = new MainProcess();
mainProcess.run();
```

---

### **总结**

通过分阶段处理，算法能够在提取阶段逐个模块懒加载并提取信息，然后在转换阶段统一进行转换和生成 JSON Schema。这种方式既满足了“需要等所有提取完成后才能进行转换”的需求，又通过懒加载优化了内存使用效率。