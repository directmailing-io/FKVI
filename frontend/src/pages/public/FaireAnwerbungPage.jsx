import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { openCookieSettings } from '@/lib/cookieConsent'
import { ShieldCheck, MessageSquare, FileDown, CheckCircle2, Flag, AlertCircle } from 'lucide-react'

const LANGS = [
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
]

const T = {
  de: {
    dir: 'ltr',
    back: '← Zurück zur Startseite',
    eyebrow: 'Faire Anwerbung',
    h1: 'Transparenz & faire Vermittlung',
    lead: 'Wir handeln nach dem Gütesiegel „Faire Anwerbung Pflege Deutschland". Hier finden Sie alle wichtigen Informationen.',
    s_process: 'So läuft Ihre Vermittlung ab',
    phase1: 'Phase 1 – Vorbereitung im Herkunftsland',
    steps_p1: [
      { label: 'Erstkontakt & Information', sub: 'Erstgespräch, KDA-Broschüre' },
      { label: 'Bedenkzeit & Vertragsschluss', sub: '7 Tage Bedenkzeit, Vertrag' },
      { label: 'Sprachqualifizierung & Dokumente', sub: 'B2-Ausbildung, Dokumentenprüfung' },
      { label: 'Matching & Arbeitsplatzangebot', sub: 'Profilabgleich, Angebot' },
    ],
    phase2: 'Phase 2 – Vermittlung bis zur Berufsanerkennung',
    steps_p2: [
      { label: 'Anerkennungs- & Visumverfahren', sub: 'Antrag, Visum, Einreise' },
      { label: 'Einreise & Onboarding', sub: 'Abholung, Unterkunft, Start' },
      { label: 'Anpassungsmaßnahmen & Prüfung', sub: 'soweit erforderlich' },
    ],
    step_done: 'Volle Berufsanerkennung',
    step_done_sub: 'Ziel erreicht',
    s_grund: 'Unsere Grundsätze',
    grund_p: 'Für die Fachkraft ist der gesamte Prozess kostenfrei (Employer-Pays-Prinzip). Wir verpflichten uns auf die UN-Leitprinzipien für Wirtschaft und Menschenrechte, den WHO-Verhaltenskodex und die ILO-Grundsätze fairer Anwerbung.',
    tags: ['Keine Kosten für die Fachkraft', 'Transparente Verträge', 'Schutz vor Repressalien'],
    grund_dl: 'Grundsatzerklärung herunterladen (PDF)',
    s_besch: 'Beschwerden & Hinweise',
    besch_p: 'Jede Fachkraft kann sich – auch anonym und ohne Nachteile – mit Beschwerden oder Hinweisen an uns wenden. Wir behandeln alle Anliegen vertraulich.',
    besch_ext: 'Externe Stelle: Gütegemeinschaft GAPA',
    s_bro: 'Informationsbroschüre herunterladen',
    bro_p: 'Die offizielle Broschüre „Informationen zur Erwerbsmigration in die Pflege nach Deutschland" – kostenlos, in Ihrer Sprache.',
    bro_btn: 'Broschüre herunterladen (PDF)',
    bro_note: 'Der Download startet in der oben gewählten Sprache.',
  },
  fr: {
    dir: 'ltr',
    back: '← Retour à la page d\'accueil',
    eyebrow: 'Recrutement équitable',
    h1: 'Transparence & placement équitable',
    lead: 'Nous agissons selon le label de qualité « Faire Anwerbung Pflege Deutschland ». Vous trouverez ici toutes les informations importantes.',
    s_process: 'Le déroulement de votre placement',
    phase1: 'Phase 1 – Préparation dans le pays d\'origine',
    steps_p1: [
      { label: 'Premier contact & information', sub: 'Entretien, brochure KDA' },
      { label: 'Délai de réflexion & contrat', sub: '7 jours de réflexion, contrat' },
      { label: 'Qualification linguistique & documents', sub: 'Formation B2, vérification' },
      { label: 'Mise en relation & offre d\'emploi', sub: 'Profil, offre écrite' },
    ],
    phase2: 'Phase 2 – Placement jusqu\'à la reconnaissance professionnelle',
    steps_p2: [
      { label: 'Reconnaissance & procédure de visa', sub: 'Demande, visa, entrée' },
      { label: 'Arrivée & intégration', sub: 'Accueil, logement, début' },
      { label: 'Mesures d\'adaptation & examen', sub: 'si nécessaire' },
    ],
    step_done: 'Autorisation d\'exercice complète',
    step_done_sub: 'Objectif atteint',
    s_grund: 'Nos principes',
    grund_p: 'Pour le personnel soignant, l\'ensemble du processus est gratuit (principe « l\'employeur paie »). Nous nous engageons à respecter les Principes directeurs des Nations Unies relatifs aux entreprises et aux droits de l\'homme, le Code de l\'OMS et les principes de l\'OIT pour un recrutement équitable.',
    tags: ['Gratuit pour le personnel soignant', 'Contrats transparents', 'Protection contre les représailles'],
    grund_dl: 'Télécharger la déclaration de principes (PDF)',
    s_besch: 'Réclamations & signalements',
    besch_p: 'Chaque professionnel peut nous adresser une réclamation ou un signalement – également de manière anonyme et sans conséquence. Nous traitons toutes les demandes de manière confidentielle.',
    besch_ext: 'Organisme externe : communauté de qualité GAPA',
    s_bro: 'Télécharger la brochure d\'information',
    bro_p: 'La brochure officielle « Informations sur la migration de travail dans le secteur des soins en Allemagne » – gratuite, dans votre langue.',
    bro_btn: 'Télécharger la brochure (PDF)',
    bro_note: 'Le téléchargement se fait dans la langue sélectionnée ci-dessus.',
  },
  ar: {
    dir: 'rtl',
    back: 'العودة إلى الصفحة الرئيسية →',
    eyebrow: 'التوظيف العادل',
    h1: 'الشفافية والتوظيف العادل',
    lead: 'نحن نعمل وفقًا لعلامة الجودة «التوظيف العادل للرعاية في ألمانيا». تجدون هنا جميع المعلومات المهمة.',
    s_process: 'كيف تتم عملية التوظيف',
    phase1: 'المرحلة 1 – التحضير في بلد المنشأ',
    steps_p1: [
      { label: 'الاتصال الأول والمعلومات', sub: 'محادثة، كتيب KDA' },
      { label: 'مهلة التفكير وإبرام العقد', sub: '7 أيام للتفكير، عقد' },
      { label: 'التأهيل اللغوي والوثائق', sub: 'مستوى B2، فحص الوثائق' },
      { label: 'المطابقة وعرض العمل', sub: 'مطابقة الملف، عرض كتابي' },
    ],
    phase2: 'المرحلة 2 – التوظيف حتى الاعتراف المهني',
    steps_p2: [
      { label: 'إجراءات الاعتراف والتأشيرة', sub: 'الطلب، التأشيرة، الدخول' },
      { label: 'الوصول والاندماج', sub: 'الاستقبال، السكن، البدء' },
      { label: 'إجراءات التكيف والامتحان', sub: 'عند الاقتضاء' },
    ],
    step_done: 'الاعتراف المهني الكامل',
    step_done_sub: 'تحقق الهدف',
    s_grund: 'مبادئنا',
    grund_p: 'العملية بأكملها مجانية للكادر التمريضي (مبدأ «صاحب العمل يدفع»). نلتزم بالمبادئ التوجيهية للأمم المتحدة بشأن الأعمال التجارية وحقوق الإنسان، ومدونة منظمة الصحة العالمية، ومبادئ منظمة العمل الدولية للتوظيف العادل.',
    tags: ['مجاني للكادر التمريضي', 'عقود شفافة', 'حماية من الانتقام'],
    grund_dl: 'تحميل إعلان المبادئ (PDF)',
    s_besch: 'الشكاوى والملاحظات',
    besch_p: 'يمكن لكل كادر تمريضي التوجه إلينا بشكوى أو ملاحظة – بشكل مجهول ودون أي عواقب. نتعامل مع جميع الطلبات بسرية تامة.',
    besch_ext: 'جهة خارجية: جمعية الجودة GAPA',
    s_bro: 'تنزيل كتيب المعلومات',
    bro_p: 'الكتيب الرسمي «معلومات حول الهجرة للعمل في مجال الرعاية في ألمانيا» – مجاني، بلغتك.',
    bro_btn: 'تنزيل الكتيب (PDF)',
    bro_note: 'يبدأ التنزيل باللغة المحددة أعلاه.',
  },
  en: {
    dir: 'ltr',
    back: '← Back to homepage',
    eyebrow: 'Fair recruitment',
    h1: 'Transparency & fair placement',
    lead: 'We act in accordance with the quality seal "Faire Anwerbung Pflege Deutschland". Here you will find all the important information.',
    s_process: 'How your placement works',
    phase1: 'Phase 1 – Preparation in the country of origin',
    steps_p1: [
      { label: 'First contact & information', sub: 'Initial talk, KDA brochure' },
      { label: 'Reflection period & contract', sub: '7 days, placement contract' },
      { label: 'Language qualification & documents', sub: 'B2 training, document check' },
      { label: 'Matching & job offer', sub: 'Profile match, written offer' },
    ],
    phase2: 'Phase 2 – Placement up to professional recognition',
    steps_p2: [
      { label: 'Recognition & visa procedure', sub: 'Application, visa, entry' },
      { label: 'Arrival & onboarding', sub: 'Pickup, housing, start' },
      { label: 'Adaptation measures & exam', sub: 'if required' },
    ],
    step_done: 'Full professional recognition',
    step_done_sub: 'Goal achieved',
    s_grund: 'Our principles',
    grund_p: 'The entire process is free of charge for the nurse (employer-pays principle). We are committed to the UN Guiding Principles on Business and Human Rights, the WHO Code of Practice and the ILO principles of fair recruitment.',
    tags: ['Free of charge for the nurse', 'Transparent contracts', 'Protection from reprisals'],
    grund_dl: 'Download policy statement (PDF)',
    s_besch: 'Complaints & reports',
    besch_p: 'Every nurse can contact us with complaints or reports – also anonymously and without any disadvantages. We treat all matters confidentially.',
    besch_ext: 'External body: quality association GAPA',
    s_bro: 'Download the information brochure',
    bro_p: 'The official brochure "Information on labour migration into nursing in Germany" – free of charge, in your language.',
    bro_btn: 'Download brochure (PDF)',
    bro_note: 'The download starts in the language selected above.',
  },
  vi: {
    dir: 'ltr',
    back: '← Quay lại trang chủ',
    eyebrow: 'Tuyển dụng công bằng',
    h1: 'Minh bạch & tuyển dụng công bằng',
    lead: 'Chúng tôi hành động theo nhãn chất lượng "Faire Anwerbung Pflege Deutschland". Tại đây bạn sẽ tìm thấy mọi thông tin quan trọng.',
    s_process: 'Quy trình tuyển dụng của bạn',
    phase1: 'Giai đoạn 1 – Chuẩn bị tại nước xuất xứ',
    steps_p1: [
      { label: 'Liên hệ đầu tiên & thông tin', sub: 'Trao đổi, tài liệu KDA' },
      { label: 'Thời gian cân nhắc & hợp đồng', sub: '7 ngày, hợp đồng' },
      { label: 'Trình độ ngôn ngữ & hồ sơ', sub: 'Đào tạo B2, kiểm tra' },
      { label: 'Kết nối & lời mời làm việc', sub: 'Đối chiếu hồ sơ, đề nghị' },
    ],
    phase2: 'Giai đoạn 2 – Tuyển dụng đến khi được công nhận nghề',
    steps_p2: [
      { label: 'Công nhận & thủ tục thị thực', sub: 'Đơn, thị thực, nhập cảnh' },
      { label: 'Nhập cảnh & hòa nhập', sub: 'Đón, chỗ ở, bắt đầu' },
      { label: 'Biện pháp thích ứng & kiểm tra', sub: 'nếu cần thiết' },
    ],
    step_done: 'Công nhận nghề đầy đủ',
    step_done_sub: 'Đạt mục tiêu',
    s_grund: 'Nguyên tắc của chúng tôi',
    grund_p: 'Toàn bộ quy trình miễn phí cho nhân viên điều dưỡng (nguyên tắc người sử dụng lao động chi trả). Chúng tôi cam kết tuân thủ các Nguyên tắc của Liên Hợp Quốc về Kinh doanh và Nhân quyền, Bộ quy tắc của WHO và các nguyên tắc tuyển dụng công bằng của ILO.',
    tags: ['Miễn phí cho nhân viên điều dưỡng', 'Hợp đồng minh bạch', 'Bảo vệ khỏi sự trả đũa'],
    grund_dl: 'Tải tuyên bố nguyên tắc (PDF)',
    s_besch: 'Khiếu nại & phản ánh',
    besch_p: 'Mỗi nhân viên điều dưỡng có thể gửi khiếu nại hoặc phản ánh cho chúng tôi – kể cả ẩn danh và không bị bất lợi. Chúng tôi xử lý mọi vấn đề một cách bảo mật.',
    besch_ext: 'Cơ quan bên ngoài: hiệp hội chất lượng GAPA',
    s_bro: 'Tải xuống tài liệu thông tin',
    bro_p: 'Tài liệu chính thức "Thông tin về di cư lao động ngành điều dưỡng tại Đức" – miễn phí, bằng ngôn ngữ của bạn.',
    bro_btn: 'Tải tài liệu (PDF)',
    bro_note: 'Quá trình tải xuống diễn ra bằng ngôn ngữ đã chọn ở trên.',
  },
}

