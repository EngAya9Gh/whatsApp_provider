# وكيل (Wakeel): ملف التسليم

**ما أُنجز، وما تبقّى، وكيف تكمل.**

آخر تحديث: 2026-11-19. آخر commit منشور على السيرفر: `9c5f6e2` (ربط انستغرام وماسنجر).

هذا الملف لمن يكمل العمل: مطوّر أو مساعد ذكاء اصطناعي. اقرأه كاملاً قبل أي تعديل. كل ما فيه مأخوذ من الكود ومن جلسات العمل حتى التاريخ أعلاه. إذا تعارض شيء هنا مع الكود، فالكود هو الصحيح، وحدّث هذا الملف.

---

## ١. قبل أن تبدأ

- **جلسات تعمل بالتوازي:** أكثر من جلسة (أو شخص) قد تعمل في نفس المستودع في الوقت نفسه. ابدأ دائماً بـ `git status` و`git log`، ولا تلمس تعديلات غير مرفوعة لا تعرف مصدرها.
- **الـ commit والـ push:** تقوم بهما إدارة المشروع، وليس من يكتب الكود، إلا إذا طُلب ذلك صراحةً.
- **لغة التواصل:** مع فريق المشروع بالعربية. نصوص الواجهة بالعربية الفصحى والإنجليزية معاً (`isAr ? '…' : '…'`). التعليقات في الكود بالإنجليزية.
- **قواعد البيانات في الاختبارات:** لا تشغّل أي اختبار يكتب على MongoDB Atlas الحقيقية. الاختبارات تستعمل بدائل وهمية أو قواعد مؤقتة.
- **ملف `dashboard/dist/index.html` متتبَّع في git:** بعد أي `npm run build` محلي أرجعه بـ `git checkout dashboard/dist/index.html`.
- **لا أسرار في الملفات:** لا تضع كلمات سر أو توكنات أو App Secret في الكود أو في هذا الملف أو في الفيديوهات.

---

## ٢. المنتج والبنية

وكيل منصة SaaS لخدمة العملاء عبر واتساب وقنوات أخرى، على `provider.wakeel.cc`، من شركة رشد إيه أي (Rushd AI).

| الجزء | التقنية | المكان |
|---|---|---|
| الخادم | Node.js + Express | `src/` (التشغيل: `src/server.js`، والعمليات الخلفية: `src/worker.js`) |
| البيانات الأساسية | MySQL عبر Prisma: الحسابات والقنوات والتذاكر والمحفظة والحملات… | `prisma/schema.prisma` |
| المحادثات | MongoDB عبر Mongoose: `ChatThread` و`ChatMessage` والسير `ChatFlow`… | `src/models/mongo/` |
| الطوابير والأقفال | Redis: BullMQ وحدود الطلبات ومحوّل Socket.io | `src/config/redis.js` |
| لوحة العميل | Vue 3 + Vite | `dashboard/` |
| لوحة الأدمن | Vue 3، وتُنشر تحت `/admin` | `admin-dashboard/` |
| الذكاء الاصطناعي | Gemini (مفتاح المنصة أو مفتاح العميل) | `src/modules/ai/` |

### العمليات على السيرفر
تُدار بـ `ecosystem.config.js`:
- **`whatsapp-api`** (`PROCESS_ROLE=api`): الـ API و Socket.io.
- **`whatsapp-worker`** (`PROCESS_ROLE=worker`): webhooks Meta، والحملات، والجدولات (إغلاق التذاكر، واسترجاع الحملات، واشتراكات القنوات كل ساعة).

### النشر
`push` إلى `main` يشغّل GitHub Actions (`.github/workflows/deploy.yml`). الخطوات بالترتيب:
1. الاختبارات على MySQL وMongo وRedis حقيقية.
2. الدخول على السيرفر بـ SSH.
3. `git reset --hard origin/main` ثم `npm install`.
4. `node prisma/scripts/fix-ticket-numbers.js`.
5. **`prisma db push`**، وليس `migrate deploy`.
6. بناء اللوحتين.
7. `pm2 startOrRestart ecosystem.config.js`.

