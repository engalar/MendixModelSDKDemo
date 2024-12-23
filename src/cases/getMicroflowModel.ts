require("dotenv").config();

import { IModel, projects, microflows } from "mendixmodelsdk";
import { MendixPlatformClient } from "mendixplatformsdk";
import * as fs from 'fs';

async function main() {
    const appId = "b67d8b80-c748-4153-b9f1-d22e5a7f84ba"; // 你的 App ID
    const branchName = "main"; // 分支名称，通常为 "main"
    const moduleName = "Example"; // 模块名称
    const microflowName = "Microflow_3"; // 微流名称
    const outputFilePath = "microflow_3.json"; // 输出文件路径

    try {
        const client = new MendixPlatformClient();
        const app = client.getApp(appId);
        const workingCopy = await app.createTemporaryWorkingCopy(branchName);
        const model = await workingCopy.openModel();

        // 查找微流
        const microflow = await findMicroflow(model, moduleName, microflowName);

        if (microflow) {
            // 序列化微流为 JSON
            const microflowJson = microflow.asLoaded().toJSON();
            const microflowJsonString = JSON.stringify(microflowJson, null, 2);

            // 保存到文件
            fs.writeFileSync(outputFilePath, microflowJsonString);

            console.log(`Microflow "${microflowName}" in module "${moduleName}" has been serialized to ${outputFilePath}`);
        } else {
            console.error(`Microflow "${microflowName}" not found in module "${moduleName}"`);
        }

        // 关闭连接
        model.closeConnection();

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

async function findMicroflow(model: IModel, moduleName: string, microflowName: string): Promise<microflows.Microflow | null> {
    const module = model.allModules().find((m) => m.name === moduleName);
    if (!module) {
        console.error(`Module "${moduleName}" not found.`);
        return null;
    }

    const microflow = module.documents
        .filter((doc): doc is microflows.Microflow => doc instanceof microflows.Microflow)
        .find((mf) => mf.name === microflowName);

    if (microflow) {
        return await microflow.load();
    }

    return null;
}

main();