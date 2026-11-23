<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { devLogin, getMe, loginUser, registerUser, type UserInfo } from './api/client'
import ApiTester from './components/ApiTester.vue'
import FactoryTwinView from './components/FactoryTwinView.vue'
import LogisticsSimView from './components/LogisticsSimView.vue'
import WarehouseMaintenance from './components/WarehouseMaintenance.vue'

type TabKey = 'twin' | 'logistics' | 'warehouse' | 'api'
const TOKEN_KEY = 'token'
const allowDevSwitch = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true'

const activeTab = ref<TabKey>('twin')
const token = ref('')
const currentUser = ref<UserInfo | null>(null)
const initError = ref('')
const focusRackId = ref('')

const showAuthModal = ref(false)
const authMode = ref<'login' | 'register'>('login')
const formUser = ref('')
const formPwd = ref('')
const formRole = ref<UserInfo['role']>('user')
const formGroups = ref('public,engineering')
const authErr = ref('')

function applyAuth(auth: { access_token: string; user: UserInfo }) {
  token.value = auth.access_token
  currentUser.value = auth.user
  localStorage.setItem(TOKEN_KEY, auth.access_token)
  showAuthModal.value = false
}

function logout() {
  token.value = ''
  currentUser.value = null
  localStorage.removeItem(TOKEN_KEY)
  showAuthModal.value = true
}

async function quickSwitch(preset: 'admin' | 'eng' | 'guest') {
  initError.value = ''
  try {
    if (preset === 'admin') applyAuth(await devLogin('shenyang', 'admin', ['public', 'engineering', 'finance']))
    else if (preset === 'eng') applyAuth(await devLogin('dev_user', 'user', ['public', 'engineering']))
    else applyAuth(await devLogin('guest', 'readonly', ['public']))
  } catch (err) { initError.value = err instanceof Error ? err.message : '登录初始化失败' }
}

async function restoreFromStorage() {
  initError.value = ''
  const saved = localStorage.getItem(TOKEN_KEY) || ''
  if (!saved) {
    if (allowDevSwitch) { await quickSwitch('admin'); return }
    token.value = ''; currentUser.value = null; showAuthModal.value = true
    return
  }
  try {
    const user = await getMe(saved)
    token.value = saved; currentUser.value = user; showAuthModal.value = false
  } catch {
    if (allowDevSwitch) { await quickSwitch('admin'); return }
    logout()
  }
}

async function submitAuthForm() {
  authErr.value = ''
  try {
    if (authMode.value === 'login') applyAuth(await loginUser(formUser.value.trim(), formPwd.value))
    else applyAuth(await registerUser(formUser.value.trim(), formPwd.value, formRole.value, formGroups.value.split(',').map((s) => s.trim()).filter(Boolean)))
    formPwd.value = ''
  } catch (err) { authErr.value = err instanceof Error ? err.message : String(err) }
}

function onStorageSync(e: StorageEvent) {
  if (!e.key || e.key === TOKEN_KEY) void restoreFromStorage()
}

function jumpToRack(rackId: string) {
  focusRackId.value = rackId
  activeTab.value = 'warehouse'
}

onMounted(() => {
  window.addEventListener('storage', onStorageSync)
  void restoreFromStorage()
})
onBeforeUnmount(() => window.removeEventListener('storage', onStorageSync))
</script>

<template>
  <div class="shell">
    <nav class="topbar">
      <div class="brand">
        <strong>厂区数字孪生与仓储维护平台</strong>
        <span v-if="currentUser" class="badge badge-ok">{{ currentUser.username }} · {{ currentUser.role }}</span>
      </div>

      <div class="tabs">
        <button class="btn" :class="{ 'btn-primary': activeTab === 'twin' }" @click="activeTab = 'twin'">3D 厂区孪生</button>
        <button class="btn" :class="{ 'btn-primary': activeTab === 'logistics' }" @click="activeTab = 'logistics'">物流模拟</button>
        <button class="btn" :class="{ 'btn-primary': activeTab === 'warehouse' }" @click="activeTab = 'warehouse'">仓储维护</button>
        <button class="btn" :class="{ 'btn-primary': activeTab === 'api' }" @click="activeTab = 'api'">接口测试台</button>
      </div>

      <div class="auth-actions">
        <template v-if="allowDevSwitch">
          <button class="btn" @click="quickSwitch('admin')">Admin</button>
          <button class="btn" @click="quickSwitch('eng')">研发组</button>
          <button class="btn" @click="quickSwitch('guest')">只读</button>
        </template>
        <button v-if="token && !allowDevSwitch" class="btn" @click="logout">退出登录</button>
        <button v-else-if="!token" class="btn btn-primary" @click="showAuthModal = true">登录</button>
      </div>
    </nav>

    <main :class="activeTab === 'twin' ? 'twin-main' : 'container'">
      <div v-if="initError" class="err-banner">{{ initError }}</div>
      <div v-else-if="!token" class="wait-login">请先登录（若通过主系统进入，将自动读取 localStorage.token）</div>
      <template v-else>
        <FactoryTwinView v-show="activeTab === 'twin'" :token="token" :active="activeTab === 'twin'" @open-rack="jumpToRack" />
        <LogisticsSimView v-if="activeTab === 'logistics'" :token="token" />
        <WarehouseMaintenance v-if="activeTab === 'warehouse'" :token="token" :focus-rack-id="focusRackId" />
        <ApiTester v-if="activeTab === 'api'" :token="token" />
      </template>
    </main>

    <div v-if="showAuthModal" class="modal-mask" @click.self="token && (showAuthModal = false)">
      <div class="modal-card">
        <div class="modal-tabs">
          <button class="btn" :class="{ 'btn-primary': authMode === 'login' }" @click="authMode = 'login'">登录</button>
          <button class="btn" :class="{ 'btn-primary': authMode === 'register' }" @click="authMode = 'register'">注册</button>
        </div>
        <input v-model="formUser" class="inp" placeholder="用户名" /><input v-model="formPwd" class="inp" type="password" placeholder="密码" @keyup.enter="submitAuthForm" />
        <template v-if="authMode === 'register'">
          <select v-model="formRole" class="inp"><option value="user">user</option><option value="admin">admin</option><option value="readonly">readonly</option></select>
          <input v-model="formGroups" class="inp" placeholder="所属组 (逗号分隔)" />
        </template>
        <p v-if="authErr" class="err-text">{{ authErr }}</p>
        <button class="btn btn-primary" @click="submitAuthForm">提交</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.twin-main { flex: 1; min-height: 0; }
.err-banner { padding: 12px; margin: 16px; background: #450a0a; color: #fecaca; border-radius: 8px; }
.wait-login { padding: 48px 16px; text-align: center; color: #94a3b8; font-size: 14px; }
.modal-mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-card { width: 320px; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.modal-tabs { display: flex; gap: 8px; }
.inp { padding: 8px 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
.err-text { color: #fca5a5; font-size: 12px; margin: 0; }
</style>
