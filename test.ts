import { MendixPlatformClient } from "mendixplatformsdk";
import { domainmodels, projects } from "mendixmodelsdk";
import { IModel } from "mendixmodelsdk/src/gen/base-model";
import { readData } from "./t";

main("4160aabf-9ee0-44ce-aa1f-ec4cf6a4243c", cb);

export async function cb(model: IModel) {
  const project = model.allProjects()[0];

  const module = projects.Module.createIn(project);
  module.name =
    "AutoGen_" +
    new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(8, 12);

  const newDomainModel = domainmodels.DomainModel.createIn(module);

  const newEntity = domainmodels.Entity.createIn(newDomainModel);
  newEntity.name = "Opportunity";
  newEntity.location = { x: 500, y: 100 };

  readData((n, t) => {
    const attribute = domainmodels.Attribute.createIn(newEntity);
    attribute.name = n;
    attribute.type = domainmodels.StringAttributeType.create(model);
  });
  return true;
}

async function main(appID: string, cb: (model: IModel) => Promise<boolean>) {
  const client = new MendixPlatformClient();
  const app = await client.getApp(appID);

  const workingCopy = await app.createTemporaryWorkingCopy("main");
  const model = await workingCopy.openModel();

  if (await cb(model)) {
    await model.flushChanges();
    await workingCopy.commitToRepository("main");
  }
}
