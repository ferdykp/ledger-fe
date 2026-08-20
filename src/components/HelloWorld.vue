<!-- ledger-web/src/components/HelloWorld.vue -->
<script setup>
import { ref } from "vue";
import viteLogo from "../assets/vite.svg";
import heroImg from "../assets/hero.png";
import vueLogo from "../assets/vue.svg";

const count = ref(0);
</script>

<template>
  <div
    class="max-w-[1126px] mx-auto min-h-screen border-x border-line-200 flex flex-col bg-paper-50 text-ink-900 font-body"
  >
    <!-- Hero / Center Section -->
    <section
      class="flex flex-col items-center justify-center gap-6 grow p-8 text-center"
    >
      <div class="relative w-[170px] h-[179px] mx-auto">
        <img :src="heroImg" class="absolute inset-0 w-[170px] z-0" alt="" />
        <img
          :src="vueLogo"
          class="absolute top-[34px] h-[28px] z-10 left-1/2 -translate-x-1/2 transform-gpu rotate-[-60deg] scale-[1.4]"
          alt="Vue logo"
        />
        <img
          :src="viteLogo"
          class="absolute top-[107px] h-[26px] w-auto z-0 left-1/2 -translate-x-1/2 transform-gpu rotate-[-60deg] scale-[0.8]"
          alt="Vite logo"
        />
      </div>

      <div>
        <h1
          class="font-display text-4xl md:text-6xl font-medium text-ink-900 tracking-tight my-4"
        >
          Get started
        </h1>
        <p class="text-ink-600 text-base md:text-lg">
          Edit
          <code
            class="font-mono-money text-sm px-2 py-1 rounded bg-paper-0 border border-line-200 text-ink-900"
            >src/App.vue</code
          >
          and save to test
          <code
            class="font-mono-money text-sm px-2 py-1 rounded bg-paper-0 border border-line-200 text-ink-900"
            >HMR</code
          >
        </p>
      </div>

      <button
        type="button"
        class="font-mono-money text-base px-3 py-1.5 rounded-sm text-indigo-600 bg-indigo-100 border border-transparent hover:border-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600 transition-colors cursor-pointer"
        @click="count++"
      >
        Count is {{ count }}
      </button>
    </section>

    <!-- Divider Line -->
    <div class="border-t border-line-200"></div>

    <!-- Next Steps Section -->
    <section
      class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line-200 text-left"
    >
      <!-- Docs Column -->
      <div class="p-6 md:p-8">
        <svg
          class="w-5 h-5 mb-4 text-ink-900"
          role="presentation"
          aria-hidden="true"
        >
          <use href="/icons.svg#documentation-icon"></use>
        </svg>
        <h2
          class="font-display text-xl md:text-2xl font-medium text-ink-900 mb-2"
        >
          Documentation
        </h2>
        <p class="text-ink-600 text-sm">Your questions, answered</p>

        <ul class="flex flex-wrap gap-2 mt-6 p-0 list-none">
          <li>
            <a
              href="https://vite.dev/"
              target="_blank"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-ink-900 bg-paper-0 rounded-sm border border-line-200 hover:shadow-card transition-shadow"
            >
              <img class="h-4.5" :src="viteLogo" alt="" />
              Explore Vite
            </a>
          </li>
          <li>
            <a
              href="https://vuejs.org/"
              target="_blank"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-ink-900 bg-paper-0 rounded-sm border border-line-200 hover:shadow-card transition-shadow"
            >
              <img class="h-4.5 w-4.5" :src="vueLogo" alt="" />
              Learn more
            </a>
          </li>
        </ul>
      </div>

      <!-- Social Column -->
      <div class="p-6 md:p-8">
        <svg
          class="w-5 h-5 mb-4 text-ink-900"
          role="presentation"
          aria-hidden="true"
        >
          <use href="/icons.svg#social-icon"></use>
        </svg>
        <h2
          class="font-display text-xl md:text-2xl font-medium text-ink-900 mb-2"
        >
          Connect with us
        </h2>
        <p class="text-ink-600 text-sm">Join the Vite community</p>

        <ul class="flex flex-wrap gap-2 mt-6 p-0 list-none">
          <li>
            <a
              href="https://github.com/vitejs/vite"
              target="_blank"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-ink-900 bg-paper-0 rounded-sm border border-line-200 hover:shadow-card transition-shadow"
            >
              <svg
                class="w-4.5 h-4.5 text-ink-900 dark:invert"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#github-icon"></use>
              </svg>
              GitHub
            </a>
          </li>
          <li>
            <a
              href="https://chat.vite.dev/"
              target="_blank"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-ink-900 bg-paper-0 rounded-sm border border-line-200 hover:shadow-card transition-shadow"
            >
              <svg
                class="w-4.5 h-4.5 text-ink-900 dark:invert"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#discord-icon"></use>
              </svg>
              Discord
            </a>
          </li>
          <li>
            <a
              href="https://x.com/vite_js"
              target="_blank"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-ink-900 bg-paper-0 rounded-sm border border-line-200 hover:shadow-card transition-shadow"
            >
              <svg
                class="w-4.5 h-4.5 text-ink-900 dark:invert"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#x-icon"></use>
              </svg>
              X.com
            </a>
          </li>
          <li>
            <a
              href="https://bsky.app/profile/vite.dev"
              target="_blank"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-ink-900 bg-paper-0 rounded-sm border border-line-200 hover:shadow-card transition-shadow"
            >
              <svg
                class="w-4.5 h-4.5 text-ink-900 dark:invert"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#bluesky-icon"></use>
              </svg>
              Bluesky
            </a>
          </li>
        </ul>
      </div>
    </section>

    <!-- Bottom Spacer -->
    <div class="h-12 md:h-22 border-t border-line-200"></div>
  </div>
</template>
