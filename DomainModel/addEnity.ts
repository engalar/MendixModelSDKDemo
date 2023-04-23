import { domainmodels } from "mendixmodelsdk";

export function addEnity(
  domainModel: domainmodels.DomainModel,
  entityName: string,
  attributes: string[]) {
  const entity = domainmodels.Entity.createIn(domainModel);
  entity.name = entityName;
  entity.location = { x: 500, y: 100 };

  attributes.forEach((name) => {
    const attribute = domainmodels.Attribute.createIn(entity);
    attribute.name = name;
  });
}
