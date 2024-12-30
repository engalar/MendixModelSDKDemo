# get exist microflow json model
```
{kb/model_sdk.md}
通过 model sdk读取模块Example下名为Microflow的微流并序列化为json保存到文件
```

# get app json model
```
{json schema}
{app snapshot}
先生成学生选课系统的需求文档，然后
严格按照json schema生成应用的json模型，并满足如下要求：
# 页面
用DataView和ListView作为数据容器，而其中的widget需要绑定数据属性.
已有widget不能完整表达ui时，用page.schema.json#/definitions/Label来占位，方便开发者后续完善。
# domain
# 微流
已有活动不能完整表达逻辑时，用注解(Microflows$Annotation)来占位，方便开发者后续完善。
```

```
继续生成json，注意衔接
```

# create from json model
```
{kb/model_sdk.md}
{app.model.json}
通过 model sdk读取app.model.json创建应用，尽可能采用反序列化的方式
```

# schema extract
```
{.js}
{.d.ts}
{.schema.json}

思考从domainmodels.js和domainmodels.d.ts.txt（实际上是typescript typing）用AST提取出domain.schema.json
```

# temp
{schema.ts}
{pages.schema.json}
解决如下问题，要求给出修改部分，方便我新增和替换（方便定位，并保持前后整个布局不变）。先给出修改前后的算法描述，再给出修改步骤。
# 问题：当类为模块外部时无法正确处理并列出其目标类的所有子类
PageParameter/parameterType  is datatypes.schema.json#/definitions/DataType
tsAst中：
class PageParameter extends internal.Element<IModel> implements IPageParameter {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsPage(): Page;
        get name(): string;
        set name(newValue: string);
        get parameterType(): datatypes.DataType;

## 提示
- 无论是类是否为当前模块都要缓存模块名，以便在生成另外模块的schema时能够正确处理是否需要保留模块名。例如 在扫描M1/C1时，如果不缓存M1，那么当在M2被引用时，就有可能误认为是M2的类。