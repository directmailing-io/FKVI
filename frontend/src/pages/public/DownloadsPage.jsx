import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, ArrowRight, Loader2, Lock, ShieldCheck, BookOpen, Home, Clock, Users, AlertTriangle } from 'lucide-react'

const LANGUAGES = [
  { code: 'de', flag: '🇩🇪', nativeLabel: 'Deutsch' },
  { code: 'en', flag: '🇬🇧', nativeLabel: 'English' },
  { code: 'fr', flag: '🇫🇷', nativeLabel: 'Français' },
  { code: 'ar', flag: '🇸🇦', nativeLabel: 'عربي' },
  { code: 'vi', flag: '🇻🇳', nativeLabel: 'Tiếng Việt' },
]

const T = {
  de: {
    dir: 'ltr',
    back: '← Zurück zur Startseite',
    badge: 'Kostenlose Informationsbroschüre',
    h1a: 'Deine Informationsbroschüre',
    h1b: 'für den Start in Deutschland',
    subtitle: 'Alles, was du als Pflegefachkraft aus dem Ausland wissen musst – kompakt, verständlich und in deiner Sprache.',
    langLabel: 'Wähle deine Sprache',
    contentLabel: 'Das erwartet dich in der Broschüre',
    points: [
      { title: 'Der Vermittlungsprozess', desc: 'Schritt für Schritt erklärt – von der Bewerbung bis zur Anstellung in Deutschland.' },
      { title: 'Unterkunft & Ankommen', desc: 'Wir kümmern uns um deine Unterkunft und stehen dir beim Start in Deutschland zur Seite.' },
      { title: '12 Monate Begleitung', desc: 'Nach deiner Ankunft begleiten wir dich ein ganzes Jahr – damit du dich sicher und gut aufgehoben fühlst.' },
      { title: 'Deine Rechte & Pflichten', desc: 'Alles, was du als Pflegefachkraft in Deutschland wissen musst – rechtlich, sozial und im Berufsalltag.' },
    ],
    privacy: 'Deine Daten werden vertraulich behandelt und nicht weitergegeben.',
    formTitle: 'Jetzt kostenlos anfordern',
    formSubtitle: (flag, label) => `Du erhältst die Broschüre auf ${flag} ${label} per E-Mail.`,
    emailNote: 'Hinweis: Unsere Bestätigungs-E-Mails werden auf Deutsch versendet. Falls du kein Deutsch sprichst, empfehlen wir dir, einen Übersetzer hinzuzuziehen.',
    firstName: 'Vorname',
    lastName: 'Nachname',
    phone: 'Telefonnummer',
    email: 'E-Mail-Adresse',
    firstNamePh: 'Max',
    lastNamePh: 'Mustermann',
    phonePh: '+49 123 456789',
    emailPh: 'deine@email.de',
    gdpr: 'Ich stimme der Verarbeitung meiner Daten gemäß der',
    gdprLink: 'Datenschutzerklärung',
    gdprSuffix: 'zu.',
    agreeError: 'Bitte stimme der Datenschutzerklärung zu.',
    alreadyError: 'Diese E-Mail-Adresse hat bereits Zugang zur Broschüre erhalten. Bitte prüfe dein Postfach.',
    genericError: 'Bitte versuche es erneut.',
    btnSending: 'Wird gesendet...',
    btnRequest: 'Broschüre anfordern',
    trust: 'Double-Opt-in · DSGVO-konform · Kostenlos',
    successTitle: 'Fast geschafft!',
    successText: (email) => `Wir haben dir eine Bestätigungs-E-Mail an ${email} geschickt. Klicke auf den Link in der E-Mail, um deine Broschüre zu öffnen.`,
    noEmail: 'Keine E-Mail erhalten? Prüfe deinen Spam-Ordner.',
  },
  en: {
    dir: 'ltr',
    back: '← Back to homepage',
    badge: 'Free information brochure',
    h1a: 'Your information brochure',
    h1b: 'for starting in Germany',
    subtitle: 'Everything you need to know as a nursing professional from abroad – compact, clear, and in your language.',
    langLabel: 'Choose your language',
    contentLabel: "What's inside the brochure",
    points: [
      { title: 'The placement process', desc: 'Explained step by step – from application to employment in Germany.' },
      { title: 'Accommodation & arrival', desc: 'We arrange your accommodation and support you when you start in Germany.' },
      { title: '12 months of support', desc: 'After your arrival, we accompany you for a full year so you feel safe and well looked after.' },
      { title: 'Your rights & duties', desc: 'Everything you need to know as a nursing professional in Germany – legally, socially and on the job.' },
    ],
    privacy: 'Your data is treated confidentially and not passed on to third parties.',
    formTitle: 'Request for free now',
    formSubtitle: (flag, label) => `You will receive the brochure in ${flag} ${label} by email.`,
    emailNote: 'Please note: Our confirmation emails are sent in German. If you do not speak German, we recommend using a translator.',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    email: 'Email address',
    firstNamePh: 'Max',
    lastNamePh: 'Mustermann',
    phonePh: '+49 123 456789',
    emailPh: 'your@email.com',
    gdpr: 'I agree to the processing of my data in accordance with the',
    gdprLink: 'Privacy Policy',
    gdprSuffix: '.',
    agreeError: 'Please agree to the privacy policy.',
    alreadyError: 'This email address already has access to the brochure. Please check your inbox.',
    genericError: 'Please try again.',
    btnSending: 'Sending...',
    btnRequest: 'Request brochure',
    trust: 'Double opt-in · GDPR compliant · Free',
    successTitle: 'Almost there!',
    successText: (email) => `We sent a confirmation email to ${email}. Click the link in the email to open your brochure.`,
    noEmail: 'No email received? Check your spam folder.',
  },
  fr: {
    dir: 'ltr',
    back: '← Retour à la page d\'accueil',
    badge: 'Brochure d\'information gratuite',
    h1a: 'Votre brochure d\'information',
    h1b: 'pour commencer en Allemagne',
    subtitle: 'Tout ce que vous devez savoir en tant que professionnel·le de santé venu·e de l\'étranger – concis, clair et dans votre langue.',
    langLabel: 'Choisissez votre langue',
    contentLabel: 'Ce que contient la brochure',
    points: [
      { title: 'Le processus de placement', desc: 'Expliqué étape par étape – de la candidature à l\'emploi en Allemagne.' },
      { title: 'Logement & arrivée', desc: 'Nous nous occupons de votre logement et vous accompagnons lors de votre installation en Allemagne.' },
      { title: '12 mois d\'accompagnement', desc: 'Après votre arrivée, nous vous accompagnons pendant toute une année pour que vous vous sentiez en sécurité.' },
      { title: 'Vos droits & obligations', desc: 'Tout ce que vous devez savoir en tant que professionnel·le de santé en Allemagne – sur le plan juridique, social et professionnel.' },
    ],
    privacy: 'Vos données sont traitées de manière confidentielle et ne sont pas transmises à des tiers.',
    formTitle: 'Demandez gratuitement maintenant',
    formSubtitle: (flag, label) => `Vous recevrez la brochure en ${flag} ${label} par e-mail.`,
    emailNote: 'Remarque : Nos e-mails de confirmation sont envoyés en allemand. Si vous ne parlez pas allemand, nous vous recommandons de faire appel à un traducteur.',
    firstName: 'Prénom',
    lastName: 'Nom',
    phone: 'Numéro de téléphone',
    email: 'Adresse e-mail',
    firstNamePh: 'Marie',
    lastNamePh: 'Dupont',
    phonePh: '+49 123 456789',
    emailPh: 'votre@email.fr',
    gdpr: 'J\'accepte le traitement de mes données conformément à la',
    gdprLink: 'Politique de confidentialité',
    gdprSuffix: '.',
    agreeError: 'Veuillez accepter la politique de confidentialité.',
    alreadyError: 'Cette adresse e-mail a déjà accès à la brochure. Veuillez vérifier votre boîte de réception.',
    genericError: 'Veuillez réessayer.',
    btnSending: 'Envoi en cours...',
    btnRequest: 'Demander la brochure',
    trust: 'Double opt-in · Conforme RGPD · Gratuit',
    successTitle: 'Presque terminé\u00a0!',
    successText: (email) => `Nous vous avons envoyé un e-mail de confirmation à ${email}. Cliquez sur le lien dans l'e-mail pour ouvrir votre brochure.`,
    noEmail: 'Vous n\'avez pas reçu d\'e-mail\u00a0? Vérifiez votre dossier spam.',
  },
  ar: {
    dir: 'rtl',
    back: 'العودة إلى الصفحة الرئيسية →',
    badge: 'كتيب معلومات مجاني',
    h1a: 'كتيبك المعلوماتي',
    h1b: 'للبدء في ألمانيا',
    subtitle: 'كل ما تحتاج معرفته كممرض/ة متخصص/ة قادم/ة من الخارج – موجز وواضح وبلغتك.',
    langLabel: 'اختر لغتك',
    contentLabel: 'ما يتضمنه الكتيب',
    points: [
      { title: 'عملية التوظيف', desc: 'موضحة خطوة بخطوة – من التقديم حتى العمل في ألمانيا.' },
      { title: 'السكن والوصول', desc: 'نتولى ترتيب سكنك ونقف إلى جانبك عند بدايتك في ألمانيا.' },
      { title: '12 شهراً من الدعم', desc: 'بعد وصولك، نرافقك طوال عام كامل حتى تشعر بالأمان والراحة.' },
      { title: 'حقوقك وواجباتك', desc: 'كل ما تحتاج معرفته كممرض/ة متخصص/ة في ألمانيا – قانونياً واجتماعياً ومهنياً.' },
    ],
    privacy: 'تُعامَل بياناتك بسرية تامة ولا تُشارك مع أطراف ثالثة.',
    formTitle: 'اطلب مجاناً الآن',
    formSubtitle: (flag, label) => `ستتلقى الكتيب باللغة ${flag} ${label} عبر البريد الإلكتروني.`,
    emailNote: 'ملاحظة: يتم إرسال رسائل التأكيد باللغة الألمانية. إذا كنت لا تتحدث الألمانية، نوصيك باستخدام مترجم.',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    firstNamePh: 'محمد',
    lastNamePh: 'العمري',
    phonePh: '+49 123 456789',
    emailPh: 'بريدك@email.com',
    gdpr: 'أوافق على معالجة بياناتي وفقاً لـ',
    gdprLink: 'سياسة الخصوصية',
    gdprSuffix: '.',
    agreeError: 'يرجى الموافقة على سياسة الخصوصية.',
    alreadyError: 'هذا البريد الإلكتروني لديه بالفعل صلاحية الوصول إلى الكتيب. يرجى مراجعة صندوق الوارد.',
    genericError: 'يرجى المحاولة مرة أخرى.',
    btnSending: 'جارٍ الإرسال...',
    btnRequest: 'اطلب الكتيب',
    trust: 'موافقة مزدوجة · متوافق مع GDPR · مجاني',
    successTitle: '!اكتمل تقريباً',
    successText: (email) => `أرسلنا إليك رسالة تأكيد على ${email}. انقر على الرابط في البريد الإلكتروني لفتح كتيبك.`,
    noEmail: 'لم تتلقَّ بريداً إلكترونياً؟ تحقق من مجلد البريد غير المرغوب فيه.',
  },
  vi: {
    dir: 'ltr',
    back: '← Quay lại trang chủ',
    badge: 'Tài liệu thông tin miễn phí',
    h1a: 'Tài liệu thông tin của bạn',
    h1b: 'để bắt đầu tại Đức',
    subtitle: 'Tất cả những gì bạn cần biết với tư cách là chuyên gia điều dưỡng từ nước ngoài – súc tích, rõ ràng và bằng ngôn ngữ của bạn.',
    langLabel: 'Chọn ngôn ngữ của bạn',
    contentLabel: 'Nội dung tài liệu',
    points: [
      { title: 'Quy trình tuyển dụng', desc: 'Giải thích từng bước – từ đơn ứng tuyển đến khi làm việc tại Đức.' },
      { title: 'Chỗ ở & định cư', desc: 'Chúng tôi lo sắp xếp chỗ ở và đồng hành cùng bạn khi bắt đầu cuộc sống ở Đức.' },
      { title: '12 tháng hỗ trợ', desc: 'Sau khi bạn đến nơi, chúng tôi đồng hành suốt một năm để bạn cảm thấy an toàn và được chăm sóc tốt.' },
      { title: 'Quyền & nghĩa vụ của bạn', desc: 'Mọi điều bạn cần biết với tư cách là chuyên gia điều dưỡng tại Đức – pháp lý, xã hội và nghề nghiệp.' },
    ],
    privacy: 'Dữ liệu của bạn được bảo mật và không được chia sẻ với bên thứ ba.',
    formTitle: 'Yêu cầu miễn phí ngay bây giờ',
    formSubtitle: (flag, label) => `Bạn sẽ nhận được tài liệu bằng ${flag} ${label} qua email.`,
    emailNote: 'Lưu ý: Email xác nhận của chúng tôi được gửi bằng tiếng Đức. Nếu bạn không nói được tiếng Đức, chúng tôi khuyên bạn nên nhờ người phiên dịch hỗ trợ.',
    firstName: 'Tên',
    lastName: 'Họ',
    phone: 'Số điện thoại',
    email: 'Địa chỉ email',
    firstNamePh: 'Nguyễn',
    lastNamePh: 'Văn A',
    phonePh: '+49 123 456789',
    emailPh: 'email@cua-ban.com',
    gdpr: 'Tôi đồng ý với việc xử lý dữ liệu của mình theo',
    gdprLink: 'Chính sách bảo mật',
    gdprSuffix: '.',
    agreeError: 'Vui lòng đồng ý với chính sách bảo mật.',
    alreadyError: 'Địa chỉ email này đã có quyền truy cập tài liệu. Vui lòng kiểm tra hộp thư đến.',
    genericError: 'Vui lòng thử lại.',
    btnSending: 'Đang gửi...',
    btnRequest: 'Yêu cầu tài liệu',
    trust: 'Xác nhận kép · Tuân thủ GDPR · Miễn phí',
    successTitle: 'Gần xong rồi!',
    successText: (email) => `Chúng tôi đã gửi email xác nhận đến ${email}. Nhấp vào liên kết trong email để mở tài liệu của bạn.`,
    noEmail: 'Không nhận được email? Kiểm tra thư mục spam.',
  },
}

