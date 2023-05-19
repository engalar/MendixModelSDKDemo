import { MendixPlatformClient } from "mendixplatformsdk";
import { datatypes, domainmodels, microflows } from "mendixmodelsdk";
import { IModel } from "mendixmodelsdk/src/gen/base-model";
import { readData } from "./t";
import { addActivityInMicroflow, addMemberChange } from "./batchGenMicroflow";
import { newRandomModule } from "./moduleUtil";

//https://sprintr.home.mendix.com/link/teamserver/4160aabf-9ee0-44ce-aa1f-ec4cf6a4243c
// main("4160aabf-9ee0-44ce-aa1f-ec4cf6a4243c", cb);

export async function cb(model: IModel) {
  const module = newRandomModule(model);

  // entity
  const newDomainModel = domainmodels.DomainModel.createIn(module);

  const newEntity = domainmodels.Entity.createIn(newDomainModel);
  newEntity.name = "Opportunity";
  newEntity.location = { x: 500, y: 100 };

  readData((n, t) => {
    const attribute = domainmodels.Attribute.createIn(newEntity);
    attribute.name = n;
    attribute.type = domainmodels.StringAttributeType.create(model);
  });

  // microflow
  const newMicroflow = microflows.Microflow.createIn(module);
  newMicroflow.name = "Microflow";

  // parameter
  var integerType1 = datatypes.IntegerType.create(model);

  var rowIdx1 = microflows.MicroflowParameterObject.createIn(
    newMicroflow.objectCollection
  );
  rowIdx1.relativeMiddlePoint = { x: 50, y: 40 };
  rowIdx1.size = { width: 30, height: 30 };
  rowIdx1.name = "RowIdx";
  rowIdx1.variableType = integerType1; // Note: for this property a default value is defined.
  rowIdx1.hasVariableNameBeenChanged = true;

  var stringType1 = datatypes.StringType.create(model);

  var sheetName1 = microflows.MicroflowParameterObject.createIn(
    newMicroflow.objectCollection
  );
  sheetName1.relativeMiddlePoint = { x: 160, y: 40 };
  sheetName1.size = { width: 30, height: 30 };
  sheetName1.name = "SheetName";
  sheetName1.variableType = stringType1; // Note: for this property a default value is defined.
  sheetName1.hasVariableNameBeenChanged = true;

  // start end
  var startEvent1 = microflows.StartEvent.createIn(
    newMicroflow.objectCollection
  );
  startEvent1.relativeMiddlePoint = { x: 50, y: 200 };
  startEvent1.size = { width: 20, height: 20 };

  var endEvent1 = microflows.EndEvent.createIn(newMicroflow.objectCollection);
  endEvent1.relativeMiddlePoint = { x: 710, y: 200 };
  endEvent1.size = { width: 20, height: 20 };

  // create activity
  var createObjectActivity = microflows.ActionActivity.createIn(
    newMicroflow.objectCollection
  );
  createObjectActivity.relativeMiddlePoint = { x: 500, y: 200 };
  createObjectActivity.size = { width: 120, height: 60 };
  createObjectActivity.action = createObjectAction1;

  var createObjectAction1 =
    microflows.CreateObjectAction.createIn(createObjectActivity);
  createObjectAction1.entity = newEntity;
  createObjectAction1.outputVariableName = "NewOpportunity";

  // change activity
  const changeObjectActivity = microflows.ActionActivity.createIn(
    newMicroflow.objectCollection
  );
  changeObjectActivity.relativeMiddlePoint = { x: 500, y: 400 };
  changeObjectActivity.size = { width: 120, height: 60 };

  const changeObjectAction1 =
    microflows.ChangeObjectAction.createIn(changeObjectActivity);
  changeObjectAction1.changeVariableName =
    createObjectAction1.outputVariableName;

  // 按属性追加
  let i = 0;
  const javaActivityArray = [];
  readData((n, t) => {
    // 追加excel读数
    const javaActivity = addActivityInMicroflow(
      n,
      i,
      newMicroflow.model,
      newMicroflow
    );
    javaActivityArray.push(javaActivity);

    // 追加实体赋值
    addMemberChange(model, n, newEntity.qualifiedName, changeObjectAction1);
    i++;
  });

  // sequence flow
  javaActivityArray.push(createObjectActivity, changeObjectActivity, endEvent1);
  let lastActivity = startEvent1;

  javaActivityArray.forEach((a) => {
    connectBySequenceFlow(lastActivity, a, newMicroflow);
    lastActivity = a;
  });

  return true;
}

/**
 *
 * @param appID 应用id
 * @param cb 回调
 */
export async function main(
  appID: string,
  cb: (model: IModel) => Promise<string | void>
) {
  const client = new MendixPlatformClient();
  const app = await client.getApp(appID);

  const workingCopy = await app.createTemporaryWorkingCopy("main");
  const model = await workingCopy.openModel();

  const commitMessage = await cb(model);
  if (commitMessage) {
    await model.flushChanges();
    await workingCopy.commitToRepository("main", { commitMessage });
  }
}
function connectBySequenceFlow(
  startEvent1: microflows.MicroflowObject,
  createObjectActivity: microflows.MicroflowObject,
  newMicroflow: microflows.Microflow
) {
  var sequenceFlow1 = microflows.SequenceFlow.createIn(newMicroflow);
  sequenceFlow1.origin = startEvent1;
  sequenceFlow1.destination = createObjectActivity;
}
