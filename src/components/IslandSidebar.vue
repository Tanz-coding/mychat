<template>
  <aside class="island-sidebar">
    <div class="island-sidebar__brand">
      <div class="island-sidebar__logo">Q信</div>
      <div class="island-sidebar__sub">MyChat</div>
    </div>

    <div class="island-sidebar__profile">
      <img :src="user.avatar" alt="当前用户头像" />
      <span class="island-sidebar__status"></span>
      <strong>{{ user.name }}</strong>
      <small>{{ user.role }}</small>
    </div>

    <nav class="island-sidebar__nav" aria-label="主导航">
      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        class="island-sidebar__item"
        :class="{ 'island-sidebar__item--active': activePage === item.key }"
        @click="$emit('navigate', item.key)"
      >
        <IslandSvgIcon :name="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <img class="island-sidebar__scene" :src="sidebarScene" alt="海岛小屋装饰" />
  </aside>
</template>

<script>
import IslandSvgIcon from "./island-ui/IslandSvgIcon.vue";

export default {
  name: "IslandSidebar",
  components: {
    IslandSvgIcon
  },
  props: {
    navItems: {
      type: Array,
      required: true
    },
    activePage: {
      type: String,
      required: true
    },
    user: {
      type: Object,
      required: true
    },
    sidebarScene: {
      type: String,
      required: true
    }
  }
};
</script>
