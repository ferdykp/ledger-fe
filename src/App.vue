<!-- <script setup>
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <HelloWorld />
</template> -->

<script setup>
import { ref, onMounted } from "vue";
import api from "./lib/axios";

const message = ref("");
onMounted(async () => {
  const res = await api.get("/api/ping");
  message.value = res.data.message;
});
</script>
<template>
  <div>{{ message }}</div>
</template>
