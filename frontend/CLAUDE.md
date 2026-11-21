# frontend/CLAUDE.md — 前端记忆规范 (Vue 3 + TypeScript + Three.js)

> 先读顶层 `../CLAUDE.md` 与 `../docs/API_SPEC.md`。

## 1. 模块职责边界

- `src/api/client.ts`：所有 REST 请求唯一收口（`fetch` + Bearer JWT）。
- `src/composables/useFactoryScene.ts`：Three.js 场景生命周期、相机预设与渲染循环。
- `src/utils/`：纯 3D 几何体构建与共享材质池（不依赖 Vue 响应式）。
- `src/components/*.vue`：纯 UI 展示与局部视图状态（单文件 `< 200` 行）。
- `src/App.vue`：鉴权初始化（`devLogin` / 登录注册）与顶层 Tab 切换。

## 2. 前端开发铁律

1. **禁止组件裸写请求**：`.vue` 文件严禁直接调用 `fetch()`，必须从 `src/api/client.ts` 引入。
2. **严格 TypeScript**：统一使用 `<script setup lang="ts">`，接口类型必须与 `docs/API_SPEC.md` 保持一致。
3. **代理路径约定**：所有请求使用相对路径 `/api/v1/...`（由 `vite.config.ts` 代理至 `http://127.0.0.1:8000`）。
4. **WebGL 上下文保活**：`FactoryTwinView.vue` 使用 `v-show` 切换，禁止切 Tab 销毁重建 Three.js 实例。
