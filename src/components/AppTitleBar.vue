<template>
  <header class="title-bar" @dblclick="toggleMaximized">
    <div class="title-bar__drag"></div>
    <div class="title-bar__title">{{ title }}</div>
    <nav class="title-bar__actions">
      <button class="title-bar__btn" @click.stop="handleMinimize" title="最小化">&#x2013;</button>
  <button class="title-bar__btn" @click.stop="toggleMaximized" :title="maximized ? '还原' : '最大化'">
        <span v-if="maximized">&#x2752;</span>
        <span v-else>&#x2610;</span>
      </button>
      <button class="title-bar__btn title-bar__btn--close" @click.stop="handleClose" title="关闭">&#x2715;</button>
    </nav>
  </header>
</template>

<script>
export default {
  name: 'AppTitleBar',
  props: {
    title: {
      type: String,
      default: 'Q信'
    }
  },
  data() {
    return {
      maximized: false
    };
  },
  mounted() {
    if (window.electron && typeof window.electron.isMaximized === 'function') {
      window.electron.isMaximized().then((value) => {
        this.maximized = Boolean(value);
      });
    }
    window.addEventListener('electron-window-maximize', this.handleWindowState);
  },
  beforeDestroy() {
    window.removeEventListener('electron-window-maximize', this.handleWindowState);
  },
  methods: {
    handleWindowState(event) {
      if (event && event.detail) {
        this.maximized = Boolean(event.detail.maximized);
      }
    },
    handleMinimize() {
      if (window.electron && typeof window.electron.minimize === 'function') {
        window.electron.minimize();
      }
    },
    toggleMaximized() {
      if (window.electron && typeof window.electron.toggleMaximize === 'function') {
        window.electron.toggleMaximize().then((state) => {
          this.maximized = Boolean(state);
        });
      }
    },
    handleClose() {
      if (window.electron && typeof window.electron.close === 'function') {
        window.electron.close();
      }
    }
  }
};
</script>

<style scoped lang="less">
.title-bar {
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 12px;
  background: linear-gradient(90deg, #1f2329 0%, #2f333a 100%);
  color: #f0f0f0;
  font-size: 13px;
  user-select: none;
}

.title-bar__drag {
  flex: 0 0 auto;
  width: 16px;
  height: 100%;
}

.title-bar__title {
  flex: 1;
  padding-left: 8px;
  font-weight: 500;
}

.title-bar__actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.title-bar__btn {
  width: 34px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease;
}

.title-bar__btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.title-bar__btn--close:hover {
  background: #e81123;
  color: #ffffff;
}
</style>