**تنبيهات النشر:**
- **`db push` يرفض فهرساً فريداً (unique) جديداً** بدون `--accept-data-loss`، ولا تضف هذا الخيار أبداً. الفهرس الفريد يُضاف بسكربت قبل الـ push (راجع `prisma/README.md`).
- **مجلد `prisma/migrations` مُحدَّث دائماً**، لأن الاختبار `tests/migrations.test.js` يبني منه القاعدة كاملة. أي عمود جديد يحتاج ملف migration أيضاً.
- **كل نشر يأخذ آخر نسخة من `main`.** لا حاجة لإعادة تشغيل نشر قديم فاشل.
- **في 17 و18 نوفمبر فشلت 3 نشرات** لأن كلمة سر السيرفر تغيّرت ولم تُحدَّث في GitHub ← Settings ← Secrets. يُنصح بالانتقال إلى مفتاح SSH بدل كلمة السر.

### الاختبارات
- **التشغيل:** `npm test`، وهو `node:test` على `tests/*.test.js`.
- **البدائل الوهمية:** تُحقن بـ `inject()` من `tests/helpers/env.js`.
- **الاختبارات التي تحتاج قواعد حقيقية:** تُتخطّى محلياً بدون `TEST_MONGO_URL` و`TEST_MYSQL_URL` و`TEST_REDIS_HOST`، وتعمل في GitHub Actions.
- **آخر نتيجة محلية:** 142 اختباراً: 92 نجح، 0 فشل، 50 تُخطّي (تحتاج قواعد بيانات).

---

## ٣. ما أُنجز

### ٣.١ القنوات المتعددة (Omnichannel)

#### الفكرة المعمارية
كل القنوات صفوف في جدول واحد `whatsapp_channels` (الموديل `WhatsAppChannel`). السبب أن الفرق والشيفتات والدوام والتذاكر والسير كلها مربوطة بـ `channelId`.

| `providerType` | القناة | عنوان العميل في `ChatThread.contactPhone` |
|---|---|---|
| `META_CLOUD` | رقم واتساب رسمي (Meta) | رقم الهاتف |
| `BAILEYS` | واتساب بالباركود (بدون لايف شات) | رقم الهاتف |
| `WEBCHAT` | ويدجت الموقع | `web:<visitor id>` |
| `MESSENGER` | ماسنجر صفحة فيسبوك | `fb:<PSID>` |
| `INSTAGRAM` | انستغرام احترافي مربوط بصفحة | `ig:<IGSID>` |

**الملفات الأساسية:**

| الملف | دوره |
|---|---|
| `src/modules/channels/channel.kinds.js` | قدرات كل قناة: أزرار، قوالب، نافذة 24 ساعة، هل تُحسب من رصيد الرسائل (`metered`)، و`LIVE_CHAT_PROVIDERS` |
| `src/modules/channels/channel.sender.js` | كل الإرسال من اللايف شات يمر من هنا، ثم يتوزّع: واتساب ← `meta.service`، والويدجت ← لا شيء (الويدجت يقرأ المحادثة)، وانستغرام وماسنجر ← `social.sender` |
| `chat.service.receiveMessage(tenantId, channelId, contact, message)` | مدخل موحّد لكل رسالة عميل من أي قناة: محادثة، تذكرة، سير، رسالة خارج الدوام. `handleIncomingMessage` (واتساب) يحوّل رسالة Meta للشكل الموحّد ثم يستدعيه |
| حقل `contactInfo` في `ChatThread` | تفاصيل إضافية: هاتف الزائر المكتوب، البريد، الصفحة، `@username`، الصورة |
| `GET /api/v1/channels` (`channels.routes.js`) | كل قنوات اللايف شات، لصفحات الفرق والدوام والموظفين واللايف شات |
| `dashboard/src/utils/channelKinds.js` | أيقونة ولون واسم كل قناة في اللوحة |

#### ويدجت الموقع (`src/modules/webchat/`): منشور ومجرَّب
- **الواجهة العامة للزوار:** `webchat.public.routes.js`، مركّبة في `src/app.js` **قبل** CORS العام، لأن أي موقع يستدعيها:
  - `config` و`session` و`messages` (GET وPOST) و`whatsapp`.
  - `widget.js`: الملف الذي يضعه العميل في موقعه.
  - `try/:id`: صفحة تجربة جاهزة.
