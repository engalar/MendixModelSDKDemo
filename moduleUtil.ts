import { projects } from "mendixmodelsdk";
import { IModel } from "mendixmodelsdk/src/gen/base-model";


export function newRandomModule(model: IModel) {
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

export async function findModule(model, moduleName: string) {
  const domainModelInterface = model
    .allDomainModels()
    .filter((dm) => dm.containerAsModule.name === moduleName)[0];
  const domainModel = await domainModelInterface.load();
  return domainModel;
}