function SectionHead({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-10">
      <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-fkvi-teal" />
      </div>
      <h2 className="text-xl font-bold text-fkvi-blue">{title}</h2>
    </div>
  )
}

export default function FaireAnwerbungPage() {
  const [lang, setLang] = useState('de')
  const t = T[lang] || T.de

  return (
    <div className="min-h-screen bg-[#f8fafc]" dir={t.dir}>
      <Helmet>
        <title>Faire Anwerbung | FKVI – Fachkraft Vermittlung International</title>
        <meta name="description" content="Informationen zur fairen Anwerbung von Pflegefachkräften. FKVI handelt nach dem Gütesiegel Faire Anwerbung Pflege Deutschland." />
        <link rel="canonical" href="https://fachkraft-vermittlung.de/faire-anwerbung" />
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="FKVI – Fachkraft Vermittlung International" className="h-16 w-auto" />
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{t.back}</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-20">

        {/* Language switcher */}
        <div className={`flex flex-wrap gap-2 mb-8 ${t.dir === 'rtl' ? 'justify-start' : 'justify-end'}`} role="group" aria-label="Sprache wählen">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                lang === l.code
                  ? 'bg-fkvi-teal text-white border-fkvi-teal'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-fkvi-teal hover:text-fkvi-teal'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Hero */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-fkvi-teal mb-2">{t.eyebrow}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-fkvi-blue mb-3">{t.h1}</h1>
          <p className="text-gray-500 max-w-lg mx-auto">{t.lead}</p>
        </div>

        {/* ── Process steps ── */}
        <div className="h-px bg-gray-200 mb-8" />
        <SectionHead icon={Flag} title={t.s_process} />

        <p className="text-sm font-bold text-blue-600 mb-3">{t.phase1}</p>
        <div className="space-y-2 mb-6">
          {t.steps_p1.map((step, i) => (
            <div key={i} className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
              <span className="font-semibold text-blue-900 text-sm">{step.label}</span>
              <span className={`text-xs text-blue-500 ${t.dir === 'rtl' ? 'mr-auto' : 'ml-auto'} text-right shrink-0`}>{step.sub}</span>
            </div>
          ))}
        </div>

        <p className="text-sm font-bold text-fkvi-teal mb-3">{t.phase2}</p>
        <div className="space-y-2 mb-2">
          {t.steps_p2.map((step, i) => (
            <div key={i} className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-fkvi-teal text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 5}</div>
              <span className="font-semibold text-teal-900 text-sm">{step.label}</span>
              <span className={`text-xs text-teal-500 ${t.dir === 'rtl' ? 'mr-auto' : 'ml-auto'} text-right shrink-0`}>{step.sub}</span>
            </div>
          ))}
        </div>
        {/* Done step */}
        <div className="flex items-center gap-3 bg-emerald-600 border border-emerald-500 rounded-xl px-4 py-3">
          <div className="w-6 h-6 rounded-full bg-white text-emerald-600 text-xs font-bold flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="font-semibold text-white text-sm">{t.step_done}</span>
          <span className={`text-xs text-emerald-100 ${t.dir === 'rtl' ? 'mr-auto' : 'ml-auto'} shrink-0`}>{t.step_done_sub}</span>
        </div>

        {/* ── Grundsätze ── */}
        <div className="h-px bg-gray-200 mt-10 mb-2" />
        <SectionHead icon={ShieldCheck} title={t.s_grund} />
        <div className="bg-white border border-gray-100 rounded-2xl p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">{t.grund_p}</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {t.tags.map((tag, i) => (
              <span key={i} className="bg-teal-50 text-teal-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-teal-100">{tag}</span>
            ))}
          </div>
          <a
            href="/Grundsatzerklaerung_FKVI.pdf"
            download
            className="inline-flex items-center gap-2 text-fkvi-teal font-semibold text-sm hover:text-fkvi-teal/80 transition-colors"
          >
            <FileDown className="h-4 w-4" />
            {t.grund_dl}
          </a>
        </div>

        {/* ── Beschwerden ── */}
        <div className="h-px bg-gray-200 mt-10 mb-2" />
        <SectionHead icon={MessageSquare} title={t.s_besch} />
        <div className="bg-white border border-gray-100 rounded-2xl p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">{t.besch_p}</p>
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
            <span className="text-gray-400">✉</span>
            <a href="mailto:beschwerde@fachkraft-vermittlung.de" className="text-fkvi-teal hover:underline">beschwerde@fachkraft-vermittlung.de</a>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>{t.besch_ext}</span>
          </div>
        </div>

        {/* ── Broschüre ── */}
        <div className="h-px bg-gray-200 mt-10 mb-2" />
        <div className="bg-white border border-fkvi-teal/30 rounded-2xl p-6 mt-8" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <SectionHead icon={FileDown} title={t.s_bro} />
          <p className="text-gray-500 text-sm mb-5 leading-relaxed">{t.bro_p}</p>
          <a
            href={`/api/brochure/public-download?lang=${lang}`}
            className="w-full flex items-center justify-center gap-2 bg-fkvi-teal text-white font-bold text-sm py-3.5 px-6 rounded-xl hover:bg-fkvi-teal/90 transition-colors"
          >
            <FileDown className="h-4 w-4" />
            {t.bro_btn}
          </a>
          <p className="text-xs text-center text-gray-400 mt-3">{t.bro_note}</p>
        </div>

      </main>

      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 text-center text-xs text-gray-400">
        <span>© 2026 Fachkraft Vermittlung International GmbH &amp; Co. KG</span>
        <span className="mx-3">·</span>
        <Link to="/impressum" className="hover:text-gray-600 transition-colors">Impressum</Link>
        <span className="mx-3">·</span>
        <Link to="/datenschutzerklaerung" className="hover:text-gray-600 transition-colors">Datenschutzerklärung</Link>
        <span className="mx-3">·</span>
        <button onClick={openCookieSettings} className="hover:text-gray-600 transition-colors">Cookie-Einstellungen</button>
      </footer>
    </div>
  )
}