- **التحديث:** الويدجت يسأل السيرفر كل 3 ثوانٍ (polling)، وليس اتصالاً لحظياً بعد.
- **هوية الزائر:** موقّعة بـ HMAC من `JWT_SECRET`. ملاحظات الفريق الداخلية لا تصل للزائر أبداً.
- **الحماية:** حدود طلبات لكل IP وكل زائر، والمواقع المسموحة (`allowedDomains`).
- **قبل أول رسالة:** نموذج واحد فيه الاسم والجوال والرسالة الأولى، ثم ملاحظة «✓ وصلت رسالتك»، وترحيب بالاسم.
- **الرقم الذي يكتبه الزائر غير موثّق:** يظهر للفريق، لكنه لا يُربط بجهات الاتصال ولا بالـ CRM.
- **«تابع على واتساب»:** يفتح `wa.me` برمز `W-XXXXXX`. عندما يصل الرمز على رقم واتساب مربوط، تُربط المحادثتان بملاحظة داخلية في كل منهما (`linkFromWhatsApp`)، ويظهر زر «محادثته على واتساب» في اللايف شات.
- **صفحة اللوحة `/webchat`** (`WebchatWidgets.vue`): الشكل والنصوص، ودليل التركيب لكل منصة (موقع عادي، ووردبريس، شوبيفاي، سلة بنسخة JavaScript، زد)، والسعر وحالة الاشتراك.

#### انستغرام وماسنجر (`src/modules/social/`): منشور، لكن **لم يُجرَّب مع Meta الحقيقية بعد**
- **الربط:** المستخدم يسجّل الدخول بـ Facebook Login for Business (الإعداد `META_FB_PAGES_CONFIG_ID`) في صفحة `/connect-social` (`ConnectSocial.vue`).
  - `startConnect` يحوّل الـ code إلى توكن طويل، ويجلب الصفحات وحساب انستغرام المربوط بكل صفحة. التوكنات تُحفظ في Redis 15 دقيقة، ولا تصل للمتصفح.
  - `finishConnect` يشترك بالصفحة (`subscribed_apps`)، وينشئ قناة `MESSENGER` و/أو `INSTAGRAM`، ويحفظ معرّف الصفحة أو الحساب في `externalId`.
- **ملكية الصفحة:** الصفحة الواحدة لحساب وكيل واحد فقط (409 إذا كانت مربوطة بحساب آخر).
- **الاستقبال:** نفس رابط webhook واتساب `POST /api/v1/meta/webhook`. الكائنان `page` و`instagram` يُوجَّهان في `meta.controller._handleSocial`، ويُتحقق من التوقيع بـ `META_APP_SECRET`. ثم تُوضع مهمة `SOCIAL_EVENT` في الطابور، ويعالجها `social.inbound.processEntry` في الـ worker.
- **الإرسال:** `social.sender.js` عبر `POST /me/messages` بتوكن الصفحة.
  - أزرار واتساب والقوائم تصبح quick replies (حتى 13، والعنوان 20 حرفاً).
  - زر الرابط: قالب أزرار في ماسنجر، ونص مع الرابط في انستغرام.
- **اسم المرسل وصورته:** يُقرآن مرة واحدة عند أول رسالة.
- **حدود معروفة:**
  - رسائل الـ echo (ما يُكتب من تطبيق انستغرام نفسه) **تُتجاهل** ولا تظهر في اللايف شات.
  - لا يوجد بعد شريط نافذة الـ 24 ساعة لهاتين القناتين.
  - علامات «تم التسليم/القراءة» غير مدعومة.

#### الردود الآلية بالكلمات على كل القنوات
- **الملف:** `src/modules/chatbot/autoReply.js`. فيه `pickRule` (مشتركة مع واتساب في `meta.webhook.worker.js`) و`replyIfMatched` (للويدجت وانستغرام وماسنجر).
- **حقل `AutoResponder.allChannels`:** مفتاح «على كل القنوات» في صفحة «الرد الآلي».
- **قواعد بوت الباركود القديمة** (`channelId = null`) **لا تُطبَّق** على القنوات الجديدة عن قصد.
- **أولوية السير:** إذا ردّ السير على الرسالة لا يُرسَل رد آلي.

#### السير لكل قناة
- لكل قناة سيرها. الصفحة «سير المحادثة» (`Flows.vue`) فيها نسخ سير قناة إلى أخرى: `POST /api/v1/flows/:channelId/copy-from/:sourceChannelId`.
- المنسوخ يصبح مسودة، ويحتاج نشراً.

