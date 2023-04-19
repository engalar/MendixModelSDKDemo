import { domainmodels } from "mendixmodelsdk";
import { OnlineWorkingCopy } from "mendixplatformsdk";

export async function batchGenAttribue(workingCopy: OnlineWorkingCopy) {
  const model = await workingCopy.openModel();

  const domainModelInterface = model
    .allDomainModels()
    .filter((dm) => dm.containerAsModule.name === "MyFirstModule")[0];
  const domainModel = await domainModelInterface.load();

  const entity = domainmodels.Entity.createIn(domainModel);
  entity.name = `Opportunity`;
  entity.location = { x: 500, y: 100 };

  const attributes = [
    "OpportunityId",
    "AccountName",
    "AccountNameLocal",
    "OpportunityName",
    "PartnerAccount",
    "Tier2PartnerAccount",
    "PartnerRegistrationType",
    "OpportunityRecordType",
    "OwnerRole",
    "OpportunityOwner",
    "Stage",
    "FiscalPeriod",
    "Probability",
    "Age",
    "TotalLicenseMargin",
    "TotalHwMaintenanceMargin",
    "CloseDate",
    "CreatedDate",
    "NextStep",
    "GscsNamedAccount",
    "LastActivity",
    "TotalPerpetualCurrency",
    "TotalPerpetual",
    "TotalHardwareCurrency",
    "TotalHardware",
    "TotalLicenseCurrency",
    "TotalLicense",
    "TotalSubscriptionsCurrency",
    "TotalSubscriptions",
    "TotalOpportunityCurrency",
    "TotalOpportunity",
  ];

  attributes.forEach((name) => {
    const attribute = domainmodels.Attribute.createIn(entity);
    attribute.name = name;
  });

  return model;
}
