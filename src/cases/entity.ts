import { IModel, JavaScriptSerializer, domainmodels } from "mendixmodelsdk";
import { newRandomModule } from "../lib/moduleUtil";

async function cb(model: IModel) {
    const randomeModule = newRandomModule(model);
    var domainModel1 = domainmodels.DomainModel.createIn(randomeModule);

    // Entity Customer
    var customerEntity = domainmodels.Entity.createIn(domainModel1);
    customerEntity.name = "Customer";

    const nameAttribute = domainmodels.Attribute.createIn(customerEntity);
    nameAttribute.name = "Name";
    nameAttribute.type = domainmodels.StringAttributeType.create(model);

    const ageAttribute = domainmodels.Attribute.createIn(customerEntity);
    ageAttribute.name = "Age";
    ageAttribute.type = domainmodels.IntegerAttributeType.create(model);

    //Entity Order
    var orderEntity = domainmodels.Entity.createIn(domainModel1);
    orderEntity.name = "Order";
    const dateAttribute = domainmodels.Attribute.createIn(orderEntity);
    dateAttribute.name = "Date";
    dateAttribute.type = domainmodels.DateTimeAttributeType.create(model);

    const totalAttribute = domainmodels.Attribute.createIn(orderEntity);
    totalAttribute.name = "Total";
    totalAttribute.type = domainmodels.DecimalAttributeType.create(model);

    // 关联
    var association = domainmodels.Association.createIn(domainModel1);
    association.name = "Customer_Order";
    association.parent = customerEntity;
    association.child = orderEntity;

    return true;
}

async function cb2(model: IModel) {
    // model.findMicroflowByQualifiedName("MyFirstModule.Microflow").delete();
    const systemModel = await model
        .findModuleByQualifiedName("MendixSSO")
        .domainModel.load();

    const js = JavaScriptSerializer.serializeToJs(systemModel);
    console.log(js);

    const page = await model
        .findPageByQualifiedName("Administration.Account_Overview")
        .load();
    const js2 = JavaScriptSerializer.serializeToJs(page);
    console.log(js2);

    return false;
}
