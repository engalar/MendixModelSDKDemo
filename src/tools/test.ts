import { readFromFile } from "../lib/serialize";
import { getEnums } from "./tool";

async function main() {
    const data = await readFromFile("dump-full.json");
    const result = getEnums("DomainModels$Entity", "attributes", JSON.parse(data));
    console.log(result);
}

main();
