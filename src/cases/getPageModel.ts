require("dotenv").config();

import { IModel, projects, microflows, pages } from "mendixmodelsdk";
import { MendixPlatformClient } from "mendixplatformsdk";
import * as fs from 'fs';

async function main() {
    const appId = "b67d8b80-c748-4153-b9f1-d22e5a7f84ba"; // 你的 App ID
    const branchName = "main"; // 分支名称，通常为 "main"
    const moduleName = "Example"; // 模块名称
    const pageName = "Page"; // 微流名称
    const outputFilePath = "Example.Page.page.json"; // 输出文件路径

    try {
        const client = new MendixPlatformClient();
        const app = client.getApp(appId);
        const workingCopy = await app.createTemporaryWorkingCopy(branchName);
        const model = await workingCopy.openModel();

        // 查找微流
        const page = await findPage(model, moduleName, pageName);

        if (page) {
            // 序列化微流为 JSON
            const pageJson = page.asLoaded().toJSON();
            const pageJsonString = JSON.stringify(pageJson, null, 2);

            // 保存到文件
            fs.writeFileSync(outputFilePath, pageJsonString);

            console.log(`Microflow "${pageName}" in module "${moduleName}" has been serialized to ${outputFilePath}`);
        } else {
            console.error(`Microflow "${pageName}" not found in module "${moduleName}"`);
        }

        // 关闭连接
        model.closeConnection();

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

async function findPage(model: IModel, moduleName: string, pageName: string): Promise<pages.Page | null> {
    const module = model.allModules().find((m) => m.name === moduleName);
    if (!module) {
        console.error(`Module "${moduleName}" not found.`);
        return null;
    }

    const page = module.documents
        .filter((doc): doc is pages.Page => doc instanceof pages.Page)
        .find((pg) => pg.name === pageName);

    if (page) {
        return await page.load();
    }

    return null;
}

main();