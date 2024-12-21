import { batchGenMicroflow } from "./cases/batchGenMicroflow";
import { batchGenAttribue } from "./cases/batchGenAttribue";
import { boot } from "./lib/bootstrap";

boot(async (model) => {
    const moduleName = "DiscountAutomation",
        entityName = "Opportunity2",
        microflowName = "Microflow";
    await batchGenAttribue(model, moduleName, entityName);
    await batchGenMicroflow(
        model,
        `${moduleName}.${microflowName}`,
        `${moduleName}.${entityName}`,
    );

    return true; // if true then commit
});
