<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { api, act } from "./api";
const newKey = () => crypto.randomUUID();
const templates = ref([]),
  rows = ref([]),
  name = ref("Hoş geldin"),
  body = ref("Merhaba {{name}}, hesabın hazır."),
  templateId = ref(""),
  recipient = ref("local-demo"),
  person = ref("Deniz"),
  channel = ref("in-app"),
  dedupe = ref(crypto.randomUUID());
let events;
async function load() {
  [templates.value, rows.value] = await Promise.all([
    api("/templates"),
    api("/notifications"),
  ]);
  if (!templateId.value) templateId.value = templates.value[0]?.id || "";
}
onMounted(async () => {
  await act(load, "");
  events = new EventSource("/api/events");
  events.addEventListener("notification", () => act(load, ""));
  events.onopen = () => act(load, "");
});
onUnmounted(() => events?.close());
</script>
<template>
  <div class="grid">
    <form
      class="panel"
      @submit.prevent="
        act(async () => {
          await api('/templates', 'POST', { name, body });
          await load();
        })
      "
    >
      <h2>Şablon oluştur</h2>
      <label>Ad<input v-model="name" required /></label
      ><label>Metin<textarea v-model="body"></textarea></label
      ><button>Kaydet</button
      ><small v-pre
        >{{ name }} değişkeni gönderim sırasında değiştirilir.</small
      >
    </form>
    <form
      class="panel"
      @submit.prevent="
        act(async () => {
          await api('/notifications', 'POST', {
            templateId,
            recipient,
            channel,
            dedupe,
            variables: { name: person },
          });
          await load();
        }, 'Kuyruğa alındı veya aynı iş bulundu')
      "
    >
      <h2>Bildirim kuyruğa al</h2>
      <label
        >Şablon<select v-model="templateId" required>
          <option v-for="t in templates" :value="t.id">{{ t.name }}</option>
        </select></label
      >
      <div class="toolbar">
        <label>Alıcı<input v-model="recipient" /></label
        ><label
          >Kanal<select v-model="channel">
            <option>in-app</option>
            <option>email-demo</option>
            <option>sms-demo</option>
          </select></label
        >
      </div>
      <label>İsim değişkeni<input v-model="person" /></label
      ><label>Tekilleştirme anahtarı<input v-model="dedupe" /></label>
      <div class="actions">
        <button :disabled="!templateId">Gönder</button
        ><button type="button" class="ghost" @click="dedupe = newKey()">
          Yeni iş anahtarı
        </button>
      </div>
      <small
        >retry-demo: 3. denemede başarı · fail-demo: kalıcı hata · gerçek
        e-posta/SMS gönderilmez.</small
      >
    </form>
  </div>
  <section class="panel">
    <h2>Gönderim günlüğü</h2>
    <div class="card" v-for="r in rows">
      <div class="toolbar">
        <strong>{{ r.recipient }}</strong
        ><span class="badge">{{ r.status }} · deneme {{ r.attempt }}</span
        ><button
          v-if="r.status === 'failed'"
          class="ghost small"
          @click="
            act(async () => {
              await api('/notifications/' + r.id + '/retry', 'POST', {});
              await load();
            })
          "
        >
          Yeniden dene
        </button>
      </div>
      <p>{{ r.body }}</p>
      <small>{{ r.channel }} · {{ r.last_error }}</small>
    </div>
  </section>
</template>
