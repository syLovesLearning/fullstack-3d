<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { devLogin, loginUser, registerUser, type UserInfo } from './api/client'
import ApiTester from './components/ApiTester.vue'
import FactoryTwinView from './components/FactoryTwinView.vue'
import WarehouseMaintenance from './components/WarehouseMaintenance.vue'

type TabKey = 'twin' | 'warehouse' | 'api'
const activeTab = ref<TabKey>('twin')
const token = ref('')
const currentUser = ref<UserInfo | null>(null)
const initError = ref('')

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
}

async function quickSwitch(preset: 'admin' | 'eng' | 'guest') {
  initError.value = ''
  try {
    if (preset === 'admin') applyAuth(await devLogin('shenyang', 'admin', ['public', 'engineering', 'finance']))
    else if (preset === 'eng') applyAuth(await devLogin('dev_user', 'user', ['public', 'engineering']))
    else applyAuth(await devLogin('guest', 'readonly', ['public']))
  } catch (err) {
    initError.value = err instanceof Error ? err.message : '登录初始化失败'
  }
}

async function submitAuthForm() {
  authErr.value = ''
  try {
    if (authMode.value === 'login') {
      applyAuth(await loginUser(formUser.value.trim(), formPwd.value))
    } else {
      const groups = formGroups.value.split(',').map((s) => s.trim()).filter(Boolean)
      applyAuth(await registerUser(formUser.value.trim(), formPwd.value, formRole.value, groups))
    }
    showAuthModal.value = false
    formPwd.value = ''
  } catch (err) {
    authErr.value = err instanceof Error ? err.message : String(err)
  }
}

onMounted(() => quickSwitch('admin'))
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
        <button class="btn" :class="{ 'btn-primary': activeTab === 'warehouse' }" @click="activeTab = 'warehouse'">仓储维护</button>
        <button class="btn" :class="{ 'btn-primary': activeTab === 'api' }" @click="activeTab = 'api'">接口测试台</button>
      </div>

      <div class="auth-actions">
        <button class="btn" @click="quickSwitch('admin')">Admin</button>
        <button class="btn" @click="quickSwitch('eng')">研发组</button>
        <button class="btn" @click="quickSwitch('guest')">只读</button>
        <button class="btn btn-primary" @click="showAuthModal = true">登录/注册</button>
      </div>
    </nav>

    <main :class="activeTab === 'twin' ? 'twin-main' : 'container'">
      <div v-if="initError" class="err-banner">{{ initError }}</div>
      <template v-else-if="token">
        <FactoryTwinView v-show="activeTab === 'twin'" :token="token" :active="activeTab === 'twin'" />
        <WarehouseMaintenance v-if="activeTab === 'warehouse'" :token="token" />
        <ApiTester v-if="activeTab === 'api'" :token="token" />
      </template>
    </main>

    <div v-if="showAuthModal" class="modal-mask" @click.self="showAuthModal = false">
      <div class="modal-card">
        <div class="modal-tabs">
          <button class="btn" :class="{ 'btn-primary': authMode === 'login' }" @click="authMode = 'login'">登录</button>
          <button class="btn" :class="{ 'btn-primary': authMode === 'register' }" @click="authMode = 'register'">注册</button>
        </div>
        <input v-model="formUser" class="inp" placeholder="用户名" />
        <input v-model="formPwd" class="inp" type="password" placeholder="密码" />
        <template v-if="authMode === 'register'">
          <select v-model="formRole" class="inp">
            <option value="user">user</option>
            <option value="admin">admin</option>
            <option value="readonly">readonly</option>
          </select>
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
.modal-mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-card { width: 320px; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.modal-tabs { display: flex; gap: 8px; }
.inp { padding: 8px 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
.err-text { color: #fca5a5; font-size: 12px; margin: 0; }
</style>
