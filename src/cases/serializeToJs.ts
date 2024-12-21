import { IModel, JavaScriptSerializer } from "mendixmodelsdk";
import { boot } from "../lib/bootstrap";
import { saveToFile } from "../lib/serialize";

boot(testSerializeToJs_Page);

async function testSerializeToJs_Page(model: IModel) {
    // model.findMicroflowByQualifiedName("MyFirstModule.Microflow").delete();
    const systemModel = await model
        .findModuleByQualifiedName("MendixSSO")
        .domainModel.load();

    const domainScriptString = JavaScriptSerializer.serializeToJs(systemModel);
    saveToFile(domainScriptString, "domain.js");

    const page = await model
        .findPageByQualifiedName("MyFirstModule.Home_Web")
        .load();
    const homePageScriptString = JavaScriptSerializer.serializeToJs(page);
    saveToFile(homePageScriptString, "homePage.js");

    return false;
}
