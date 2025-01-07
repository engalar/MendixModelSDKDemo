require("dotenv").config();
import { MendixPlatformClient } from "mendixplatformsdk";

async function deleteAndCreateApp(
    appIdToDelete: string,
    newAppName: string,
    templateId?: string,
) {
    const client = new MendixPlatformClient();

    try {
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
const templateId = "a2065e4a-bebd-4e13-ae5b-ef0bf89ebf4d"; // 可选：模板 ID，例如 "Blank App"

deleteAndCreateApp(appIdToDelete, newAppName, templateId);