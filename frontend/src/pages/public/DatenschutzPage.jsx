import { Link } from 'react-router-dom'

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
    </div>
  )
}

function SubSection({ title, children }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export default function DatenschutzPage() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10">Datenschutzerklärung</h1>

        <Section title="1. Datenschutz auf einen Blick">
          <SubSection title="Allgemeine Hinweise">
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.
            </p>
          </SubSection>
          <SubSection title="Datenerfassung auf unserer Website">
            <p>
              Die Datenerfassung auf dieser Website erfolgt zum einen durch Daten, die Sie uns mitteilen (z.B. Daten in einem Kontaktformular), und zum anderen durch Daten, die beim Besuch der Website automatisch durch unsere IT-Systeme erfasst werden (z.B. Browsertyp, Betriebssystem, Uhrzeit des Seitenaufrufs). Verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist der Websitebetreiber.
            </p>
          </SubSection>
          <SubSection title="Ihre Rechte">
            <p>
              Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit an uns wenden.
            </p>
          </SubSection>
          <SubSection title="Analyse-Tools und Drittanbieter-Tools">
            <p>
              Beim Besuch unserer Website kann Ihr Surf-Verhalten statistisch ausgewertet werden. Das geschieht vor allem mit Cookies und mit sogenannten Analyseprogrammen. Die Analyse Ihres Surf-Verhaltens erfolgt in der Regel anonym; das Surf-Verhalten kann nicht zu Ihnen zurückverfolgt werden.
            </p>
          </SubSection>
        </Section>

        <Section title="2. Allgemeine Hinweise und Pflichtinformationen">
          <SubSection title="Datenschutz">
            <p>
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
            </p>
            <p>
              Wir weisen darauf hin, dass die Datenübertragung im Internet (z.B. bei der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht möglich.
            </p>
          </SubSection>
          <SubSection title="Hinweis zur verantwortlichen Stelle">
            <p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
            <p className="font-medium text-gray-800">
              Fachkraft Vermittlung International GmbH und Co. KG<br />
              Ammelburgstraße 34<br />
              60320 Frankfurt am Main
            </p>
            <p>
              Telefon: <a href="tel:+491605562142" className="text-teal-600 hover:underline">+49 160 5562142</a><br />
              E-Mail: <a href="mailto:info@fachkraft-vermittlung.de" className="text-teal-600 hover:underline">info@fachkraft-vermittlung.de</a>
            </p>
          </SubSection>
          <SubSection title="Widerruf Ihrer Einwilligung zur Datenverarbeitung">
            <p>
              Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Dazu reicht eine formlose Mitteilung per E-Mail an uns. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
            </p>
          </SubSection>
          <SubSection title="Beschwerderecht bei der zuständigen Aufsichtsbehörde">
            <p>
              Im Falle datenschutzrechtlicher Verstöße steht dem Betroffenen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu. Zuständige Aufsichtsbehörde in datenschutzrechtlichen Fragen ist der Landesdatenschutzbeauftragte des Bundeslandes, in dem unser Unternehmen seinen Sitz hat.
            </p>
          </SubSection>
          <SubSection title="Recht auf Datenübertragbarkeit">
            <p>
              Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen, maschinenlesbaren Format aushändigen zu lassen.
            </p>
          </SubSection>
          <SubSection title="SSL- bzw. TLS-Verschlüsselung">
            <p>
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL-bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://" auf „https://" wechselt.
            </p>
          </SubSection>
          <SubSection title="Auskunft, Sperrung, Löschung">
            <p>
              Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit unter der im Impressum angegebenen Adresse an uns wenden.
            </p>
          </SubSection>
          <SubSection title="Widerspruch gegen Werbe-Mails">
            <p>
              Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten zur Übersendung von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien wird hiermit widersprochen. Die Betreiber der Seiten behalten sich ausdrücklich rechtliche Schritte im Falle der unverlangten Zusendung von Werbeinformationen, etwa durch Spam-E-Mails, vor.
            </p>
          </SubSection>
        </Section>

        <Section title="3. Datenerfassung auf unserer Website">
          <SubSection title="Server-Log-Dateien">
            <p>
              Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Browsertyp und Browserversion</li>
              <li>Verwendetes Betriebssystem</li>
              <li>Referrer URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse</li>
            </ul>
            <p>
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen. Grundlage für die Datenverarbeitung ist Art. 6 Abs. 1 lit. f DSGVO.
            </p>
          </SubSection>
          <SubSection title="Kontaktformular">
            <p>
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter. Die Verarbeitung der in das Kontaktformular eingegebenen Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO. Sie können diese Einwilligung jederzeit widerrufen.
            </p>
          </SubSection>
          <SubSection title="Newsletter (GetResponse)">
            <p>
              Unser Newsletter-Versand erfolgt über GetResponse, ein E-Mail-Marketing-Tool der GetResponse Sp. z o.o., Arkonska 6, 80-387 Gdansk, Polen. Der Anbieter ermöglicht die Analyse des Verhaltens der Newsletter-Empfänger, z.B. ob der Newsletter geöffnet und welche Links geklickt wurden.
            </p>
          </SubSection>
        </Section>

        <Section title="4. Analyse-Tools und Werbung">
          <SubSection title="Google Analytics">
            <p>
              Diese Website nutzt Funktionen des Webanalysedienstes Google Analytics. Anbieter ist die Google Inc., 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA. Google Analytics verwendet so genannte „Cookies". Die durch den Cookie erzeugten Informationen über Ihre Benutzung dieser Website werden in der Regel an einen Server von Google in den USA übertragen und dort gespeichert.
            </p>
            <p>
              Wir haben auf dieser Website die Funktion IP-Anonymisierung aktiviert. Dadurch wird Ihre IP-Adresse von Google innerhalb von Mitgliedstaaten der Europäischen Union oder in anderen Vertragsstaaten des Abkommens über den Europäischen Wirtschaftsraum vor der Übermittlung in die USA gekürzt.
            </p>
            <p>
              Sie können die Speicherung der Cookies durch eine entsprechende Einstellung Ihrer Browser-Software verhindern. Wir weisen Sie jedoch darauf hin, dass Sie in diesem Fall gegebenenfalls nicht sämtliche Funktionen dieser Website vollumfänglich nutzen können.
            </p>
          </SubSection>
          <SubSection title="Google Web Fonts">
            <p>
              Diese Seite nutzt zur einheitlichen Darstellung von Schriftarten so genannte Web Fonts, die von Google bereitgestellt werden. Beim Aufruf einer Seite lädt Ihr Browser die benötigten Web Fonts in ihren Browsercache, um Texte und Schriftarten korrekt anzuzeigen. Die Nutzung von Google Web Fonts erfolgt im Interesse einer einheitlichen und ansprechenden Darstellung unserer Online-Angebote. Dies stellt ein berechtigtes Interesse im Sinne von Art. 6 Abs. 1 lit. f DSGVO dar.
            </p>
          </SubSection>
          <SubSection title="Google Maps">
            <p>
              Diese Seite nutzt über eine API den Kartendienst Google Maps. Anbieter ist die Google Inc., 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA. Zur Nutzung der Funktionen von Google Maps ist es notwendig, Ihre IP-Adresse zu speichern. Diese Informationen werden in der Regel an einen Server von Google in den USA übertragen und dort gespeichert.
            </p>
          </SubSection>
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
