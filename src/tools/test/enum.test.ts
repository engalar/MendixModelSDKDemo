import { extractPropertiesAndEnums } from '../js/extractor';
import * as fs from 'fs';
import * as path from 'path';


describe('extractEnumClasses', () => {
  const casesDir = path.join(__dirname, 'cases/enum');
  const testCases = fs.readdirSync(casesDir)
    .filter(file => file.endsWith('.js'))
    .map(jsFile => {
      const caseName = path.basename(jsFile, '.js');
      const jsFilePath = path.join(casesDir, jsFile);
      const expectJsonFilePath = path.join(casesDir, `${caseName}.json`);

      const code = fs.readFileSync(jsFilePath, 'utf-8');
      const expected = JSON.parse(fs.readFileSync(expectJsonFilePath, 'utf-8'));

      return {
        description: `should correctly extract enum classes for ${caseName}`,
        code,
        expected,
      };
    });

  testCases.forEach(({ description, code, expected }) => {
    it(description, () => {
      const result = extractPropertiesAndEnums(getDomainFramwork(code));
      expect(result.enumClasses).toEqual(expected);
    });
  });
});

function getDomainFramwork(code) {
  return `
"use strict";
/* tslint:disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainmodels = exports.StructureVersionInfo = void 0;
const internal = require("../sdk/internal");
exports.StructureVersionInfo = internal.StructureVersionInfo;
const utils_1 = require("../sdk/utils");
const projects_1 = require("./projects");
var domainmodels;
(function (domainmodels) {
${code}
})(domainmodels = exports.domainmodels || (exports.domainmodels = {}));
const businessevents_1 = require("./businessevents");
const customwidgets_1 = require("./customwidgets");
const documenttemplates_1 = require("./documenttemplates");
const expressions_1 = require("./expressions");
const mlmappings_1 = require("./mlmappings");
const microflows_1 = require("./microflows");
const pages_1 = require("./pages");
const rest_1 = require("./rest");
const security_1 = require("./security");
const texts_1 = require("./texts");
const workflows_1 = require("./workflows");
//# sourceMappingURL=domainmodels.js.map
  `;
}