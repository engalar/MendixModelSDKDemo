import { IModel } from "mendixmodelsdk";
import { MendixPlatformClient } from "mendixplatformsdk";
import { saveToFile } from "./serialize";

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
    saveToFile(JSON.stringify(workingCopy), "currentWorkingCopy.json");
    const model = await workingCopy.openModel();

    if (await cb(model)) {
        await model.flushChanges();
        await workingCopy.commitToRepository(branchName);
    }
}

export async function createNewApp(name: string) {
    const client = new MendixPlatformClient();
    const app = await client.createNewApp(name, {
        templateId: 'a2065e4a-bebd-4e13-ae5b-ef0bf89ebf4d' // https://marketplace.mendix.com/link/component/51830

        //Releases V 10.12.41995
    });
}
