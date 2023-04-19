import { MendixPlatformClient } from "mendixplatformsdk";
import { batchGenMicroflow } from "./batchGenMicroflow";

// https://sprintr.home.mendix.com/link/teamserver/89a91e35-0f4f-4e27-81d9-d34ca76e31b9
const APP_ID = "89a91e35-0f4f-4e27-81d9-d34ca76e31b9";
// PAT 写入环境变量 MENDIX_TOKEN
// https://user-settings.mendix.com/link/developersettings
// Model Repository + Model Server

async function main() {
  const client = new MendixPlatformClient();

  const workingCopy = await getApp();
  await batchGenMicroflow(workingCopy);

  async function getApp() {
    const app = await client.getApp(APP_ID);

    const workingCopy = await app.createTemporaryWorkingCopy("main");
    return workingCopy;
  }
  async function newApp() {
    const app = await client.createNewApp(`NewApp-${Date.now()}`, {
      repositoryType: "git",
    });

    await client.getApp(APP_ID);

    const workingCopy = await app.createTemporaryWorkingCopy("main");
    return workingCopy;
  }
}

main().catch(console.error);