#### التسعير: سعر لكل قناة ورصيد واحد
- **الملف:** `src/modules/channels/channel.billing.js`.
- **الأسعار:** يحددها الأدمن في الإعدادات (`channelPriceWebchat` و`channelPriceInstagram` و`channelPriceMessenger`، بالريال شهرياً). الخانة الفارغة تعني مجاناً.
- **الخصم:** أول شهر عند إنشاء القناة، ثم شهرياً عبر `src/services/channelBillingScheduler.js` كل ساعة.
- **إذا لم يكفِ الرصيد:** `billingState = UNPAID`، والقناة تتوقف (الويدجت يختفي). وتعود تلقائياً بعد الشحن، أو فوراً بزر «جدّد».
- **سجل المحفظة:** كل حركة في `wallet_transactions` تحمل `channelKind` و`channelId`. صفحة «الاستهلاك والفواتير» تعرض «من أين انصرف الرصيد» حسب القناة.
- **رصيد الرسائل:** رسائل الويدجت وانستغرام وماسنجر لا تُحسب من رصيد رسائل واتساب.

### ٣.٢ التذاكر واللايف شات
- **الاستلام عند فتح المحادثة:** الإعداد `claimOn` = `OPEN` أو `REPLY`.
  - التنازع بين موظفين يُحل بتحديث شرطي واحد في MySQL: `updateMany where assignedToId = null`. يفوز أول طلب فقط.
  - نفس الطريقة في التوزيع التلقائي والاستلام بأول رد.
- **أوقات التذكرة:** `readyAt` و`firstOpenedAt` و`firstAssignedAt` و`firstResponseAt` و`assignedVia`. وقت البوت لا يُحسب.
- **صفحة «تحليلات التذاكر»** (`/analytics/tickets`): مدة الفتح، ومدة الاستلام، وأول رد، وزمن الحل، ولكل موظف.
- **رسائل الحملات:** تُضاف للمحادثة عندما يرد العميل، من حملات آخر 30 يوماً وحتى 10 رسائل. المصدر `CampaignDelivery.preview`.
- **الشارات:** «الموظف الذكي» و«السير» و«آلي» و«حملة». وضغطة زر قالب الحملة تظهر نصاً.

### ٣.٣ أجزاء أقدم مبنية
- الفرق والشيفتات والتوزيع، وساعات العمل ورسالة خارج الدوام.
- الوسوم ومراحل العميل.
- صلاحيات رؤية المحادثات.
- محرر السير المرئي، مع خطوة الموظف الذكي وخطوة زر الرابط.
- الموظف الذكي (Gemini) مع حصص لكل باقة.
- المحادثات الداخلية للفريق، والمهام.
- القسائم والإحالات.
- إضافات الباقة (موظف أو رقم إضافي بفاتورة).
- الحملات على دفعات (`campaign.dispatcher.js`) مع استرجاع تكلفة الرسائل الفاشلة.
- Embedded Signup v4، وCoexistence (رقم تطبيق واتساب للأعمال)، وبوت Meta (Business Agent).
- دخول الأدمن كعميل، وصفحة صحة النظام.

---

## ٤. وضع حسابات Meta

| البند | الحالة |
|---|---|
| تطبيق Meta | «wakeel pro»، `App ID 29665408596382680`، **منشور (Live)** |
| محفظة الأعمال الموثّقة | **wakeel.cc**. محفظة «Rushd Ai» **غير موثّقة** |
| مراجعة التطبيق (App Review) | قُدّمت في 2026-11-09 لـ `whatsapp_business_messaging` و`whatsapp_business_management` (+ `email` و`public_profile`)، و**ما زالت قيد المراجعة** في 2026-11-18. حتى تُقبل: فقط من له دور في التطبيق يكمل Embedded Signup |
| حساب المراجِع | مستخدم فرعي في حساب demo. **لا تغيّر كلمة سره قبل نتيجة المراجعة**، ثم غيّرها فوراً لأنها ضعيفة |
| حالة استخدام Messenger | أُضيفت في 2026-11-18. `pages_messaging` و`pages_manage_metadata` و`pages_show_list` و`business_management` و`instagram_basic` و`instagram_manage_messages` كلها «Ready for testing»، أي تعمل لأصحاب الأدوار في التطبيق بدون مراجعة |
| حساب واتساب «Rushd Ai» | **بدون طريقة دفع**: القوالب والحملات لن تُرسل حتى تُضاف من WhatsApp Manager |
| اسم العرض | «Rushd Ai» مقبول. ظهوره بدل الرقم في قائمة محادثات العميل يحتاج، حسب تقارير المزوّدين، توثيقاً وحد رسائل أعلى |

