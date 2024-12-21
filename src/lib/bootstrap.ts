import { IModel } from "mendixmodelsdk";
import { MendixPlatformClient } from "mendixplatformsdk";
import { _saveToDumyFile } from "./serialize";

export async function boot(
    cb: (model: IModel) => Promise<boolean>,
    appID: string = process.env.APP_ID,
    branchName: string = "main",
    workingCopyId: string = process.env.WORKING_COPY_ID,
) {
    const client = new MendixPlatformClient();
    const app = client.getApp(appID);

    const workingCopy = workingCopyId
        ? app.getOnlineWorkingCopy(workingCopyId)
        : await app.createTemporaryWorkingCopy(branchName);
    _saveToDumyFile(JSON.stringify(workingCopy), "currentWorkingCopy.json");
    const model = await workingCopy.openModel();

    if (await cb(model)) {
        await model.flushChanges();
        await workingCopy.commitToRepository(branchName);
    }
}

export async function createNewApp(name: string) {
    const client = new MendixPlatformClient();
    const app = await client.createNewApp(name);
}
