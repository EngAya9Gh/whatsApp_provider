<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 text-slate-800" :dir="isAr ? 'rtl' : 'ltr'">

    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">🤖 {{ t('بوت Meta (Business Agent)', 'Meta Business Agent') }}</h1>
      <p class="text-slate-500 font-medium">{{ t(
        'بوت ذكاء اصطناعي من Meta يرد على عملائك على واتساب لحاله، من معلومات نشاطك والتعليمات اللي بتعطيه ياها. إعداداته محفوظة عند Meta.',
        'Meta\'s own AI agent that answers your customers on WhatsApp by itself, from your business information and the instructions you give it. Its settings are stored at Meta.') }}</p>
    </div>

    <div v-if="!activeMetaChannelId" class="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <div class="text-5xl mb-4 opacity-50">📱</div>
      <h3 class="text-xl font-bold text-slate-700">{{ t('ما في رقم مختار', 'No number selected') }}</h3>
      <p class="text-slate-500 mt-2">{{ t('اختر رقم Meta من القائمة الجانبية.', 'Choose a Meta number in the sidebar.') }}</p>
    </div>

    <div v-else-if="loading" class="text-center py-20">
      <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-slate-400">{{ t('جاري الفحص عند Meta…', 'Checking with Meta…') }}</p>
    </div>

    <template v-else-if="ov">
      <!-- Messages -->
      <div v-if="notice.text" :class="['mb-4 p-4 rounded-xl font-semibold text-sm border', notice.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700']">
        {{ notice.ok ? '✅' : '⚠️' }} {{ notice.text }}
        <div v-if="notice.hint" class="font-normal mt-1">{{ notice.hint }}</div>
      </div>

      <!-- Status -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div class="text-xs text-slate-400 font-bold">{{ t('الرقم', 'Number') }}</div>
          <div class="text-lg font-extrabold" dir="ltr">+{{ ov.channel.phoneNumber }}</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <span :class="['pill', eligible ? 'pill-good' : ov.eligibility.ok ? 'pill-bad' : 'pill-muted']">
            {{ eligible ? t('مؤهل', 'Eligible') : ov.eligibility.ok ? t('غير مؤهل', 'Not eligible') : t('تعذّر فحص الأهلية', 'Eligibility not checked') }}
          </span>
          <span :class="['pill', agentOn ? 'pill-good' : ov.agent ? 'pill-warn' : 'pill-muted']">
            {{ !ov.agent ? t('البوت غير مفعّل على الرقم', 'No agent on this number') : agentOn ? t('البوت شغّال', 'Agent is on') : t('البوت موقّف', 'Agent is off') }}
          </span>
          <span v-if="ov.agent" class="pill pill-muted">
            {{ ov.agent.ai_audience === 'ALLOWLISTED_ONLY' ? t('يرد على أرقام التجربة فقط', 'Answers test numbers only') : t('يرد على كل العملاء', 'Answers every customer') }}
          </span>
        </div>
        <button class="btn-light" @click="load" :disabled="busy">{{ t('تحديث', 'Refresh') }}</button>
      </div>

      <!-- Step-by-step guide -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <h2 class="text-lg font-extrabold mb-1">{{ t('خطوات التفعيل', 'How to turn it on') }}</h2>
        <p class="text-sm text-slate-500 mb-4">{{ t('بعض الخطوات بيعملها صاحب حساب Meta بنفسه بشاشات Meta، والروابط بتفتحها مباشرة.', 'Some steps are done by the Meta account owner in Meta\'s own screens; the links open them directly.') }}</p>
        <ol class="space-y-3">
          <li v-for="(s, i) in steps" :key="i" class="step">
            <div :class="['step-icon', s.state]">{{ s.state === 'done' ? '✓' : s.state === 'bad' ? '!' : i + 1 }}</div>
            <div class="flex-1">
              <div class="font-bold">{{ s.title }}</div>
              <div class="text-sm text-slate-600 leading-relaxed">{{ s.text }}</div>
              <ul v-if="s.bullets" class="text-sm text-slate-600 list-disc ps-5 mt-1 space-y-0.5">
                <li v-for="(b, j) in s.bullets" :key="j">{{ b }}</li>
              </ul>
              <div v-if="s.detail" class="text-sm mt-1 text-red-700">{{ s.detail }}</div>
              <div class="flex flex-wrap gap-2 mt-2">
                <a v-if="s.link" :href="s.link" target="_blank" rel="noopener" class="btn-light">{{ s.linkLabel }} ↗</a>
                <button v-if="s.action" class="btn-main" :disabled="busy" @click="s.action">{{ s.actionLabel }}</button>
              </div>
            </div>
          </li>
        </ol>
      </div>

      <!-- Configuration (once the agent exists) -->
      <div v-if="ov.agent" class="bg-white rounded-2xl border border-slate-200">
        <div class="flex flex-wrap gap-1 border-b border-slate-200 p-2">
          <button v-for="tb in tabs" :key="tb.key" @click="openTab(tb.key)" :class="['tab', tab === tb.key && 'tab-active']">{{ tb.label }}</button>
        </div>

        <div class="p-5">
          <!-- Business information -->
          <div v-if="tab === 'info'" class="space-y-3">
            <p class="hint">{{ t('هاد اللي بيعرفه البوت عن نشاطك. Meta بتستبدل المعلومات كلها كل ما تحفظ.', 'What the agent knows about your business. Meta replaces all of it every time you save.') }}</p>
            <label class="field"><span>{{ t('وصف النشاط', 'Business description') }}</span><textarea v-model="info.business_description" rows="3"></textarea></label>
            <div class="grid md:grid-cols-3 gap-3">
              <label class="field"><span>{{ t('الإيميل', 'Email') }}</span><input v-model="info.contact_info.email" dir="ltr" /></label>
              <label class="field"><span>{{ t('ساعات العمل', 'Opening hours') }}</span><input v-model="info.contact_info.hours_of_operation" /></label>
              <label class="field"><span>{{ t('العنوان', 'Address') }}</span><input v-model="info.contact_info.address" /></label>
            </div>
            <div class="grid md:grid-cols-2 gap-3">
              <label class="field"><span>{{ t('طرق الدفع', 'Payment methods') }}</span><textarea v-model="info.payment_method" rows="2"></textarea></label>
              <label class="field"><span>{{ t('طريقة الشراء أو الطلب', 'How to buy or order') }}</span><textarea v-model="info.purchase_info" rows="2"></textarea></label>
              <label class="field"><span>{{ t('الشحن والتوصيل', 'Delivery and shipping') }}</span><textarea v-model="info.delivery_and_shipping" rows="2"></textarea></label>
              <label class="field"><span>{{ t('سياسة الإرجاع', 'Return policy') }}</span><textarea v-model="info.return_policy" rows="2"></textarea></label>
            </div>
            <button class="btn-main" :disabled="busy" @click="saveInfo">{{ t('حفظ المعلومات', 'Save information') }}</button>
          </div>

          <!-- FAQs -->
          <div v-else-if="tab === 'faq'" class="space-y-3">
            <p class="hint">{{ t('أسئلة بيسألها زباينك مع جوابها. Meta بتنصح ما تزيد عن كم مية سؤال.', 'Questions your customers ask, with the answer. Meta advises staying under a few hundred.') }}</p>
            <div class="grid md:grid-cols-2 gap-3">
              <label class="field"><span>{{ t('السؤال', 'Question') }}</span><input v-model="faqForm.question" /></label>
              <label class="field"><span>{{ t('الجواب', 'Answer') }}</span><input v-model="faqForm.answer" /></label>
            </div>
            <div class="flex gap-2">
              <button class="btn-main" :disabled="busy" @click="saveFaq">{{ faqForm.id ? t('حفظ التعديل', 'Save changes') : t('إضافة سؤال', 'Add question') }}</button>
              <button v-if="faqForm.id" class="btn-light" @click="faqForm = { id: null, question: '', answer: '' }">{{ t('إلغاء', 'Cancel') }}</button>
            </div>
            <div v-for="f in lists.faq" :key="f.id" class="row">
              <div class="flex-1"><div class="font-bold">{{ f.question }}</div><div class="text-sm text-slate-600">{{ f.answer }}</div></div>
              <button class="btn-link" @click="faqForm = { id: f.id, question: f.question, answer: f.answer }">{{ t('تعديل', 'Edit') }}</button>
              <button class="btn-link text-red-600" @click="removeItem('faq', f.id)">{{ t('حذف', 'Delete') }}</button>
            </div>
            <div v-if="!lists.faq.length" class="empty">{{ t('ما في أسئلة بعد.', 'No questions yet.') }}</div>
          </div>

          <!-- Websites -->
          <div v-else-if="tab === 'websites'" class="space-y-3">
            <p class="hint">{{ t('Meta بتقرأ صفحات موقعك ليعرف البوت منتجاتك وخدماتك. القراءة بتاخد وقت.', 'Meta reads your website\'s pages so the agent learns your products and services. Reading takes a while.') }}</p>
            <div class="flex gap-2">
              <input v-model="siteUrl" class="input flex-1" dir="ltr" placeholder="https://example.com" />
              <button class="btn-main" :disabled="busy" @click="addSite">{{ t('إضافة', 'Add') }}</button>
              <button class="btn-light" :disabled="busy" @click="loadList('websites')">{{ t('تحديث', 'Refresh') }}</button>
            </div>
            <div v-for="w in lists.websites" :key="w.id" class="row">
              <div class="flex-1">
                <div class="font-bold" dir="ltr">{{ w.url }}</div>
                <div class="text-sm text-slate-600">{{ crawlLabel(w.crawl_status) }}<span v-if="w.pages_crawled"> · {{ w.pages_crawled }} {{ t('صفحة', 'pages') }}</span><span v-if="w.crawl_error" class="text-red-600"> · {{ w.crawl_error }}</span></div>
              </div>
              <button class="btn-link text-red-600" @click="removeItem('websites', w.id)">{{ t('حذف', 'Delete') }}</button>
            </div>
            <div v-if="!lists.websites.length" class="empty">{{ t('ما في مواقع بعد.', 'No websites yet.') }}</div>
          </div>

          <!-- Files -->
          <div v-else-if="tab === 'files'" class="space-y-3">
            <p class="hint">{{ t('كتالوج، قائمة أسعار، شروط… PDF أو Word أو صور أو Excel، لحد 25 ميغا.', 'Catalogue, price list, terms… PDF, Word, images or Excel, up to 25 MB.') }}</p>
            <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx" @change="uploadFile" :disabled="busy" />
            <div v-for="f in lists.files" :key="f.id" class="row">
              <div class="flex-1 font-bold" dir="ltr">{{ f.file_name }}</div>
              <button class="btn-link text-red-600" @click="removeFile(f.id)">{{ t('حذف', 'Delete') }}</button>
            </div>
            <div v-if="!lists.files.length" class="empty">{{ t('ما في ملفات بعد.', 'No files yet.') }}</div>
          </div>

          <!-- Instructions (skills) -->
          <div v-else-if="tab === 'skills'" class="space-y-4">
            <div class="guide-box">
              <strong>{{ t('كيف بتتحكم بالبوت؟', 'How do you control the agent?') }}</strong>
              <ul class="list-disc ps-5 mt-1 space-y-0.5">
                <li>{{ t('البوت بيرد لحاله، ما بتوافق على كل رد. بس بيلتزم بالتعليمات حرفياً، فاكتبها كأوامر واضحة.', 'The agent replies by itself; you do not approve each reply. It follows instructions as written, so write them as clear directives.') }}</li>
                <li>{{ t('اللغة: بيرد بلغة الزبون لحاله. اللهجة والأسلوب وطول الرد بتحددهم هون بالتعليمات.', 'Language: it answers in the customer\'s language by itself. Dialect, tone and length are set here, in instructions.') }}</li>
                <li>{{ t('Meta بتراجع كل تعليمة تلقائياً: «فعّالة» أو «قيد المراجعة» أو «مرفوضة» (غالباً لأنها بتطلب معلومات شخصية حساسة).', 'Meta reviews each instruction automatically: active, pending review, or blocked (usually because it asks for sensitive personal information).') }}</li>
                <li>{{ t('جرّب أي تعديل بتبويب «التجربة» قبل التشغيل.', 'Try every change in the "Test" tab before going live.') }}</li>
              </ul>
            </div>

            <!-- Reply style builder -->
            <div class="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
              <div class="font-bold mb-2">{{ t('أسلوب الرد واللهجة', 'Reply style and dialect') }}</div>
              <div class="grid md:grid-cols-4 gap-3">
                <label class="field"><span>{{ t('اللهجة بالعربي', 'Arabic dialect') }}</span>
                  <select v-model="style.dialect"><option v-for="d in DIALECTS" :key="d.key" :value="d.key">{{ isAr ? d.ar : d.en }}</option></select></label>
                <label class="field"><span>{{ t('الأسلوب', 'Tone') }}</span>
                  <select v-model="style.tone"><option v-for="d in TONES" :key="d.key" :value="d.key">{{ isAr ? d.ar : d.en }}</option></select></label>
                <label class="field"><span>{{ t('طول الرد', 'Length') }}</span>
                  <select v-model="style.length"><option v-for="d in LENGTHS" :key="d.key" :value="d.key">{{ isAr ? d.ar : d.en }}</option></select></label>
                <label class="field"><span>{{ t('الإيموجي', 'Emojis') }}</span>
                  <select v-model="style.emoji"><option value="few">{{ t('قليل', 'A few') }}</option><option value="none">{{ t('بدون', 'None') }}</option></select></label>
              </div>
              <button class="btn-main mt-3" @click="fillStyleSkill">{{ t('جهّز تعليمة الأسلوب', 'Prepare the style instruction') }}</button>
              <span class="text-xs text-slate-500 ms-2">{{ t('بتنكتب بالإنجليزي لأن البوت بيفهمها أدق، وبتقدر تعدّلها قبل الحفظ.', 'It is written in English, which the agent follows most precisely; you can edit it before saving.') }}</span>
            </div>

            <!-- Skill form -->
            <div class="space-y-3">
              <div class="grid md:grid-cols-2 gap-3">
                <label class="field"><span>{{ t('اسم التعليمة (إنجليزي صغير وشرطات)', 'Name (lowercase English and hyphens)') }}</span><input v-model="skillForm.title" dir="ltr" placeholder="reply-style" /></label>
                <label class="field"><span>{{ t('إيمتى بيطبقها البوت', 'When the agent applies it') }}</span><input v-model="skillForm.description" /></label>
              </div>
              <label class="field"><span>{{ t('التعليمة', 'Instruction') }} <small class="text-slate-400">({{ (skillForm.skill || '').length }}/20000)</small></span><textarea v-model="skillForm.skill" rows="8" dir="auto"></textarea></label>
              <div class="flex gap-2">
                <button class="btn-main" :disabled="busy" @click="saveSkill">{{ skillForm.id ? t('حفظ التعديل', 'Save changes') : t('إضافة التعليمة', 'Add instruction') }}</button>
                <button v-if="skillForm.id" class="btn-light" @click="resetSkill">{{ t('إلغاء', 'Cancel') }}</button>
              </div>
            </div>
            <div v-for="s in lists.skills" :key="s.id" class="row">
              <div class="flex-1">
                <div class="font-bold" dir="ltr">{{ s.title }} <span :class="['pill ms-2', s.status === 'active' ? 'pill-good' : s.status === 'blocked' ? 'pill-bad' : 'pill-warn']">{{ skillStatus(s.status) }}</span></div>
                <div class="text-sm text-slate-600">{{ s.description }}</div>
              </div>
              <button class="btn-link" @click="skillForm = { id: s.id, title: s.title, description: s.description, skill: s.skill }">{{ t('تعديل', 'Edit') }}</button>
              <button class="btn-link text-red-600" @click="removeItem('skills', s.id)">{{ t('حذف', 'Delete') }}</button>
            </div>
            <div v-if="!lists.skills.length" class="empty">{{ t('ما في تعليمات بعد.', 'No instructions yet.') }}</div>
          </div>

          <!-- Behaviour -->
          <div v-else-if="tab === 'behaviour'" class="space-y-5">
            <div>
              <div class="font-bold mb-1">{{ t('التحويل لموظف', 'Handoff to a person') }}</div>
              <p class="hint">{{ t('Meta بتقرر لحالها إيمتى البوت بيحوّل (مثلاً إذا الزبون طلب موظف). نحن منحدد بس الرسالة اللي بتوصل للزبون، والمحادثة بتجي لفريقك بـ Live Chat.', 'Meta decides by itself when the agent hands off (e.g. when the customer asks for a person). You only set the message the customer gets; the conversation then comes to your team in Live Chat.') }}</p>
              <label class="check"><input type="checkbox" v-model="behaviour.handoff.enabled" /> {{ t('السماح بالتحويل لموظف', 'Allow handoff to a person') }}</label>
              <div class="grid md:grid-cols-2 gap-3 mt-2">
                <label class="field"><span>{{ t('رسالة التحويل', 'Handoff message') }}</span>
                  <select v-model="behaviour.handoff.message_selection">
                    <option value="DEFAULT">{{ t('رسالة Meta الافتراضية', 'Meta\'s default message') }}</option>
                    <option value="AGENT">{{ t('البوت بيكتبها', 'The agent writes it') }}</option>
                    <option value="CUSTOM">{{ t('رسالتي أنا', 'My own message') }}</option>
                  </select></label>
                <label v-if="behaviour.handoff.message_selection === 'CUSTOM'" class="field"><span>{{ t('نص الرسالة', 'Message text') }}</span><input v-model="behaviour.handoff.message" /></label>
              </div>
            </div>
            <div>
              <div class="font-bold mb-1">{{ t('رسالة متابعة', 'Follow-up message') }}</div>
              <p class="hint">{{ t('إذا الزبون سكت بعد مدة، البوت بيبعتله رسالة.', 'If the customer goes quiet, the agent sends a message after a while.') }}</p>
              <label class="check"><input type="checkbox" v-model="behaviour.followup.enabled" /> {{ t('تفعيل المتابعة', 'Turn on follow-up') }}</label>
              <div class="grid md:grid-cols-2 gap-3 mt-2">
                <label class="field"><span>{{ t('بعد', 'After') }}</span>
                  <select v-model.number="behaviour.followup.followup_interval_in_seconds">
                    <option v-for="o in FOLLOWUPS" :key="o.v" :value="o.v">{{ isAr ? o.ar : o.en }}</option>
                  </select></label>
                <label class="field"><span>{{ t('نص الرسالة (اختياري)', 'Message text (optional)') }}</span><input v-model="behaviour.followup.message" /></label>
              </div>
            </div>
            <div>
              <div class="font-bold mb-1">{{ t('عبارات ممنوعة', 'Never-say phrases') }}</div>
              <p class="hint">{{ t('أي رد فيه وحدة من هالعبارات ما بينبعت. كل عبارة بسطر. Meta ما بترجعلنا اللائحة الحالية: اللي بتكتبه بيحل محلها، وإذا تركته فاضي ما بيتغير شي.', 'A reply containing one of these phrases is not sent. One per line. Meta does not return the current list: what you write replaces it, and an empty box changes nothing.') }}</p>
              <textarea v-model="behaviour.neverSay" rows="4" class="input w-full"></textarea>
              <button class="btn-link text-red-600" @click="clearNeverSay">{{ t('امسح اللائحة عند Meta', 'Clear the list at Meta') }}</button>
            </div>
            <button class="btn-main" :disabled="busy" @click="saveBehaviour">{{ t('حفظ', 'Save') }}</button>
          </div>

          <!-- Test chat -->
          <div v-else-if="tab === 'test'" class="space-y-3">
            <p class="hint">{{ t('احكي مع البوت متل الزبون. التجربة ببلاش، وبتشتغل حتى لو البوت موقّف، وما بيوصل شي لحدا.', 'Talk to the agent like a customer. Testing is free, works while the agent is off, and nothing reaches anyone.') }}</p>
            <div class="chat">
              <div v-for="(m, i) in chat" :key="i" :class="['bubble', m.from === 'me' ? 'bubble-me' : 'bubble-bot']">
                <div class="whitespace-pre-wrap" dir="auto">{{ m.text }}</div>
                <div v-if="m.handoff" class="text-xs mt-1 text-amber-700">🔁 {{ t('هون كان رح يحوّل لموظف', 'Here it would hand off to a person') }}: {{ m.handoff }}</div>
                <div v-if="m.noResponse" class="text-xs mt-1 text-red-700">{{ t('ما رد', 'No reply') }}: {{ m.noResponse }}</div>
                <div v-if="m.quickReplies?.length" class="flex flex-wrap gap-1 mt-2">
                  <button v-for="q in m.quickReplies" :key="q" class="chip" @click="sendTest(q)">{{ q }}</button>
                </div>
              </div>
              <div v-if="!chat.length" class="empty">{{ t('ابعت أول رسالة…', 'Send a first message…') }}</div>
            </div>
            <div class="flex gap-2">
              <input v-model="testInput" class="input flex-1" dir="auto" :placeholder="t('اكتب رسالة متل الزبون', 'Write as a customer')" @keyup.enter="sendTest()" />
              <button class="btn-main" :disabled="busy || !testInput.trim()" @click="sendTest()">{{ t('إرسال', 'Send') }}</button>
              <button class="btn-light" @click="chat = []; testConversationId = null">{{ t('محادثة جديدة', 'New chat') }}</button>
            </div>
          </div>

          <!-- Go live -->
          <div v-else-if="tab === 'launch'" class="space-y-5">
            <div>
              <div class="font-bold mb-1">{{ t('أرقام التجربة', 'Test numbers') }}</div>
              <p class="hint">{{ t('ابدأ بهالأرقام بس (لحد 20)، متل جوالك وجوال زميلك، قبل ما تشغّله للكل.', 'Start with these numbers only (up to 20), such as your phone and a colleague\'s, before turning it on for everyone.') }}</p>
              <div class="flex gap-2">
                <input v-model="allowPhone" class="input flex-1" dir="ltr" placeholder="966501234567" />
                <button class="btn-main" :disabled="busy" @click="addAllow">{{ t('إضافة', 'Add') }}</button>
              </div>
              <div v-for="a in lists.allowlist" :key="a.id" class="row">
                <div class="flex-1 font-bold" dir="ltr">{{ a.consumer_phone_number || a.consumer_bsuid }}</div>
                <button class="btn-link text-red-600" @click="removeAllow(a.id)">{{ t('حذف', 'Delete') }}</button>
              </div>
            </div>
            <div>
              <div class="font-bold mb-1">{{ t('مين بيرد عليه البوت', 'Who the agent answers') }}</div>
              <label class="check"><input type="radio" value="ALLOWLISTED_ONLY" v-model="audience" /> {{ t('أرقام التجربة بس', 'Test numbers only') }}</label>
              <label class="check"><input type="radio" value="EVERYONE" v-model="audience" /> {{ t('كل العملاء (لازم وسيلة دفع بحساب Meta)', 'Every customer (needs a payment method in the Meta account)') }}</label>
            </div>
            <div class="guide-box">
              <ul class="list-disc ps-5 space-y-0.5">
                <li>{{ t('إيقاف البوت بيوقف ردوده على كل المحادثات. تشغيله من جديد بيرجع يرد على المحادثات الجديدة بس.', 'Turning it off stops its replies in every conversation. Turning it on again only applies to new conversations.') }}</li>
                <li>{{ t('لو Meta ردّت «Conversation routing setup required»، كمّل الخطوة 4.', 'If Meta answers "Conversation routing setup required", finish step 4.') }}</li>
                <li>{{ t('وقت البوت شغّال، بوت المنصة (الموظف الذكي والردود التلقائية) ما بيرد على المحادثات اللي ماسكها بوت Meta.', 'While it is on, the platform\'s own bots (AI Agent, auto replies) do not answer the conversations Meta\'s agent holds.') }}</li>
              </ul>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="btn-main" :disabled="busy" @click="setRollout(true)">{{ agentOn ? t('حفظ الجمهور', 'Save audience') : t('شغّل البوت', 'Turn the agent on') }}</button>
              <button v-if="agentOn" class="btn-danger" :disabled="busy" @click="setRollout(false)">{{ t('وقّف البوت', 'Turn the agent off') }}</button>
            </div>
            <div class="border-t border-slate-200 pt-4">
              <button class="btn-link text-red-600" :disabled="busy" @click="deleteAgent">{{ t('حذف البوت من هالرقم نهائياً', 'Delete the agent from this number') }}</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import { useI18n } from 'vue-i18n'
