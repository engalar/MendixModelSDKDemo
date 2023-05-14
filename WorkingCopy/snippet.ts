import { JavaScriptSerializer, domainmodels } from "mendixmodelsdk";
import { OnlineWorkingCopy } from "mendixplatformsdk";

function createEntity(
  domainModel: domainmodels.DomainModel,
  entityName: string,
  attributeName: string
) {
  const newEntity = domainmodels.Entity.createIn(domainModel);
  newEntity.name = entityName;

  // location in the Mendix Studio Pro working area:
  newEntity.location = { x: 100, y: 100 };

  // new attribute (which is by default a string attribute):
  const newAttribute = domainmodels.Attribute.createIn(newEntity);
  newAttribute.name = attributeName;
}
async function closeConnection(workingCopy: OnlineWorkingCopy) {
  (await workingCopy.openModel()).closeConnection();
}

async function demo1(workingCopy: OnlineWorkingCopy) {
  const model = await workingCopy.openModel();
  const domainModel = model.root.modules[0].domainModel;
  const customerEntity = domainModel.entities.filter(
    (entity) => entity.name === "Customer"
  )[0];

  const attributeName = customerEntity.attributes[0].name;
}

async function demo2(workingCopy: OnlineWorkingCopy) {
  const model = await workingCopy.openModel();
  const domainModel = model.allDomainModels()[0];
  const customerEntity = domainModel.entities.filter(
    (entity) => entity.name === "Customer"
  )[0];

  const attributeName = customerEntity.attributes[0].name;
}
async function demo3(workingCopy: OnlineWorkingCopy) {
  const model = await workingCopy.openModel();
  const customerEntity = model.findEntityByQualifiedName("Customers.Customer");
  if (customerEntity) {
    const attributeName = customerEntity.attributes[0].name;
  }
}

async function demo4(workingCopy: OnlineWorkingCopy) {
  const model = await workingCopy.openModel();
  model
    .allModules()
    .filter((module) => module.fromAppStore === true)
    .forEach((module) =>
      console.log({
        name: module.name,
        appStoreVersion: module.appStoreVersion,
        appStoreGuid: module.appStoreGuid,
        appStoreVersionGuid: module.appStoreVersionGuid,
      })
    );
}

async function demo5_load(workingCopy: OnlineWorkingCopy) {
  const model = await workingCopy.openModel();
  // at first, only interfaces are available:
  const domainModel = model.allDomainModels()[0];
  const entity1Interface = domainModel.entities[0];

  console.log(entity1Interface.isLoaded); // ==> prints false

  const entity1 = await entity1Interface.load();

  // entity1 is now the fully-loaded entitiy of type domainmodels.Entity
  console.log(entity1.isLoaded); // ==> prints true
  console.log(entity1Interface === entity1); // ==> prints true

  // loading the entity actually loaded the complete domain model unit:
  console.log(domainModel.isLoaded); // prints true
  // ... so we can cast it as a fully loaded domainModel:
  const fullDomainModel = domainModel.asLoaded();

  // In fully-loaded units, all sub elements also have the fully-loaded types,
  // while in interfaces all sub objects are interfaces as well.
  const entity2: domainmodels.Entity = fullDomainModel.entities[1];
  console.log(entity2.isLoaded); // prints true
}

async function demo6_serialize(workingCopy: OnlineWorkingCopy) {
  const model = await workingCopy.openModel();
  const domainModel = model.allDomainModels()[0];
  console.log(JavaScriptSerializer.serializeToJs(domainModel));
}
