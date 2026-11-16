<template>
  <div class="thm" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="thm-head">
      <span class="thm-title"><i class="fas" :class="icon"></i> {{ isAr ? 'ترويسة القالب:' : 'Template header:' }} {{ mediaLabel(kind, isAr) }}</span>
      <div class="thm-tabs">
        <button type="button" :class="{ on: mode === 'upload' }" @click="setMode('upload')">{{ isAr ? 'رفع ملف' : 'Upload' }}</button>
        <button type="button" :class="{ on: mode === 'link' }" @click="setMode('link')">{{ isAr ? 'رابط' : 'Link' }}</button>
      </div>
    </div>

    <template v-if="mode === 'upload'">
      <label class="thm-drop" :class="{ busy: uploading }">
        <input type="file" :accept="spec.accept" :disabled="uploading || disabled" @change="upload" />
        <span v-if="uploading"><i class="fas fa-spinner fa-spin"></i> {{ isAr ? 'جارٍ الرفع إلى Meta…' : 'Uploading to Meta…' }}</span>
        <span v-else-if="modelValue?.id"><i class="fas fa-check-circle ok"></i> {{ modelValue.filename || (isAr ? 'تم الرفع' : 'Uploaded') }} — {{ isAr ? 'اختر ملفاً آخر للتغيير' : 'pick another file to change it' }}</span>
        <span v-else><i class="fas fa-cloud-arrow-up"></i> {{ isAr ? 'اختر الملف' : 'Choose the file' }}</span>
      </label>
      <p class="thm-hint">{{ isAr ? spec.hintAr : spec.hintEn }}</p>
    </template>

    <template v-else>
      <input v-model.trim="link" type="url" dir="ltr" class="thm-input" :disabled="disabled" placeholder="https://…" @input="useLink" />
      <p class="thm-hint" :class="{ err: link && !validLink }">
        {{ link && !validLink
          ? (isAr ? 'الرابط لازم يبدأ بـ https:// ويكون متاحاً للعموم.' : 'The link must start with https:// and be public.')
          : (isAr ? 'رابط مباشر للملف (ليس صفحة)، تحمّله Meta وقت الإرسال. ' : 'A direct link to the file (not a page); Meta downloads it when sending. ') + (isAr ? spec.hintAr : spec.hintEn) }}
      </p>
    </template>

    <div v-if="previewUrl && kind === 'image'" class="thm-preview"><img :src="previewUrl" alt="" /></div>
    <div v-else-if="previewUrl && kind === 'video'" class="thm-preview"><video :src="previewUrl" controls muted></video></div>
    <p v-if="error" class="thm-hint err">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { mediaLabel } from '../utils/metaTemplate'

// The image / video / PDF that goes at the top of a media-header template. v-model is
// { type, id, filename } (uploaded to Meta from this number, kept 30 days) or { type, link }, or null.
const props = defineProps({
  kind: { type: String, required: true }, // image | video | document
  channelId: { type: String, required: true },
  modelValue: { type: Object, default: null },
  isAr: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const SPECS = {
  image: { accept: 'image/jpeg,image/png', icon: 'fa-image', hintAr: 'JPG أو PNG، حتى 5 ميجا.', hintEn: 'JPG or PNG, up to 5 MB.' },
  video: { accept: 'video/mp4,video/3gpp', icon: 'fa-film', hintAr: 'MP4، حتى 16 ميجا.', hintEn: 'MP4, up to 16 MB.' },
  document: { accept: 'application/pdf', icon: 'fa-file-pdf', hintAr: 'PDF، حتى 16 ميجا. يظهر للعميل باسم الملف.', hintEn: 'PDF, up to 16 MB. The customer sees the file name.' }
}
const spec = computed(() => SPECS[props.kind] || SPECS.image)
const icon = computed(() => spec.value.icon)

const mode = ref(props.modelValue?.link ? 'link' : 'upload')
const link = ref(props.modelValue?.link || '')
const uploading = ref(false)
const error = ref('')
const localUrl = ref('')

const validLink = computed(() => /^https:\/\/[^\s]+\.[^\s]+/i.test(link.value))
const previewUrl = computed(() => (mode.value === 'link' ? (validLink.value ? link.value : '') : localUrl.value))

const revoke = () => { if (localUrl.value) URL.revokeObjectURL(localUrl.value); localUrl.value = '' }
onBeforeUnmount(revoke)

const setMode = (next) => {
  if (mode.value === next) return
  mode.value = next
  error.value = ''
  revoke()
  emit('update:modelValue', next === 'link' && validLink.value ? { type: props.kind, link: link.value } : null)
}

const useLink = () => {
  emit('update:modelValue', validLink.value ? { type: props.kind, link: link.value } : null)
}

const MAX = { image: 5, video: 16, document: 16 }
const upload = async (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  error.value = ''
  if (!spec.value.accept.split(',').includes(file.type)) {
    error.value = props.isAr ? `نوع الملف غير مقبول. ${spec.value.hintAr}` : `This file type is not accepted. ${spec.value.hintEn}`
    return
  }
  if (file.size > MAX[props.kind] * 1024 * 1024) {
    error.value = props.isAr ? `الملف أكبر من المسموح. ${spec.value.hintAr}` : `The file is too big. ${spec.value.hintEn}`
    return
  }
  uploading.value = true
  emit('update:modelValue', null)
  try {
    const form = new FormData()
    form.append('type', props.kind)
    form.append('file', file)
    const res = await axios.post(`/api/v1/meta/channel/${props.channelId}/header-media`, form)
    revoke()
    if (props.kind !== 'document') localUrl.value = URL.createObjectURL(file)
    const { id, filename } = res.data.data
    emit('update:modelValue', { type: props.kind, id, filename })
  } catch (err) {
    error.value = err.response?.data?.message || (props.isAr ? 'تعذّر رفع الملف' : 'Could not upload the file')
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.thm { border: 1px dashed #cbd5e1; border-radius: 14px; padding: 12px; background: #f8fafc; }
.thm-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.thm-title { font-size: 12px; font-weight: 700; color: #334155; }
.thm-title i { color: #FF6600; margin-inline-end: 4px; }
.thm-tabs { display: inline-flex; background: #e2e8f0; border-radius: 999px; padding: 2px; }
.thm-tabs button { border: none; background: transparent; font-size: 11px; font-weight: 600; color: #475569; padding: 4px 12px; border-radius: 999px; cursor: pointer; }
.thm-tabs button.on { background: #fff; color: #0f172a; box-shadow: 0 1px 2px rgba(15, 23, 42, .12); }
.thm-drop { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 52px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; font-size: 13px; color: #475569; cursor: pointer; text-align: center; padding: 8px; }
.thm-drop:hover { border-color: #FF6600; }
.thm-drop.busy { cursor: progress; opacity: .8; }
.thm-drop input { display: none; }
.thm-drop .ok { color: #16a34a; }
.thm-input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 13px; outline: none; background: #fff; }
.thm-input:focus { border-color: #FF6600; }
.thm-hint { margin: 6px 2px 0; font-size: 11px; color: #64748b; line-height: 1.5; }
.thm-hint.err { color: #dc2626; }
.thm-preview { margin-top: 8px; }
.thm-preview img, .thm-preview video { max-height: 140px; max-width: 100%; border-radius: 10px; display: block; }
</style>
