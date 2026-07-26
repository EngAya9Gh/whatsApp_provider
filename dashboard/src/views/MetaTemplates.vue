<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Meta Templates</h2>
        <p class="text-slate-500 font-medium text-lg">Manage official WhatsApp message templates directly with Meta.</p>
      </div>
      <div v-if="activeMetaChannelId" class="flex gap-3">
        <button @click="showLibraryModal = true" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer flex items-center gap-2">
          📚 مكتبة القوالب
        </button>
        <button @click="showCreateModal = true" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5 border-none cursor-pointer">
          + إنشاء قالب
        </button>
      </div>
    </div>

    <div v-if="!activeMetaChannelId" class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
      <div class="text-4xl mb-4">📱</div>
      <h3 class="text-xl font-bold text-slate-700">No Channel Selected</h3>
      <p class="text-slate-500 mt-2">Please select a Meta Cloud channel from the left sidebar to view its templates.</p>
    </div>

    <div v-else>
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-semibold text-sm mb-6">⚠️ {{ error }}</div>

      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
        <p class="mt-4 text-slate-500 font-medium">Loading templates from Meta...</p>
      </div>

      <div v-else-if="templates.length === 0" class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <div class="text-4xl mb-4">📝</div>
        <h3 class="text-xl font-bold text-slate-700">No Templates Found</h3>
        <p class="text-slate-500 mt-2">You don't have any templates approved by Meta yet.</p>
        <button @click="showCreateModal = true" class="mt-6 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-6 py-2.5 rounded-lg font-bold transition-colors border-none cursor-pointer">
          Create Your First Template
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="template in templates" :key="template.id" class="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow">
          <div class="p-5 border-b border-slate-100 flex justify-between items-start">
            <div>
              <h3 class="font-bold text-slate-900 text-lg mb-1">{{ template.name }}</h3>
              <div class="flex items-center gap-2 text-xs">
                <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded font-semibold">{{ template.language }}</span>
                <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded font-semibold">{{ template.category }}</span>
              </div>
            </div>
            <span :class="getStatusClass(template.status)" class="px-2.5 py-1 rounded-full text-xs font-bold border">
              {{ template.status }}
            </span>
          </div>
          
          <div class="p-5 flex-1 bg-slate-50/50">
            <!-- Render Body Text Preview -->
            <p class="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed line-clamp-4">
              {{ getTemplateBody(template) }}
            </p>
            <div v-if="template.rejected_reason" class="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100">
              <strong class="block mb-1">Rejection Reason:</strong>
              {{ template.rejected_reason }}
            </div>
          </div>

          <div class="p-4 border-t border-slate-100 flex gap-2">
            <button @click="deleteTemplate(template.name)" class="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors border-none cursor-pointer">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Library Modal -->
    <div v-if="showLibraryModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div class="bg-white rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[85vh]">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
          <h3 class="text-xl font-bold text-slate-900 m-0">📚 مكتبة القوالب (Template Library)</h3>
          <button @click="showLibraryModal = false" class="text-slate-400 hover:text-slate-600 bg-transparent border-none text-2xl cursor-pointer leading-none">&times;</button>
        </div>
        <div class="p-6 bg-slate-50 flex-1 overflow-y-auto">
          <!-- Filter -->
          <div class="flex gap-3 mb-6">
            <button @click="libraryFilter = 'ALL'" :class="libraryFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'" class="px-4 py-2 rounded-full text-sm font-bold transition-colors border-none cursor-pointer">الكل (All)</button>
            <button @click="libraryFilter = 'UTILITY'" :class="libraryFilter === 'UTILITY' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'" class="px-4 py-2 rounded-full text-sm font-bold transition-colors border-none cursor-pointer">🔔 Utility</button>
            <button @click="libraryFilter = 'MARKETING'" :class="libraryFilter === 'MARKETING' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'" class="px-4 py-2 rounded-full text-sm font-bold transition-colors border-none cursor-pointer">📢 Marketing</button>
            <button @click="libraryFilter = 'AUTHENTICATION'" :class="libraryFilter === 'AUTHENTICATION' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'" class="px-4 py-2 rounded-full text-sm font-bold transition-colors border-none cursor-pointer">🔐 Auth</button>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div v-for="tpl in filteredLibrary" :key="tpl.id" 
                 class="group bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative" 
                 @click="selectLibraryTemplate(tpl)">
                 
              <!-- Category Badge & Gradient Header -->
              <div class="h-32 p-5 relative flex items-start justify-between"
                   :class="tpl.formState.category === 'MARKETING' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : tpl.formState.category === 'AUTHENTICATION' ? 'bg-gradient-to-br from-slate-700 to-slate-900' : 'bg-gradient-to-br from-emerald-500 to-teal-600'">
                <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30"></div>
                
                <span class="relative z-10 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white backdrop-blur-md shadow-sm border border-white/10 uppercase tracking-wide">
                  {{ tpl.formState.category }}
                </span>
                <div class="relative z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-sm border border-white/10">
                  {{ tpl.formState.category === 'MARKETING' ? '📢' : tpl.formState.category === 'AUTHENTICATION' ? '🔐' : '🔔' }}
                </div>
              </div>

              <!-- Main Content Area -->
              <div class="p-6 flex-1 flex flex-col -mt-8 relative z-20">
                <div class="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 flex-1 flex flex-col">
                  <h4 class="font-extrabold text-slate-900 mb-2 text-xl tracking-tight leading-tight">{{ tpl.title }}</h4>
                  <p class="text-sm text-slate-500 font-medium mb-4 line-clamp-2 leading-relaxed">{{ tpl.description }}</p>
                  
                  <!-- WhatsApp Preview Mockup -->
                  <div class="bg-[#efeae2] p-4 rounded-2xl flex-1 relative overflow-hidden mt-auto border border-slate-200/50 shadow-inner">
                    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                    
                    <!-- Dummy Image for Marketing -->
                    <div v-if="tpl.formState.headerType === 'IMAGE'" class="w-full h-32 mb-3 rounded-xl bg-slate-200 overflow-hidden shadow-sm relative border border-slate-300/50">
                      <img src="https://images.unsplash.com/photo-1557821552-171051530d93?w=400&q=80" alt="Placeholder" class="w-full h-full object-cover" />
                      <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                      <span class="absolute bottom-2 left-2 text-[10px] text-white font-bold px-2 py-0.5 bg-black/40 rounded backdrop-blur-sm">Image Placeholder</span>
                    </div>
                    
                    <p class="text-[13px] text-slate-800 whitespace-pre-wrap font-sans leading-relaxed m-0 relative z-10 font-medium">{{ tpl.formState.bodyText }}</p>
                    <div v-if="tpl.formState.buttons && tpl.formState.buttons.length" class="mt-4 pt-3 border-t border-slate-300/40 flex flex-col gap-2 relative z-10">
                      <div v-for="btn in tpl.formState.buttons" class="text-center text-[#00a884] font-black text-[13px] bg-white shadow-sm py-2 rounded-xl transition-transform group-hover:scale-[1.02]">{{ btn.text }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Call to action -->
              <div class="px-6 pb-6 pt-2">
                <div class="w-full flex justify-center items-center gap-2 bg-slate-900 text-white text-sm font-bold py-3 rounded-xl shadow-md group-hover:bg-emerald-600 group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <span>استخدام هذا القالب</span>
                  <span class="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div class="bg-white rounded-2xl w-full max-w-5xl shadow-2xl">
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
          <h3 class="text-xl font-bold text-slate-900 m-0">إنشاء قالب رسالة Meta</h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 bg-transparent border-none text-2xl cursor-pointer leading-none">&times;</button>
        </div>

        <div class="flex flex-col md:flex-row min-h-[500px]">

          <!-- Left: Instructions Panel -->
          <div class="md:w-72 bg-gradient-to-b from-emerald-600 to-emerald-800 text-white p-6 md:rounded-bl-2xl flex-shrink-0">
            <h4 class="font-extrabold text-base mb-4 border-b border-emerald-500 pb-3">📋 إرشادات إنشاء القالب</h4>
            <ul class="space-y-3 text-xs leading-relaxed">
              <li class="flex gap-2">
                <span class="text-emerald-300 font-bold">✓</span>
                <span><strong>اسم القالب:</strong> أحرف إنجليزية صغيرة وشرطات سفلية فقط، بدون مسافات. مثال: <code class="bg-emerald-700 px-1 rounded">order_confirm</code></span>
              </li>
              <li class="flex gap-2">
                <span class="text-emerald-300 font-bold">✓</span>
                <span><strong>الفئة:</strong> اختر التسويق للعروض، التنبيهات للإشعارات، المصادقة لرموز OTP.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-emerald-300 font-bold">✓</span>
                <span><strong>الرأس (Header):</strong> اختياري — يمكن أن يكون نصاً أو صورة أو فيديو أو مستنداً.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-emerald-300 font-bold">✓</span>
                <span><strong>المتغيرات:</strong> استخدم <code class="bg-emerald-700 px-1 rounded">{{1}}</code> <code class="bg-emerald-700 px-1 rounded">{{2}}</code> لإضافة نصوص ديناميكية يتم تعبئتها عند الإرسال.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-emerald-300 font-bold">✓</span>
                <span><strong>الأزرار:</strong> الرد السريع يُرسل نصاً عند الضغط، رابط الموقع يفتح متصفحاً، والاتصال يُجري مكالمة.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-yellow-300 font-bold">⚠</span>
                <span>القالب يُرسل إلى Meta للمراجعة وقد يستغرق حتى 24 ساعة قبل الاعتماد.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-yellow-300 font-bold">⚠</span>
                <span>يُرفض القالب إذا احتوى على محتوى مضلل أو ترويج غير مناسب.</span>
              </li>
            </ul>
          </div>

          <!-- Right: Form -->
          <div class="flex-1 overflow-y-auto max-h-[75vh]">
            <div class="p-6">
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Template Name</label>
              <input v-model="form.name" type="text" placeholder="e.g. order_confirmation" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono lowercase" />
              <p class="text-xs text-slate-500 mt-1">Lowercase and underscores only.</p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Language</label>
              <select v-model="form.language" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none">
                <option value="en_US">English (US)</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Category</label>
            <div class="grid grid-cols-3 gap-3">
              <label class="border rounded-lg p-3 cursor-pointer flex flex-col items-center text-center transition-all" :class="form.category === 'MARKETING' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300'">
                <input type="radio" v-model="form.category" value="MARKETING" class="hidden" />
                <span class="text-xl mb-1">📢</span>
                <span class="font-bold text-sm">Marketing</span>
                <span class="text-[10px] opacity-70 mt-1 text-slate-500">Promotions, Offers</span>
              </label>
              <label class="border rounded-lg p-3 cursor-pointer flex flex-col items-center text-center transition-all" :class="form.category === 'UTILITY' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300'">
                <input type="radio" v-model="form.category" value="UTILITY" class="hidden" />
                <span class="text-xl mb-1">🔔</span>
                <span class="font-bold text-sm">Utility</span>
                <span class="text-[10px] opacity-70 mt-1 text-slate-500">Updates, Alerts</span>
              </label>
              <label class="border rounded-lg p-3 cursor-pointer flex flex-col items-center text-center transition-all" :class="form.category === 'AUTHENTICATION' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300'">
                <input type="radio" v-model="form.category" value="AUTHENTICATION" class="hidden" />
                <span class="text-xl mb-1">🔐</span>
                <span class="font-bold text-sm">Auth</span>
                <span class="text-[10px] opacity-70 mt-1 text-slate-500">OTP Codes</span>
              </label>
            </div>
          </div>

          <div class="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Header (Optional)</label>
            <select v-model="form.headerType" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-emerald-500/20 outline-none">
              <option value="">None</option>
              <option value="TEXT">Text</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Document</option>
            </select>

            <div v-if="form.headerType === 'TEXT'">
              <label class="block text-xs font-bold text-slate-500 mb-1">Header Text</label>
              <input v-model="form.headerText" type="text" placeholder="e.g. Welcome {{1}}" class="w-full p-2 border border-slate-300 rounded-lg text-sm mb-2 outline-none" maxlength="60" />
              <div v-if="form.headerText.includes('{{1}}')">
                <label class="block text-xs font-bold text-slate-500 mb-1">Example for {{1}}</label>
                <input v-model="form.headerExample" type="text" placeholder="e.g. John" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
              </div>
            </div>

            <div v-else-if="form.headerType && form.headerType !== 'TEXT'">
              <!-- Tab: Upload vs URL -->
              <div class="flex gap-2 mb-3">
                <button type="button" @click="headerInputMode = 'upload'" class="flex-1 text-xs font-bold px-3 py-2 rounded-lg border transition-colors" :class="headerInputMode === 'upload' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'">📤 Upload File</button>
                <button type="button" @click="headerInputMode = 'url'" class="flex-1 text-xs font-bold px-3 py-2 rounded-lg border transition-colors" :class="headerInputMode === 'url' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'">🔗 Public URL</button>
              </div>

              <!-- Upload File -->
              <div v-if="headerInputMode === 'upload'">
                <label class="block text-xs font-bold text-slate-500 mb-1">
                  {{ form.headerType === 'IMAGE' ? 'Upload Image (JPG/PNG/WEBP — max 5MB)' : form.headerType === 'VIDEO' ? 'Upload Video (MP4 — max 16MB)' : 'Upload Document (PDF — max 100MB)' }}
                </label>
                <input type="file" @change="handleHeaderFileChange" :accept="form.headerType === 'IMAGE' ? 'image/*' : form.headerType === 'VIDEO' ? 'video/mp4,video/3gpp' : 'application/pdf'" class="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" />
                <div v-if="uploadingHeader" class="mt-2 flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                  <div class="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  Uploading to Meta servers...
                </div>
                <div v-if="form.headerMediaId" class="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-semibold">
                  ✅ Uploaded! Media ID: {{ form.headerMediaId }}
                </div>
              </div>

              <!-- Public URL -->
              <div v-else>
                <label class="block text-xs font-bold text-slate-500 mb-1">Media Link Example (Required by Meta)</label>
                <input v-model="form.headerExample" type="url" placeholder="https://example.com/sample.png" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
                <p class="text-[10px] text-slate-500 mt-1">Provide a publicly accessible URL so Meta can review the template.</p>
              </div>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Message Body</label>
            <textarea v-model="form.body" rows="4" placeholder="Hello {{1}}, your order {{2}} is confirmed." class="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none font-sans"></textarea>
            <p class="text-xs text-slate-500 mt-1">Use {{1}}, {{2}} for variables. You must provide examples if using variables.</p>
          </div>

          <div v-if="form.body.includes('{{1}}')" class="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Variable Examples</label>
            <div class="flex gap-2 mb-2" v-for="n in countVariables(form.body)" :key="n">
              <span class="bg-slate-200 px-3 py-2 rounded-lg text-sm font-mono text-slate-600 font-bold" v-text="'{{' + n + '}}'"></span>
              <input v-model="form.bodyVariables[n-1]" type="text" placeholder="Sample value (e.g. John)" class="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Footer (Optional)</label>
            <input v-model="form.footer" type="text" placeholder="e.g. Thanks for using our service" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
          </div>

          <div class="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div class="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
              <label class="block text-sm font-semibold text-slate-700 m-0">Interactive Buttons (Optional)</label>
              <button @click="addButton" type="button" class="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-sm text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer">+ Add Button</button>
            </div>
            
            <div v-for="(btn, idx) in form.buttons" :key="idx" class="bg-white p-4 border border-slate-200 rounded-lg mb-3 flex flex-col gap-3 relative shadow-sm">
              <button @click="removeButton(idx)" class="absolute top-3 right-3 text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer text-lg leading-none font-bold">&times;</button>
              
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Button Type</label>
                <select v-model="btn.type" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none">
                  <option value="QUICK_REPLY">Quick Reply (Text Only)</option>
                  <option value="URL">Visit Website (URL)</option>
                  <option value="PHONE_NUMBER">Call Phone Number</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Button Text</label>
                <input v-model="btn.text" type="text" placeholder="e.g. Yes / Go to Site" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" maxlength="25" />
                <span class="text-[10px] text-slate-400 mt-1 block">Max 25 characters.</span>
              </div>

              <div v-if="btn.type === 'URL'">
                <label class="block text-xs font-bold text-slate-500 mb-1">Website URL</label>
                <input v-model="btn.url" type="url" placeholder="https://example.com" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
              </div>

              <div v-if="btn.type === 'PHONE_NUMBER'">
                <label class="block text-xs font-bold text-slate-500 mb-1">Phone Number (with Country Code)</label>
                <input v-model="btn.phoneNumber" type="text" placeholder="+123456789" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
              </div>
            </div>
            <p v-if="!form.buttons.length" class="text-xs text-slate-500 text-center italic m-0 py-2">No buttons added. You can add up to 3 buttons.</p>
          </div>

        </div>
            <!-- Footer Actions -->
            <div class="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 sticky bottom-0">
              <button @click="showCreateModal = false" class="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-transparent border-none cursor-pointer">إلغاء</button>
              <button @click="submitTemplate" :disabled="creating" class="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50 border-none cursor-pointer flex items-center gap-2">
                <div v-if="creating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                إرسال إلى Meta للمراجعة
              </button>
            </div>
          </div><!-- end right panel -->
        </div><!-- end two-col flex -->
      </div><!-- end modal card -->
    </div><!-- end modal overlay -->

  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'
import { useMetaChannel } from '../composables/useMetaChannel'
import { metaTemplateLibrary } from '../data/metaTemplateLibrary'

const { metaChannels, activeMetaChannelId, fetchMetaChannels } = useMetaChannel()

const showLibraryModal = ref(false)
const libraryFilter = ref('ALL')
const filteredLibrary = computed(() => {
  if (libraryFilter.value === 'ALL') return metaTemplateLibrary;
  return metaTemplateLibrary.filter(t => t.category === libraryFilter.value);
})

const selectLibraryTemplate = (tpl) => {
  form.value = {
    name: tpl.formState.name,
    language: tpl.formState.language,
    category: tpl.formState.category,
    headerType: tpl.formState.headerType || '',
    headerText: tpl.formState.headerText || '',
    headerExample: '',
    headerMediaId: '',
    body: tpl.formState.bodyText,
    bodyVariables: [...(tpl.formState.bodyExamples || [])],
    footer: tpl.formState.footerText || '',
    buttons: tpl.formState.buttons ? JSON.parse(JSON.stringify(tpl.formState.buttons)) : []
  }
  showLibraryModal.value = false
  showCreateModal.value = true
}
const templates = ref([])
const loading = ref(true)
const showCreateModal = ref(false)
const creating = ref(false)
const error = ref('')

const form = ref({
  name: '',
  language: 'en_US',
  category: 'UTILITY',
  headerType: '',
  headerText: '',
  headerExample: '',
  headerMediaId: '',
  body: '',
  bodyVariables: [],
  footer: '',
  buttons: []
})

const headerInputMode = ref('upload') // 'upload' | 'url'
const uploadingHeader = ref(false)

const addButton = () => {
  if (form.value.buttons.length >= 3) {
    alert('Maximum 3 buttons allowed per template.');
    return;
  }
  form.value.buttons.push({ type: 'QUICK_REPLY', text: '' });
}

const removeButton = (idx) => {
  form.value.buttons.splice(idx, 1);
}

// Handle header file upload to Meta
const handleHeaderFileChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !activeMetaChannelId.value) return;
  uploadingHeader.value = true;
  form.value.headerMediaId = '';
  const token = localStorage.getItem('token');
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await axios.post(`/api/v1/meta/channel/${activeMetaChannelId.value}/upload-media`, fd, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
    });
    form.value.headerMediaId = res.data.mediaId;
    form.value.headerExample = res.data.mediaId; // use as example
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to upload file to Meta');
  } finally {
    uploadingHeader.value = false;
  }
}

