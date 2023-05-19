import { OnlineWorkingCopy } from "mendixplatformsdk";
import { addEnity } from "./DomainModel";
import { findDomainModule } from "./moduleUtil";

export async function batchGenAttribue(
  workingCopy: OnlineWorkingCopy,
  moduleName: string,
  entityName: string,
) {
  const model = await workingCopy.openModel();

  const domainModel = await findDomainModule(model, moduleName);

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