import { useMetaChannel } from '../composables/useMetaChannel'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const t = (ar, en) => (isAr.value ? ar : en)
const { activeMetaChannelId } = useMetaChannel()

const loading = ref(false)
const busy = ref(false)
const ov = ref(null)
const notice = ref({ ok: true, text: '', hint: '' })
const lastOnboardError = ref(null)
const tab = ref('info')
const lists = ref({ faq: [], websites: [], skills: [], files: [], allowlist: [] })

const base = () => `/api/v1/meta/agent/${activeMetaChannelId.value}`
const http = (method, url, data, cfg = {}) => axios({ method, url, data, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, ...cfg })

const HINTS = {
  TERMS: ['صاحب حساب Meta لسا ما وافق على شروط البوت (الخطوة 2).', 'The Meta account owner has not accepted the agent\'s terms yet (step 2).'],
  NO_AGENT: ['البوت مش مفعّل على هالرقم بعد (الخطوة 5).', 'There is no agent on this number yet (step 5).'],
  RATE_LIMIT: ['طلبات كتير لـ Meta، جرّب بعد شوي.', 'Too many requests to Meta, try again shortly.'],
  RETRY: ['صار تعديل بنفس اللحظة وما انحفظ شي، جرّب مرة تانية.', 'Another change happened at the same moment and nothing was saved; try again.']
}
const say = (ok, text, hint = '') => { notice.value = { ok, text, hint } }
const fail = (e, fallback) => {
  const d = e.response?.data || {}
  const hint = d.hint && HINTS[d.hint] ? (isAr.value ? HINTS[d.hint][0] : HINTS[d.hint][1]) : ''
  say(false, d.message || e.message || fallback, hint)
  return d.hint || null
}
const run = async (fn) => {
  busy.value = true
  try { return await fn() } finally { busy.value = false }
}

