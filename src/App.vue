<template>
  <div class="app-warp">
    <AppTitleBar v-if="isElectron"></AppTitleBar>
    <div class="app-body">
      <ChatApp></ChatApp>
    </div>
  </div>
</template>

<script>
import ChatApp from "./components/ChatApp";
import AppTitleBar from "./components/AppTitleBar.vue";

export default {
  name: 'App',
  components: {
    ChatApp,
    AppTitleBar
  },
  data() {
    return {
      isElectron: typeof window !== 'undefined' && Boolean(window.electron)
    };
  }
}
</script>

<style scoped lang="less">
.app-warp {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f2f2f2;
}

.app-body {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>
