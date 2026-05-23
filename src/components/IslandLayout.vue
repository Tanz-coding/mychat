<template>
  <section class="island-stage">
    <IslandSidebar
      :nav-items="navItems"
      :active-page="activePage"
      :user="user"
      :sidebar-scene="sidebarScene"
      @navigate="$emit('navigate', $event)"
    />

    <main class="island-main">
      <div class="island-window-controls" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <slot />
    </main>
  </section>
</template>

<script>
import IslandSidebar from "./IslandSidebar.vue";

export default {
  name: "IslandLayout",
  components: {
    IslandSidebar
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
