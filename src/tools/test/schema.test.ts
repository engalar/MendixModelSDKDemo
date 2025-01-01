import * as fs from "fs";
import extractNamespaceDetails from "../dts";
import { extractInheritanceInfo, parseCode } from "../schema";
import { join } from "path";

describe('extractInheritanceInfo', () => {
    it('should extract inheritance info from class declarations', async () => {
        const jsCode = `
            class A extends B {}
            class C extends D.E {}
            class F extends internal.G {}
            class H extends _xyz.projects.J {}
            class K extends domainmodels.L {}
        `;
        const ast = parseCode(jsCode);
        const result = await extractInheritanceInfo(ast);
        expect(result).toEqual({
            A: { module: null, superClass: 'B' },
            C: { module: 'D', superClass: 'E' },
            F: { module: null, superClass: null },
            H: { module: 'projects', superClass: 'J' },
            K: { module: 'domainmodels', superClass: 'L' },
        });
    });
});

describe('findSubClasses', () => {
    // center as ICodeActionParameter
    const tsCode = fs.readFileSync(join(__dirname, 'cases/1.ts'), 'utf-8');

    it('should find all subclasses of a given class or interface', async () => {
        const ast = parseCode(tsCode);
        const result = extractNamespaceDetails(ast);

        const expected = JSON.parse(fs.readFileSync(join(__dirname, 'cases/1.json'), 'utf-8'));

        expect(result).toEqual(expected);
    });
});