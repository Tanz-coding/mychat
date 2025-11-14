<template>
  <transition name="fade">
  <div class="db-config-mask" v-if="visible" @click.self="$emit('close')">
      <div class="db-config-panel" @mousedown.stop>
        <header class="db-config-header">
          <div class="db-config-header__title">数据库连接</div>
          <button class="db-config-header__close" @click="$emit('close')" title="关闭">&#x2715;</button>
        </header>
        <section class="db-config-body">
          <div class="db-config-section">
            <h3 class="db-config-section__title">MySQL</h3>
            <div class="db-config-grid">
              <label class="db-config-field">
                <span>主机</span>
                <input type="text" v-model="form.mysql.host" required placeholder="例如 127.0.0.1">
              </label>
              <label class="db-config-field">
                <span>端口</span>
                <input type="number" v-model.number="form.mysql.port" min="1" max="65535" required>
              </label>
              <label class="db-config-field">
                <span>用户名</span>
                <input type="text" v-model="form.mysql.user" required>
              </label>
              <label class="db-config-field">
                <span>密码</span>
                <input type="password" v-model="form.mysql.password" autocomplete="new-password">
              </label>
              <label class="db-config-field db-config-field--full">
                <span>数据库</span>
                <input type="text" v-model="form.mysql.database" required>
              </label>
            </div>
          </div>
          <div class="db-config-section">
            <h3 class="db-config-section__title">Redis</h3>
            <div class="db-config-grid">
              <label class="db-config-field">
                <span>主机</span>
                <input type="text" v-model="form.redis.host" required>
              </label>
              <label class="db-config-field">
                <span>端口</span>
                <input type="number" v-model.number="form.redis.port" min="1" max="65535" required>
              </label>
              <label class="db-config-field">
                <span>密码</span>
                <input type="password" v-model="form.redis.password" autocomplete="new-password">
              </label>
              <label class="db-config-field">
                <span>数据库</span>
                <input type="number" v-model.number="form.redis.db" min="0" max="32">
              </label>
            </div>
          </div>
        </section>
        <footer class="db-config-footer">
          <div class="db-config-footer__hint" v-if="dirty">
            保存后需要重启应用才能生效。
          </div>
          <div class="db-config-footer__actions">
            <button type="button" class="db-config-btn" @click="$emit('close')">取消</button>
            <button type="button" class="db-config-btn db-config-btn--primary" :disabled="loading" @click="submit">
              <span v-if="loading">保存中...</span>
              <span v-else>保存</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'DatabaseConfigDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    value: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      form: this.normalize(this.value)
    };
  },
  computed: {
    dirty() {
      return JSON.stringify(this.normalize(this.value)) !== JSON.stringify(this.form);
    }
  },
  watch: {
    value: {
      deep: true,
      handler(newVal) {
        this.form = this.normalize(newVal);
      }
    }
  },
  methods: {
    normalize(config = {}) {
      return {
        mysql: {
          host: config.mysql && config.mysql.host ? config.mysql.host : '',
          port: config.mysql && config.mysql.port ? Number(config.mysql.port) : 3306,
          user: config.mysql && config.mysql.user ? config.mysql.user : '',
          password: config.mysql && config.mysql.password ? config.mysql.password : '',
          database: config.mysql && config.mysql.database ? config.mysql.database : ''
        },
        redis: {
          host: config.redis && config.redis.host ? config.redis.host : '127.0.0.1',
          port: config.redis && config.redis.port ? Number(config.redis.port) : 6379,
          password: config.redis && config.redis.password ? config.redis.password : '',
          db: config.redis && config.redis.db !== undefined ? Number(config.redis.db) : 0
        }
      };
    },
    submit() {
      this.$emit('submit', this.normalize(this.form));
    }
  }
};
</script>

<style scoped lang="less">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.db-config-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 18, 24, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.db-config-panel {
  width: 640px;
  max-width: calc(100% - 48px);
  background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
  border-radius: 12px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.db-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 20px;
  background: #1f2329;
  color: #f2f2f2;
  font-size: 16px;
  font-weight: 500;
}

.db-config-header__title {
  -webkit-app-region: no-drag;
}

.db-config-header__close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.2s ease;
  -webkit-app-region: no-drag;
}

.db-config-header__close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.db-config-body {
  padding: 20px;
  max-height: 420px;
  overflow-y: auto;
}

.db-config-section + .db-config-section {
  margin-top: 24px;
}

.db-config-section__title {
  font-size: 15px;
  margin-bottom: 12px;
  color: #2f333a;
}

.db-config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.db-config-field {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: #3c4048;
}

.db-config-field span {
  margin-bottom: 6px;
}

.db-config-field input {
  height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid #cfd3dc;
  background-color: #ffffff;
  outline: none;
  transition: border 0.15s ease, box-shadow 0.15s ease;
  font-size: 13px;
}

.db-config-field input:focus {
  border-color: #3a8ee6;
  box-shadow: 0 0 0 2px rgba(58, 142, 230, 0.2);
}

.db-config-field--full {
  grid-column: span 2;
}

.db-config-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #edf1f7;
  border-top: 1px solid #dbe0e9;
}

.db-config-footer__hint {
  font-size: 12px;
  color: #5f6672;
}

.db-config-footer__actions {
  display: flex;
  gap: 12px;
}

.db-config-btn {
  min-width: 88px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: #d1d6de;
  color: #2f333a;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0 12px;
}

.db-config-btn:hover {
  background: #bfc5cf;
}

.db-config-btn--primary {
  background: #3a8ee6;
  color: #ffffff;
}

.db-config-btn--primary:disabled {
  background: #9abdea;
  cursor: not-allowed;
}
</style>
