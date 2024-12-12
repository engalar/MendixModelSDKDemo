import { IModel, JavaScriptSerializer } from "mendixmodelsdk";
import { boot } from "../lib/bootstrap";
import { _saveToDumyFile } from "../lib/serialize";

boot(testSerializeToJs_Page);

async function testSerializeToJs_Page(model: IModel) {
    // model.findMicroflowByQualifiedName("MyFirstModule.Microflow").delete();
    const systemModel = await model
        .findModuleByQualifiedName("MendixSSO")
        .domainModel.load();

    const js = JavaScriptSerializer.serializeToJs(systemModel);
    console.log(js);

    const page = await model
        .findPageByQualifiedName("MyFirstModule.Home_Web")
        .load();
    const js2 = JavaScriptSerializer.serializeToJs(page);
    console.log(js2);

    return false;
}
