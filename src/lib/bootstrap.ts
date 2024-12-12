import { IModel } from "mendixmodelsdk";
import { MendixPlatformClient } from "mendixplatformsdk";

export async function boot(
    cb: (model: IModel) => Promise<boolean>,
    appID: string = process.env.APP_ID,
    branchName: string = "main",
) {
    const client = new MendixPlatformClient();
    const app = client.getApp(appID);

    const workingCopy = await app.createTemporaryWorkingCopy(branchName);
    const model = await workingCopy.openModel();

    if (await cb(model)) {
        await model.flushChanges();
        await workingCopy.commitToRepository(branchName);
    }
}
