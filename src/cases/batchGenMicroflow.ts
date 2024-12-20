import { IModel, microflows } from "mendixmodelsdk";

export async function batchGenMicroflow(
    model: IModel,
    qMicroflowName: string,
    qEntityName: string,
) {
    const mf = await model.findMicroflowByQualifiedName(qMicroflowName).load();

    // console.log(JavaScriptSerializer.serializeToJs(mf));
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

    // activity change object
    const changeObjectAction1 = microflows.ChangeObjectAction.create(model);

    attributes.forEach((name, i) => {
        addActivityInMicroflow(name, i, model, mf);

        addMemberChange(model, name, qEntityName, changeObjectAction1);
    });

    const changeObjectActivity = microflows.ActionActivity.create(model);
    changeObjectActivity.action = changeObjectAction1;

    // collect activity
    mf.objectCollection.objects.push(changeObjectActivity);
}

export function addMemberChange(
    model: IModel,
    attributeName: string,
    qEntityName: string,
    changeObjectAction1: microflows.ChangeObjectAction,
) {
    var memberChange1 = microflows.MemberChange.create(model);
    memberChange1.attribute = model.findAttributeByQualifiedName(
        `${qEntityName}.${attributeName}`,
    );
    memberChange1.value = "$" + attributeName;

    changeObjectAction1.items.push(memberChange1);
}

/**
 * Advanced_Excel.Cell_ReadString
 * @param name
 * @param index
 * @param model
 * @param mf
 */
export function addActivityInMicroflow(
    name: string,
    index: number,
    model: IModel,
    mf: microflows.Microflow,
) {
    var basicCodeActionParameterValue1 =
        microflows.BasicCodeActionParameterValue.create(model);
    basicCodeActionParameterValue1.argument = "$SheetName";

    var javaActionParameterMapping1 =
        microflows.JavaActionParameterMapping.create(model);
    javaActionParameterMapping1.parameter =
        model.findJavaActionParameterByQualifiedName(
            "Advanced_Excel.Cell_ReadString.SheetName",
        );
    javaActionParameterMapping1.parameterValue = basicCodeActionParameterValue1; // Note: for this property a default value is defined.

    var basicCodeActionParameterValue2 =
        microflows.BasicCodeActionParameterValue.create(model);
    basicCodeActionParameterValue2.argument = "$RowIdx";

    var javaActionParameterMapping2 =
        microflows.JavaActionParameterMapping.create(model);
    javaActionParameterMapping2.parameter =
        model.findJavaActionParameterByQualifiedName(
            "Advanced_Excel.Cell_ReadString.Row",
        );
    javaActionParameterMapping2.parameterValue = basicCodeActionParameterValue2;

    var basicCodeActionParameterValue3 =
        microflows.BasicCodeActionParameterValue.create(model);
    basicCodeActionParameterValue3.argument = index.toString();

    var javaActionParameterMapping3 =
        microflows.JavaActionParameterMapping.create(model);
    javaActionParameterMapping3.parameter =
        model.findJavaActionParameterByQualifiedName(
            "Advanced_Excel.Cell_ReadString.Column",
        );
    javaActionParameterMapping3.parameterValue = basicCodeActionParameterValue3;

    var javaActionCallAction1 = microflows.JavaActionCallAction.create(model);
    javaActionCallAction1.javaAction = model.findJavaActionByQualifiedName(
        "Advanced_Excel.Cell_ReadString",
    );
    javaActionCallAction1.parameterMappings.push(javaActionParameterMapping1);
    javaActionCallAction1.parameterMappings.push(javaActionParameterMapping2);
    javaActionCallAction1.parameterMappings.push(javaActionParameterMapping3);
    javaActionCallAction1.outputVariableName = name;

    var actionActivity1 = microflows.ActionActivity.create(model);
    actionActivity1.relativeMiddlePoint = { x: 390, y: 100 * (index + 1) };
    actionActivity1.size = { width: 120, height: 60 };
    actionActivity1.action = javaActionCallAction1;

    mf.objectCollection.objects.push(actionActivity1);

    return actionActivity1;
}