const eligible = computed(() => !!ov.value?.eligibility?.ok && ov.value.eligibility.eligible)
const agentOn = computed(() => !!ov.value?.agent?.rollout?.enabled)

const load = async () => {
  if (!activeMetaChannelId.value) return
  loading.value = !ov.value
  try {
    const res = await http('get', base())
    ov.value = res.data.data
    syncBehaviour()
    if (ov.value.agent) await openTab(tab.value)
  } catch (e) {
    fail(e, 'Failed to load')
  } finally {
    loading.value = false
  }
}
watch(activeMetaChannelId, () => { ov.value = null; notice.value = { ok: true, text: '' }; load() }, { immediate: true })

// ─── Guide ───
const steps = computed(() => {
  const o = ov.value
  if (!o) return []
  const agentExists = !!o.agent
  return [
    {
      title: t('1. فحص الأهلية', '1. Eligibility'),
      text: t('Meta بتتحقق إذا الرقم مسموح له بالبوت: نوع النشاط، البلد، التوثيق، وما يكون عليه بوت تاني.', 'Meta checks whether the number may use the agent: business type, country, verification, and no other AI agent on it.'),
      state: eligible.value ? 'done' : o.eligibility.ok ? 'bad' : 'todo',
      detail: !o.eligibility.ok ? `${t('تعذّر الفحص (هاد مش معناه إنه غير مؤهل)', 'Could not check (this does not mean not eligible)')}: ${o.eligibility.error?.message || ''}`
        : !eligible.value ? `${t('غير مؤهل حالياً', 'Not eligible for now')}${o.eligibility.reason ? ': ' + o.eligibility.reason : ''}. ${t('الأنشطة المستثناة: المالية، الحكومية، الصحية، الكحول، القمار، الأدوية، خدمات الزواج. وغالباً لازم يكون النشاط موثّق عند Meta.', 'Excluded: finance, government, health, alcohol, gambling, OTC drugs, matrimony. The business usually needs Meta verification.')}` : '',
      action: load, actionLabel: t('أعد الفحص', 'Check again')
    },
    {
      title: t('2. الموافقة على شروط البوت', '2. Accept the agent\'s terms'),
      text: t('صاحب حساب Meta بيفتح تبويب «Meta Business Agent» بـ WhatsApp Manager وبيوافق على الشروط. التبويب ما بيطلع إلا إذا الرقم مؤهل، ونحن ما منقدر نوافق عنه.', 'The Meta account owner opens the "Meta Business Agent" tab in WhatsApp Manager and accepts the terms. The tab only appears when the number is eligible, and we cannot accept for them.'),
      state: agentExists ? 'done' : lastOnboardError.value === 'TERMS' ? 'bad' : 'todo',
      detail: lastOnboardError.value === 'TERMS' && !agentExists ? t('Meta ردّت إنه الشروط لسا ما انقبلت.', 'Meta answered that the terms are not accepted yet.') : '',
      link: o.links.agentTab, linkLabel: t('افتح التبويب بـ WhatsApp Manager', 'Open the tab in WhatsApp Manager')
    },
    {
      title: t('3. وسيلة الدفع', '3. Payment method'),
      text: t('Meta بتحاسب صاحب الحساب على ردود البوت (2 دولار لكل مليون token، تقريباً 4–5 سنت للرد). بدون وسيلة دفع البوت ما بيرد إلا على أرقام التجربة. ما فينا نتحقق منها من هون.', 'Meta bills the account owner for the agent\'s replies ($2 per million tokens, about 4–5 cents a reply). Without a payment method it only answers test numbers. We cannot check this from here.'),
      state: 'info',
      link: o.links.billing, linkLabel: t('افتح Billing Hub', 'Open Billing Hub')
    },
    {
      title: t('4. توجيه المحادثات (Conversation routing)', '4. Conversation routing'),
      text: t('Business Settings ← WhatsApp accounts ← الحساب ← Conversation routing، وبعدين Save. هالخيارات بتطلع بعد الموافقة على الشروط:', 'Business Settings › WhatsApp accounts › the account › Conversation routing, then Save. These options appear after the terms are accepted:'),
      bullets: [
        t('«Service»: اختار Meta Business Agent، حتى يرد البوت على رسائل الزباين.', '"Service": choose Meta Business Agent, so the agent answers customer messages.'),
        t('«Thread control»: اختار wakeel pro، حتى موظفينك يقدروا ياخدوا المحادثة من البوت.', '"Thread control": choose wakeel pro, so your team can take a conversation from the agent.'),
        t('«Conversation visibility»: اختار wakeel pro، حتى تشوف ردود البوت بـ Live Chat. بدونها ما بتشوف المحادثات اللي ماسكها البوت.', '"Conversation visibility": choose wakeel pro, so you see the agent\'s replies in Live Chat. Without it, conversations the agent holds are hidden from you.')
      ],
      state: 'info',
      link: o.links.routing, linkLabel: t('افتح Conversation routing', 'Open Conversation routing')
    },
    {
      title: t('5. تفعيل البوت على الرقم', '5. Activate the agent on the number'),
      text: t('بينشئ البوت عند Meta. بعدها Meta بتجهّزه كم دقيقة قبل أول رد.', 'Creates the agent at Meta, which then prepares it for a few minutes before the first reply.'),
      state: agentExists ? 'done' : 'todo',
      action: agentExists ? null : onboard, actionLabel: t('فعّل البوت', 'Activate the agent')
    },
    {
      title: t('6. علّم البوت', '6. Teach the agent'),
      text: t('عبّي التبويبات تحت: معلومات النشاط، الأسئلة الشائعة، الموقع، الملفات، والتعليمات (الأسلوب واللهجة).', 'Fill the tabs below: business information, FAQs, website, files and instructions (style and dialect).'),
      state: agentExists ? 'info' : 'todo'
    },
    {
      title: t('7. جرّب', '7. Test'),
      text: t('بتبويب «التجربة» احكي معه متل الزبون. ببلاش.', 'In the "Test" tab, talk to it like a customer. Free.'),
      state: agentExists ? 'info' : 'todo'
    },
    {
      title: t('8. شغّله', '8. Go live'),
      text: t('بتبويب «التشغيل»: أول شي على أرقام تجربة، وبعدين لكل العملاء.', 'In the "Go live" tab: first on test numbers, then for every customer.'),
      state: agentOn.value ? 'done' : agentExists ? 'info' : 'todo'
    }
  ]
})