---

## ٥. المتبقي: الخطة بالترتيب

### المرحلة أ: تجربة انستغرام وماسنجر (خطوات في Meta تنفّذها إدارة المشروع)
التجربة على **انستغرام وكيل وصفحة فيسبوك وكيل**، لأن «رشد» ليس لديها انستغرام.

1. **حساب انستغرام وكيل:**
   - يكون احترافياً ومربوطاً بصفحة فيسبوك وكيل.
   - من تطبيق انستغرام: الإعدادات ← الرسائل والردود على القصص ← التحكم في الرسائل ← الأدوات المتصلة ← تشغيل «Allow access to messages».
2. **صلاحيتان إضافيتان:** في حالة استخدام Messenger ← Permissions، إضافة `pages_read_engagement` و`Business Asset User Profile Access`.
3. **Webhooks:**
   - في Messenger API Settings ← Configure webhooks:
     - الرابط: `https://provider.wakeel.cc/api/v1/meta/webhook`.
     - التوكن: قيمة `META_VERIFY_TOKEN` في `.env` السيرفر.
     - الحقول: `messages` و`messaging_postbacks`.
   - ونفس الشيء في Instagram settings.
4. **إعداد تسجيل الدخول:**
   - Facebook Login for Business ← Configurations ← Create.
   - نوع التوكن: User access token. الأصول: Pages + Instagram accounts.
   - الصلاحيات: `pages_show_list` و`pages_messaging` و`pages_manage_metadata` و`pages_read_engagement` و`business_management` و`instagram_basic` و`instagram_manage_messages`.
   - نسخ الـ Configuration ID إلى `.env` السيرفر: `META_FB_PAGES_CONFIG_ID=…`، ثم إعادة تشغيل `whatsapp-api`.
5. **التجربة:**
   - من اللوحة ← «انستغرام وماسنجر» ← ربط ← اختيار صفحة وكيل وحسابها.
   - إرسال رسالة خاصة من حساب آخر. يجب أن تظهر في اللايف شات باسم المرسل وصورته.
   - الرد عليها من اللايف شات.

### المرحلة ب: أعمال تطوير بعد أول تجربة حقيقية
بالترتيب المقترح:
1. **إصلاح ما يظهر في التجربة.** نقاط غير مؤكدة لم تُجرَّب:
   - هل الاشتراك بالصفحة (`subscribed_apps` بحقلي `messages,messaging_postbacks`) يكفي لاستقبال رسائل انستغرام؟
   - هل `/me/messages` بتوكن الصفحة يرسل لانستغرام؟
   - هل قراءة الاسم والصورة تعمل بالصلاحيات الحالية؟
2. **نافذة الـ 24 ساعة لانستغرام وماسنجر في اللايف شات:** شريط تحذير، ثم وسم Human Agent (7 أيام) بعد موافقة Meta عليه. الأخطاء الحالية تظهر كنص خطأ من Meta فقط.
3. **رسائل الـ echo:** إظهار ما يُكتب من تطبيق انستغرام أو صندوق Meta في اللايف شات، مع منع التكرار برقم الرسالة `mid`.
4. **علامات التسليم والقراءة** لانستغرام وماسنجر (حدثا `read` و`delivery`).
5. **زر «راسله على واتساب»** في محادثة الموقع: يرسل قالباً على الرقم الذي كتبه الزائر.
6. **صفحة «تحليلات Meta»** تعرض واتساب فقط. قرّر هل تُضاف القنوات الجديدة لها، أم تكفي «تحليلات التذاكر» (وهي تشمل كل القنوات).
7. **نصوص صفحة الفرق** ما زالت تقول «كل رقم واتساب يتبع فريقاً». تُعدَّل إلى «كل قناة».

