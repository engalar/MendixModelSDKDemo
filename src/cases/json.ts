import { createElementFromJSON } from "mendixmodelsdk";
import { boot } from "../lib/bootstrap";
import { _saveToDumyFile } from "../lib/serialize";

boot(async (model) => {
    // page
    const iPage = model.findPageByQualifiedName("MyFirstModule.Home_Web");
    const page = await iPage.load();
    _saveToDumyFile(JSON.stringify(page.toJSON()), "page.structure.json");
    // domain
    const iModule = model.findModuleByQualifiedName("MyFirstModule");
    const module = await iModule.domainModel.load();
    _saveToDumyFile(JSON.stringify(module.toJSON()), "domain.structure.json");
    // microflow
    const iMicroflow = model.findMicroflowByQualifiedName(
        "MyFirstModule.DS_GetUser",
    );
    const microflow = await iMicroflow.load();
    _saveToDumyFile(
        JSON.stringify(microflow.toJSON()),
        "microflow.structure.json",
    );
    return false;
});