const onboard = () => run(async () => {
  try {
    await http('post', `${base()}/onboard`)
    lastOnboardError.value = null
    say(true, t('انفعّل البوت على الرقم. عبّي معلوماته وجرّبه.', 'The agent was created. Fill in its information and test it.'))
    await load()
  } catch (e) {
    lastOnboardError.value = fail(e, 'Onboarding failed')
  }
})

// ─── Tabs ───
const tabs = computed(() => [
  { key: 'info', label: t('معلومات النشاط', 'Business info') },
  { key: 'faq', label: t('أسئلة شائعة', 'FAQs') },
  { key: 'websites', label: t('الموقع', 'Website') },
  { key: 'files', label: t('ملفات', 'Files') },
  { key: 'skills', label: t('التعليمات والأسلوب', 'Instructions & style') },
  { key: 'behaviour', label: t('التحويل والمتابعة', 'Handoff & follow-up') },
  { key: 'test', label: t('التجربة', 'Test') },
  { key: 'launch', label: t('التشغيل', 'Go live') }
])
const loadList = async (kind) => {
  const url = kind === 'files' ? `${base()}/files` : kind === 'allowlist' ? `${base()}/allowlist` : `${base()}/${kind}`
  try {
    const res = await http('get', url)
    lists.value[kind] = res.data.data || []
  } catch (e) { fail(e, 'Failed to load') }
}
const openTab = async (key) => {
  tab.value = key
  if (key === 'info') await loadInfo()
  else if (['faq', 'websites', 'skills', 'files', 'allowlist'].includes(key)) await loadList(key)
  else if (key === 'launch') await loadList('allowlist')
}

