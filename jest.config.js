module.exports = {
    preset: 'ts-jest', // 使用 ts-jest 预设
    testEnvironment: 'node', // 测试环境为 Node.js
    testMatch: ['**/test/**/*.test.ts'], // 匹配测试文件
    collectCoverage: false, // 收集测试覆盖率
    coverageDirectory: 'coverage', // 覆盖率报告输出目录
    coverageReporters: ['text', 'lcov'], // 覆盖率报告格式
};