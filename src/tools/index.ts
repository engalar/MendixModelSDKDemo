import { _readFromDumyFile } from "../lib/serialize";
import { getEnums } from "./tool";

async function main() {
    const data = await _readFromDumyFile("dump-full.json");
    const result = getEnums("DomainModels$Entity", "attributes", JSON.parse(data));
    console.log(result);
}

main();
