import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { openCookieSettings } from '@/lib/cookieConsent'

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Datenschutzerklärung | FKVI – Fachkraft Vermittlung International</title>
        <meta name="description" content="Datenschutzerklärung der Fachkraft Vermittlung International GmbH & Co. KG gemäß DSGVO." />
        <link rel="canonical" href="https://fachkraft-vermittlung.de/datenschutzerklaerung" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="FKVI – Fachkraft Vermittlung International" className="h-16 w-auto" />
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Zurück zur Startseite</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 pb-20">
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-600 mb-3">Rechtliches</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">Datenschutzerklärung</h1>
        <p className="text-sm text-gray-400 mb-10">FKVI – Fachkraft Vermittlung International GmbH &amp; Co. KG · Stand: Juni 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">1. Verantwortlicher</h2>
            <p>Verantwortliche Stelle im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
            <p className="mt-3 bg-gray-50 rounded-xl p-4 text-sm font-medium text-gray-800">
              Fachkraft Vermittlung International GmbH &amp; Co. KG<br />
              Friedrich-Ebert-Anlage 35–37<br />
              60327 Frankfurt am Main<br /><br />
              Telefon: <a href="tel:+496980884364" className="text-teal-600 hover:underline">+49 69 8088 4364</a><br />
              E-Mail: <a href="mailto:office@fachkraft-vermittlung.de" className="text-teal-600 hover:underline">office@fachkraft-vermittlung.de</a>
            </p>
            <p className="mt-3 text-sm">
              Ein gesetzlich vorgeschriebener Datenschutzbeauftragter ist derzeit nicht bestellt. Bei datenschutzrechtlichen
              Anliegen wenden Sie sich bitte an die oben genannte Adresse.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">2. Welche Daten wir verarbeiten</h2>
            <p>Je nach Art Ihrer Nutzung verarbeiten wir folgende Kategorien personenbezogener Daten:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 mt-3 text-sm">
              <li>Stammdaten: Vorname, Nachname, Geburtsdatum, Geburtsort, Staatsangehörigkeit</li>
              <li>Kontaktdaten: Anschrift, Telefonnummer, E-Mail-Adresse</li>
              <li>Qualifikationsdaten: Berufsabschlüsse, Sprachkenntnisse, Berufserfahrung</li>
              <li>Identitäts- und Nachweisdokumente (z.&nbsp;B. Reisepass, Zeugnisse), soweit für Anerkennung und Vermittlung erforderlich</li>
              <li>Vermittlungsstatus und Verfahrensdaten</li>
              <li>Technische Zugriffsdaten beim Besuch unserer Website (Server-Logdaten)</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">3. Zwecke und Rechtsgrundlagen</h2>
            <p>Wir verarbeiten personenbezogene Daten auf folgenden Rechtsgrundlagen gemäß Art.&nbsp;6 DSGVO:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 mt-3 text-sm">
              <li>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a – Einwilligung (z.&nbsp;B. Anforderung der Informationsbroschüre)</li>
              <li>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b – Erfüllung eines Vertrags oder vorvertragliche Maßnahmen (Bewerberprofile, Vermittlungsleistungen)</li>
              <li>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;c – Erfüllung rechtlicher Verpflichtungen (z.&nbsp;B. im Verwaltungsverfahren, Aufbewahrungspflichten)</li>
              <li>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f – Berechtigte Interessen (z.&nbsp;B. IT-Sicherheit)</li>
            </ul>
            <p className="mt-3 text-sm">
              Soweit wir besondere Kategorien personenbezogener Daten verarbeiten (z.&nbsp;B. Gesundheitsdaten, sofern für
              eine Stelle relevant), erfolgt dies auf Grundlage von Art.&nbsp;9 Abs.&nbsp;2 lit.&nbsp;b DSGVO.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">4. Verarbeitung im Rahmen der Vermittlung</h2>
            <p className="text-sm">
              Im Rahmen unserer Personalvermittlung verarbeiten wir die unter Ziffer&nbsp;2 genannten Daten, um die
              Vermittlung anzubahnen und durchzuführen. Ohne diese Daten können wir unsere Dienstleistung nicht erbringen.
              Ihre Daten werden in eigenen sowie in beauftragten, DSGVO-konformen IT-Systemen innerhalb der EU verarbeitet.
              Rechtsgrundlage: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO.
            </p>
            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">Informationsbroschüre</h3>
            <p className="text-sm">
              Interessierte Fachkräfte können eine Informationsbroschüre anfordern. Dabei verarbeiten wir Vorname, Nachname,
              E-Mail-Adresse, Telefonnummer und die bevorzugte Sprache, um Ihnen die Broschüre sowie weitere Informationen
              zuzusenden. Rechtsgrundlage: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO (Einwilligung durch aktive Anforderung).
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">5. Weitergabe Ihrer Daten</h2>
            <p className="text-sm">Im Rahmen der Vermittlung geben wir die jeweils erforderlichen Daten an folgende Empfänger weiter:</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><strong>Potenzielle Arbeitgeber</strong> – nach Ihrer Zustimmung zu einer konkreten Bewerbung. Die Arbeitgeber sind ihrerseits zur DSGVO-konformen Verarbeitung verpflichtet.</li>
              <li><strong>Zuständige Behörden</strong> – insbesondere Ausländerbehörden, die Bundesagentur für Arbeit sowie Anerkennungsstellen, im Rahmen des Anerkennungs- und Einreiseverfahrens für ausländische Fachkräfte, auf Grundlage einer von Ihnen erteilten Vollmacht (§&nbsp;81a AufenthG).</li>
            </ul>
            <p className="mt-3 text-sm">
              Bei der Vertretung gegenüber Behörden bevollmächtigt die Fachkraft den Arbeitgeber, der wiederum FKVI
              (mit Unterbevollmächtigung einer benannten Mitarbeiterin) zur Vertretung bevollmächtigt. Rechtsgrundlage:
              Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b und lit.&nbsp;c DSGVO.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">6. Speicherdauer</h2>
            <p className="text-sm">
              Wir speichern Ihre Daten für die Dauer des Vermittlungsprozesses und löschen sie anschließend unter Beachtung
              gesetzlicher Aufbewahrungsfristen (in der Regel 6–10 Jahre nach handels- und steuerrechtlichen Vorgaben).
              Auf Wunsch löschen wir früher, soweit keine Aufbewahrungspflicht entgegensteht. Server-Logdaten werden nach
              spätestens 30 Tagen gelöscht.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">7. Hosting und Auftragsverarbeiter</h2>
            <p className="text-sm">
              Unsere Website und die zugehörigen Systeme werden auf Servern in Deutschland bzw. der EU betrieben. Mit allen
              Auftragsverarbeitern bestehen Verträge gemäß Art.&nbsp;28 DSGVO. Soweit Daten in Drittländer (z.&nbsp;B. USA)
              übertragen werden, erfolgt dies auf Grundlage von Standardvertragsklauseln (Art.&nbsp;46 Abs.&nbsp;2 lit.&nbsp;c DSGVO).
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-fkvi-blue text-white">
                    <th className="text-left p-3 font-semibold rounded-tl-lg">Dienstleister</th>
                    <th className="text-left p-3 font-semibold">Zweck</th>
                    <th className="text-left p-3 font-semibold rounded-tr-lg">Sitz / Transfer</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-gray-200">Hetzner Online GmbH</td>
                    <td className="p-3 border border-gray-200">Hosting, Server, Datenbank</td>
                    <td className="p-3 border border-gray-200">Deutschland (EU)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-3 border border-gray-200">Strato AG</td>
                    <td className="p-3 border border-gray-200">E-Mail-Postfach, Domains</td>
                    <td className="p-3 border border-gray-200">Deutschland (EU)</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-gray-200">Google Ireland Ltd.</td>
                    <td className="p-3 border border-gray-200">Datenverarbeitung und -ablage im Vermittlungsprozess</td>
                    <td className="p-3 border border-gray-200">Irland / USA (SCCs)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">8. Server-Logdaten</h2>
            <p className="text-sm">
              Beim Aufruf unserer Website werden automatisch technische Daten in Server-Logdateien gespeichert (u.&nbsp;a.
              IP-Adresse, Datum/Uhrzeit, aufgerufene Seite, Browsertyp). Diese Daten dienen ausschließlich dem sicheren
              Betrieb und der Fehlerdiagnose, werden nicht mit anderen Daten zusammengeführt und nach spätestens 30 Tagen
              gelöscht. Rechtsgrundlage: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">9. Cookies</h2>
            <p className="text-sm">
              Wir setzen technisch notwendige Cookies bzw. lokalen Speicher ein, um grundlegende Funktionen der Website
              (z.&nbsp;B. Sitzungsverwaltung, Speicherung Ihrer Cookie-Einstellungen) bereitzustellen. Tracking- oder
              Marketing-Cookies setzen wir nicht ein. Ihre Cookie-Einstellungen können Sie jederzeit über den{' '}
              <button onClick={openCookieSettings} className="text-teal-600 hover:underline font-medium">Cookie-Einstellungen-Dialog</button>{' '}
              ändern. Rechtsgrundlage: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO; für optionale Cookies Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">10. Ihre Rechte</h2>
            <p className="text-sm">
              Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
              und Widerspruch sowie das Recht, eine erteilte Einwilligung jederzeit mit Wirkung für die Zukunft zu widerrufen.
              Wenden Sie sich hierfür an{' '}
              <a href="mailto:office@fachkraft-vermittlung.de" className="text-teal-600 hover:underline">office@fachkraft-vermittlung.de</a>.
            </p>
            <p className="mt-3 text-sm">Außerdem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Für uns zuständig ist:</p>
            <p className="mt-3 bg-gray-50 rounded-xl p-4 text-sm font-medium text-gray-800">
              Der Hessische Beauftragte für Datenschutz und Informationsfreiheit (HBDI)<br />
              Postfach 3163, 65021 Wiesbaden<br />
              Telefon: +49 611 1408-0<br />
              E-Mail: <a href="mailto:poststelle@datenschutz.hessen.de" className="text-teal-600 hover:underline">poststelle@datenschutz.hessen.de</a>
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">11. Keine automatisierte Entscheidungsfindung</h2>
            <p className="text-sm">
              Eine ausschließlich automatisierte Entscheidungsfindung einschließlich Profiling im Sinne des Art.&nbsp;22 DSGVO
              findet nicht statt. Alle Vermittlungsentscheidungen werden durch unsere Mitarbeiterinnen und Mitarbeiter getroffen.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-bold text-fkvi-blue mb-3">12. Änderungen dieser Datenschutzerklärung</h2>
            <p className="text-sm">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, wenn sich rechtliche Anforderungen ändern oder wir
              neue Dienste einführen. Die jeweils aktuelle Version ist auf dieser Seite abrufbar. Stand: Juni&nbsp;2026.
            </p>
          </section>

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
