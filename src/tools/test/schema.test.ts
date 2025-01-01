import { extractInheritanceInfo, parseCode } from "../schema";

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