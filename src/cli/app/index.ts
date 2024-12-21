import { MendixPlatformClient } from "mendixplatformsdk";


// app create
export async function AppCreate(name: string) {
    console.log(`create app ${name}`);
}

// app show
export async function AppShow(appId: string) {
    // check arg
    if (!appId) {
        console.log("No app id provided");
        throw new Error("No app id provided");
    }
    const client = new MendixPlatformClient();
    const app = await client.getApp(appId);
    console.log(`https://sprintr.home.mendix.com/link/teamserver/${app.appId} ${(await app.getRepository().getInfo()).url}`);
}