### المرحلة ج: مراجعة Meta لانستغرام وماسنجر
بعد نتيجة مراجعة واتساب، وبعد نجاح المرحلة أ:
- تسجيل فيديو: ربط الصفحة، ثم وصول رسالة انستغرام وماسنجر للايف شات، ثم الرد.
- تقديم Advanced Access لـ `pages_messaging` و`instagram_manage_messages` و`pages_manage_metadata` و`pages_show_list` و`pages_read_engagement` و`instagram_basic` و`business_management`، ثم Human Agent لاحقاً.
- **لا تضف صلاحيات لا نستخدمها:** `ads_management` والرسائل التسويقية وغيرها.

### المرحلة د: تيك توك
- **تقدّمه إدارة المشروع:**
  1. حساب TikTok Business لوكيل.
  2. بوابة TikTok API for Business (`business-api.tiktok.com/portal`) بحساب TikTok For Business: تسجيل الشركة ثم إنشاء App ثم طلب **Business Messaging API**، مع وصف الاستخدام ورابط سياسة الخصوصية.
  3. توثيق الشركة إذا طُلب: مستند رسمي فيه الاسم ورقم التسجيل والعنوان مطابقة تماماً. شهادة الضريبة عليها عنوان حي الوادي.
- **غير متاح** في أوروبا وبريطانيا.
- **التطوير بعد الموافقة:** نفس وصفة إضافة قناة في القسم ٨.

### المرحلة هـ: تحسينات ويدجت الموقع
- اتصال لحظي (Socket.io أو SSE) بدل السؤال كل 3 ثوانٍ.
- صور وملفات من الزائر وإليه.
- إشعار بالبريد للزائر عند وصول رد وهو خارج الموقع (إذا ترك بريده).
- تطبيقات «وكيل» في متجر تطبيقات **زد** و**سلة**، لتركيب الويدجت بكبسة بدل نسخ الكود. زد يدعم ذلك رسمياً (App Scripts). سلة لم تُوثَّق طريقتها بعد.

### المرحلة و: أمور عامة غير مبنية
- **اتصالات واتساب** (Cloud API Calling): تحتاج رقماً بحد 2000 رسالة يومياً على الأقل.
- **الفوترة الشهرية التلقائية:** الفواتير يدوية الآن.
- **X (تويتر):** فقط إذا طلبه عميل كبير. الـ API مدفوع لكل استخدام.
- **دمج نفس العميل عبر القنوات:** الاقتراح دمج يدوي أولاً.
- **سعر لكل محادثة** كبديل عن الاشتراك الشهري للقناة: غير مبني.

---

## ٦. قرارات تنتظر إدارة المشروع
- **الأسعار:** أسعار القنوات (فارغة = مجانية حالياً)، وحصص الذكاء الاصطناعي لكل باقة، وحدود الموظفين والأرقام لكل باقة، وأسعار الإضافات، ومكافأة الإحالة، وقيم القسائم. كلها مطفأة أو بلا حد افتراضياً.
- **الرسائل المفردة** (اللايف شات والـ API): من المحفظة أم من الحد الشهري؟
- **دمج العملاء عبر القنوات:** يدوي أم تلقائي برقم الجوال؟
- **ربط انستغرام:** عبر صفحة فيسبوك (المبني الآن) فقط، أم إضافة «تسجيل دخول انستغرام» لمن ليس لديه صفحة؟

---

## ٧. أمان: يجب إصلاحه
- **دخول الأدمن:** يقبل كلمة سر افتراضية مكتوبة في الكود إذا لم يُضبط `ADMIN_PASSWORD_HASH`. اضبطه على السيرفر.
- **صفحة سجلات النظام** `/api/system/logs`: لها مستخدم وكلمة سر افتراضيان في الكود إذا لم يُضبط `LOGS_USER` و`LOGS_PASS`. اضبطهما.
- **حد للمحاولات:** لا يوجد على `/api/auth/login` و`/sub-login`. أضفه (`rate-limiter-flexible` موجود في المشروع).
- **الأسرار:** تغيير App Secret وتوكنات Meta، لأنها ظهرت في لقطات شاشة سابقاً، وتغيير كلمة سر حساب المراجِع بعد نتيجة المراجعة.
- **النشر:** الدخول على السيرفر بمفتاح SSH بدل كلمة السر.

---

