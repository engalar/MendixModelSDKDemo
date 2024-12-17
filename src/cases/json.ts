import { createElementFromJSON } from "mendixmodelsdk";
import { boot } from "../lib/bootstrap";
import { _saveToDumyFile } from "../lib/serialize";

/* boot(async (model) => {
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
}); */

// command parameters
const unit = process.argv[2];

boot(async (model) => {
    // domain
    unit === "domain" &&
        model.allDomainModels().forEach(async (dm) => {
            const domain = await dm.load();
            const json = dm.toJSON();
            json["$schema"] = "../schemas/domain.schema.json";
            await _saveToDumyFile(
                JSON.stringify(json),
                `${domain.containerAsModule.name}.domain.json`,
            );
        });

    // microflow
    unit === "microflow" &&
        model.allMicroflows().forEach(async (mf) => {
            const microflow = await mf.load();
            const json = mf.toJSON();
            json["$schema"] = "../schemas/microflow.schema.json";
            await _saveToDumyFile(
                JSON.stringify(json),
                `${microflow.qualifiedName}.microflow.json`,
            );
        });

    // page
    unit === "page" &&
        model.allPages().forEach(async (pg) => {
            const page = await pg.load();
            const json = pg.toJSON();
            json["$schema"] = "../schemas/page.schema.json";
            await _saveToDumyFile(
                JSON.stringify(json),
                `${page.qualifiedName}.page.json`,
            );
        });
    return false;
});