// Business information
const emptyInfo = () => ({ business_description: '', payment_method: '', return_policy: '', purchase_info: '', delivery_and_shipping: '', contact_info: { email: '', hours_of_operation: '', address: '' } })
const info = ref(emptyInfo())
const loadInfo = async () => {
  try {
    const d = (await http('get', `${base()}/business-info`)).data.data || {}
    info.value = { ...emptyInfo(), ...d, contact_info: { ...emptyInfo().contact_info, ...(d.contact_info || {}) } }
  } catch (e) { fail(e, 'Failed to load') }
}
const saveInfo = () => run(async () => {
  try { await http('put', `${base()}/business-info`, info.value); say(true, t('انحفظت المعلومات.', 'Information saved.')) } catch (e) { fail(e, 'Save failed') }
})

// FAQs / websites / skills
const faqForm = ref({ id: null, question: '', answer: '' })
const saveFaq = () => run(async () => {
  try {
    const { id, ...body } = faqForm.value
    if (id) await http('put', `${base()}/faq/${encodeURIComponent(id)}`, body)
    else await http('post', `${base()}/faq`, body)
    faqForm.value = { id: null, question: '', answer: '' }
    say(true, t('انحفظ السؤال.', 'Question saved.'))
    await loadList('faq')
  } catch (e) { fail(e, 'Save failed') }
})
const siteUrl = ref('')
const addSite = () => run(async () => {
  try {
    await http('post', `${base()}/websites`, { url: siteUrl.value.trim() })
    siteUrl.value = ''
    say(true, t('انضاف الموقع. Meta رح تقرأه خلال دقائق أو ساعات.', 'Website added. Meta will read it within minutes or hours.'))
    await loadList('websites')
  } catch (e) { fail(e, 'Save failed') }
})
const removeItem = async (kind, id) => {
  const ok = await Swal.fire({ icon: 'warning', title: t('حذف؟', 'Delete?'), showCancelButton: true, confirmButtonText: t('احذف', 'Delete'), cancelButtonText: t('إلغاء', 'Cancel'), confirmButtonColor: '#DC2626' })
  if (!ok.isConfirmed) return
  await run(async () => {
    try { await http('delete', `${base()}/${kind}/${encodeURIComponent(id)}`); await loadList(kind) } catch (e) { fail(e, 'Delete failed') }
  })
}
const crawlLabel = (s) => ({
  not_started: t('لسا ما بلّشت القراءة', 'Not started'), pending: t('بالانتظار', 'Waiting'), in_progress: t('عم تنقرأ', 'Reading'),
  completed: t('انقرأ', 'Read'), completed_no_data: t('انقرأ بس ما لقت محتوى', 'Read, but no content found'), failed: t('فشلت القراءة', 'Reading failed')
}[s] || s || '')

