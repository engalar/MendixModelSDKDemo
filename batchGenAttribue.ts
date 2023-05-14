import { OnlineWorkingCopy } from "mendixplatformsdk";
import { addEnity } from "./DomainModel";

export async function batchGenAttribue(
  workingCopy: OnlineWorkingCopy,
  moduleName: string,
  entityName: string,
) {
  const model = await workingCopy.openModel();

  const domainModelInterface = model
    .allDomainModels()
    .filter((dm) => dm.containerAsModule.name === moduleName)[0];
  const domainModel = await domainModelInterface.load();

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

  addEnity(domainModel, entityName, attributes);

  await model.flushChanges();
  await workingCopy.commitToRepository("main");
}
