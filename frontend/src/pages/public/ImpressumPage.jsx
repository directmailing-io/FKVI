import { Link } from 'react-router-dom'

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="FKVI" className="h-[52px] w-auto" />
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Zurück zur Startseite</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-600 mb-3">Rechtliches</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10">Impressum</h1>

        <Section title="Angaben gemäß § 5 TMG">
          <p className="font-semibold text-gray-900">Fachkraft Vermittlung International GmbH und Co. KG</p>
          <p>Ammelburgstraße 34<br />60320 Frankfurt am Main</p>
        </Section>

        <Section title="Handelsregister">
          <p>Amtsgericht Frankfurt am Main</p>
          <p>HRB 136097 (GmbH als Komplementärin)<br />HRA 53930 (Kommanditgesellschaft)</p>
        </Section>

        <Section title="Geschäftsführung">
          <p>Samir Ouattaleb<br />Wahib Akhouaji</p>
        </Section>

        <Section title="Kontakt">
          <p>
            Telefon: <a href="tel:+4961958069442" className="text-teal-600 hover:underline">+49 6195 – 8069442</a>
          </p>
          <p>
            Mobil: <a href="tel:+491605562142" className="text-teal-600 hover:underline">+49 160 5562142</a>
          </p>
          <p>
            E-Mail: <a href="mailto:info@fachkraft-vermittlung.de" className="text-teal-600 hover:underline">info@fachkraft-vermittlung.de</a>
          </p>
        </Section>

        <Section title="Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV">
          <p>Samir Ouattaleb<br />Ammelburgstraße 34<br />60320 Frankfurt am Main</p>
        </Section>

        <Section title="Haftung für Inhalte">
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </p>
          <p>
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
          </p>
        </Section>

        <Section title="Haftung für Links">
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
          </p>
          <p>
            Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
          </p>
        </Section>

        <Section title="Urheberrecht">
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
          </p>
        </Section>

        <Section title="Hinweis zu Kundenstimmen">
          <p>
            Die auf dieser Website dargestellten Kundenstimmen und Erfahrungsberichte wurden von echten Kunden verfasst und ohne Vergütung bereitgestellt. Individuelle Ergebnisse können variieren.
          </p>
        </Section>
      </main>

      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 text-center text-xs text-gray-400">
        <span>© 2026 Fachkraft Vermittlung International GmbH &amp; Co. KG</span>
        <span className="mx-3">·</span>
        <Link to="/impressum" className="hover:text-gray-600 transition-colors">Impressum</Link>
        <span className="mx-3">·</span>
        <Link to="/datenschutzerklaerung" className="hover:text-gray-600 transition-colors">Datenschutzerklärung</Link>
      </footer>
    </div>
  )
}
