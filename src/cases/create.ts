import {
    createModelUnitFromJSON,
    IAbstractElementJson,
    IModel,
    pages,
} from "mendixmodelsdk";
import { _readFromDumyFile } from "../lib/serialize";
import { boot } from "../lib/bootstrap";
import { newRandomModule } from "../lib/moduleUtil";

// boot(createFromDummy);

boot(createFromGemini).catch(console.error);

async function createFromDummy(model: IModel) {
    const json = await _readFromDumyFile("page.structure.json");
    const elementJson: IAbstractElementJson = JSON.parse(json);
    const module = model.findModuleByQualifiedName("MyFirstModule");
    // const dummyPage = pages.Page.createIn(module);
    // dummyPage.name = "DummyPage";
    elementJson.name = "DummyPage";
    createModelUnitFromJSON(module, "documents", elementJson);
    return true;
}
async function createFromGemini(model: IModel): Promise<boolean> {
    const module = newRandomModule(model);
    const json = JSON.parse(await _readFromDumyFile("c1-domain.json"));
    createModelUnitFromJSON(module, "domainModel", json);
    return false;
}