// Files
const uploadFile = (ev) => run(async () => {
  const file = ev.target.files?.[0]
  if (!file) return
  const form = new FormData()
  form.append('file', file)
  try {
    await http('post', `${base()}/files`, form)
    say(true, t('انرفع الملف.', 'File uploaded.'))
    await loadList('files')
  } catch (e) { fail(e, 'Upload failed') } finally { ev.target.value = '' }
})
const removeFile = async (id) => {
  const ok = await Swal.fire({ icon: 'warning', title: t('حذف الملف؟', 'Delete the file?'), showCancelButton: true, confirmButtonText: t('احذف', 'Delete'), cancelButtonText: t('إلغاء', 'Cancel'), confirmButtonColor: '#DC2626' })
  if (!ok.isConfirmed) return
  await run(async () => { try { await http('delete', `${base()}/files/${encodeURIComponent(id)}`); await loadList('files') } catch (e) { fail(e, 'Delete failed') } })
}

// Skills (instructions) + reply style builder
const DIALECTS = [
  { key: 'saudi', ar: 'سعودية', en: 'Saudi', text: 'a simple, friendly Saudi dialect' },
  { key: 'gulf', ar: 'خليجية', en: 'Gulf', text: 'a simple Gulf (Khaleeji) dialect' },
  { key: 'levantine', ar: 'شامية', en: 'Levantine', text: 'a simple Levantine (Syrian / Lebanese / Jordanian) dialect' },
  { key: 'egyptian', ar: 'مصرية', en: 'Egyptian', text: 'a simple Egyptian dialect' },
  { key: 'msa', ar: 'فصحى بسيطة', en: 'Simple standard Arabic', text: 'simple Modern Standard Arabic' }
]
const TONES = [
  { key: 'friendly', ar: 'ودود', en: 'Friendly', text: 'warm, friendly and helpful' },
  { key: 'professional', ar: 'مهني ولطيف', en: 'Professional', text: 'professional and polite' },
  { key: 'formal', ar: 'رسمي', en: 'Formal', text: 'formal and respectful' }
]
const LENGTHS = [
  { key: 'short', ar: 'قصير', en: 'Short', text: 'Keep replies short: one to three sentences.' },
  { key: 'medium', ar: 'متوسط', en: 'Medium', text: 'Keep replies concise: a short paragraph at most.' },
  { key: 'detailed', ar: 'مفصّل عند الحاجة', en: 'Detailed when needed', text: 'Be brief by default and give details only when the customer asks for them.' }
]
const style = ref({ dialect: 'saudi', tone: 'friendly', length: 'short', emoji: 'few' })
const blankSkill = () => ({ id: null, title: '', description: '', skill: '' })
const skillForm = ref(blankSkill())
const resetSkill = () => { skillForm.value = blankSkill() }
const fillStyleSkill = () => {
  const d = DIALECTS.find(x => x.key === style.value.dialect)
  const tone = TONES.find(x => x.key === style.value.tone)
  const len = LENGTHS.find(x => x.key === style.value.length)
  skillForm.value = {
    id: skillForm.value.title === 'reply-style' ? skillForm.value.id : (lists.value.skills.find(s => s.title === 'reply-style')?.id || null),
    title: 'reply-style',
    description: 'Apply to every reply, in every conversation.',
    skill: [
      'Follow this style in every reply:',
      `- Language: reply in the customer's language. When the customer writes in Arabic, reply in ${d.text}. When they write in English, reply in clear, simple English.`,
      `- Tone: ${tone.text}. Address the customer politely and never argue.`,
      `- Length: ${len.text}`,
      style.value.emoji === 'none' ? '- Do not use emojis.' : '- Use at most one emoji, and only when it fits naturally.',
      '- Format: plain WhatsApp text. Use a short numbered list only for steps or options.',
      '- Only state prices, stock, delivery times and policies that appear in the business information, FAQs, website or files. If you are not sure, say so and offer to connect the customer with the team.'
    ].join('\n')
  }
}
const saveSkill = () => run(async () => {
  try {
    const { id, ...body } = skillForm.value
    if (id) await http('put', `${base()}/skills/${encodeURIComponent(id)}`, body)
    else await http('post', `${base()}/skills`, body)
    resetSkill()
    say(true, t('انحفظت التعليمة. Meta بتراجعها تلقائياً، حدّث القائمة بعد شوي لتشوف حالتها.', 'Instruction saved. Meta reviews it automatically; refresh the list shortly to see its status.'))
    await loadList('skills')
  } catch (e) { fail(e, 'Save failed') }
})
const skillStatus = (s) => ({ active: t('فعّالة', 'Active'), pending_review: t('قيد المراجعة', 'Pending review'), blocked: t('مرفوضة', 'Blocked') }[s] || s || '—')

