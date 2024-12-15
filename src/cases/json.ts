import { createElementFromJSON } from "mendixmodelsdk";
import { boot } from "../lib/bootstrap";
import { _saveToDumyFile } from "../lib/serialize";

boot(async (model) => {
    const iPage = model.findPageByQualifiedName("MyFirstModule.Home_Web");
    const page = await iPage.load();
    _saveToDumyFile(JSON.stringify(page.toJSON()), "page.structure.json");
    return false;
});
