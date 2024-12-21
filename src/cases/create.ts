import {
    createModelUnitFromJSON,
    IAbstractElementJson,
    IModel,
    pages,
} from "mendixmodelsdk";
import { readFromFile } from "../lib/serialize";
import { boot } from "../lib/bootstrap";
import { newRandomModule } from "../lib/moduleUtil";

const source = "dumy";

const unit = process.argv[2];
// boot(createFromDummy);

boot(createFromGemini).catch((e) => {
    debugger;
    console.error(e);
});

async function createFromDummy(model: IModel) {
    const json = await readFromFile("page.structure.json");
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
    const json = JSON.parse(await readFromFile(unit, source));
    delete json["$schema"];

    let attributeName = "documents";
    if (json["$Type"] === "DomainModels$DomainModel") {
        attributeName = "domainModel";
    } else if (json["$Type"] === "Pages$Page") {
        attributeName = "documents";
    }
    createModelUnitFromJSON(module, attributeName, json);
    return true;
}
