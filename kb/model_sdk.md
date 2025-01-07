# Mendix Model SDK

Mendix Model SDK 允许你以编程方式读取、修改和创建 Mendix 应用的模型。这使得自动化构建、测试和部署 Mendix 应用成为可能。

## 安装

```sh
npm install mendixmodelsdk@^4.93.0 mendixplatformsdk@^5.1.3
```

## 获取已存在的应用模型

```ts
import { IModel } from "mendixmodelsdk";
import { MendixPlatformClient } from "mendixplatformsdk";

const branchName = "main"; // 分支名称，通常为 "main"
const appID = "your app id"; // 你的 App ID
const workingCopyId = "your last created workingCopyId"; // 可选：已有的在线工作副本 ID

const client = new MendixPlatformClient();// 自动读取环境变量MENDIX_TOKEN完成认证
const app = client.getApp(appID);

// 获取在线工作副本，如果提供了 workingCopyId 则获取指定的，否则创建一个新的
const workingCopy = workingCopyId
        ? app.getOnlineWorkingCopy(workingCopyId)
        : await app.createTemporaryWorkingCopy(branchName);
const model = await workingCopy.openModel();

// 对 model 进行操作
// ...

// 提交更改并推送到仓库
await model.flushChanges();
await workingCopy.commitToRepository(branchName);
```

**注意:** OnlineWorkingCopy 在一段时间后可能会被远程服务清理，因此建议在需要时创建新的。

## 创建新应用

```ts
const app = await client.createNewApp(name, {
        templateId: 'a2065e4a-bebd-4e13-ae5b-ef0bf89ebf4d' // 模板 ID，本质上也是一个 App ID
});
```

模板 ID 可以从 [Mendix Marketplace](https://marketplace.mendix.com/link/component/51830) 获取，例如 `a2065e4a-bebd-4e13-ae5b-ef0bf89ebf4d` 对应的是 "Blank App" 模板。

## 删除和创建

```ts
import { MendixPlatformClient } from "mendixplatformsdk";

async function deleteAndCreateApp(
    appIdToDelete: string,
    newAppName: string,
    templateId?: string,
) {
    const client = new MendixPlatformClient();

    try {
        // 删除应用
        console.log(`Deleting app with ID: ${appIdToDelete}`);
        const appToDelete = await client.getApp(appIdToDelete);
        await appToDelete.delete();
        console.log(`App with ID ${appIdToDelete} deleted successfully.`);

        // 创建新应用
        console.log(`Creating new app with name: ${newAppName}`);
        const newApp = await client.createNewApp(newAppName, { templateId });
        console.log(`New app created with ID: ${newApp.appId}`);
        console.log(`New app name: ${newAppName}`);
        console.log(
            `New app repository address: ${(await newApp.getRepository().getInfo()).url}`,
        );
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

// 使用示例
const appIdToDelete = "b67d8b80-c748-4153-b9f1-d22e5a7f84ba"; // 要删除的应用的 ID
const newAppName = "_ModelSdkDemo250107"; // 新应用的名称

// v10.12.9
const templateId = "89a91e35-0f4f-4e27-81d9-d34ca76e31b9"; // 可选：模板 ID，例如 "Blank App"
deleteAndCreateApp(appIdToDelete, newAppName, templateId);
```

## 创建新模块

```ts
import { projects } from "mendixmodelsdk";
const project = model.allProjects()[0];
const module = projects.Module.createIn(project);
module.name = "NewModuleName";
```

## 操作实体 (Entity)

### 创建实体

```ts
import { domainmodels } from "mendixmodelsdk";

function createEntity(
    domainModel: domainmodels.DomainModel,
    entityName: string,
    attributeName: string,
) {
    const newEntity = domainmodels.Entity.createIn(domainModel);
    newEntity.name = entityName;
    newEntity.location = { x: 100, y: 100 }; // 设置实体在 Studio Pro 中的位置

    const newAttribute = domainmodels.Attribute.createIn(newEntity);
    newAttribute.name = attributeName;
}
```

### 获取实体和属性

```ts
// 方式一：通过 module 获取
const domainModel = model.root.modules[0].domainModel;

// 方式二：获取所有 Domain Models
const domainModel = model.allDomainModels()[0];

// 查找名为 "Customer" 的实体
const customerEntity = domainModel.entities.filter(
    (entity) => entity.name === "Customer",
)[0];

// 获取第一个属性的名称
const attributeName = customerEntity.attributes[0].name;
```

## 获取 App Store 模块信息
模块分两类：一类是从App Store安装的、另一类是项目创建的
```ts
model
    .allModules()
    .filter((module) => module.fromAppStore === true)
    .forEach((module) =>
        console.log({
            name: module.name,
            appStoreVersion: module.appStoreVersion,
            appStoreGuid: module.appStoreGuid,
            appStoreVersionGuid: module.appStoreVersionGuid,
        }),
    );
```

## 加载模型单元

```ts
const domainModel = model.allDomainModels()[0];
const entity1Interface = domainModel.entities[0];

console.log(entity1Interface.isLoaded); // 输出: false

const entity1 = await entity1Interface.load();

console.log(entity1.isLoaded); // 输出: true
console.log(entity1Interface === entity1); // 输出: true
console.log(domainModel.isLoaded); // 输出: true

const fullDomainModel = domainModel.asLoaded();
const entity2: domainmodels.Entity = fullDomainModel.entities[1];
console.log(entity2.isLoaded); // 输出: true
```

-   初始状态下，模型单元（如 Domain Model）只加载了接口部分，`isLoaded` 属性为 `false`。
-   调用 `load()` 方法可以加载完整的模型单元，`isLoaded` 属性变为 `true`。
-   加载一个模型单元会同时加载其包含的所有子元素。
-   可以使用 `asLoaded()` 方法将已加载的模型单元转换为完全加载的类型。

## 序列化模型

```ts
// to js string
const domainModel = model.allDomainModels()[0];
console.log(JavaScriptSerializer.serializeToJs(domainModel));

// to json string
const domainModelJson = domainModel.asLoaded().toJSON();
const domainModelJsonString = JSON.stringify(domainModelJson);
```

可以使用 `JavaScriptSerializer.serializeToJs()` 将模型单元序列化为 JavaScript 对象，方便进行数据传输或存储。



## 反序列化模型

```ts
import {
    createModelUnitFromJSON,
    IAbstractElementJson,
    IModel,
} from "mendixmodelsdk";
const module = model.findModuleByQualifiedName(moduleName);
const json = JSON.parse(some_model_json_string);
delete json["$schema"]; // 如果存在 $schema 属性，需要删除
createModelUnitFromJSON(module, attributeName, json);
return true;
```

可以使用 `createModelUnitFromJSON()` 方法将 JSON 数据反序列化为模型单元。

-   `module`:  要将模型单元添加到的模块。
-   `attributeName`:  模块中用于存储模型单元的属性名称。
    -   对于 `DomainModels$DomainModel` 类型，应设置为 `"domainModel"`。
    -   对于 `Pages$Page` 等其他文档类型，应设置为 `"documents"`。
-   `json`:  表示模型单元的 JSON 数据。目前仅支持page、domain和microflow，不支持module

## 关闭连接

```ts
async function closeConnection(workingCopy: OnlineWorkingCopy) {
    (await workingCopy.openModel()).closeConnection();
}
```
对model的操作完成后需要进行关闭
# 总结
以上是 Mendix Model SDK 的基本用法，包括安装、获取模型、创建应用和模块、操作实体等。通过这些 API，你可以编写脚本来自动化处理 Mendix 应用的模型，实现更高效的开发和部署流程。
