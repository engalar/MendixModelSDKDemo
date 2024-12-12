import * as fs from "fs";
import * as path from "path";

// _saveToDumyFile("abc", "a.txt");

export async function _saveToDumyFile(data: string, file_name: string) {
    let currentDir = __dirname;
    let foundParent = false;

    while (!foundParent) {
        if (fs.existsSync(path.join(currentDir, "package.json"))) {
            foundParent = true;
            const dumyFolder = path.join(currentDir, "dumy");
            if (!fs.existsSync(dumyFolder)) {
                fs.mkdirSync(dumyFolder);
            }
            const filePath = path.join(dumyFolder, file_name);
            try {
                await fs.promises.writeFile(filePath, data);
                console.log(`File saved to ${filePath}`);
            } catch (error) {
                console.error(`Error saving file: ${error}`);
            }
        } else {
            if (currentDir === path.dirname(currentDir)) {
                break;
            }
            // Move up to the parent directory
            currentDir = path.dirname(currentDir);
        }
    }
}
