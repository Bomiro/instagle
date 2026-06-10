const config = require('../config');

const translations = {
  ar: {
    // Welcome & Onboarding
    welcome: 'مرحباً بك! المنصة رقم #1 للدردشة العشوائية والسرية على إنستغرام. 💬',
    not_following: 'مرحباً! للتفاعل مع البوت، يرجى متابعة الحساب أولاً 👆',
    how_it_works: `📖 كيف يعمل؟
    
🎲 اضغط على "ابدأ الدردشة" للبحث عن شخص عشوائي
💬 تحدث مع شخص مجهول الهوية بشكل آمن
🛑 استخدم "إيقاف" لإنهاء المحادثة

⚠️ تنبيه: مشاركة الروابط أو الحسابات ممنوعة للحفاظ على أمان الجميع.`,

    // Queue States
    searching: 'جاري البحث عن شخص عشوائي... انتظر لحظة ⏳',
    searching_wait: 'لا تزال في انتظار شخص ما... يرجى الانتظار قليلاً ⏳',
    search_cancelled: 'تم إلغاء البحث. العودة للقائمة الرئيسية 🔄',

    // Chat
    found_partner: '🎉 تم العثور على شخص! يمكنكما التحدث الآن بكل سرية وأمان. هوّيتكما مجهولة تماماً.',
    disconnected: '🚶 غادر أحد المستخدمين. العودة للقائمة الرئيسية.',
    disconnected_a: '🚶 لقد غادرت الدردشة.',
    disconnected_b: '🚶 غادر الطرف الآخر الدردشة.',

    // Link Filter
    link_warning: '⚠️ عذراً، مشاركة الروابط أو الحسابات ممنوعة تماماً داخل المحادثة للحفاظ على الأمان والسرية!',

    // Reports
    report_confirm: '✅ تم تلقي تبليغك بنجاح. شكراً لمساعدتنا في الحفاظ على بيئة آمنة.',
    reported_user_banned: '⚠️ تم حظر حسابك مؤقتاً لمدة 24 ساعة بسبب تلقي تبليغات متعددة عن سلوك غير لائق.',

    // Banned
    banned: '⚠️ تم حظر حسابك مؤقتاً لمدة 24 ساعة بسبب تلقي تبليغات متعددة عن سلوك غير لائق.',

    // Language
    language_changed: '✅ تم تغيير اللغة بنجاح.',

    // Buttons
    start_chat: '🎲 ابدأ الدردشة',
    change_language: '🌐 تغيير اللغة',
    how_it_works_btn: 'ℹ️ كيف يعمل؟',
    cancel_search: '❌ إلغاء البحث',
    next: '⏩ التالي',
    stop: '🛑 إيقاف',
    exit: '🚪 خروج',
    report: '🚨 تبليغ',
    back_to_menu: '↩️ العودة للقائمة',
    quick_reply_start: '🎲 ابدأ',

    // Selection
    select_language: '🌐 اختر لغتك المفضلة:',
    select_ar: '🇲🇦 العربية',
    select_en: '🇬🇧 English'
  },
  en: {
    // Welcome & Onboarding
    welcome: 'Welcome! The #1 platform for random and anonymous chat on Instagram. 💬',
    not_following: 'Hello! To interact with the bot, please follow the account first 👆',
    how_it_works: `📖 How does work?

🎲 Press "Start Chat" to find a random person
💬 Talk to an anonymous person safely
🔄 Use "Next" to find a new person
🛑 Use "Stop" to end the conversation
🚨 Use "Report" to flag inappropriate behavior

⚠️ Warning: Sharing links or accounts is prohibited to keep everyone safe.`,

    // Queue States
    searching: 'Searching for a random person... please wait ⏳',
    searching_wait: 'Still waiting for someone... please be patient ⏳',
    search_cancelled: 'Search cancelled. Returning to main menu 🔄',

    // Chat
    found_partner: '🎉 Match found! You can now talk freely and safely. Your identity is completely anonymous.',
    disconnected: '🚶 A user has left. Returning to the main menu.',
    disconnected_a: '🚶 You have left the chat.',
    disconnected_b: '🚶 The other user has left the chat.',

    // Link Filter
    link_warning: '⚠️ Sorry, sharing links or accounts is strictly forbidden in chat to maintain safety and privacy!',

    // Reports
    report_confirm: '✅ Your report has been received. Thank you for helping us maintain a safe environment.',
    reported_user_banned: '⚠️ Your account has been temporarily banned for 24 hours due to multiple reports of inappropriate behavior.',

    // Banned
    banned: '⚠️ Your account has been temporarily banned for 24 hours due to multiple reports of inappropriate behavior.',

    // Language
    language_changed: '✅ Language changed successfully.',

    // Buttons
    start_chat: '🎲 Start',
    change_language: '🌐 Language',
    how_it_works_btn: 'ℹ️ Ideas',
    cancel_search: '❌ Cancel Search',
    next: '⏩ Next',
    stop: '🛑 Stop',
    exit: '🚪 Exit',
    report: '🚨 Report',
    back_to_menu: '↩️ Back to Menu',
    quick_reply_start: '🎲 Start',

    // Selection
    select_language: '🌐 Select your preferred language:',
    select_ar: '🇲🇦 العربية',
    select_en: '🇬🇧 English'
  }
};

/**
 * Get translation string
 * @param {string} key - Translation key
 * @param {string} lang - Language code (default from config)
 * @returns {string}
 */
const t = (key, lang = null) => {
  const language = lang || config.DEFAULT_LANGUAGE;
  const strings = translations[language] || translations[config.DEFAULT_LANGUAGE];
  return strings[key] || translations[config.DEFAULT_LANGUAGE][key] || key;
};

/**
 * Get all translations for a language
 * @param {string} lang
 * @returns {Object}
 */
const getAllTranslations = (lang = null) => {
  const language = lang || config.DEFAULT_LANGUAGE;
  return translations[language] || translations[config.DEFAULT_LANGUAGE];
};

/**
 * Check if language is supported
 * @param {string} lang
 * @returns {boolean}
 */
const isSupportedLanguage = (lang) => {
  return config.SUPPORTED_LANGUAGES.includes(lang);
};

module.exports = {
  translations,
  t,
  getAllTranslations,
  isSupportedLanguage
};
