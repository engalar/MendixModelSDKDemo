const pSdk = require('mendixplatformsdk');
const mSdk = require('mendixmodelsdk');


//https://sprintr.home.mendix.com/link/settings/89a91e35-0f4f-4e27-81d9-d34ca76e31b9
const API_KEY = '0eaa16f8-97df-4572-bd97-c3ef469386fd';
const APP_ID = '89a91e35-0f4f-4e27-81d9-d34ca76e31b9';

// https://user-settings.mendix.com/link/developersettings
// const Personal_Access_Token = 'some string put to MENDIX_TOKEN env var';

const client = new pSdk.MendixPlatformClient();

const app = client.getApp(APP_ID);

async function main() {
    const wc = await
        app.getOnlineWorkingCopy('main');
        // app.createTemporaryWorkingCopy('branches/nn');

    const model = await wc.openModel();

    const newEntity = new mSdk.domainmodels.Entity(model);
    newEntity.name = 'ExampleEntity';

    model.addEntity(newEntity);

    await client.platform().commitOnlineModelVersion({
        workingCopyId: appId,
        branch,
        revision: domainModel.metaData.version,
        commitMessage: 'Added new entity ExampleEntity'
    });
}

main().catch(e => {
    console.log(e);
});