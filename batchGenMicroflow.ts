import { JavaScriptSerializer, domainmodels } from "mendixmodelsdk";
import { OnlineWorkingCopy } from "mendixplatformsdk";

export async function batchGenMicroflow(workingCopy: OnlineWorkingCopy) {
  const model = await workingCopy.openModel();

  const mf = await model
    .findMicroflowByQualifiedName("MyFirstModule.Microflow")
    .load();

  console.log(JavaScriptSerializer.serializeToJs(mf));
}