// Handoff, follow-up, never-say
const FOLLOWUPS = [
  { v: 300, ar: '5 دقائق', en: '5 minutes' }, { v: 900, ar: '15 دقيقة', en: '15 minutes' }, { v: 1800, ar: '30 دقيقة', en: '30 minutes' },
  { v: 3600, ar: 'ساعة', en: '1 hour' }, { v: 7200, ar: 'ساعتين', en: '2 hours' }, { v: 28800, ar: '8 ساعات', en: '8 hours' }, { v: 86400, ar: '24 ساعة', en: '24 hours' }
]
const behaviour = ref({ handoff: { enabled: true, message_selection: 'DEFAULT', message: '' }, followup: { enabled: false, followup_interval_in_seconds: 3600, message: '' }, neverSay: '' })
const audience = ref('ALLOWLISTED_ONLY')
const syncBehaviour = () => {
  const a = ov.value?.agent
  if (!a) return
  behaviour.value.handoff = { enabled: a.handoff?.enabled ?? true, message_selection: a.handoff?.message_selection || 'DEFAULT', message: a.handoff?.message || '' }
  behaviour.value.followup = {
    enabled: !!a.followup?.enabled,
    followup_interval_in_seconds: a.followup?.followup_interval_in_seconds || 3600,
    message: a.followup?.message || ''
  }
  // Until it is on, suggest the safe start (test numbers only); Meta's own default is EVERYONE
  audience.value = a.rollout?.enabled ? (a.ai_audience || 'EVERYONE') : 'ALLOWLISTED_ONLY'
}
const putSettings = (body) => http('put', `${base()}/settings`, { ...body, agent_id: ov.value?.agent?.agent_id })
const saveBehaviour = () => run(async () => {
  const body = { handoff: behaviour.value.handoff, followup: behaviour.value.followup }
  const phrases = behaviour.value.neverSay.split('\n').map(s => s.trim()).filter(Boolean)
  if (phrases.length) body.never_say_phrases = phrases
  try { await putSettings(body); say(true, t('انحفظت الإعدادات.', 'Settings saved.')); await load() } catch (e) { fail(e, 'Save failed') }
})
const clearNeverSay = () => run(async () => {
  try { await putSettings({ never_say_phrases: [] }); behaviour.value.neverSay = ''; say(true, t('انمسحت اللائحة.', 'List cleared.')) } catch (e) { fail(e, 'Save failed') }
})

