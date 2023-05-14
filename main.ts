import { MendixPlatformClient } from "mendixplatformsdk";
import { batchGenMicroflow } from "./batchGenMicroflow";
import { batchGenAttribue } from "./batchGenAttribue";

const APP_ID = "4160aabf-9ee0-44ce-aa1f-ec4cf6a4243c";
// PAT 写入环境变量 MENDIX_TOKEN
// https://user-settings.mendix.com/link/developersettings
// Model Repository + Model Server

async function main() {
  const workingCopy = await getApp(APP_ID);

  //MyFirstModule
  const moduleName = "DiscountAutomation",
    entityName = "Opportunity2",
    microflowName = "Microflow";
  // await batchGenAttribue(workingCopy, moduleName, entityName);
  await batchGenMicroflow(
    workingCopy,
    `${moduleName}.${microflowName}`,
    `${moduleName}.${entityName}`
  );

  async function getApp(ai: string) {
    const client = new MendixPlatformClient();
    const app = await client.getApp(ai);

    const workingCopy = await app.createTemporaryWorkingCopy("main");
    return workingCopy;
  }
}

main().catch(console.error);
