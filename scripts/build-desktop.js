'use strict';

/**
 * Builds the Windows desktop launcher:
 *   release/DeepSeekHarnessConsole/DeepSeek Harness Console.exe
 *
 * Lightweight tray launcher + bundled Node.js runtime. The console opens in
 * an external Edge/Chrome app window (or the default browser).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const RELEASE_ROOT = path.join(ROOT, 'release');
const APP_DIR = process.env.DSH_BUILD_DIR
  ? path.resolve(ROOT, process.env.DSH_BUILD_DIR)
  : path.join(RELEASE_ROOT, 'DeepSeekHarnessConsole');
const EXE_NAME = 'DeepSeek Harness Console.exe';
const CSC = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const SDK_DIR = path.join(ROOT, 'vendor', 'webview2');
const CORE_DLL = path.join(SDK_DIR, 'Microsoft.Web.WebView2.Core.dll');
const WINFORMS_DLL = path.join(SDK_DIR, 'Microsoft.Web.WebView2.WinForms.dll');
const LOADER_DLL = path.join(SDK_DIR, 'WebView2Loader.dll');

function assertInside(parent, target) {
  const parentAbs = path.resolve(parent);
  const targetAbs = path.resolve(target);
  if (targetAbs !== parentAbs && !targetAbs.startsWith(parentAbs + path.sep)) {
    throw new Error(`拒绝操作目录之外的路径：${targetAbs}`);
  }
}

function writeInstaller() {
  const ps1 = `$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $env:LOCALAPPDATA 'Programs\\DeepSeekHarnessConsole'
if ($src.TrimEnd('\\') -ieq $dest.TrimEnd('\\')) {
  Start-Process (Join-Path $dest 'DeepSeek Harness Console.exe')
  exit 0
}
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Force $dest | Out-Null
$skip = @('user-data', 'Install.bat', 'Install.ps1')
Get-ChildItem $src -Force | Where-Object { $skip -notcontains $_.Name } | ForEach-Object {
  Copy-Item $_.FullName $dest -Recurse -Force
}
$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$lnk = $ws.CreateShortcut((Join-Path $desktop 'DeepSeek Harness 控制台.lnk'))
$lnk.TargetPath = Join-Path $dest 'DeepSeek Harness Console.exe'
$lnk.WorkingDirectory = $dest
$lnk.IconLocation = (Join-Path $dest 'DeepSeek Harness Console.exe') + ',0'
$lnk.Description = 'DeepSeek Harness 控制台'
$lnk.Save()
Start-Process (Join-Path $dest 'DeepSeek Harness Console.exe')`;
  fs.writeFileSync(path.join(APP_DIR, 'Install.ps1'), `\uFEFF${ps1}`, 'utf8');
  const bat = `@echo off
chcp 65001 >nul
echo Installing DeepSeek Harness Console to %LOCALAPPDATA%\\Programs\\DeepSeekHarnessConsole ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1"
if errorlevel 1 pause
`;
  fs.writeFileSync(path.join(APP_DIR, 'Install.bat'), bat, 'utf8');
}

function writeReadme() {
  const content = `DeepSeek Harness 控制台 v1.0.0
================================

启动
----
双击 “DeepSeek Harness Console.exe”。
应用主界面在自己的窗口中打开，使用白色主题；包含项目、记忆、技能与工具、软件管理等。
点击具体对话（需求文档、项目制作、任务对话、软件管理对话）时，使用控制台自己的对话页
在本地浏览器标签中打开；项目树和对话记录保持完整，点击项目只高亮当前项目，不会隐藏其他项目。
主界面保持原样。不需要安装 Node.js。

推荐先安装一次：
- 在文件资源管理器中双击 Install.bat。
- 会复制到 %LOCALAPPDATA%\Programs\DeepSeekHarnessConsole，并创建桌面快捷方式。
- 之后始终从桌面快捷方式启动，可避免从受限工作区/对话文件链接启动导致的权限回退。
- 如果 Install.bat 被 Windows 拦截，右键“以普通方式运行”，不要用管理员身份。

安装一次即可长期使用：
- 关闭主界面窗口会最小化到系统托盘，本地服务继续运行。
- 关闭外部对话浏览器不会停止服务，也不会关闭主界面。
- 在托盘图标右键可“显示应用界面”“打开工作区”“开机自动启动”“创建桌面快捷方式”。
- 记忆、技能、工具、项目和对话数据都保存在本机，重启后继续可用。

首次使用
--------
1. 点击左下角“设置”。
2. 对话后端默认“自动”：优先调用本机已安装且已登录的 DeepSeek Harness（dsh headless），
   不需要再填 API Key；也可以显式选择本机 DSH 或 DeepSeek API。
3. 使用本机 DSH 前，请确认已经在 DeepSeek Harness 中登录或配置模型。
4. 确认工作区根目录，默认是 D:\\dscontrol。项目与任务会分别放入 xaingmu、renwu 子目录。
5. 保存后即可新建项目。

工作区
------
项目：   文件夹可以有上下级；项目放在文件夹里，项目之间没有上下级。
         每个项目有两个独立对话 —— 需求文档、项目制作。
任务：   不经过需求文档，直接描述任务并执行；可归属到项目。
记忆：   查看项目与对话沉淀的长期记忆，编辑“我的智能体”画像。
技能与工具：新增、启用、编辑 Skill 和可执行工具。
项目总管理：选择文件夹，汇总它下面所有项目的成果文件、任务与对话记忆，
           支持重命名、移动、移除。
软件改进：打开原生 DSH Web 软件改进页面，直接修改控制台源码。

数据位置
--------
会话、记忆、设置、API Key、暂存更新：
  %APPDATA%\\DeepSeek Harness Console\\data

如果该目录不可写，应用会自动回退到：
  应用目录\\user-data\\data
或
  D:\\dscontrol\\.dsh-console-data\\data

DSH 会话与登录凭据：
  %USERPROFILE%\\.dsh

项目与任务文件：
  工作区根目录\\xaingmu\\<项目>（默认 D:\\dscontrol\\xaingmu）
  工作区根目录\\renwu\\<任务>（默认 D:\\dscontrol\\renwu）
  如果根目录不可写，会自动回退到用户目录或应用数据目录，设置中会显示实际路径。

扩展接口
--------
%APPDATA%\\DeepSeek Harness Console\\data\\extensions\\*.js
每个模块可以导出 skills、tools 与提示词片段。详见应用内“技能与工具 → 扩展接口”。

快捷键
------
F11          全屏
F12          开发者工具
Ctrl + R     刷新界面

说明
----
- API Key 只保存在本机，并仅发送给设置中的 DeepSeek API Base。
- 未配置 Key 时进入演示模式，界面、记忆、文件产出流程仍可完整体验。
- 项目文件默认在 D 盘；如果该目录不可写，可在设置中更换。
- 本程序未做代码签名，Windows SmartScreen 可能提示，选择“仍要运行”即可。
`;
  fs.writeFileSync(path.join(APP_DIR, 'START-HERE.txt'), `\uFEFF${content}`, 'utf8');
}

async function applyVersionInfo(exePath) {
  const icon = path.join(ROOT, 'assets', 'icon.ico');
  const rceditExe = path.join(ROOT, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');
  if (!fs.existsSync(icon) || !fs.existsSync(rceditExe)) return;
  const args = [
    exePath,
    '--set-icon', icon,
    '--set-file-version', '1.0.0',
    '--set-product-version', '1.0.0',
    '--set-version-string', 'FileDescription', 'DeepSeek Harness 控制台',
    '--set-version-string', 'ProductName', 'DeepSeek Harness 控制台',
    '--set-version-string', 'CompanyName', 'DeepSeek Harness Console',
    '--set-version-string', 'OriginalFilename', EXE_NAME,
    '--set-version-string', 'InternalName', 'DeepSeekHarnessConsole',
    '--set-version-string', 'LegalCopyright', 'Local desktop console',
  ];
  const result = spawnSync(rceditExe, args, { cwd: ROOT, stdio: 'inherit' });
  if (result.status === 0) {
    console.log('  ✓ 已写入应用图标与版本信息');
  } else {
    console.warn('  ! 版本信息写入跳过（不影响运行）');
  }
}

function compile(exePath) {
  const args = [
    '/nologo',
    '/target:winexe',
    '/platform:x64',
    '/langversion:5',
    `/out:${exePath}`,
    `/win32icon:${path.join(ROOT, 'assets', 'icon.ico')}`,
    `/win32manifest:${path.join(ROOT, 'desktop', 'app.manifest')}`,
    '/r:System.dll',
    '/r:System.Core.dll',
    '/r:System.Drawing.dll',
    '/r:System.Windows.Forms.dll',
    `/r:${CORE_DLL}`,
    `/r:${WINFORMS_DLL}`,
    path.join(ROOT, 'desktop', 'Program.cs'),
  ];
  const result = spawnSync(CSC, args, { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('C# 编译失败');
}

function copyDir(source, target) {
  if (!fs.existsSync(source)) throw new Error(`缺少构建文件：${source}`);
  fs.cpSync(source, target, { recursive: true });
}

function measure(dir) {
  let sum = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sum += measure(full);
    else if (entry.isFile()) sum += fs.statSync(full).size;
  }
  return sum;
}

async function main() {
  for (const file of [CSC, CORE_DLL, WINFORMS_DLL, LOADER_DLL]) {
    if (!fs.existsSync(file)) throw new Error(`缺少构建依赖：${file}`);
  }
  if (!fs.existsSync(process.execPath) || fs.statSync(process.execPath).size < 10 * 1024 * 1024) {
    throw new Error('无法找到完整的 Node.js 运行时（process.execPath）');
  }

  assertInside(RELEASE_ROOT, APP_DIR);
  console.log('构建桌面主界面 + 外部对话窗口…');
  fs.mkdirSync(RELEASE_ROOT, { recursive: true });
  fs.rmSync(APP_DIR, { recursive: true, force: true });
  fs.mkdirSync(APP_DIR, { recursive: true });

  const exePath = path.join(APP_DIR, EXE_NAME);
  console.log('  → 编译应用主界面');
  compile(exePath);

  console.log('  → 复制 WebView2 运行时接口');
  for (const file of [CORE_DLL, WINFORMS_DLL, LOADER_DLL]) {
    fs.copyFileSync(file, path.join(APP_DIR, path.basename(file)));
  }

  console.log('  → 打包内置 Node.js 与控制台');
  const runtimeDir = path.join(APP_DIR, 'runtime');
  const appRuntimeDir = path.join(runtimeDir, 'app');
  fs.mkdirSync(appRuntimeDir, { recursive: true });
  fs.copyFileSync(process.execPath, path.join(runtimeDir, 'node.exe'));
  for (const item of ['server.js', 'lib', 'public', 'assets']) {
    copyDir(path.join(ROOT, item), path.join(appRuntimeDir, item));
  }
  if (fs.existsSync(path.join(ROOT, 'docs'))) {
    copyDir(path.join(ROOT, 'docs'), path.join(appRuntimeDir, 'docs'));
  }

  writeReadme();
  writeInstaller();
  await applyVersionInfo(exePath);

  const totalBytes = measure(APP_DIR);
  console.log('');
  console.log('构建完成');
  console.log(`  → ${exePath}`);
  console.log(`  → 大小 ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log('');
}

main().catch((err) => {
  console.error(`\n构建失败：${err.stack || err.message}`);
  process.exit(1);
});
