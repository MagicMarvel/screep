#!/usr/bin/env node
/**
 * Screeps 项目构建脚本 (esbuild)
 *
 * 用法:
 *   node build.mjs                    单次构建
 *   node build.mjs --watch            监听模式（持续构建+部署）
 *   node build.mjs --env DEST=main    构建并上传到 main 服务器
 *   node build.mjs --env DEST=local   构建并复制到本地路径
 *   node build.mjs --env DEST=private 构建并上传到私有服务器
 */

import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "dist");

// ======================== 参数解析 ========================

function getDestFromArgs() {
    const args = process.argv.slice(2);
    for (const arg of args) {
        const match = arg.match(/(?:--env\s+)?DEST=(.+)/);
        if (match) return match[1];
    }
    return undefined;
}

const DEST = getDestFromArgs();
const isWatch = process.argv.includes("--watch");

// ======================== 配置读取 ========================

let deployConfig = null;

if (DEST) {
    const secretPath = path.join(__dirname, ".secret.json");
    if (!fs.existsSync(secretPath)) {
        console.error("错误: 未找到 .secret.json 文件");
        process.exit(1);
    }
    const secret = JSON.parse(fs.readFileSync(secretPath, "utf8"));
    deployConfig = secret[DEST];
    if (!deployConfig) {
        console.error(`错误: 无效目标 "${DEST}"，请检查 .secret.json`);
        process.exit(1);
    }
    console.log(`[config] 目标: ${DEST}, 部署方式: ${deployConfig.copyPath ? "本地复制" : "远程上传"}`);
} else {
    console.log("[config] 未指定目标, 代码将被编译但不会部署");
}

// ======================== Source Map 后处理 ========================

function postProcessSourceMap() {
    const mapFile = path.join(DIST_DIR, "main.js.map");
    const mainFile = path.join(DIST_DIR, "main.js");

    if (!fs.existsSync(mapFile)) return;

    const mapObj = JSON.parse(fs.readFileSync(mapFile, "utf8"));

    // 删除 sourcesContent 以减小体积
    delete mapObj.sourcesContent;

    // 包装为 module.exports 格式（Screeps require("main.js.map") 会自动查找 main.js.map.js）
    const wrappedContent = `module.exports = ${JSON.stringify(mapObj)};`;
    fs.writeFileSync(path.join(DIST_DIR, "main.js.map.js"), wrappedContent, "utf8");

    // 修正 main.js 中的 sourceMappingURL
    let mainContents = fs.readFileSync(mainFile, "utf8");
    mainContents = mainContents.replace("sourceMappingURL=main.js.map", "sourceMappingURL=main.js.map.js");
    fs.writeFileSync(mainFile, mainContents, "utf8");

    // 删除原始 .map 文件
    fs.unlinkSync(mapFile);
}

// ======================== 部署：复制到本地 ========================

function deployCopy(copyPath) {
    if (!fs.existsSync(copyPath)) {
        fs.mkdirSync(copyPath, { recursive: true });
    }

    fs.copyFileSync(path.join(DIST_DIR, "main.js"), path.join(copyPath, "main.js"));

    const mapJsFile = path.join(DIST_DIR, "main.js.map.js");
    if (fs.existsSync(mapJsFile)) {
        fs.copyFileSync(mapJsFile, path.join(copyPath, "main.js.map.js"));
    }

    console.log(`[deploy] 复制到 ${copyPath} 完成`);
}

// ======================== 部署：上传到 Screeps 服务器 ========================

async function deployUpload(config) {
    const { ScreepsAPI } = await import("screeps-api");

    const code = {};
    const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith(".js") || f.endsWith(".wasm"));

    for (const file of files) {
        const filePath = path.join(DIST_DIR, file);
        if (file.endsWith(".js")) {
            code[file.replace(/\.js$/i, "")] = fs.readFileSync(filePath, "utf8");
        } else {
            code[file] = { binary: fs.readFileSync(filePath).toString("base64") };
        }
    }

    const api = new ScreepsAPI(config);

    if (!config.token) {
        await api.auth();
    }

    const branch = config.branch || "default";

    try {
        const res = await api.raw.user.branches();
        const branches = res?.list?.map((b) => b.branch) || [];

        if (branches.includes(branch)) {
            await api.code.set(branch, code);
        } else {
            await api.raw.user.cloneBranch("", branch, code);
        }
        console.log(`[deploy] 上传完成 (分支: ${branch})`);
    } catch (err) {
        console.error("[deploy] 上传失败:", err.message);
    }
}

// ======================== esbuild 插件 ========================

const screepsDeployPlugin = {
    name: "screeps-deploy",
    setup(build) {
        build.onEnd(async (result) => {
            if (result.errors.length > 0) return;

            postProcessSourceMap();

            if (deployConfig) {
                try {
                    if (deployConfig.copyPath) {
                        deployCopy(deployConfig.copyPath);
                    } else {
                        await deployUpload(deployConfig);
                    }
                } catch (err) {
                    console.error("[deploy] 部署失败:", err.message);
                }
            }
        });
    },
};

// ======================== 主配置 ========================

const esbuildOptions = {
    entryPoints: [path.join(__dirname, "src", "main.ts")],
    bundle: true,
    outfile: path.join(DIST_DIR, "main.js"),
    format: "cjs",
    platform: "node",
    target: "es2017",
    sourcemap: true,
    sourcesContent: true,
    minify: false,
    treeShaking: true,
    tsconfig: path.join(__dirname, "tsconfig.json"),
    logLevel: "info",
    external: ["main.js.map"],
    plugins: [screepsDeployPlugin],
};

// ======================== 执行 ========================

async function main() {
    // 清空 dist 目录
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });

    if (isWatch) {
        console.log("[watch] 启动监听模式...");
        const ctx = await esbuild.context(esbuildOptions);
        await ctx.watch();
        console.log("[watch] 正在监听文件变化 (Ctrl+C 退出)");
    } else {
        await esbuild.build(esbuildOptions);
    }
}

main().catch((err) => {
    console.error("构建失败:", err);
    process.exit(1);
});
