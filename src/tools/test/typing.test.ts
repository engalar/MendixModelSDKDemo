import { extractTypingInfo } from '../js/extractor';
import * as fs from 'fs';
import * as path from 'path';

describe('extractTypingInfo', () => {
  const casesDir = path.join(__dirname, 'cases/typing');
  const testCases = fs.readdirSync(casesDir)
    .filter(file => file.endsWith('.ts'))
    .map(tsFile => {
      const caseName = path.basename(tsFile, '.ts');
      const tsFilePath = path.join(casesDir, tsFile);
      const jsonFilePath = path.join(casesDir, `${caseName}.json`);

      const code = fs.readFileSync(tsFilePath, 'utf-8');
      const expected = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

      return {
        description: `should correctly extract typing info for ${caseName}`,
        code,
        expected,
      };
    });

  testCases.forEach(({ description, code, expected }) => {
    it(description, () => {
      const result = extractTypingInfo(code);
      expect(result).toEqual(expected);
    });
  });
});