## ٨. وصفة: إضافة قناة جديدة (تيك توك مثلاً)
1. **`channel.kinds.js`:** نوع `providerType` جديد بقدراته (`liveChat` و`metered: false` و`addressPrefix`…).
2. **عمود `externalId`:** معرّف الحساب عند المنصة، ويُبحث به عند وصول الـ webhook.
3. **الاستقبال:** يحوّل حدث المنصة إلى `{ id, type, content, interactiveId, hasMedia, mediaUrl }`، ثم يستدعي `chatService.receiveMessage(...)` بعنوان مثل `tt:<id>`، ثم `autoReply.replyIfMatched` إذا لم يرد السير.
4. **الإرسال:** دوال `sendText` و`sendMedia` و`sendButtons` و`sendList` و`sendLinkButton`، وتوزيعها في `channel.sender.js`.
5. **الربط:** routes ومنطق الربط مثل `social.service.js`، وصفحة في اللوحة، وأيقونة في `dashboard/src/utils/channelKinds.js`.
6. **السعر:** في `PRICE_KEYS` في `channel.billing.js`، وخانة في `admin-dashboard/src/views/Settings.vue`.
7. **قاعدة البيانات:** ملف migration لأي عمود جديد، واختبارات بنمط `tests/social.test.js`.

---

## ٩. فخاخ معروفة
- **إيقاف التذاكر لقناة:** يكون بـ `ticketSettings.ticketlessChannelIds`. أما عمود `whatsapp_channels.auto_create_tickets` فهو **مهمل** ولا يُقرأ.
- **قواعد الرد الآلي بدون قناة** (`channelId = null`) تخص بوت الباركود.
- **رقم Meta التجريبي** (`+1 555…`) لا يمر عبر نافذة Embedded Signup، ويُضاف يدوياً من لوحة الأدمن.
- **قناة محذوفة:** محادثات اللايف شات مربوطة بـ `channelId`. حذف قناة وإعادة إضافتها ينشئ قناة جديدة، والمحادثات القديمة تبقى على القديمة.
- **أخطاء Meta:** استعمل `src/modules/meta/meta.errors.js` لتحويلها إلى نص مفهوم، ولا تعرض للمستخدم «Meta rejected» فقط.
- **الويب هوك:** وصول webhooks حقيقية يتطلب أن يكون التطبيق Live والحقول مشتركاً بها في لوحة Meta لكل كائن: `whatsapp_business_account` و`page` و`instagram`.

---

## ١٠. أين تجد ماذا
| المجال | الملفات |
|---|---|
| استقبال webhooks Meta | `src/modules/meta/meta.controller.js` ← طابور ← `src/workers/meta.webhook.worker.js` |
| اللايف شات (الخادم) | `src/modules/chat/chat.service.js` |
| اللايف شات (الواجهة) | `dashboard/src/views/LiveChat.vue` |
| القنوات | `src/modules/channels/` |
| ويدجت الموقع | `src/modules/webchat/` و`dashboard/src/views/WebchatWidgets.vue` |
| انستغرام وماسنجر | `src/modules/social/` و`dashboard/src/views/ConnectSocial.vue` |
| التذاكر | `src/modules/tickets/` و`src/modules/workforce/routing.service.js` |
| التحليلات | `src/modules/analytics/analytics.service.js` |
| السير | `src/modules/flows/` (المحرك `flow.engine.js`) و`dashboard/src/views/FlowEditor.vue` |
| الرد الآلي | `src/modules/chatbot/autoReply.js` و`src/modules/meta/meta.autoresponder.controller.js` |
| المحفظة والأسعار | `src/modules/wallet/wallet.service.js` و`src/modules/channels/channel.billing.js` و`src/modules/campaign/campaign.billing.js` |
| الحملات | `src/modules/campaign/` و`src/workers/meta.campaign.worker.js` |
| متغيرات البيئة المهمة | `META_FB_APP_ID`، `META_APP_SECRET`، `META_VERIFY_TOKEN`، `META_FB_CONFIG_ID` (واتساب)، `META_FB_PAGES_CONFIG_ID` (انستغرام وماسنجر)، `APP_URL`، `JWT_SECRET`، `GEMINI_API_KEY`، `PROCESS_ROLE`، `ADMIN_PASSWORD_HASH`، `LOGS_USER`/`LOGS_PASS` |