const POINT_ICONS = [
  { Icon: BookOpen, color: 'text-teal-500', bg: 'bg-teal-50' },
  { Icon: Home,     color: 'text-blue-500', bg: 'bg-blue-50' },
  { Icon: Clock,    color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { Icon: Users,    color: 'text-purple-500', bg: 'bg-purple-50' },
]

export default function DownloadsPage() {
  const [language, setLanguage] = useState('de')
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '' })
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const t = T[language] || T.de
  const currentLang = LANGUAGES.find(l => l.code === language)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleLangSwitch = code => {
    setLanguage(code)
    setError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!agreed) { setError(t.agreeError); return }
    setLoading(true)
    try {
      const res = await fetch('/api/brochure/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, language }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'already_confirmed') {
          setError(t.alreadyError)
          return
        }
        throw new Error(data.error || t.genericError)
      }
      setSubmitted(true)
    } catch (err) {
      setError(err.message || t.genericError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]" dir={t.dir}>
      <Helmet>
        <title>Kostenlose Informationsbroschüre für Pflegefachkräfte | FKVI</title>
        <meta name="description" content="Kostenlose Informationsbroschüre für Pflegefachkräfte aus dem Ausland. Alles über Ihren Weg nach Deutschland – Vermittlungsprozess, Unterkunft, Begleitung – in Deutsch, Englisch, Französisch, Arabisch & Vietnamesisch." />
        <link rel="canonical" href="https://fkvi-plattform.de/downloads" />
        <meta property="og:title" content="Kostenlose Informationsbroschüre für Pflegefachkräfte | FKVI" />
        <meta property="og:description" content="Alles, was Pflegefachkräfte aus dem Ausland für ihren Start in Deutschland wissen müssen – kompakt und mehrsprachig." />
        <meta property="og:url" content="https://fkvi-plattform.de/downloads" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="FKVI – Fachkraft Vermittlung International" className="h-[52px] w-auto" />
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            {t.back}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid lg:grid-cols-5 gap-10 items-start">

          {/* Left: Info */}
          <div className="lg:col-span-3 lg:sticky lg:top-28 space-y-8">

            <div>
              <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-teal-200 mb-4">
                <BookOpen className="h-3.5 w-3.5" />
                {t.badge}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3">
                {t.h1a}<br />
                <span className="text-teal-600">{t.h1b}</span>
              </h1>
              <p className="text-gray-500 leading-relaxed">{t.subtitle}</p>
            </div>

            {/* Language selector */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t.langLabel}</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleLangSwitch(lang.code)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      language === lang.code
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                  >
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <span>{lang.nativeLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content points */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.contentLabel}</p>
              {t.points.map((point, i) => {
                const { Icon, color, bg } = POINT_ICONS[i]
                return (
                  <div key={i} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm mb-0.5">{point.title}</p>
                      <p className="text-gray-400 text-xs leading-relaxed">{point.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              {t.privacy}
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t.successTitle}</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  {t.successText(form.email)}
                </p>
                <p className="text-xs text-gray-400">{t.noEmail}</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-1">{t.formTitle}</h2>
                <p className="text-xs text-gray-400 mb-4">
                  {t.formSubtitle(currentLang?.flag, currentLang?.nativeLabel)}
                </p>

                {/* Email-in-German notice — hidden for DE */}
                {language !== 'de' && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">{t.emailNote}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="first_name" className="text-xs text-gray-600 mb-1.5 block">{t.firstName} *</Label>
                      <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required placeholder={t.firstNamePh} />
                    </div>
                    <div>
                      <Label htmlFor="last_name" className="text-xs text-gray-600 mb-1.5 block">{t.lastName} *</Label>
                      <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required placeholder={t.lastNamePh} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-xs text-gray-600 mb-1.5 block">{t.phone} *</Label>
                    <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required placeholder={t.phonePh} />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-xs text-gray-600 mb-1.5 block">{t.email} *</Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder={t.emailPh} />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div
                      onClick={() => setAgreed(a => !a)}
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        agreed ? 'bg-teal-600 border-teal-600' : 'border-gray-300 group-hover:border-teal-400'
                      }`}
                    >
                      {agreed && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 leading-relaxed">
                      {t.gdpr}{' '}
                      <Link to="/datenschutzerklaerung" className="text-teal-600 underline" target="_blank">{t.gdprLink}</Link>
                      {' '}{t.gdprSuffix}
                    </span>
                  </label>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.btnSending}</>
                    ) : (
                      <>{t.btnRequest} <ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </form>

                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t.trust}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 text-center text-xs text-gray-400 mt-12">
        <span>© 2026 Fachkraft Vermittlung International GmbH &amp; Co. KG</span>
        <span className="mx-3">·</span>
        <Link to="/impressum" className="hover:text-gray-600 transition-colors">Impressum</Link>
        <span className="mx-3">·</span>
        <Link to="/datenschutzerklaerung" className="hover:text-gray-600 transition-colors">Datenschutzerklärung</Link>
      </footer>
    </div>
  )
}
