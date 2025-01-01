import * as fs from "fs";
import { extractNamespaceDetails } from "../typing2";
import { parseCode } from "../schema";
import { join } from "path";


describe('findSubClasses', () => {
    // center as ICodeActionParameter
    const tsCode = fs.readFileSync(join(__dirname, 'cases/typing2/1.ts'), 'utf-8');

    it('should find all subclasses of a given class or interface', async () => {
        const ast = parseCode(tsCode);
        const result = extractNamespaceDetails(ast);

        const expected = JSON.parse(fs.readFileSync(join(__dirname, 'cases/typing2/1.json'), 'utf-8'));

        expect(result).toEqual(expected);
    });
});