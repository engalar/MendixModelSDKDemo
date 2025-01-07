require("dotenv").config();

import { MendixPlatformClient } from "mendixplatformsdk";
import * as fs from 'fs';

async function main() {
    const appId = "b67d8b80-c748-4153-b9f1-d22e5a7f84ba"; // 你的 App ID
    const branchName = "main"; // 分支名称，通常为 "main"
    const moduleName = "MyFirstModule"; // 模块名称
    const outputFilePath =`${moduleName}.module.json`; // 输出文件路径

    try {
        const client = new MendixPlatformClient();
        const app = client.getApp(appId);
        const workingCopy = await app.createTemporaryWorkingCopy(branchName);
        const model = await workingCopy.openModel();

        const module = model.allModules().find((m) => m.name === moduleName);
        // 查找微流

        if (module) {
            // 序列化微流为 JSON
            const moduleJson = module.toJSON();
            const moduleJsonString = JSON.stringify(moduleJson, null, 2);

            // 保存到文件
            fs.writeFileSync(outputFilePath, moduleJsonString);

            console.log(`Module "${moduleName}"  has been serialized to ${outputFilePath}`);
        } else {
            console.error(`Module "${moduleName}" not found`);
        }

        // 关闭连接
        model.closeConnection();

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();