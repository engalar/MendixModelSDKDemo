import { IModel, JavaScriptSerializer } from "mendixmodelsdk";
import { boot } from "../lib/bootstrap";
import { _saveToDumyFile } from "../lib/serialize";

boot(testSerializeToJs_Page);

async function testSerializeToJs_Page(model: IModel) {
    // model.findMicroflowByQualifiedName("MyFirstModule.Microflow").delete();
    const systemModel = await model
        .findModuleByQualifiedName("MendixSSO")
        .domainModel.load();

    const domainScriptString = JavaScriptSerializer.serializeToJs(systemModel);
    _saveToDumyFile(domainScriptString, "domain.js");

    const page = await model
        .findPageByQualifiedName("MyFirstModule.Home_Web")
        .load();
    const homePageScriptString = JavaScriptSerializer.serializeToJs(page);
    _saveToDumyFile(homePageScriptString, "homePage.js");

    return false;
}
