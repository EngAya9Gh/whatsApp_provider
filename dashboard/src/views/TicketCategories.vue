<template>
  <div class="p-6 max-w-4xl mx-auto rtl-mode">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'تصنيفات التذاكر' : 'Ticket Categories' }}</h1>
        <p class="text-slate-500 mt-1">{{ isAr ? 'إدارة تصنيفات التذاكر لتنظيم الدعم الفني.' : 'Manage ticket categories to organize your support.' }}</p>
      </div>
      <button @click="showAddModal = true" class="btn btn-primary px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 transition-all">
        <i class="fas fa-plus mr-2"></i> {{ isAr ? 'إضافة تصنيف' : 'Add Category' }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <AppLoader />
    </div>

    <div v-else-if="categories.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
      <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-tags text-3xl text-slate-400"></i>
      </div>
      <h3 class="text-lg font-bold text-slate-800 mb-2">{{ isAr ? 'لا توجد تصنيفات بعد' : 'No Categories Yet' }}</h3>
      <p class="text-slate-500 max-w-md mx-auto">{{ isAr ? 'قم بإضافة التصنيفات لتتمكن من تصنيف التذاكر عند فتحها.' : 'Add categories to classify tickets when opening them.' }}</p>
    </div>

    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-sm">
            <th class="p-4 font-semibold w-1/3">{{ isAr ? 'اسم التصنيف' : 'Category Name' }}</th>
            <th class="p-4 font-semibold w-1/2">{{ isAr ? 'الوصف' : 'Description' }}</th>
            <th class="p-4 font-semibold text-right w-24">{{ isAr ? 'إجراءات' : 'Actions' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in categories" :key="category.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
            <td class="p-4">
              <div class="font-semibold text-slate-800">{{ category.name }}</div>
            </td>
            <td class="p-4 text-slate-600 text-sm">
              {{ category.description || '-' }}
            </td>
            <td class="p-4 text-right">
              <button @click="deleteCategory(category.id)" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showAddModal = false"></div>
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 class="font-bold text-slate-800">{{ isAr ? 'إضافة تصنيف جديد' : 'Add New Category' }}</h3>
          <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form @submit.prevent="saveCategory" class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'الاسم' : 'Name' }} *</label>
            <input v-model="form.name" required type="text" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition-all" />
          </div>
          <div class="mb-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'الوصف' : 'Description' }}</label>
            <textarea v-model="form.description" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition-all min-h-[80px] resize-y"></textarea>
          </div>
          
          <div class="flex gap-3">
            <button type="button" @click="showAddModal = false" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors">
              {{ isAr ? 'إلغاء' : 'Cancel' }}
            </button>
            <button type="submit" :disabled="saving" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              <i v-if="saving" class="fas fa-spinner fa-spin"></i>
              <span>{{ isAr ? 'حفظ' : 'Save' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>

import axios from 'axios'
import { ref as vueRef, onMounted as vueOnMounted } from 'vue'

const isAr = vueRef(localStorage.getItem('lang') !== 'en')
const categories = vueRef([])
const loading = vueRef(true)
const showAddModal = vueRef(false)
const saving = vueRef(false)

const form = vueRef({
  name: '',
  description: ''
})

const fetchCategories = async () => {
  try {
    loading.value = true
    const res = await axios.get('/api/v1/tickets/categories')
    categories.value = res.data.data
  } catch (error) {
    console.error('Error fetching categories:', error)
  } finally {
    loading.value = false
  }
}

const saveCategory = async () => {
  try {
    saving.value = true
    await axios.post('/api/v1/tickets/categories', form.value)
    showAddModal.value = false
    form.value = { name: '', description: '' }
    await fetchCategories()
  } catch (error) {
    alert(isAr.value ? 'حدث خطأ أثناء الحفظ' : 'Error saving category')
  } finally {
    saving.value = false
  }
}

const deleteCategory = async (id) => {
  if (!confirm(isAr.value ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return
  try {
    await axios.delete(`/api/v1/tickets/categories/${id}`)
    await fetchCategories()
  } catch (error) {
    alert(isAr.value ? 'حدث خطأ أثناء الحذف' : 'Error deleting category')
  }
}

vueOnMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.rtl-mode {
  direction: rtl;
}
.rtl-mode th {
  text-align: right;
}
.rtl-mode .text-right {
  text-align: left;
}
</style>
