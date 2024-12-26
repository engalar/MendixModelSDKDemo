require("dotenv").config();

import {
    createModelUnitFromJSON,
    domainmodels,
    IModel,
    microflows,
    pages,
    projects,
} from "mendixmodelsdk";
import {
    MendixPlatformClient,
    OnlineWorkingCopy,
} from "mendixplatformsdk";
import * as fs from "fs";

const appId = "b67d8b80-c748-4153-b9f1-d22e5a7f84ba"; // 你的 App ID

async function main() {
    const client = new MendixPlatformClient();
    const app = await client.getApp(appId);
    const workingCopy = await app.createTemporaryWorkingCopy("main");
    const model = await workingCopy.openModel();

    try {
        await createAppFromJson(model, "./demos/gemini.app.model.json");

        await model.flushChanges();
        await workingCopy.commitToRepository("main");
        console.log("Successfully created app from JSON.");
    } catch (error) {
        console.error("Error creating app from JSON:", error);
    } finally {
        model.closeConnection();
    }
}

async function createAppFromJson(model: IModel, filePath: string) {
    const appJsonString = fs.readFileSync(filePath, "utf-8");
    const appJson = JSON.parse(appJsonString);

    // 删除 $schema 属性
    delete appJson["$schema"];

    const project = model.allProjects()[0];
    // project. = appJson.settings.applicationName;

    for (const moduleJson of appJson.modules) {
        await createModuleFromJSON(model, project, moduleJson);
    }
}

async function createModuleFromJSON(
    model: IModel,
    project: projects.IProject,
    moduleJson: any,
) {
    const module = projects.Module.createIn(project);
    module.name = moduleJson.name;
    createDomainModelFromJSON(
        module,
        moduleJson.domainModel,
    );

    // Pages
    const pagesFolder = projects.Folder.createIn(module);
    pagesFolder.name = "Pages";
    for (const pageJson of moduleJson.children.find(
        (child: any) => child.name === "Pages",
    ).children) {
        createPageFromJSON(model, module, pageJson);
    }

    // Microflows
    const microflowsFolder = projects.Folder.createIn(module);
    microflowsFolder.name = "Microflows";
    for (const microflowJson of moduleJson.children.find(
        (child: any) => child.name === "Microflows",
    ).children) {
        createMicroflowFromJSON(model, module, microflowJson);
    }
}

function createDomainModelFromJSON(
    module: projects.Module,
    domainModelJson: any,
) {
    delete domainModelJson["$schema"]; // 如果存在 $schema 属性，需要删除
    createModelUnitFromJSON(
        module,
        "domainModel",
        domainModelJson,
    ) as domainmodels.DomainModel;
}

function createPageFromJSON(
    model: IModel,
    module: projects.Module,
    pageJson: any,
) {
    delete pageJson.document["$schema"]; // 如果存在 $schema 属性，需要删除
    return createModelUnitFromJSON(
        module,
        "documents",
        pageJson.document,
    ) as pages.Page;
}

function createMicroflowFromJSON(
    model: IModel,
    module: projects.Module,
    microflowJson: any,
) {
    delete microflowJson.document["$schema"]; // 如果存在 $schema 属性，需要删除
    return createModelUnitFromJSON(
        module,
        "documents",
        microflowJson.document,
    ) as microflows.Microflow;
}

main();
