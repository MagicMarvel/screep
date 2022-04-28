const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig");

module.exports = {
  preset: "ts-jest",
  roots: ["<rootDir>"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: "<rootDir>/",
  }),
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  // 当 jest 环境准备好后执行的代码文件
  setupFilesAfterEnv: ["<rootDir>/src/mock/setup.ts"],
};
