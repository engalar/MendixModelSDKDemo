import { projects } from "mendixmodelsdk";
import { IModel } from "mendixmodelsdk";

export function newRandomModule(model: IModel): projects.Module {
    const project = model.allProjects()[0];

    // module
    const module = projects.Module.createIn(project);
    module.name =
        "AutoGen_" +
        new Date()
            .toISOString()
            .replace(/[-:T.]/g, "")
            .slice(8, 12);
    return module;
}
