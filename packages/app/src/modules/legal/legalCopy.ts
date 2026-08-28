import type { LandingLocaleId } from '../identity/landingI18n';
import { legalPageId } from './constants';

export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalPageCopy = {
  title: string;
  placeholder: boolean;
  intro?: string;
  sections?: LegalSection[];
  body?: string[];
  updated?: string;
  placeholderSubtitle?: string;
};

export type LegalPageKey = ReturnType<typeof legalPageId>;

export type LegalNavCopy = {
  legal: string;
  privacy: string;
  terms: string;
  openSource: string;
  cookieSettings: string;
};

const enPages: Record<LegalPageKey, LegalPageCopy> = {
  legal: {
    title: 'Legal Notice',
    placeholder: false,
    intro: 'Information according to Swiss law (Art. 3 para. 1 lit. s UWG)',
    sections: [
      {
        heading: 'Nexora Digital',
        paragraphs: ['Markus Schmeckenbecher', 'Schweiz / Switzerland / Suisse'],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'E-Mail: markus.schmeckenbecher@gmail.com',
          'Website: www.nexora-digital.ch',
        ],
      },
      {
        heading: 'Authorized Representatives',
        paragraphs: [
          'Markus Schmeckenbecher – Management & Head of Development',
          'Dominic Betz – Management & Head of Finance',
        ],
      },
      {
        heading: 'Disclaimer',
        paragraphs: [
          'The author assumes no liability for the correctness, accuracy, timeliness, reliability and completeness of the information. Liability claims against the author for damages of a material or immaterial nature arising from access to or use or non-use of the published information, through misuse of the connection or through technical malfunctions, are excluded.',
          'All offers are non-binding. The author expressly reserves the right to change, supplement, delete parts of the pages or the entire offer without prior notice, or to cease publication temporarily or permanently.',
        ],
      },
      {
        heading: 'Liability for Links',
        paragraphs: [
          "References and links to third-party websites are outside our area of responsibility. Any responsibility for such websites is rejected. Access to and use of such websites is at the user's own risk.",
        ],
      },
      {
        heading: 'Copyright',
        paragraphs: [
          'The copyright and all other rights to content, images, photos or other files on the website belong exclusively to Nexora Digital or the specifically named rights holders. Written consent of the copyright holders must be obtained in advance for the reproduction or use of any such materials.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    placeholder: false,
    sections: [
      {
        heading: '1. General',
        paragraphs: [
          'The protection of your personal data is of particular concern to us. We therefore process your data exclusively on the basis of legal provisions (Swiss DPA, GDPR). In this privacy policy, we inform you about the most important aspects of data processing on our website.',
        ],
      },
      {
        heading: '2. Responsible Entity',
        paragraphs: [
          'Nexora Digital',
          'Markus Schmeckenbecher',
          'Schweiz / Switzerland / Suisse',
          'E-Mail: markus.schmeckenbecher@gmail.com',
        ],
      },
      {
        heading: '3. Data Collection and Processing',
        paragraphs: [
          'When visiting our website, the following data is automatically stored in server log files:',
          'This data cannot be assigned to specific persons. This data is not merged with other data sources.',
        ],
        bullets: [
          'Browser type and version',
          'Operating system used',
          'Referrer URL (previously visited page)',
          'Hostname of the accessing computer',
          'Date and time of the server request',
          'IP address (anonymized)',
        ],
      },
      {
        heading: '4. Contact Form',
        paragraphs: [
          'When you send us inquiries via the contact form, your details from the form (name, email address, project type, budget and message) are stored for the purpose of processing the inquiry. We do not share this data without your consent.',
          'The processing of data entered into the contact form is based exclusively on your consent. You can revoke this consent at any time.',
        ],
      },
      {
        heading: '5. Cookies',
        paragraphs: [
          'Our website uses technically necessary cookies. These are small text files that your browser automatically creates and stores on your device.',
          'Most of the cookies we use are so-called session cookies. They are automatically deleted at the end of your visit.',
        ],
      },
      {
        heading: '6. Web Analytics',
        paragraphs: [
          'We use a privacy-friendly analytics tool that does not store personal data and does not set cookies.',
        ],
      },
      {
        heading: '7. Your Rights',
        paragraphs: [
          'You generally have the rights to information, correction, deletion, restriction, data portability and objection.',
        ],
      },
      {
        heading: '8. Data Security',
        paragraphs: [
          'We use the widespread SSL (Secure Socket Layer) method with the highest level of encryption supported by your browser.',
        ],
      },
      {
        heading: '9. Changes',
        paragraphs: [
          'We reserve the right to adapt this privacy policy at any time to ensure it always complies with current legal requirements.',
        ],
      },
    ],
    updated: 'Last updated: June 2026',
  },
  terms: {
    title: 'Terms',
    placeholder: true,
    placeholderSubtitle: 'Review placeholder · not final legal terms',
    body: [
      'REVIEW PLACEHOLDER — no counsel-approved terms of use are published yet.',
      'Do not treat this page as a binding customer agreement.',
    ],
  },
  openSource: {
    title: 'Open source',
    placeholder: true,
    placeholderSubtitle: 'Review placeholder · not final legal terms',
    body: [
      'REVIEW PLACEHOLDER — NOTICE and THIRD_PARTY_NOTICES text is not counsel-approved yet.',
      'Nexora is a commercial product. Backstage is the open-source framework (Apache-2.0). Apache-2.0 does not grant trademark rights in Backstage®.',
      'Required OSS attribution will be published here after counsel completes the Phase 0 gates. This page does not replace LICENSE or NOTICE files.',
    ],
  },
};

const dePages: Record<LegalPageKey, LegalPageCopy> = {
  legal: {
    title: 'Impressum / Legal Notice',
    placeholder: false,
    intro: 'Angaben gemäss Schweizer Recht (Art. 3 Abs. 1 lit. s UWG)',
    sections: [
      {
        heading: 'Nexora Digital',
        paragraphs: ['Markus Schmeckenbecher', 'Schweiz / Switzerland / Suisse'],
      },
      {
        heading: 'Kontakt',
        paragraphs: [
          'E-Mail: markus.schmeckenbecher@gmail.com',
          'Website: www.nexora-digital.ch',
        ],
      },
      {
        heading: 'Zeichnungsberechtigte',
        paragraphs: [
          'Markus Schmeckenbecher – Management & Head of Development',
          'Dominic Betz – Management & Head of Finance',
        ],
      },
      {
        heading: 'Haftungsausschluss',
        paragraphs: [
          'Der Autor übernimmt keine Gewähr für die Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen. Haftungsansprüche gegen den Autor wegen Schäden materieller oder immaterieller Art, die aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten Informationen, durch Missbrauch der Verbindung oder durch technische Störungen entstanden sind, werden ausgeschlossen.',
          'Alle Angebote sind unverbindlich. Der Autor behält sich ausdrücklich vor, Teile der Seiten oder das gesamte Angebot ohne vorherige Ankündigung zu verändern, zu ergänzen, zu löschen oder die Veröffentlichung zeitweise oder endgültig einzustellen.',
        ],
      },
      {
        heading: 'Haftung für Links',
        paragraphs: [
          'Verweise und Links auf Websites Dritter liegen ausserhalb unseres Verantwortungsbereichs. Jede Verantwortung für solche Websites wird abgelehnt. Der Zugriff und die Nutzung solcher Websites erfolgen auf eigene Gefahr des Nutzers.',
        ],
      },
      {
        heading: 'Urheberrecht',
        paragraphs: [
          'Das Urheberrecht und alle anderen Rechte an Inhalten, Bildern, Fotos oder sonstigen Dateien auf der Website gehören ausschliesslich Nexora Digital oder den speziell genannten Rechtsinhabern. Für die Reproduktion oder Nutzung solcher Materialien ist die vorgängige schriftliche Zustimmung der Rechtsinhaber einzuholen.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Datenschutzerklärung',
    placeholder: false,
    sections: [
      {
        heading: '1. Allgemeines',
        paragraphs: [
          'Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten daher ausschliesslich auf Grundlage der gesetzlichen Bestimmungen (Schweizer DSG, DSGVO). In dieser Datenschutzerklärung informieren wir Sie über die wichtigsten Aspekte der Datenverarbeitung auf unserer Website.',
        ],
      },
      {
        heading: '2. Verantwortliche Stelle',
        paragraphs: [
          'Nexora Digital',
          'Markus Schmeckenbecher',
          'Schweiz / Switzerland / Suisse',
          'E-Mail: markus.schmeckenbecher@gmail.com',
        ],
      },
      {
        heading: '3. Datenerhebung und -verarbeitung',
        paragraphs: [
          'Beim Besuch unserer Website werden automatisch folgende Daten in Server-Logfiles gespeichert:',
          'Diese Daten können keinen bestimmten Personen zugeordnet werden. Eine Zusammenführung mit anderen Datenquellen findet nicht statt.',
        ],
        bullets: [
          'Browsertyp und -version',
          'Verwendetes Betriebssystem',
          'Referrer-URL (zuvor besuchte Seite)',
          'Hostname des zugreifenden Rechners',
          'Datum und Uhrzeit der Serveranfrage',
          'IP-Adresse (anonymisiert)',
        ],
      },
      {
        heading: '4. Kontaktformular',
        paragraphs: [
          'Wenn Sie uns Anfragen über das Kontaktformular senden, werden Ihre Angaben aus dem Formular (Name, E-Mail-Adresse, Projekttyp, Budget und Nachricht) zum Zweck der Bearbeitung der Anfrage gespeichert. Wir geben diese Daten ohne Ihre Einwilligung nicht weiter.',
          'Die Verarbeitung der im Kontaktformular eingegebenen Daten erfolgt ausschliesslich auf Grundlage Ihrer Einwilligung. Sie können diese Einwilligung jederzeit widerrufen.',
        ],
      },
      {
        heading: '5. Cookies',
        paragraphs: [
          'Unsere Website verwendet technisch notwendige Cookies. Das sind kleine Textdateien, die Ihr Browser automatisch erstellt und auf Ihrem Gerät speichert.',
          'Die meisten von uns verwendeten Cookies sind sogenannte Session-Cookies. Sie werden am Ende Ihres Besuchs automatisch gelöscht.',
        ],
      },
      {
        heading: '6. Web-Analyse',
        paragraphs: [
          'Wir verwenden ein datenschutzfreundliches Analyse-Tool, das keine personenbezogenen Daten speichert und keine Cookies setzt.',
        ],
      },
      {
        heading: '7. Ihre Rechte',
        paragraphs: [
          'Sie haben grundsätzlich die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch.',
        ],
      },
      {
        heading: '8. Datensicherheit',
        paragraphs: [
          'Wir verwenden das verbreitete SSL-Verfahren (Secure Socket Layer) in der von Ihrem Browser unterstützten höchsten Verschlüsselungsstufe.',
        ],
      },
      {
        heading: '9. Änderungen',
        paragraphs: [
          'Wir behalten uns vor, diese Datenschutzerklärung jederzeit anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht.',
        ],
      },
    ],
    updated: 'Zuletzt aktualisiert: Juni 2026',
  },
  terms: {
    title: 'Nutzungsbedingungen',
    placeholder: true,
    placeholderSubtitle: 'Review-Placeholder · keine finalen rechtlichen Bedingungen',
    body: [
      'REVIEW PLACEHOLDER — es liegen noch keine counsel-freigegebenen Nutzungsbedingungen vor.',
      'Behandeln Sie diese Seite nicht als verbindliche Kundenvereinbarung.',
    ],
  },
  openSource: {
    title: 'Open Source',
    placeholder: true,
    placeholderSubtitle: 'Review-Placeholder · keine finalen rechtlichen Bedingungen',
    body: [
      'REVIEW PLACEHOLDER — NOTICE- und THIRD_PARTY_NOTICES-Text ist noch nicht counsel-freigegeben.',
      'Nexora ist ein kommerzielles Produkt. Backstage ist das Open-Source-Framework (Apache-2.0). Apache-2.0 gewährt keine Markenrechte an Backstage®.',
      'Erforderliche OSS-Attribution wird hier veröffentlicht, sobald Counsel die Phase-0-Gates abgeschlossen hat. Diese Seite ersetzt keine LICENSE- oder NOTICE-Dateien.',
    ],
  },
};

const enNav: LegalNavCopy = {
  legal: 'Legal Notice',
  privacy: 'Privacy Policy',
  terms: 'Terms',
  openSource: 'Open source',
  cookieSettings: 'Cookie settings',
};

const deNav: LegalNavCopy = {
  legal: 'Impressum',
  privacy: 'Datenschutzerklärung',
  terms: 'Nutzungsbedingungen',
  openSource: 'Open Source',
  cookieSettings: 'Cookie-Einstellungen',
};

export const legalPages: Record<LandingLocaleId, Record<LegalPageKey, LegalPageCopy>> = {
  en: enPages,
  de: dePages,
};

export const legalNavCopy: Record<LandingLocaleId, LegalNavCopy> = {
  en: enNav,
  de: deNav,
};
