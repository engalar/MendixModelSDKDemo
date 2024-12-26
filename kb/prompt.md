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