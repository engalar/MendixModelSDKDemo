import {
    createModelUnitFromJSON,
    IAbstractElementJson,
    pages,
} from "mendixmodelsdk";
import { _readFromDumyFile } from "../lib/serialize";
import { boot } from "../lib/bootstrap";

boot(async (model) => {
    const json = await _readFromDumyFile("page.structure.json");
    const elementJson: IAbstractElementJson = JSON.parse(json);
    const module = model.findModuleByQualifiedName("MyFirstModule");
    // const dummyPage = pages.Page.createIn(module);
    // dummyPage.name = "DummyPage";
    elementJson.name = "DummyPage";
    createModelUnitFromJSON(module, "folders", elementJson);
    return true;
});