const fetchTemplates = async () => {
  if (!activeMetaChannelId.value) {
    templates.value = [];
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get(`/api/v1/meta/channel/${activeMetaChannelId.value}/meta-templates`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    })
    const rawData = res.data.data?.data || res.data.data || []
    templates.value = Array.isArray(rawData) ? rawData : []
  } catch (err) {
    console.error('Failed to fetch templates', err)
    error.value = err.response?.data?.message || 'Failed to load templates from Meta. Please check your Meta Access Token.';
    templates.value = []
  } finally {
    loading.value = false
  }
}

watch(activeMetaChannelId, () => {
  fetchTemplates()
}, { immediate: true })

const countVariables = (text) => {
  const matches = text.match(/\{\{(\d+)\}\}/g)
  if (!matches) return 0
  const numbers = matches.map(m => parseInt(m.replace(/[^0-9]/g, '')))
  return Math.max(...numbers)
}

const submitTemplate = async () => {
  if (!activeMetaChannelId.value) return;
  if (!form.value.name) return alert('Name required')
  if (!form.value.body) return alert('Body required')
  
  creating.value = true
  const token = localStorage.getItem('token')
  try {
    await axios.post(`/api/v1/meta/channel/${activeMetaChannelId.value}/meta-templates`, {
      name: form.value.name,
      language: form.value.language,
      category: form.value.category,
      headerType: form.value.headerType || undefined,
      headerText: form.value.headerType === 'TEXT' ? form.value.headerText : undefined,
      headerExample: form.value.headerType ? form.value.headerExample : undefined,
      headerMediaId: (form.value.headerType !== 'TEXT' && headerInputMode.value === 'upload') ? form.value.headerMediaId : undefined,
      body: form.value.body,
      bodyVariables: form.value.bodyVariables.filter(Boolean),
      footer: form.value.footer || undefined,
      buttons: form.value.buttons.length > 0 ? form.value.buttons : undefined
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    showCreateModal.value = false
    form.value = {
      name: '', language: 'en_US', category: 'UTILITY',
      headerType: '', headerText: '', headerExample: '', headerMediaId: '',
      body: '', bodyVariables: [], footer: '', buttons: []
    }
    fetchTemplates()
    alert('Template submitted to Meta successfully!')
  } catch (err) {
    console.error(err)
    alert(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to submit template')
  } finally {
    creating.value = false
  }
}

const deleteTemplate = async (name) => {
  if (!confirm(`Are you sure you want to delete template "${name}" from Meta? This action cannot be undone.`)) return;
  
  const token = localStorage.getItem('token')
  try {
    await axios.delete(`/api/v1/meta/channel/${activeMetaChannelId.value}/meta-templates/${name}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchTemplates()
  } catch (err) {
    alert(err.response?.data?.error?.message || 'Failed to delete template')
  }
}

const getTemplateBody = (template) => {
  const bodyComponent = template.components?.find(c => c.type === 'BODY');
  return bodyComponent ? bodyComponent.text : 'No body text';
}

const getStatusClass = (status) => {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
    case 'PENDING': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}



watch(() => form.value.body, (newBody) => {
  const count = countVariables(newBody);
  while (form.value.bodyVariables.length < count) {
    form.value.bodyVariables.push('');
  }
})

onMounted(() => {
  fetchMetaChannels()
})
</script>