// Test chat
const chat = ref([])
const testInput = ref('')
const testConversationId = ref(null)
const sendTest = (text) => run(async () => {
  const message = (text ?? testInput.value).trim()
  if (!message) return
  chat.value.push({ from: 'me', text: message })
  testInput.value = ''
  try {
    const d = (await http('post', `${base()}/test`, { message, conversation_id: testConversationId.value })).data.data || {}
    testConversationId.value = d.conversation_id || testConversationId.value
    chat.value.push({ from: 'bot', text: d.agent_response || '—', handoff: d.handoff_reason || '', noResponse: d.no_response_reason || '', quickReplies: d.quick_replies || [] })
  } catch (e) { fail(e, 'Test failed') }
})

// Allowlist, rollout, delete
const allowPhone = ref('')
const addAllow = () => run(async () => {
  try { await http('post', `${base()}/allowlist`, { phone: allowPhone.value }); allowPhone.value = ''; await loadList('allowlist') } catch (e) { fail(e, 'Save failed') }
})
const removeAllow = (id) => run(async () => {
  try { await http('delete', `${base()}/allowlist/${encodeURIComponent(id)}`); await loadList('allowlist') } catch (e) { fail(e, 'Delete failed') }
})
const setRollout = async (enabled) => {
  if (enabled && audience.value === 'ALLOWLISTED_ONLY' && !lists.value.allowlist.length) {
    return say(false, t('ضيف رقم تجربة واحد على الأقل، أو اختار «كل العملاء».', 'Add at least one test number, or choose "Every customer".'))
  }
  if (!enabled || audience.value === 'EVERYONE') {
    const ok = await Swal.fire({
      icon: 'warning',
      title: enabled ? t('تشغيل البوت لكل العملاء؟', 'Turn the agent on for every customer?') : t('إيقاف البوت؟', 'Turn the agent off?'),
      text: enabled ? t('البوت رح يرد على كل زبون بيكتب لهالرقم، وMeta رح تحاسب على ردوده.', 'The agent will answer every customer who writes to this number, and Meta will bill its replies.') : t('رح يوقف يرد على كل المحادثات. إذا رجعت شغّلته، بيرد على المحادثات الجديدة بس.', 'It stops answering every conversation. If you turn it on again, it only answers new conversations.'),
      showCancelButton: true, confirmButtonText: t('نعم', 'Yes'), cancelButtonText: t('إلغاء', 'Cancel'), confirmButtonColor: enabled ? '#059669' : '#DC2626'
    })
    if (!ok.isConfirmed) return
  }
  await run(async () => {
    try {
      await putSettings({ rollout: { enabled }, ai_audience: audience.value })
      say(true, enabled ? t('البوت شغّال.', 'The agent is on.') : t('البوت موقّف.', 'The agent is off.'))
      await load()
    } catch (e) { fail(e, 'Save failed') }
  })
}
const deleteAgent = async () => {
  const ok = await Swal.fire({
    icon: 'warning', title: t('حذف البوت نهائياً؟', 'Delete the agent permanently?'),
    text: t('رح تنحذف كل إعداداته ومعلوماته عند Meta، وما في تراجع.', 'All its settings and knowledge at Meta are deleted, with no undo.'),
    showCancelButton: true, confirmButtonText: t('احذف', 'Delete'), cancelButtonText: t('إلغاء', 'Cancel'), confirmButtonColor: '#DC2626'
  })
  if (!ok.isConfirmed) return
  await run(async () => {
    try { await http('delete', base()); say(true, t('انحذف البوت.', 'Agent deleted.')); await load() } catch (e) { fail(e, 'Delete failed') }
  })
}
</script>

<style scoped>
.pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 800; }
.pill-good { background: #dcfce7; color: #166534; }
.pill-bad { background: #fee2e2; color: #991b1b; }
.pill-warn { background: #fef3c7; color: #92400e; }
.pill-muted { background: #f1f5f9; color: #475569; }
.btn-main { background: #059669; color: white; font-weight: 800; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.85rem; }
.btn-main:hover:not(:disabled) { background: #047857; }
.btn-main:disabled, .btn-light:disabled, .btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-light { background: #f1f5f9; color: #0f172a; font-weight: 700; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.85rem; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; gap: 4px; }
.btn-light:hover:not(:disabled) { background: #e2e8f0; }
.btn-danger { background: #dc2626; color: white; font-weight: 800; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.85rem; }
.btn-link { font-size: 0.85rem; font-weight: 700; color: #0369a1; padding: 0 6px; }
.step { display: flex; gap: 12px; align-items: flex-start; }
.step-icon { width: 28px; height: 28px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; flex-shrink: 0; background: #f1f5f9; color: #475569; }
.step-icon.done { background: #059669; color: white; }
.step-icon.bad { background: #dc2626; color: white; }
.step-icon.info { background: #e0f2fe; color: #0369a1; }
.tab { padding: 0.45rem 0.9rem; border-radius: 9px; font-weight: 700; font-size: 0.85rem; color: #475569; }
.tab:hover { background: #f1f5f9; }
.tab-active { background: #ecfdf5; color: #047857; }
.hint { font-size: 0.85rem; color: #64748b; line-height: 1.6; }
.field { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; font-weight: 700; color: #334155; }
.field input, .field textarea, .field select, .input { border: 1px solid #cbd5e1; border-radius: 10px; padding: 0.5rem 0.7rem; font-weight: 500; font-size: 0.9rem; background: white; font-family: inherit; }
.check { display: flex; gap: 8px; align-items: center; font-size: 0.9rem; font-weight: 600; margin-top: 4px; }
.row { display: flex; gap: 8px; align-items: center; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.7rem 0.9rem; }
.empty { text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 1rem; }
.guide-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.9rem 1rem; font-size: 0.85rem; color: #334155; line-height: 1.7; }
.chat { background: #efeae2; border-radius: 14px; padding: 1rem; min-height: 220px; max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.bubble { max-width: 80%; padding: 0.55rem 0.8rem; border-radius: 12px; font-size: 0.9rem; box-shadow: 0 1px 1px rgba(0,0,0,0.06); }
.bubble-me { align-self: flex-end; background: #d9fdd3; }
.bubble-bot { align-self: flex-start; background: white; }
.chip { background: #f0fdf4; border: 1px solid #86efac; color: #166534; border-radius: 999px; padding: 2px 10px; font-size: 0.8rem; font-weight: 700; }
</style>
