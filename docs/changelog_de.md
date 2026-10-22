# Changelog

Alle Änderungen jeder Version von **HA Style Hub** (bis 1.1.6 hieß das Projekt
*Sidebar Hub*), die neueste zuerst. Die Einträge sind ausführlich; die
englische Fassung steht in [changelog.md](changelog.md).

Die Versionsnummern zählen bis `.9` und springen dann auf die nächste
Nebenversion (1.2.9 → 1.3.0 → 1.3.1 → 1.3.2 → 1.3.3 → 1.3.4 → 1.3.5 → 1.3.6 →
1.3.7 → 1.3.8 → 1.3.9 → 1.4.0 → 1.4.1 → 1.4.2 → 1.4.3 → 1.4.4 → 1.4.5 →
1.4.6 → 1.4.7 → 1.4.8 → 1.4.9 → 1.5.0 → 1.5.1 → 1.5.2 → 1.5.3 → 1.5.4 → 1.5.5 → 1.5.6).

## 1.5.6

* **Kopfzeile unten.** Neues Feld *Position der Kopfzeile* (*Oben* /
  *Unten*) am Ende der Seite Header, Schlüssel `header.position`
  (`"top"` / `"bottom"`, alles andere wird in `store.py` zu `"top"`). Bei
  *Unten* setzt der Injector `.header` von `hui-root` an den unteren Rand
  (`position: fixed; bottom: 0`, Sicherheitsabstand unten), und
  `hui-view-container` hält seinen Abstand von `--header-height` unten statt
  oben; die Linie von `--app-header-border-bottom` wandert nach oben und der
  Schatten beim Scrollen zeigt nach oben. Alle Regeln hängen an `:host >
  div:not(.edit-mode)`, deshalb behält der Bearbeitungsmodus die Werkzeugleiste
  von Home Assistant oben. Vorlagen und Import behalten die Position wie
  *ausgeblendet*; die Vorschau der Seite Header zeigt die Leiste unten.
* **Neustart-Dialog im Look des Themes.** Der Neustart-Eintrag der Sidebar und
  der Neustart-Button der Kopfzeile nutzen nicht mehr das kleine Fenster des
  Browsers (`window.confirm`). Ein Dialog im Stil der PopUps (Kartenhintergrund,
  Ecken und Primärfarbe des Themes bzw. die Icon-Farbe des Neustart-Eintrags)
  erklärt, was passiert, und prüft die Konfiguration, sobald er sich öffnet –
  mit derselben Anfrage wie *Konfiguration prüfen*
  (`POST /api/config/core/check_config`):
  * *Prüfung läuft* – Spinner, *Neustart* gesperrt;
  * *gültig* – grüne Meldung, *Neustart* ruft `homeassistant.restart` auf;
  * *ungültig* – rote Meldung mit den Fehlern (und Warnungen) als Text,
    *Neustart* bleibt gesperrt (Home Assistant würde den Neustart ohnehin
    verweigern), *Erneut prüfen* wiederholt die Prüfung nach einer Korrektur;
  * *Prüfung nicht möglich* (z. B. die Integration `config` ist nicht geladen) –
    ein Hinweis, ein Neustart ist trotzdem möglich.

  *Abbrechen*, das X, Escape und ein Klick daneben schließen ihn; *Abbrechen*
  hat den Fokus, damit Enter nicht versehentlich neu startet. Verweigert Home
  Assistant den Neustart, erscheint dessen Meldung im Dialog.

## 1.5.5

* **Vorschau der Seite einer Integration.** Auf der Seite HA-Settings, Bereich
  *Geräte & Dienste*, erscheint unter der Liste ein Modell einer
  Integrationsseite, solange *Listenansicht verwenden* und *Auch die Seite
  einer Integration gestalten* an sind: der Abschnitt *Aufmerksamkeit
  erforderlich* mit einem Eintrag mit Einrichtungsfehler (zwei Geräte) und
  einem nicht geladenen, dann ein normaler Hub. Sie übernimmt dieselben Werte
  wie Home Assistant: Rahmenbreite, Ecken, Rahmen- und Problemfarbe,
  Zeilenhintergrund, Abstand, Zeilenhöhe der Integrationsseite sowie die
  Hintergründe für Fehler / nicht geladen mit ihrer Deckkraft. Sie ist so
  breit wie die Liste darüber. Ein Klick darauf öffnet die Felder der Liste.
* **Eigenes Icon für einen Menüpunkt der Einstellungsseite.** Der Stift unter
  *Reihenfolge und Sichtbarkeit* hat ein Feld **Icon** mit der Icon-Auswahl von
  Home Assistant (`settings.menu_items[path].icon`, in `store.py` als Icon-Name
  geprüft). Auf der Seite tritt ein `<ha-icon>` an die Stelle des Symbols von
  Home Assistant, mit gleicher Größe und gleichem Abstand; Größen und Farben der
  Icon-Boxen gelten auch dafür.
* **Eigene Links der Sidebar** bekommen eine echte Adresse (`href`): ein
  Rechtsklick bietet *Link in neuem Tab öffnen*; ein normaler Klick wechselt
  weiterhin die Seite ohne Neuladen.

## 1.5.4

* **Sensoren in der Kopfzeile.** Der Dialog hinter dem Plus von *Links* (Header →
  *Buttons rechte Seite*) hat die Auswahl *Seite* / *Sensor / Entität*. Ein
  Sensor wird als `{"path": "", "entity": "sensor.x", name, icon, color}` in
  `header.links` gespeichert (in `store.py` geprüft, jede Entität nur einmal;
  Favoriten und PopUps nehmen keine Entitäten). In Home Assistant ist er ein
  pillenförmiger Button mit Icon (eigenes oder `ha-state-icon` der Entität) und
  dem Wert aus `hass.formatEntityState`. Er wird aktualisiert, wenn Home
  Assistant eine Änderung meldet (`subscribe_entities` genau für diese
  Entitäten; ohne das alle 30 s), ohne den Observer der Kopfzeile anzustoßen;
  ein Klick löst `hass-more-info` aus. Pro Sensor: `color` (Icon),
  `value_color` (Wert, leer = Icon-Farbe) und `value_only`; die Zeile eines
  Sensors klappt wie ein Favorit auf. Die Vorschau der Kopfzeile zeigt Wert und
  Farben ebenfalls.
* Die Link-Listen (Kopfzeile, Favoriten) bekommen die Icon-Auswahl von Home
  Assistant auch dann, wenn diese erst nach der Seite geladen wird.
* **Tooltips in der eingeklappten Sidebar.** Eigene Links, PopUps und der
  Neustart-Eintrag bekommen ein `<ha-tooltip for="…" placement="right">` mit
  ihrem Namen, wie die Einträge von Home Assistant – nur solange Home
  Assistant selbst Tooltips zeigt (eingeklappt, nicht auf dem Handy).
* **Einstellungsseite:** Systemmonitor, Backup- und Zählerbox nutzen den
  Kartenschatten des Themes (`--ha-card-box-shadow`).
* **Seite einer Integration:** eigene Hintergründe für Einträge mit Fehler
  (`.state-error`) und für nicht geladen / Entladen fehlgeschlagen
  (`settings.list_error_background`, `settings.list_warning_background`) mit
  einer gemeinsamen Deckkraft (`settings.list_problem_opacity`).

## 1.5.3

* **Eine Lovelace-Karte im PopUp.** Ein PopUp zeigt entweder Links oder eine
  Karte – gewählt unter *Inhalt des Fensters* im Dialog *PopUp Link* und am
  Eintrag. Die Karte wird als YAML eingefügt (der Code-Editor einer
  Dashboard-Karte) und doppelt gespeichert: wie getippt (`card_yaml`, zum
  Bearbeiten) und als Konfiguration (`card`, für Home Assistant), jeweils
  höchstens 50 KB (im Panel und in `store.py` geprüft). Das YAML liest der
  eigene Parser von Home Assistant (`homeassistant.util.yaml`) über den neuen
  Websocket-Befehl `ha_style_hub/card_yaml` – während des Tippens (nach einer
  kurzen Pause) und noch einmal beim Speichern; Fehler kommen mit ihrer Zeile.
  Tags (`!include`, `!secret`, ...) und Verweise (`*name`) werden abgelehnt –
  ein Include könnte Dateien des Konfigurationsordners in eine Karte lesen, die
  jeder Benutzer sieht. In Home Assistant wird die Karte mit
  `loadCardHelpers().createCardElement` gebaut, bekommt jedes neue `hass`,
  solange das Fenster offen ist, und Custom Cards, die noch nicht geladen sind,
  erhalten zuerst die Dashboard-Ressourcen (`lovelace/resources`). Das Fenster
  sitzt jetzt innerhalb von `home-assistant`, damit Ereignisse der Karte
  (More-Info, Aktionen) bei Home Assistant ankommen; ein More-Info-Dialog
  schließt das PopUp.
* **Fenstergröße** pro PopUp: Breite und Höhe in px (0 = automatisch, höchstens
  4000); die automatische Höhe folgt dem Inhalt bis zu 85 % des Bildschirms,
  eine feste Höhe (höchstens der Bildschirm) füllt die Karte aus (`ha-card` mit
  100 % Höhe). Keine Scrollleiste im Fenster, Scrollen funktioniert weiterhin.
* Die Vorschau der Seite Sidebar zeigt die echte Karte und die Größe.

## 1.5.2

* **PopUp-Fenster:** Die Kacheln füllen jede Reihe – am Computer bis zu vier
  pro Reihe, die Reihen so gleichmäßig wie möglich (5 → 3 + 2, 7 → 4 + 3), auf
  dem Handy (unter 600 px) zwei pro Reihe; eine kürzere letzte Reihe wird durch
  breitere Kacheln aufgefüllt. Die Vorschau der Seite Sidebar nutzt dieselbe
  Regel.
* **Wie das PopUp bedient wird,** steht im Dialog *PopUp Link* und unter den
  Links des Eintrags: Klick, Strg-/⌘-Klick oder mittlere Maustaste für einen
  neuen Tab, `Esc`, Kreuz oder ein Klick daneben schließt das Fenster.
* **Seite Sidebar:** Das Dashboard neben der Seitenleiste zeigt vorgeschlagene
  Karten wie die Seite Header (Licht, Klima, Energie, Verlauf, Medien); ein
  Klick darauf führt weiterhin auf die Seite Theme.

## 1.5.1

* **PopUp-Links in der Sidebar.** Das Plus unter *Sidebar → Einträge* heißt
  jetzt *Überschrift, Link, PopUp*; sein Dialog hat einen dritten Teil *PopUp
  Link*: ein Name und einzeln ausgewählte Seiten (zuerst Dashboards und Seiten
  der Seitenleiste, dann die Seiten von Home Assistant oder ein eigener Pfad).
  Das PopUp wird als `items["popup:<id>"]` mit `links: [{path, name, icon}]`
  gespeichert (höchstens 24, wie die Links der Kopfzeile geprüft) und ist ein
  Eintrag in der Sidebar; ein Klick öffnet ein Fenster mit den Seiten als
  Kacheln (`<body>` > `.sh-popup-host` mit eigenem Shadow Root, Farben aus dem
  Theme). Es schließt mit dem Kreuz, einem Klick daneben, `Esc`, einem
  Seitenwechsel oder der Wahl einer Seite. Unter *Einträge* hat das PopUp die
  Felder eines Links plus seine Link-Liste (umbenennen, Icon, verschieben,
  hinzufügen, entfernen); die Vorschau der Seite Sidebar zeigt das Fenster,
  solange das PopUp ausgewählt ist.
* **Schnellfarben:** *Transparent* wird immer angeboten (*Ohne Farbe*).

## 1.5.0

* **Jedes Element der Theme-Vorschau lässt sich anklicken.** Was 1.4.9 für die
  Kachel *Bedienelemente* brachte, gilt jetzt in allen Kacheln: Kartentitel,
  Icons an / aus, Schalter, Badge, Regler, Chips, jede Zustandsfarbe (Geräte,
  Klima, Sicherheit, Wetter), Tabellenkopf und Zeilen, Eingabefeld und
  Dropdown, die vier Statusfarben, der Bereich hinter dem Dialog, der Dialog,
  der Code-Editor und jede Farbe im Code, Scrollbalken und Buttons,
  Überschrift, Fließtext, kleiner Text, Link und Inline-Code, Diagrammlinien,
  Verlaufslinie, die 54 Diagrammfarben, Energie-Balken und Legende. Alle
  Gruppen mit den Variablen des Elements öffnen sich und die Felder werden
  markiert; die Kachel zeigt den Namen des Elements. Umrandet wird nur das
  innerste Element unter der Maus.
* **Info-Seite.** Die Texte der vier Bereiche (Sidebar, Theme, Header,
  HA-Settings) beschreiben wieder alle Funktionen, auch die aus 1.4.x.
* **Behoben: Fehler des Backup-Buttons.** Seit 1.4.8 benutzten zwei Texte
  denselben Schlüssel, deshalb zeigte ein fehlgeschlagener Start *„Failed::“* –
  und die Meldung wurde sofort gelöscht. Jetzt bleibt *„Das Backup konnte nicht
  gestartet werden: …“* bis zum nächsten Versuch stehen; ein laufendes Backup
  wird nach einem Seitenwechsel wieder angezeigt.
* **Aufräumen.** 67 Texte und 33 CSS-Regeln der alten Vorschau (vor 1.4.0), die
  nichts mehr benutzte, ungenutzte Schlüssel-Konstanten in `const.py` und
  Kommentare, die nicht mehr neben ihrem Code standen.

## 1.4.9

* **Menü-Vorschau mit Untertiteln.** Die Menüpunkte in der Vorschau der
  Einstellungsseite zeigen ihre zweite Zeile wie in Home Assistant;
  *Untertitel ausblenden* entfernt sie dort ebenfalls. Der Injector merkt sich
  die echten Untertitel deiner Seite (bis dahin die englischen Texte des
  Frontends oder eine deutsche Übersetzung).
* **Nur eigene Entitäten anzeigen** (`settings.monitor_sensors_only`) unter
  *Eigene Werte* des Systemmonitors: Prozessor, Arbeitsspeicher und Speicher
  verschwinden, die Hardware-Werte werden nicht mehr abgerufen. Ohne eigene
  Werte ändert sich nichts.
* **Zeilenhöhe auf der Integrationsseite** (`settings.list_entries_row_height`,
  0 = wie Home Assistant, 32–120 px) unter *Auch die Seite einer Integration
  gestalten*; sie setzt `--ha-row-item-min-height` und
  `--ha-row-item-padding-block` für die Einträge, Geräte und Untereinträge.
* **Bedienelemente einzeln.** Jedes Element in der Kachel *Bedienelemente* der
  Theme-Vorschau lässt sich anklicken: Alle Gruppen mit seinen Variablen öffnen
  sich auf einmal (auch bei eingeschaltetem Akkordeon) und die Felder werden
  markiert.
* **Strg+Z / Cmd+Z** geht einen Schritt zurück, **Strg+Y** oder
  **Strg+Umschalt+Z** wieder einen vor; auch *Verwerfen* lässt sich
  zurücknehmen.
* **Button „Seite Sidebar“** auf den Seiten Theme und Header in die Vorschau
  verschoben (unten links, Pfeil nach links); auf HA-Settings entfällt er – ein
  Klick auf die Sidebar in der Vorschau führt weiterhin dorthin.
* Der Hinweis der Seite Header nennt die Theme-Farben der Kopfzeile statt „nur
  drei Theme-Variablen“.

## 1.4.8

* **Ungespeicherte Änderungen als Liste.** Ein Klick auf *n ungespeichert* oben
  öffnet einen Dialog mit jeder Änderung, Feld für Feld und nach Seiten
  gruppiert: Name und Ort des Feldes, alter → neuer Wert (Farben mit Farbfeld).
  *Anzeigen* springt zum Feld (und wechselt bei Bedarf zwischen Dunkel / Hell),
  *Zurücksetzen* nimmt nur diese eine Änderung zurück; *Verwerfen* nimmt alles
  zurück.
* **Kontrastprüfung** unter den Textfarben des Themes (WCAG AA, 4,5 : 1) – siehe
  *Das Theme*.
* **Schnellfarben** an jedem Farbfeld: verwendete und zuletzt benutzte Farben.
* **Strg+S / Cmd+S speichert** (wenn sich etwas geändert hat).
* **Menüpunkte der Einstellungsseite.** Der Stift unter *Reihenfolge und
  Sichtbarkeit* öffnet einen Eintrag: eigener Name, Untertitel ausblenden,
  eigener Hintergrund der Icon-Box und Symbolfarbe (`settings.menu_items`). Der
  Injector schreibt den Namen in den Textknoten, den Lit gerendert hat (die
  Marker von Lit bleiben unberührt; setzt Home Assistant den Text neu, wird das
  Original wieder übernommen), Untertitel und Farben kommen als CSS. Die
  Vorschau zeigt Name und Farben.
* **Eigene Werte im Systemmonitor** (`settings.monitor_sensors`, bis zu sechs
  Entitäten mit optionalem Namen): Wert mit Einheit, darunter „vor x Min.“, ein
  Klick öffnet den More-Info-Dialog. Mit eigenen Werten fließen die Felder in
  Reihen.
* **Button „Backup jetzt erstellen“** unter der Backup-Box
  (`settings.monitor_backup_button`, standardmäßig an, nur für
  Administratoren): fragt zuerst nach, startet dann
  `backup/generate_with_automatic_settings` – wie der Button auf der
  Backup-Seite von Home Assistant – und prüft alle 15 Sekunden, bis das neue
  Backup da ist.
* **Profilseite.** Seit Home Assistant 2026.10 nutzt die Profilseite die
  Menüliste der Einstellungsseite; Icon-Boxen, Farben, Rahmen, Hover, Spalten
  und Kacheln gelten auch dort (`settings.profile_page`, standardmäßig an).
* **Seite einer Integration.** Mit der Listenansicht bekommen die Einträge auf
  der Seite einer einzelnen Integration (`ha-config-entry-row`, Home Assistant
  2026.10) Rahmenbreite, Ecken, Rahmen- und Problemfarbe, Hintergrund und
  Abstand der Zeilen (`settings.list_entries`, standardmäßig an). Einträge mit
  einem Problem behalten ihren Warnhintergrund.
* **229 neue Theme-Variablen** (jetzt 309): Diagrammfarben 1–54 und die
  Verlaufslinie, Energie (8), Wetter-Zustandsfarben (15),
  Syntaxfarben des Code-Editors (die 13, die der Editor nutzt), weitere für
  Tabellen und Eingaben (Tabellenkopf, Eingabe-Beschriftung, Dropdown-Pfeil),
  Farben der Label-Badges (5), der Filter hinter Dialogen, die Kopfzeile im
  Bearbeitungsmodus und der Filter hinter der Kopfzeile (*Theme-Farben der
  Kopfzeile*; die Unschärfe der Seite Header wird als `blur(…)` übernommen),
  die Design-Tokens von Home Assistant (91 `--ha-color-…`, die das Frontend
  2026.10 benutzt, Ecken, Rahmenbreiten, Schatten) und die Schalter-Variablen
  (`--ha-switch-…`). Nicht übernommen, weil das Frontend 2026.10 sie nicht mehr
  liest: `--sidebar-selected-text-color`, `--slider-secondary-color`, die
  meisten der alten `--input-…`-Linien- und Rahmenfarben und 12 Design-Tokens
  ohne eine einzige Verwendung. Alle neuen Variablen werden mit dem Theme
  gespeichert, registriert, exportiert und importiert.
* **Theme-Vorschau:** neue Kacheln *Diagramm* (fünf Linien in den Farben 1–5,
  die Verlaufslinie, alle 54 Farben), *Energie* (Balken und Legende) und
  *Bedienelemente* (Buttons, Chips, Checkboxen, Schalter, Eingabefeld und
  Fläche aus den Design-Tokens), eine Wetterzeile in *Zustandsfarben*,
  Syntaxfarben im Code von *Dialog und Code*. Die Schalter folgen
  `--ha-switch-…` und den Design-Tokens, wenn sie gesetzt sind.
* **Info-Seite:** Der Text zum Theme nennt die Anzahl der Variablen.

## 1.4.7

* **Theme-Vorschau: Gruppen von Card-Design und Karten.** Ein Klick auf *Card-Design*
  öffnet *Karten* und listet darüber auch *Grundfarben* (eingeklappt); *Karten*
  (die helle Karte) listet ebenfalls *Grundfarben*; *Regler und Badges* tut das
  nicht mehr.
* **Schatten-Designer.** Unter dem Feld *Schatten* der Gruppe *Karten*
  (`--ha-card-box-shadow`): sechs Vorlagen und Regler für Richtung (acht
  Richtungen oder rundherum), Abstand, Unschärfe, Ausbreitung, Farbe,
  Deckkraft und Innenschatten. Das Ergebnis wird als normaler `box-shadow` in
  das Feld geschrieben; ein von Hand getippter einzelner Schatten (Farbe als
  Hex oder `rgb()`/`rgba()`) wird in die Regler zurückgelesen, bei mehreren
  Schatten weist ein Hinweis darauf hin, dass ein Regler sie ersetzt. Der
  Designer öffnet sich mit der Checkbox *Schatten gestalten* und ist
  standardmäßig geschlossen; der Browser merkt es sich wie die offenen Gruppen.
* **Schalter in der Theme-Vorschau wie in Home Assistant 2026.10.** Die
  Schalter in der hellen Karte werden wie `ha-switch` gezeichnet: eine Spur mit
  Rahmen und ein Daumen mit kleinem Schatten, gefärbt aus der Skala der
  Primärfarbe (dunkel: Spur Stufe 10, Rahmen 40, Daumen 60; hell: 90 / 40 / 40) –
  mit der eigenen Skala von Home Assistant, solange das Theme keine Primärfarbe
  hat.
* **Einstellungsseite auf dem Handy.** CPU, Arbeitsspeicher und Speicher des
  Systemmonitors bleiben nebeneinander (etwas kleiner) statt untereinander. Die
  Favoriten-Leiste füllt die Breite in gleich breiten Spalten: bis zu drei
  Favoriten in einer Reihe, mehr in zwei gleichmäßigen Reihen, höchstens vier
  Spalten.
* **Übersichtsbox: zweite Zeile für mehr Zähler.** Geräte: nicht erreichbar
  (alle Entitäten nicht verfügbar) und deaktiviert. Integrationen: Einträge und
  wie viele sich nicht einrichten lassen (`setup_error`, `setup_retry`,
  `failed_unload`, `migration_error`; deaktivierte Einträge zählen nicht).
  Apps: Speicher der laufenden Apps (`/addons/<slug>/stats`) und Speicherplatz
  von App-Daten und Konfiguration (`/host/disks/default/usage`, Tiefe 1, alle
  30 Minuten; nur einmal gefragt, wenn der Supervisor ihn nicht kennt). Szenen:
  letzte Aktivierung. Skripte: laufend, sonst letzter Lauf. Blueprints:
  Automatisierung / Skript. Benutzer: Administratoren. Tokens: letzte
  Verwendung. Auf dem Handy wird eine lange Zeile gekürzt; im Tooltip steht sie
  vollständig. Die Vorschau der Seite HA-Settings zeigt die zweiten Zeilen auch
  mit Beispielwerten. Nicht an einem echten Supervisor geprüft.

## 1.4.6

* **Fix: Listenansicht von Geräte & Dienste in Home Assistant 2026.10.** Die
  Integrationskarte hat seit Frontend 20260930 eine neue Struktur
  (`ha-integration-card > ha-card > a.ripple-anchor > .card-content >
  ha-integration-card-header + ha-integration-card-footer`, kein
  `.card-actions` mehr). Der Injector gestaltete nur Karten der alten Struktur,
  deshalb galten Zeilenhöhe, Zeilenhintergrund, Rahmen und Ecken nicht mehr
  (Spalten und Abstand schon, sie sitzen am Container). Jetzt werden beide
  Strukturen erkannt: `.card-content` wird zur Zeile (Name links, Zähler und
  Symbole rechts, ohne Abstand oben und unten), Kopf und Fuß bekommen ein
  eigenes kleines Stylesheet in ihren Shadow Roots. Seit 2026.10 tönt Home
  Assistant die Karte auch beim Überfahren; mit einer eigenen Hover-Farbe
  behält die Zeile darunter ihren normalen Hintergrund. Gegen den
  Frontend-Quelltext geprüft (Tag 20260930.3); nicht an einer echten Installation
  mit 2026.10 getestet.
* **Einfach / Alle Felder ohne versteckte Felder.** Auf der Seite Header und auf
  *HA-Settings › Einstellungsseite* ist kein Feld mehr versteckt (z. B. die
  Icon-Größe unter *Maße*, die Boxgröße unter *Menüpunkte*). Header: *Einfach*
  zeigt die in der Vorschau gewählte Gruppe aufgeklappt und klappt die anderen
  zu, *Alle Felder* klappt alle Gruppen auf – ein Klick in der Vorschau
  scrollt dann nur, der Akkordeon-Schalter ist solange ausgeblendet.
  Einstellungsseite: *Einfach* zeigt das angeklickte Thema, *Alle Felder* wie
  bisher alle Themen untereinander.
* **Theme: Skala der Primärfarbe.** Neuere Bedienelemente von Home Assistant
  (`ha-button`, `ha-switch`, Checkboxen, Radiobuttons, Fortschrittsbalken,
  Links) werden aus `--ha-color-primary-05` … `-95` gefärbt. Home Assistant
  berechnet diese Skala nur für das Standard-Theme aus der Profilfarbe
  (`apply_themes_on_element.ts`); in einem eigenen Theme blieb sie auch bei
  abweichender `primary-color` blau. Das Theme bekommt die elf Stufen jetzt aus
  der Primärfarbe jedes Modus – Backend (`theme.py`) und Export (Panel)
  verwenden die Formel von `generateColorPalette` mit den Konstanten von culori
  4.0.2, die auch das Frontend nutzt; an 5.000 Farben gegen culori geprüft, ohne
  einen einzigen Unterschied. Nur Hex- und `rgb()`-Werte; benannte Farben oder
  `var(...)` lassen die Skala von Home Assistant bestehen. Die Seite Theme zeigt
  die Skala unter der Primärfarbe. An einer echten Installation nicht geprüft.
* **Header: Farbe der rechten Seite.** Neues Feld in der Gruppe *Reiter der Ansichten*
  (`header.actions_color`): Buttons von Home Assistant, eigene Links und
  Neustart-Button, CPU/RAM/Speicher. *Farbe der Reiter* färbt weiterhin nur die Reiter.
  Eine an einem einzelnen Link gesetzte eigene Farbe bleibt. Nicht ins Theme
  übernommen (das Theme hat nur *Text und Icons* für die ganze Kopfzeile).

## 1.4.5

* **Akkordeon unter Sidebar › Aussehen.** Der Akkordeon-Schalter steht jetzt
  auch neben dem Titel der Seite Aussehen (standardmäßig an, dieselbe
  Einstellung wie auf den anderen Seiten); Layout und Einträge behalten ihre
  Gruppen, wie sie sind.
* **Panel-Farben gehen ins Theme.** Ändert sich eine Farbe auf der Seite Header
  oder unter *Sidebar › Aussehen*, folgt die passende Theme-Variable – in Dunkel
  und Hell: Hintergrund der Kopfzeile (`--app-header-background-color`, mit der
  Hintergrund-Deckkraft als `color-mix()`; bei einem Verlauf die erste Farbe)
  und als `--app-theme-color`, wenn es eine einfache Farbe ist, Textfarbe der
  Kopfzeile (`--app-header-text-color`), Rahmenbreite und -farbe
  (`--app-header-border-bottom`, die untere Seite, wenn pro Seite gesetzt);
  Hintergrund der Sidebar, Textfarbe, Icon-Farbe, Farbe des aktiven Icons (oder
  des aktiven Textes), Kopf-Hintergrund und Titelfarbe (`--sidebar-...`). Eine
  Theme-Variable folgt nur, solange sie leer ist oder noch den übernommenen Wert
  hält – ein von Hand im Theme gesetzter Wert bleibt. Wird die Farbe geleert,
  wird auch die Variable geleert, die sie gefüllt hat. Beim Laden des Panels
  wird nichts übernommen; nach *Verwerfen*, einer Wiederherstellung aus dem
  Verlauf oder einem Import beginnt die Übernahme neu. *Farben übernehmen* in
  beiden Gruppen kopiert alle Farben der Seite auf einmal (für Konfigurationen
  von vor 1.4.5).

## 1.4.4

* **HA-Settings › Alle Felder.** Auf der Einstellungsseite zeigt *Alle Felder*
  die drei Themen Menüpunkte, Favoriten-Leiste und Systemmonitor untereinander,
  jedes mit seinem Titel und durch eine Linie getrennt; ein Klick in der
  Vorschau scrollt zu seinem Thema. *Einfach* zeigt wie bisher nur das
  angeklickte Thema.
* **Favoriten: Aussehen in voller Breite.** Die Felder eines Favoriten beginnen
  nicht mehr eingerückt: Text-, Hintergrund- und Icon-Farbe als Zeilen, das
  Icon-Feld in einer eigenen Zeile, Höhe, Rahmen und Eckenradius in einer
  Zeile, die Rahmenfarbe darunter.
* **Theme-Farben der Sidebar.** Neue Gruppe unter *Sidebar › Aussehen* mit den
  sechs Theme-Variablen der Sidebar von Home Assistant:
  `--sidebar-background-color`, `--sidebar-text-color`, `--sidebar-icon-color`,
  `--sidebar-selected-icon-color` (Icon, Text und Hervorhebung des gewählten
  Eintrags), `--sidebar-menu-button-background-color` und
  `--sidebar-menu-button-text-color` (der obere Bereich mit dem Titel). Dunkel
  und Hell, Teil des Themes (`THEME_VARIABLES`, jetzt 80), daher werden sie
  registriert, exportiert und importiert; Änderungen zählen für den Bereich
  Sidebar. Der Injector setzt die Werte der Seite Aussehen an der Sidebar
  selbst, sie haben also Vorrang. Die Sidebar-Vorschau folgt diesen Variablen.
* **Übersichtsbox (Zähler).** `settings.monitor_counts` (standardmäßig aus),
  `monitor_counts_place` (`top` / `end`) und `monitor_counts_items` (die
  angezeigten Zähler, standardmäßig alle elf). Gezählt werden: Geräte
  (`hass.devices`, sonst `config/device_registry/list`), Entitäten (Zustände;
  darunter: nicht verfügbar), Integrationen (`config_entries/get`, verschiedene
  Domains; darunter: Einträge), Apps (Supervisor `/addons`), Automatisierungen
  (darunter: an), Szenen, Skripte, Custom Cards (`lovelace/resources` vom Typ
  `module`; darunter: alle Ressourcen), Blueprints (`blueprint/list` für
  Automatisierung und Skript), Benutzer (`config/auth/list` ohne
  Systembenutzer) und Tokens (`auth/refresh_tokens`, Typ
  `long_lived_access_token` – die Tokens des angemeldeten Benutzers). Jede
  Frage für sich; ein fehlender Wert bleibt „–“. Oben steht die Box hinter
  Systemmonitor und Backup-Box, am Ende vor dem Tipp. Die Zellen fließen in
  Reihen (je mindestens 116 px). Ein Klick öffnet die Seite des Zählers.
* **Ruhigere Hervorhebungsboxen.** *Entwickelt von* (Info) und *Komplette
  Konfiguration* (Export / Import) sind mit der Primärfarbe des Themes getönt,
  statt in der Textfarbe gezeichnet zu werden (weiß bei einem dunklen Theme).

## 1.4.3

* **HA-Settings: Einfach / Alle Felder.** Neben dem Titel der Spalte HA-Settings,
  angezeigt auf der Einstellungsseite (nicht bei *Geräte & Dienste* und
  *Tabellen*). *Einfach* blendet Box- und Icon-Größe, *Rahmen und Ecken der
  Menüpunkte*, den Mouse Hover und die Graphen des Systemmonitors aus, solange
  sie auf ihrem Standard stehen.
* **Akkordeon-Schalter.** Ein Symbol-Schalter neben *Einfach / Alle* auf den
  Seiten Theme, Header und HA-Settings. Akkordeon (der Standard): Das Öffnen
  einer Gruppe – per Klick in der Spalte oder in der Vorschau – schließt die
  anderen Gruppen derselben Spalte; beim Aufbau einer Seite ist nur eine Gruppe
  pro Spalte offen. Aus: Gruppen öffnen sich einzeln wie bisher. Pro Browser
  gespeichert (`localStorage` `ha-style-hub-accordion`).
* **Menü-Icon zentriert.** In der eingeklappten Sidebar der Vorschau ist das
  Menü-Icon oben zentriert, wie es der Injector in Home Assistant macht (auch
  bei größerer *Breite eingeklappt*).
* **Feste Höhe.** Das Panel nimmt die Höhe des Fensters (`100dvh` oder die Höhe,
  die Home Assistant ihm gibt, je nachdem, was kleiner ist). Die Vorschau behält
  ihre Größe, egal welche Gruppen offen sind; die Feldspalte scrollt in sich.
  Das beseitigt auch den Rand unter dem Panel, wenn es kürzer war als das
  Fenster.

## 1.4.2

* **Sidebar-Vorschau: Mouse Hover und Scrollbalken.** Die Hover-Farben aus
  *Aussehen* (Hintergrund mit Deckkraft, Text, Icon) zeigen sich jetzt, wenn die
  Maus in der Vorschau über einem Eintrag steht – wie im Injector ersetzt ein
  eigener Hover-Hintergrund den Hintergrund des Eintrags. Mit *Scrollbalken
  ausblenden* (*Layout › Verhalten*) hat auch die Vorschau keinen Scrollbalken.
* **Theme-Farben der Kopfzeile auf der Seite Header.** Die vier
  Theme-Variablen der Kopfzeile (`--app-header-background-color`,
  `--app-header-text-color`, `--app-header-border-bottom`, `--app-theme-color`)
  haben die Seite Theme verlassen (*Einfach / Alle 14 Gruppen*) und sind jetzt
  die Gruppe *Theme-Farben der Kopfzeile* auf der Seite Header, mit eigenem
  Schalter *Dunkel / Hell* (derselbe Modus wie auf der Seite Theme). Sie gehören
  weiterhin zum Theme und werden mit ihm gespeichert, exportiert und
  importiert; Änderungen zählen für den Bereich Header.
* **Theme: Karte *Card-Design*.** Eine neue Karte in der Vorschau (unter *Regler
  und Badges*) öffnet die Gruppe *Karten*: Rahmen, Farbe, Ecken, Schatten und
  Titelgröße aller Karten.
* **Farbpalette wählen.** Der Button *Palette aus einer Farbe* heißt jetzt
  *Farbpalette wählen* und passt in eine Zeile.
* **HA-Settings › Tabellen: Farbe der Zeilen.** Neues `settings.table_row_background`
  (standardmäßig leer): der Hintergrund jeder Datenzeile der Tabellen
  (`.mdc-data-table__row[aria-rowindex]`, ausgewählte Zeilen ausgenommen);
  *Farbe jeder zweiten Zeile* liegt darüber. Funktioniert, ohne das Theme zu
  registrieren.
* **Gruppentitel fallen auf.** Die Titel der aufklappbaren Gruppen in der
  Feldspalte sind mit der Primärfarbe des Home-Assistant-Themes getönt, etwas
  kräftiger, solange die Gruppe offen ist.
* **Feldspalte 438 px** am PC (vorher 418 px).
* **Hintergrund des Themes.** Der Bereich um die Vorschau nutzt den
  Seitenhintergrund des Home-Assistant-Themes (`--primary-background-color`)
  statt eines etwas helleren Tons, damit das Panel dort, wo es endet, keinen
  Rand mehr zeigt.

## 1.4.1

* **Sidebar in den Vorschauen.** Auf *Theme*, *Header* und *HA-Settings* steht
  die Sidebar eingeklappt neben dem Modell (so breit wie *Breite eingeklappt*,
  Überschriften ausgeblendet, Innenabstand höchstens 4 px – wie der Injector sie
  zeichnet). Ein Klick darauf oder auf das neue Zeichen *Seite Sidebar ↗* unter
  der Vorschau führt auf die Seite Sidebar; *Ausgeklappt / Eingeklappt* gibt es
  nur noch dort.
* **Seite Sidebar: Kopfzeile und Karten führen weiter.** Die Kopfleiste und die
  Karten des skizzierten Dashboards neben der Sidebar sind anklickbar (*Seite
  Header ↗*, *Karten und Hintergrund · Theme ↗*) und öffnen die Seite Header
  bzw. die Seite Theme mit ausgewählten Karten.
* **Sidebar-Vorschau näher am Injector.** Abstand und Innenabstand der Liste,
  der Abstand zwischen Icon und Text der Kacheln (`tile_gap`), Kachel-Innenabstand
  6 px 2 px, Beschriftungen in zwei Zeilen, Überschriften so, wie der Injector
  sie zeichnet (14 px 12 px 4 px, 11 px, Stärke 500, `.06em` Großbuchstaben,
  sofern nicht abgeschaltet, Deckkraft .75, Icon 16 px, Pfeil rechts; Höhe,
  Hintergrund, Farben, Rahmen und Ecken einer Überschrift), die
  Standard-Rahmenfarbe der Einträge (`--divider-color`) und der 1-px-Trenner
  von Home Assistant rechts an der Sidebar, solange kein eigener Rahmen gesetzt
  ist.
* **Das Panel passt ins Fenster.** Die Vorschau ist in der Höhe flexibel
  (mindestens 300 px), damit ihr Fuß mit *Vorher* und den Schaltern darunter im
  Bild bleibt; die Feldspalte ist am PC 418 px breit (vorher 404 px).
* **Theme: ein Element nach dem anderen.** Mit *Alle 15 Gruppen* schließt ein
  Klick auf ein anderes Element die Gruppen des vorherigen, bevor seine eigene
  Gruppe aufgeht.
* **Header-Vorschau wie ein Dashboard.** Fünf Icon-Reiter, zwei Text-Reiter und zwei
  Reiter mit Icon und Text, kein Titel; CPU und Arbeitsspeicher übereinander
  (kleine Beschriftung über dem Wert); die vier Buttons von Home Assistant –
  Hinzufügen (+), Suche, Assist und Bearbeiten (Stift) – folgen jeweils ihrem
  Schalter *ausblenden*.
* **Header: Speicherplatz anzeigen.** Neues `header.show_disk` (standardmäßig
  aus) unter *CPU und Arbeitsspeicher in der Kopfzeile anzeigen*: der freie und
  der belegte Speicherplatz (*Frei* / *Belegt*, GB mit einer Nachkommastelle) im
  selben Block vor den Buttons. Die Werte kommen vom Supervisor (`/host/info`)
  oder, wenn es keinen gibt, von `ha_style_hub/disk` – beide nur für
  Administratoren – und werden jede Minute aktualisiert; ein fehlender Wert
  wird weggelassen. Ein Klick öffnet die Hardware-Seite (mit CPU /
  Arbeitsspeicher) oder die Speicher-Seite. Header-Vorlagen behalten CPU /
  Arbeitsspeicher und Speicherplatz. Die Karte *Buttons und Links rechts* heißt
  jetzt *Buttons rechte Seite*.
* **HA-Settings: Seitenumschalter oben.** *Einstellungsseite / Geräte & Dienste /
  Tabellen* ist von unter der Vorschau an den Anfang der Feldspalte gezogen, im
  Stil von *Layout / Einträge / Aussehen*; das Thema darunter nennt, was gezeigt
  wird.
* **HA-Settings-Vorschau.** Systemmonitor und Backup sind zwei eigene Boxen mit
  demselben Abstand wie zu den Menüblöcken; Favoriten in der Kopfleiste sind
  zentriert (wie der Injector sie platziert); die Tipp-Zeile unter dem Menü wird
  angezeigt und öffnet die Menüpunkte.
* **Hover für Systemmonitor und Backup.** Der *Mouse Hover* der Menüpunkte
  (`menu_hover_background`, `menu_hover_opacity`) gilt auch für die Felder des
  Systemmonitors und der Backup-Box (`.shm-cell:hover`), ebenso in der Vorschau.
* **Tipp unter dem Menü ausblenden.** Neues `settings.hide_tip` (standardmäßig
  aus) bei den Menüpunkten: blendet `ha-tip` auf der Einstellungsseite aus.
* **Geräte & Dienste: Spalten als Buttons.** *1 / 2 / 3* statt der zwei
  Checkboxen *Zwei Spalten* / *Drei Spalten*; wie bisher in `list_two_columns` /
  `list_three_columns` gespeichert, bestehende Konfigurationen funktionieren
  also weiter. *Hintergrundfarbe der Zeilen* steht jetzt neben *Maximale Breite
  der Liste*.
* **Größere Vorschauen für Geräte & Dienste und Tabellen.** Die Liste zeigt 15
  Integrationen, die Tabelle vier Bereiche mit 13 Zeilen und einer Spalte
  *Zustand*.
* **Kiosk-Modus unten in der Spalte.** *Sidebar ganz ausblenden (kiosk-mode)* ist
  aus dem Kasten *Erweitert* an das Ende der Spalte *Layout* gewandert, im Stil
  von *Kopfzeile ganz ausblenden (kiosk-mode)* auf der Seite Header (den Kasten
  *Erweitert* gibt es nicht mehr). Der Schalter der Kopfzeile bekam
  *(kiosk-mode)* in den Namen.
* **Farbfelder neben Zahlenfeldern** (z. B. *Rahmen und Ecken der Menüpunkte*)
  nehmen die Breite ihrer Spalte, statt ins nächste Feld zu laufen. Die Felder
  einer Zwischenüberschrift unter *Einträge*: Höhe, Rahmen und Eckenradius in
  einer Zeile, die Rahmenfarbe darunter als eigene Zeile.

## 1.4.0

* **Neues Layout des Panels („Bühne“).** Eine Leiste oben statt Reitern: die vier
  Bereiche *Sidebar / Theme / Header / HA-Settings*, die Suche über alle
  Einstellungen, der Zähler der ungespeicherten Änderungen, *Verwerfen*,
  *Speichern*, der Verlauf und zwei Icons für *Export / Import* und *Info*. Jede
  Seite zeigt links ein Modell von Home Assistant und rechts eine feste Spalte
  mit den Feldern (am PC 404 px). Das Panel nutzt die Schrift und die Farben des
  aktiven Home-Assistant-Themes; Text auf der Primärfarbe wird nach seinem
  Kontrast (WCAG) hell oder dunkel gewählt. Die zuletzt geöffnete Seite wird pro
  Browser gemerkt (`localStorage` `ha-style-hub-page`); der allererste Besuch
  öffnet die Info-Seite.
* **Klick in der Vorschau.** Was im Modell angeklickt wird, öffnet seine Felder;
  der gewählte Teil wird umrandet und beschriftet (*„... · ausgewählt“*).
  *Vorher* unter der Vorschau zeigt den gespeicherten Stand (alle Vorschauen auf
  einmal), jede Änderung schaltet es aus.
* **Änderungen sind sichtbar.** Ein geändertes Feld trägt einen Punkt und
  *„geändert, vorher X“*; Gruppen zeigen *„n geändert“*, die Bereiche in der
  Leiste zählen mit. Felder stehen in Gruppen, die auf- und zuklappen; was du
  selbst klappst, wird gemerkt (`localStorage` `ha-style-hub-groups`).
* **Sidebar:** *Layout / Einträge / Aussehen* oben in der Feldspalte.
  *Einträge:* Der gewählte Eintrag klappt in der Liste auf (Name, Icon,
  Spaltenbreite, Farben als Kacheln, Ausblenden, nach oben / unten, Entfernen,
  *Zurücksetzen*); ein Klick in der Vorschau wählt einen Eintrag aus, Ziehen
  dort sortiert um. *Aussehen:* Ein Klick auf Titel, Einträge, Badge,
  Benachrichtigungen oder Hintergrund öffnet die Gruppe. *Ausgeklappt /
  Eingeklappt* unter der Vorschau.
* **Theme:** Die Vorschau zeigt alle färbbaren Elemente; jedes öffnet seine
  Gruppen aus `THEME_GROUPS` (`THEME_SPOTS`). *Einfach / Alle 15 Gruppen*;
  *Palette aus einer Farbe* und *Vorlagen* als Dialoge; *Dunkel / Hell*, *Nach
  Hell kopieren* und *Diesen Modus leeren* unter der Vorschau; Name,
  *registrieren* und *Standard* unten in der Spalte. Sidebar und Kopfzeile in
  der Vorschau führen auf ihre Seiten.
* **Header:** Die Kopfleiste ist ausgewählt; Reiter der Ansichten, Titel und Buttons
  öffnen ihre Gruppe. *Einfach / Alle Felder* blendet selten genutzte Felder
  aus, die noch auf ihrem Standard stehen. *Vorlagen* (*Glas / Schlank /
  Abgesetzt*) als Dialog, *Kopfzeile ganz ausblenden* unten. Deckkraft und
  Unschärfe sind Regler.
* **HA-Settings:** Die Vorschau zeigt die Einstellungsseite, *Geräte & Dienste*
  oder eine Tabelle (Schalter unter der Vorschau); Menüpunkte, Favoriten-Leiste
  und Systemmonitor sind anklickbar. *Rahmen und Ecken* und *Mouse Hover* der
  Menüpunkte sind von Anfang an offen.
* **Export / Import** auf einer Seite. Neu: **Export und Import der Sidebar
  allein** (`{version, sidebar: {layout, appearance, order, items}}`,
  `ha-style-hub-sidebar-DATUM.json`); auch ein kompletter Export wird
  akzeptiert, und der komplette Import nimmt auch eine Sidebar-Datei. *Sidebar
  ausblenden* bleibt, wie es ist.
* **Info-Seite:** Willkommenstext in vier Bereichen, Autor und Links (GitHub,
  Issues, Dokumentation), Unterstützung (Ko-fi, PayPal), *HA Style Hub aktiv*,
  Debug-Ausgabe und *Alles zurücksetzen* (hierher verschoben aus dem Kasten *HA
  Style Hub Einstellungen*).
* **Tablet** (Panel schmaler als 1180 px): Suche als Icon, schmalere Feldspalte,
  *Einträge* zeigt den Eintrag oder die Liste. **Handy** (schmaler als 700 px):
  Bereiche in einer Leiste unten, Zähler / *Verwerfen* / *Speichern* / Verlauf
  darüber. Entschieden wird nach der Breite des Panels (Container Queries), nicht
  des Fensters.
* Unverändert: Konfiguration, Schlüssel, Speicherung, Injector und Backend. Tests
  an die neue Struktur angepasst, neue `v140.mjs`.

## 1.3.9

* **Seite *Einstellungen › System*.** `ha-config-system-navigation` wird wie die
  Einstellungsseite erkannt: ihre Navigationsliste sitzt direkt in der Seite
  (ohne `ha-config-navigation` dazwischen). Sie bekommt die Breite von
  `ha-config-section` und die Spalten und Kacheln von `settings.menu_columns` /
  `settings.menu_tiles` (`buildMenuLayoutCss(s, true)` lässt Reihenfolge und
  ausgeblendete Einträge weg). Das Element wird wie die anderen eingehängt, das
  Layout ist also schon beim ersten Zeichnen da.
* **Favoriten.** Zentriert (`justify-content: center`). Neues
  `settings.favorites_place` (`page` / `header`): Bei `header` hängt die Leiste
  im Slot `title` von `ha-top-app-bar-fixed` und ist absolut in der Mitte der
  Kopfleiste positioniert; eine zweite Leiste am alten Platz ist nur unter
  1000 px sichtbar. Jeder Favorit trägt jetzt sein Aussehen (`DEFAULT_FAVORITE`:
  `text_color`, `background`, `height`, `border_color`, `border_width`,
  `border_split` + vier Seiten, `radius`, `radius_split` + vier Ecken,
  `uppercase`, `icon_only`; `color` bleibt die Icon-Farbe). Die Werte werden
  zu CSS-Variablen am Button (`favoriteStyle()`), die Standardwerte pro Platz
  stehen im Stylesheet. Geprüft in `store.py` (`_clean_favorites`), Injector und
  Panel (`cleanFavorites`): Farben als kurze Zeichenketten, Größen −1 bis 80
  (Ecken bis 200), Schalter nur als Booleans; der erste Eintrag eines Pfades
  gewinnt.
* **Systemmonitor** (`settings.monitor`, `monitor_place` `top` / `end`,
  `monitor_graphs`): ein `<div class="sh-monitor">` in `ha-config-section` –
  erstes Kind (vor den Markern von Lit) oder vor `ha-tip`. CPU und
  Arbeitsspeicher aus `hardware/subscribe_system_status`, nur abonniert, solange
  ein Monitor oder die Kopfzeile die Werte braucht, und 20 s nach dem Wegfall
  des letzten wieder freigegeben; die letzten 60 Werte bleiben im
  `sessionStorage` des Tabs (`ha-style-hub-system`). Speicher aus
  `supervisor/api` `/host/info`, wenn `hassio` geladen ist, sonst aus dem neuen
  Befehl `ha_style_hub/disk` (Administratoren, `shutil.disk_usage` des
  Konfigurationsordners, GB = 1024³ Byte). Graphen als SVG-Pfade, das Layout
  folgt der eigenen Breite (Container Query). Schlägt das Abonnement fehl (zum
  Beispiel, solange Home Assistant noch startet), wird es höchstens alle 30 s
  erneut versucht; ein Wert, der älter als 30 s ist, wird nicht als aktuell
  angezeigt.
* **Letztes Backup** (`settings.monitor_backup`, `monitor_backup_place`): ein
  `<div class="sh-backup">` mit vier Feldern, platziert wie der Monitor (dahinter,
  wenn beide am selben Platz stehen). Daten aus `backup/info` (neuestes Backup
  nach Datum, `next_automatic_backup`) und `backup/agents/info` (Namen der
  Speicherorte), beide für Administratoren; gelesen, wenn die Seite angezeigt
  wird, und alle 5 Minuten. Größe: die größte Datei aller Speicherorte, auf Basis
  von 1024.
* **Menüpunkte: Hover** (`settings.menu_hover_background`,
  `menu_hover_opacity`): `ha-list-item-button:hover::part(base)` bekommt die
  Farbe, der Ripple von Home Assistant wird gedämpft.
* **Header:** `header.show_system` – CPU und Arbeitsspeicher in `.action-items`
  vor den eigenen Buttons; neue Werte ändern nur Textknoten, der Observer der
  Kopfzeile wird also nicht geweckt.
* Die Leiste über den Karten hält 12 px Abstand zur Kopfleiste und sitzt näher an
  der ersten Karte (`margin: 44px 0 -24px`).
* 64 Settings-Schlüssel, 43 Header-Schlüssel. Das Panel hat eine neue Karte
  *Systemmonitor* (oben in der rechten Spalte) und eine Positionsauswahl für die
  Favoriten; jeder Favorit klappt wie eine Zwischenüberschrift auf. Spalten und
  Kacheln wanderten ans Ende der Karte *Menüpunkte der Einstellungsseite*; die
  Karte für Reihenfolge und Favoriten heißt jetzt *Einstellungsseite:
  Reihenfolge und Favoriten*.

## 1.3.8

* **Die Einstellungsseite selbst (`ha-config-dashboard`).** Vier neue Teile, alle
  in der Gruppe `settings` (56 Settings-Schlüssel):
  * `settings.menu_order` / `settings.menu_hidden`: Listen von Pfaden. Jeder
    `ha-list-item-button` der Navigationslisten bekommt seinen Pfad als
    `data-sh-menu`; die Reihenfolge ist ein CSS-`order` am Eintrag, das
    Ausblenden ist `display: none`. Im DOM wird nichts verschoben, Lit zeichnet
    also wie bisher weiter. Home Assistant zeichnet die Einträge in mehreren
    Karten mit je einer Liste – eine Reihenfolge wirkt deshalb nur innerhalb
    eines Blocks. Eine Karte, deren Einträge alle ausgeblendet sind, bekommt
    `data-sh-empty` und wird ebenfalls ausgeblendet. Die Listen werden in
    `store.py` (`_clean_paths`), im Injector und im Panel geprüft: nur Pfade
    innerhalb von Home Assistant, jeder einmal, höchstens 80.
  * `settings.menu_columns` (1–3) und `settings.menu_tiles`: ein Raster auf
    `ha-list-nav::part(base)`, die Seitenbreite auf `ha-config-section` (960 /
    1280 px), Kacheln über die Parts von `ha-list-item-button`.
  * `settings.favorites`: eine Liste wie `header.links` (`{path, name, icon,
    color}`, höchstens 12). Der Injector setzt ein `<div
    class="sh-favorites">` in den Slot `header` von `ha-config-section`.
  * Der Injector merkt sich die gefundenen Menüpunkte (Pfad und Name, pro Block)
    im `localStorage` des Browsers (`ha-style-hub-menu`); das Panel liest sie für
    seine Liste und fällt auf eine Standardliste zurück.
* **Tabellen: Zeilen.** `settings.table_zebra`, `settings.table_hover_background`,
  `settings.table_hover_opacity` und `settings.table_font_size` für
  `ha-data-table`. Die Streifen richten sich nach `aria-rowindex`
  (Gruppenköpfe haben keinen), die Hover-Farbe ist ein `background-image`,
  Streifen und Auswahl bleiben also darunter erhalten.
* Panel: neue Karte *Einstellungsseite: Reihenfolge, Spalten und Favoriten* (seit
  1.3.9 *Einstellungsseite: Reihenfolge und Favoriten*); die Karte der Tabellen
  heißt jetzt *Tabellen: Gruppenköpfe und Zeilen*. Der Dialog der Links hat
  einen dritten Modus für Favoriten. Export und Import der HA-Settings
  enthalten die neuen Listen.
* **Neues Logo.** `www/ha-style-hub-logo.png` (100 × 88 px), `brand/icon.png`
  (256 × 256 px) und `brand/logo.png` (290 × 256 px), erstellt aus
  `docs/logo.png`.

## 1.3.7

* **Eigene Buttons in der Kopfzeile des Dashboards.** `applyHeaderButtons()` hängt
  einfache `<button class="sh-header-button">`-Elemente an `.action-items` von
  `hui-root` an – ans Ende, hinter die Marker von Lit – und schiebt sie per
  `order` vor die Buttons von Home Assistant (die Leiste ist ein
  Flex-Container). Der Observer über der Kopfzeile setzt sie zurück, wenn Home
  Assistant die Leiste neu zeichnet. Im Bearbeitungsmodus sind sie ausgeblendet
  und werden nicht angelegt, solange die Kopfzeile ausgeblendet oder die
  Integration abgeschaltet ist. Icon-Farbe, Icon-Größe und der Rahmen um die
  Buttons gelten auch für sie.
  * `header.show_restart`: der Neustart-Button (nur für Administratoren, mit der
    Rückfrage des Sidebar-Eintrags; Name und Icon kommen aus dem Eintrag
    `action:restart`, falls gesetzt).
  * `header.links`: eine Liste aus `{path, name, icon, color}` – der erste Wert der
    Konfiguration, der eine Liste ist. Sie wird in `store.py`
    (`_clean_header_links`), im Injector und im Panel (`cleanHeaderLinks`)
    geprüft: nur Pfade innerhalb von Home Assistant (`LINK_PATH`), jeder Pfad
    einmal, höchstens 12, ein gültiger Icon-Name, kurze Zeichenketten. Links
    unterhalb von `/config` werden nur für Administratoren angelegt.
    `default_config()` und jedes `normalize()` liefern eine frische Liste, nie
    die der Standardwerte.
  * Panel: Die Box *Buttons rechte Seite* hat die neue Checkbox und eine Liste
    der Links mit einem Plus. Das Plus öffnet den Dialog der Sidebar-Einträge in
    einem Header-Modus (nur Link). Eine Header-Vorlage und der Import eines
    älteren Header-Exports behalten Neustart-Button und Links.
* **Hover für die Reiter der Ansichten.** `header.tab_hover_background` und
  `header.tab_hover_opacity`: ein Hintergrund auf `ha-tab-group-tab:hover` (und
  den älteren Tab-Elementen), per `color-mix` gemischt wie in der Sidebar.
* 42 Header-Schlüssel.

## 1.3.6

* **Listenansicht in zwei oder drei Spalten.** Neue `settings.list_two_columns`
  und `settings.list_three_columns` (47 Settings-Schlüssel). Nur eine gilt; das
  Panel entfernt das Häkchen der anderen, und kommen beide gesetzt an (ein
  bearbeiteter Import), gewinnen drei Spalten. Der Container bekommt
  `repeat(auto-fill, minmax(max(min(100%, 260px), calc((100% - gaps) / N - 0.5px)), 1fr))`:
  höchstens N gleich breite Spalten, weniger, sobald eine Spalte schmaler als
  260 px würde. Zeilenhöhe, Abstand, maximale Breite, Rahmen, Hintergrund und
  Hover wirken wie bisher; mit `list_apps` folgt die Seite Apps. Die Vorschau im
  Panel zeigt die Spalten.
* **Links als Sidebar-Einträge.** Eine dritte Art von Eintrag, die der Injector
  selbst hinzufügt, neben den Zwischenüberschriften und dem Neustart-Button. Der
  Schlüssel trägt das Ziel: `link:/config/automation`. Es gibt kein neues Feld –
  der Eintrag nutzt die Standardwerte eines normalen Eintrags (`name`, `icon`,
  `hidden`, `span`, Farben, `parent`), Reihenfolge, Ausblenden, Umbenennen,
  Farben und Überschriften brauchen also keinen Sonderfall.
  * Injector: `applyLinks()` legt pro Link ein Element der laufenden
    Sidebar-Generation an (`data-sh-key`, `data-sh-link`). Ein Klick schreibt die
    Adresse in den Verlauf und löst `location-changed` aus, so wie Home
    Assistant selbst navigiert – kein Neuladen der Seite; Strg-/Cmd-/Umschalt-Klick
    und die mittlere Maustaste öffnen einen neuen Tab. Der Link der aktuellen
    Seite (oder einer Seite darunter) bekommt die Klasse `selected`. Im
    schmalen Layout wird die Schublade danach geschlossen (`hass-toggle-menu`).
  * Akzeptiert werden nur Pfade innerhalb von Home Assistant: `LINK_PATH`
    verlangt einen führenden `/`, keinen zweiten und einfache URL-Zeichen.
    Alles andere in der Konfiguration wird ignoriert. Links unterhalb von
    `/config` werden für Benutzer ohne Administratorrechte nicht angelegt.
  * Panel: Das Plus öffnet den Dialog `#add-modal` mit der Zwischenüberschrift
    und einem gruppierten `<select>` (`LINK_GROUPS`, 36 Seiten; Pfade und Icons
    wie in `config-sections.ts` und den Tools-Tabs des aktuellen Frontends) plus
    *Eigener Pfad*. Eine aus dem Browser eingefügte vollständige Adresse wird auf
    ihren Pfad gekürzt. Name und Icon werden beim Anlegen in den Eintrag
    geschrieben; schon vorhandene Links sind in der Liste deaktiviert. Eine
    Link-Zeile hat das Auge und einen Papierkorb.

## 1.3.5

* **Styles werden geschrieben, während das Element gezeichnet wird.** Bisher
  suchte der Injector die Elemente der Einstellungsseiten nach einer Navigation
  und danach alle 150 ms; dazwischen zeichnete der Browser das ursprüngliche
  Design. Jetzt hängt er sich in die Element-Klassen ein, genauso wie
  [UIX](https://github.com/Lint-Free-Technology/uix) (der Nachfolger von
  card-mod): `customElements.whenDefined(tag)`, dann wird die Methode `updated`
  der Klasse umhüllt. Lit ruft sie nach jedem Rendern im selben Task auf, das
  Stylesheet ist also da, bevor der Browser zeichnet. UIX wird nicht gebraucht
  und nichts davon benutzt – nur der Ansatz ist derselbe.
  * Eingehängt: `ha-integration-card`, `ha-integration-header`,
    `ha-config-navigation-list`, `ha-data-table`, `ha-config-apps-installed`,
    `supervisor-apps-card-content` (`styleSettingsElement()`) und `hui-root`
    (`styleHeaderElement()`). Der Container der Integrationskarten wird über die
    Karte (ihren Root-Knoten) gefunden, auf seinen Tag-Namen kommt es also nicht
    an.
  * Das ursprüngliche `updated` läuft immer zuerst und unverändert; ein Fehler im
    Teil der Integration wird verschluckt. Jedes Element meldet nur seine ersten
    drei Renderings. Der Zustand liegt in `window.__haStyleHubHooked`, eine zweite
    Kopie des Skripts umhüllt eine Klasse also nicht doppelt, und der Aufruf geht
    immer an die zuletzt geladene Kopie.
  * Das Polling (`scheduleSettingsPage()`, `scheduleHeader()`) bleibt als
    Rückfall – für Elemente, die schon existierten, und falls ein Frontend-Update
    ändert, wie die Elemente rendern. Beide Wege teilen sich
    `classifySettingsRoot()` / `putSettingsSheets()`; das CSS der
    Einstellungsseiten wird bis zur nächsten Änderung der Konfiguration
    zwischengespeichert.
  * Debug: Die Zeile `[settings]` zeigt jetzt auch `writtenWhileDrawing` und
    welche Klassen eingehängt sind.
* **Gemerkte Konfiguration.** Die vom Server gelesene Konfiguration wird im
  `localStorage` (`ha-style-hub-config`) gehalten und nach einem Neuladen
  verwendet, bis der Server geantwortet hat. Die Live-Vorschau des Panels wird
  nicht gespeichert. Kennt der Server den Befehl nicht (Integration entfernt),
  wird der gemerkte Stand verworfen.
* **„HA Style Hub aktiv“.** `advanced.enabled` schaltet Sidebar, Kopfzeile und
  HA-Settings ab (nur ein registriertes Theme bleibt), deshalb heißt es wieder
  *HA Style Hub aktiv* und steht in *HA Style Hub Einstellungen*, über dem
  Debug-Schalter. *Erweitert* enthält nur noch *Sidebar ausblenden
  (kiosk-mode)*. Kein Schlüssel hat sich geändert.
* **Die Box *HA Style Hub Einstellungen* klappt.** Ein Klick auf ihre Überschrift
  schließt oder öffnet sie (`data-fold="hub-settings"`), wie die Willkommensbox.
  Der Zustand wird pro Browser gemerkt, nicht in der Konfiguration. Das Dreieck,
  das eine klappbare Box kennzeichnet, ist größer (24 px statt 13 px) und
  nimmt die Farbe der Überschrift an.
* **Neues Logo.** `www/ha-style-hub-logo.png` (101 × 88 px), `brand/icon.png`
  (256 × 256 px) und `brand/logo.png` (293 × 256 px), erstellt aus
  `docs/logo.png`.

## 1.3.4

* **Sidebar › Layout, rechte Spalte.** Drei Boxen statt zwei: *Erweitert*
  (`advanced.enabled` und `layout.hide_sidebar`, aus der Layout-Box hierher
  verschoben), *Export und Import (JSON)* und *HA Style Hub Einstellungen*
  (Debug-Schalter und das Zurücksetzen der gesamten Konfiguration, orange
  Überschrift). Kein Schlüssel hat sich geändert – nur der Ort der Felder.
* **Debug-Ausgabe für alle vier Bereiche.** `debug(area, text, detail)` im
  Injector schreibt Zeilen `[HA Style Hub] [sidebar|theme|header|settings]`. Eine
  Zeile wird pro Bereich nur einmal geschrieben, bis sie sich ändert, damit das
  Polling der Einstellungsseiten und der Sidebar-Observer die Konsole nicht
  fluten.
  * `sidebar`: Strukturgeneration, ausgeklappt, Einträge, ausgeblendete Einträge,
    Spalten, Aussehen – oder „abgeschaltet“ / „ausgeblendet (kiosk-mode)“.
  * `theme`: Name, ob Home Assistant das Theme kennt, welches Theme dieser Browser
    benutzt, der Server-Standard, Dunkelmodus, Anzahl der Werte pro Modus.
  * `header`: ob ein Dashboard (`hui-root`) gefunden und das Stylesheet
    geschrieben wurde.
  * `settings`: der Pfad, was gewünscht ist (Menü-Icons, Zeilen, Tabellengruppen,
    Listenansicht, Apps-Liste) und wie viele passende Elemente gefunden wurden.

## 1.3.3

* **Eingeklappte Sidebar: eigene Kachel- und Zeilenhöhe.** Neue Layout-Schlüssel
  `tile_height_collapsed` und `row_height_collapsed` (`0` = wie `tile_height` /
  `row_height`). Der Injector übergibt die Höhe pro Bereich
  (`:host([expanded])` / `:host(:not([expanded]))`) an `tileRules()` /
  `rowRules()`; ausgeklappt behält die alten Schlüssel.
* **Listenansicht: Zeilenhintergrund.** Neues `settings.list_background` (Farbe oder
  Verlauf, leer = Home Assistant). Eine Farbe geht in `background-color`, ein
  Verlauf in `background` und liegt unter dem Hover-Ton. Gilt für Geräte &
  Dienste und, mit `list_apps`, für die Seite Apps. Teil der Vorschau, des
  JSON-Exports/-Imports und der Schlüsselprüfungen (45 Settings-Schlüssel).
* **Zurücksetzen.** `ha_style_hub/reset` ersetzt die gespeicherte Konfiguration
  durch `default_config()` – Sidebar (Layout, Aussehen, Einträge, Reihenfolge),
  Theme (und sein registriertes HA-Theme), Kopfzeile, HA-Settings, beide
  Kiosk-Mode-Schalter – und schreibt einen Verlaufseintrag. Der Button sitzt
  jetzt in einer eigenen Box (`.danger-zone`, orange) mit einem Infotext und
  einer deutlicheren Rückfrage.
* **Seite Theme.** Das Label *Bearbeiteter Modus* heißt jetzt *Modus* (*Mode*),
  und die Modus-Leiste (Schalter, Kopieren, Leeren) bleibt ab einer Kartenbreite
  von etwa 440 px in einer Zeile.
* **Formulierungen.** *Sidebar ausblenden (kiosk-mode)*, *Header ausblenden
  (kiosk-mode)*, *Headermenu des Dashboards*; dasselbe auf Englisch und in den
  Namen der beiden Schalter-Entitäten.

## 1.3.2

Eine Durchsicht des gesamten Codes, keine neuen Funktionen. Jede Korrektur hat
eine Prüfung in `bugs132.mjs` / `bugs_py.py`, die unter 1.3.1 fehlschlägt.

* **Panel: Speichern ohne geladene Konfiguration.** `_save()` hatte keine
  Absicherung, und ein fehlgeschlagenes `ha_style_hub/get` fiel auf die
  Standardwerte zurück und markierte sie als geladen – das nächste Speichern
  hätte die gespeicherte Konfiguration ersetzt. Speichern wird jetzt abgelehnt
  (`_loadFailed`), mit einer Meldung.
* **Panel: Speichern übernimmt, was der Server gespeichert hat.** `store.py`
  macht aus Theme-Zahlen Text und aus einem leeren Theme-Namen den Standard; die
  Seite behielt ihre eigenen Werte, der Verlauf erkannte den neuesten Eintrag
  also nicht als aktuellen Stand. Zahlenfelder des Themes schreiben jetzt
  ebenfalls Text.
* **Panel: die zwei Schalter.** `header.hidden` und `layout.hide_sidebar` sind
  auch Schalter-Entitäten. Vor dem Speichern liest die Seite sie erneut und
  übernimmt den Wert des Servers, außer sie wurden auf der Seite geändert
  (`_takeSwitches()`).
* **Panel: Importe.** Der Haupt-Import schrieb seinen Fehler in den Theme-Dialog
  (erstes `.modal-error` im Dokument); er akzeptierte jedes Objekt und setzte
  alles zurück, was die Datei nicht enthielt – jetzt braucht er mindestens
  einen bekannten Abschnitt und ersetzt nur die vorhandenen Abschnitte. Ein
  Theme-Import ohne bekannte Variable leerte beide Modi, bevor der Fehler
  gemeldet wurde. Der Header-Import behandelte `"false"` als wahr, eine leere
  Zahl als 0 und akzeptierte eine Datei, die nur `hidden` enthielt. Der
  YAML-Leser verlor `primary-color: #03a9f4 # comment`. Ein leeres Theme wird
  nicht mehr als Name ohne Inhalt exportiert.
* **Panel: Eintragsliste.** `_move()` ließ einen Eintrag über seine eigene
  Überschrift springen und aktualisierte `parent` nie (`_leaveGroup()` leert es
  jetzt, wenn der Eintrag nicht mehr direkt in seiner Gruppe liegt);
  `_dropBefore()` verschob eine auf ihr eigenes Kind gezogene Überschrift ans
  Ende; `_childrenOf()` legte als Nebeneffekt Standard-Eintragskonfigurationen
  an. Der delegierte `input`-Handler speicherte `"on"` für Checkboxen und einen
  Schlüssel `undefined` für die Icon-Auswahl.
* **Panel: leere Zahlenfelder** gehen auf den Standard des Feldes zurück statt
  auf 0 (`_defaultOf()`); 0 ist bei den Deckkräften ein echter Wert.
* **Panel: Kleinigkeiten.** Ein Timer für die Statusmeldung (Fehler bleiben 5 s),
  Rückmeldung, wenn ein Zurücksetzen fehlschlägt, Header- und Verlaufsdialog
  schließen bei einem Klick auf den Hintergrund, eingebaute Panels werden über
  `panel.<title>` benannt wie in der Sidebar (nicht an einem laufenden Home
  Assistant geprüft).
* **Injector: Werte im CSS.** Ein neues `css()` verwirft Werte mit `;`,
  geschweiften Klammern, Kommentaren, einem Backslash, einem Zeilenumbruch oder
  unausgeglichenen Klammern / Anführungszeichen, bevor sie in eine Deklaration
  gelangen; Namen, Icons und das freie CSS-Feld sind nicht betroffen.
  `color-mix()` wird nur für echte Farben benutzt (`CSS.supports`).
* **Injector: Stylesheets.** `bindSidebar()` vergisst die Stylesheets von Roots,
  die eine neue Sidebar überleben (`<home-assistant>`, Drawer, `hui-root`,
  Benachrichtigungs-Drawer), nicht mehr – ihr altes CSS blieb angehängt und ließ
  sich nicht mehr ändern. Die Liste der Stylesheets wird um abgehängte Roots
  bereinigt. Das Header-CSS beachtet `advanced.enabled`.
* **Injector: Sidebar.** Eingeklappte Überschriften blenden ihre Einträge nur aus,
  solange die Überschrift existiert, sichtbar und einklappbar ist;
  Überschriften reagieren auf Enter / Leertaste; `applyName()` bemerkt, wenn
  Home Assistant eine Beschriftung ändert, und schreibt in den vorhandenen
  Textknoten (`setText()`), damit Lit ihn weiter aktualisieren kann; nicht
  aufgeführte Einträge bekommen `order: 100000` statt 500; veraltete
  `data-sh-action`-Markierungen werden entfernt; die Warnung vor einer alten
  Version wird einmal protokolliert; `/config` wird ab dem Pfadanfang geprüft.
* **Backend.** Neuer Websocket-Befehl `ha_style_hub/subscribe` leitet gespeicherte
  Konfigurationen an jeden Benutzer weiter – Home Assistant erlaubt nur
  Administratoren, das Ereignis direkt zu abonnieren; der Injector fällt auf das
  Ereignis zurück, wenn der Befehl fehlt. Die Upload-View räumt keine Bilder
  mehr auf (ein ungespeicherter früherer Upload konnte gelöscht werden) und
  nimmt `hass` aus ihrem Konstruktor. `_with_unit()` / `_length()` nutzen
  denselben Test auf einfache Zahlen wie das Panel (`nan`, `inf`, `1e3`
  bekommen kein `px` mehr).
* **Entfernt:** vier ungenutzte Texte (`settings_preview`,
  `settings_icon_radius_hint`, `no_admin`, `copied`), zwei CSS-Regeln, die auf
  nichts passten, ein doppelter Schlüssel in `THEME_FALLBACK`, der ungenutzte
  Parameter `ownFallback`, eine tote `::part(end)`-Regel im Kachel-Look.

## 1.3.1

* **Theme: Dashboard-Hintergrund und Zustandsfarben.** 22 neue Variablen
  (`THEME_VARIABLES` in `const.py` und `THEME_GROUPS` im Panel, durch `keys.py`
  im Gleichschritt gehalten). `--lovelace-background` liest `hui-view-background`
  (`background: var(--view-background, var(--lovelace-background,
  var(--primary-background-color)))`), jeder CSS-Hintergrundwert ist also
  gültig. Die Zustandsfarben sind die Namen, die das Frontend für eine Entität
  nachschlägt: `--state-<domain>-<state>-color`, dann
  `--state-<domain>-active|inactive-color`, dann `--state-active|inactive-color`.
  Home Assistant definiert für die meisten Domains in seinem eigenen CSS eine
  Farbe (zum Beispiel `--state-light-active-color: var(--amber-color)`), die
  allgemeine `--state-active-color` wird für sie also nie erreicht – daher ein
  Feld pro Typ. Variablennamen mit Unterstrich (`media_player`, `fan_only`,
  `alarm_control_panel`) sind jetzt erlaubt, auch im YAML-Import. Gegen Frontend
  20260826 geprüft. Die Vorschau bekam einen Hintergrund für die
  Dashboard-Ansicht und zwölf Zustands-Icons, deren Rückfall die eigene Farbe von
  Home Assistant ist.
* **Theme: Verlauf für den Dashboard-Hintergrund.** Ein Häkchen *Farbverlauf
  verwenden* unter dem Dashboard-Hintergrund zeigt eine zweite Farbe und eine
  Richtung (dieselben neun Möglichkeiten wie bei Sidebar und Kopfzeile). Pro
  Modus als die Extras `dash_gradient`, `dash_color2`, `dash_direction`
  gespeichert; das Feld `--lovelace-background` bleibt „Farbe 1“.
  `theme.background_value()` setzt das endgültige CSS zusammen
  (`linear-gradient(<Richtung>, <Farbe 1>, <Farbe 2>)` oder
  `radial-gradient(circle at 50% 0%, ...)`), das Panel macht in
  `backgroundValue()` dasselbe für die Vorschau und den YAML-Export, und
  `keys.py` plus ein Test mit 13 Fällen stellen sicher, dass beide dieselbe
  Zeichenkette erzeugen. Eine fehlende Farbe fällt auf
  `var(--primary-background-color)` / `var(--secondary-background-color)`
  zurück.
* **Theme: Hintergrundbild hochladen.** Ein Dateidialog statt eines getippten
  Pfades. Das Panel schickt die Rohbytes per POST an
  `/api/ha_style_hub/background` (authentifiziert, nur Administratoren, bis
  8 MB, Typ aus den ersten Bytes erkannt: PNG, JPEG, GIF, WebP). Die Datei wird
  als `<config>/www/ha_style_hub/background-<12 Hex des sha256>.<ext>`
  gespeichert und mit ihrer URL `/ha_style_hub-media/<name>` beantwortet, die
  die Integration über einen eigenen statischen Pfad ausliefert (beim Setup
  angelegt; `/local` wird nicht benutzt, weil es nur existiert, wenn `www` beim
  Start da war). Ins Theme wird nur genau diese URL-Form akzeptiert
  (`is_media_url()`), weil sie in `url('...')` landet. Extras: `dash_image`,
  `dash_image_size` (leer = cover, `contain`, `tile`), `dash_image_scroll`
  (Standard: `fixed`). Das Bild ist die oberste Ebene des Hintergrunds, der
  Verlauf oder die Farbe liegt darunter. Ungenutzte Dateien werden beim
  Speichern, Zurücksetzen und Hochladen entfernt (nie Dateien, die jünger als
  zehn Minuten sind, nie Dateien, auf die Konfiguration oder Verlauf noch
  verweisen, nie Dateien, die nicht zu unserem Namensmuster passen); beim
  Deinstallieren der Integration werden die Bilder entfernt. In der
  Panel-Vorschau benutzt das Bild `scroll` statt `fixed`, weil `fixed` gegen das
  Browserfenster positioniert würde, nicht gegen die kleine Vorschau.
* **HA-Settings: Gruppenköpfe von Tabellen.** Vier neue Schlüssel
  (`table_group_background`, `table_group_color`, `table_group_size`,
  `table_group_weight`). Das Stylesheet geht in den Shadow Root jeder
  `ha-data-table` unterhalb von `/config` und gestaltet `.group-header` (ein
  `div.mdc-data-table__cell.group-header`; Home Assistant gibt ihm den
  Seitenhintergrund und `--ha-font-weight-medium`). Die Größe ist auf 8–40 px
  begrenzt, die Stärke auf `normal`, `bold` oder 100–900; alles andere wird
  ignoriert. Eine später erscheinende Tabelle wird vom selben Polling erfasst
  wie die anderen Einstellungsseiten.
* **HA-Settings: Listenansicht für Apps.** Neuer Schlüssel `list_apps`. Die Seite
  *Apps* ist `ha-config-apps-installed`: ein Raster (`.content`) aus
  `ha-card[role=button]`, jede mit einem `supervisor-apps-card-content`, das
  einen eigenen Shadow Root hat (`.app` mit Icon, Titel und Beschreibung,
  `.footer` mit Zustand und Tags). Es werden zwei Stylesheets geschrieben: eines
  in die Seite (eine Spalte, Zeilenhöhe, Abstand, maximale Breite, Rahmen, Ecken,
  Hover) und eines in jeden Karteninhalt (eine Flex-Zeile, Beschreibung mit
  Auslassungspunkten, Tags vor dem Zustand, keine Fußzeile). Die
  `supervisor-apps-card-content`-Elemente der Seite *App installieren* bleiben
  unberührt, weil die Prüfung nach dem Host des umgebenden Roots geht. Der Hover
  von Home Assistant (`ha-card:hover { background-color }`) wird auf die
  Kartenfarbe zurückgesetzt, solange eine Hover-Farbe gesetzt ist, sonst wären
  beide sichtbar.
* **Fix: Farbfeld nach dem Zurücksetzen-Button.** Das kleine Farbfeld neben einem
  Textfeld wurde nicht zurückgesetzt, wenn das Feld mit dem Kreuz geleert wurde –
  der Text und der gespeicherte Wert wurden es, das Farbfeld behielt die alte
  Farbe. Es geht jetzt auf neutrales Grau zurück und folgt, wenn ein Hex-Wert
  getippt wird (auch bei den Farben der Sidebar-Einträge). Ein Wert, den das
  Farbfeld nicht anzeigen kann (`rgb(...)`, ein Verlauf), lässt es grau statt
  schwarz.
* **Fix: Abstand unter „Einstellungen“ im Kachel-Look.** Ein Eintrag mit
  Zählerblase (Einstellungen mit Updates, Benachrichtigungen) lässt Home
  Assistant den `end`-Bereich des Zeilenelements anzeigen (die Basisklasse
  `ha-row-item` des Listeneintrags blendet ihn nur aus, solange nichts in ihn
  eingesetzt ist). Die Blase darin ist im Kachel-Look ausgeblendet, aber der
  leere Bereich blieb als dritte Zeile der Kachel: Icon und Beschriftung rutschten
  um einen halben Abstand nach oben, unter der Beschriftung war also mehr
  Platz als bei Kacheln ohne Blase. Der Bereich ist im Kachel-Look jetzt
  ausgeblendet. Im Zeilen-Look wird er weiterhin angezeigt.
* **HA-Settings: neue Anordnung.** Auf einem breiten Bildschirm steht die Karte
  *Tabellen: Gruppenköpfe* jetzt in der linken Spalte unter den Menüpunkten, die
  Listenansicht und der Export in der rechten (`break-before: column` an der
  Karte der Listenansicht). Auf einem schmalen Bildschirm bleiben die Karten in
  einer Spalte in derselben Reihenfolge.
* **Theme: neue Anordnung.** Die Gruppe *Typografie* (Schrift, Skala, Stärke) steht
  direkt nach *Karten* statt ganz am Ende, damit die beiden Spalten der Seite
  etwa auf gleicher Höhe enden. In `THEME_GROUPS` (Panel) und `THEME_VARIABLES`
  (`const.py`) wurden die drei Variablen entsprechend verschoben – `keys.py`
  prüft, dass beide Reihenfolgen gleich bleiben.

## 1.3.0

* **Listenansicht von Geräte & Dienste: Rahmen.** Vier neue Felder auf der Seite
  HA-Settings: **Rahmenbreite** (0–8 px), **Eckenradius** (0–60 px),
  **Rahmenfarbe** und **Rahmenfarbe bei Problemen**. Breite und Radius werden
  als −1 gespeichert, wenn das Feld leer ist (= so, wie Home Assistant zeichnet),
  damit 0 „kein Rahmen“ und „scharfe Ecken“ bedeuten kann. Home Assistant
  kennzeichnet Integrationen mit einem Einrichtungsfehler, einem fehlgeschlagenen
  Entladen oder solche, die nicht geladen sind, über die Zustandsklassen
  `state-error`, `state-failed-unload` und `state-not-loaded` an der Karte; die
  Problemfarbe wird genau für diese gesetzt. Die normale Rahmenfarbe wird
  bewusst nicht darauf angewendet, sonst würde sie den roten Rahmen verdecken.
  Die Felder wirken nur, solange die Listenansicht an ist. Die Vorschau enthält
  eine Zeile im Problemzustand.
* **HA-Settings: Rahmen und Ecken pro Seite, Hover.** 26 neue Schlüssel. Die
  Menüpunkte (`menu_*`) bekommen einen Rahmen und Ecken: Das Stylesheet geht in
  den Root von `ha-config-navigation-list` und gestaltet
  `ha-list-item-button::part(base)`, gemeint ist also die Zeile, nicht das Icon.
  Die Zeilen der Listenansicht (`list_*`) können jede Seite (`*_side_*`) und
  jede Ecke (`*_corner_*`) einzeln setzen; eine leer gelassene Seite oder Ecke
  übernimmt den Gesamtwert oder den von Home Assistant (1 px,
  `--ha-border-radius-lg`). Der Hover liegt über der ganzen Karte
  (`ha-card:hover`, ein Verlauf aus einer Farbe mit `color-mix` für die
  Deckkraft), und der Ripple von Home Assistant, der nur den linken Teil der
  Zeile abdeckt, wird abgeschaltet, solange eine Hover-Farbe gesetzt ist. Die
  deutschen Beschriftungen „Abstand zw. den Zeilen (px)“ und „Maximale Breite
  Liste (px)“ sind kürzer, damit die Felder in einer Zeile stehen.
* **Logo.** Die Kopfleiste des Panels beginnt jetzt mit dem Logo (transparent,
  44 px hoch, zugeschnittene Kopie von 128 × 88 px in
  `www/ha-style-hub-logo.png`, neben dem Panel ausgeliefert; fehlt die Datei,
  bleibt die Kopfleiste einfach ohne). Dasselbe Logo wird als `brand/icon.png`
  (256 × 256 px, quadratisch) und `brand/logo.png` (373 × 256 px) mitgeliefert,
  die lokalen Markenbilder, die Home Assistant 2026.3 und später dem
  Brands-Repository vorzieht. Das Original bleibt in `docs/logo.png`.
* **HA-Settings: Export und Import (JSON).** Eine neue Karte am Ende der Seite,
  wie die auf der Header-Seite. Der Export schreibt `{ "version", "settings" }`;
  der Import akzeptiert das, einen kompletten Konfigurationsexport (nur
  `settings` wird gelesen) oder das nackte Settings-Objekt. Werte werden auf den
  Typ des Feldes gebracht (ein von Hand geschriebenes `"60"` wird 60, Unsinn
  fällt auf den Standard zurück), fehlende Schlüssel nehmen den Standard,
  unbekannte Schlüssel werden verworfen. Der Dialog lässt sich mit Abbrechen,
  Escape oder einem Klick daneben schließen; vor *Speichern* wird nichts
  gespeichert.

## 1.2.9

* **Fix: Listenansicht von Geräte & Dienste.** In 1.2.8 wurden die Kartenstile
  gegen eine angenommene Struktur der Integrationskarte geschrieben und griffen
  unter Home Assistant 2026.9 nicht, deshalb blieb jeder Eintrag zweizeilig und
  die Zeilenhöhe wirkungslos. Die Listenansicht folgt jetzt dem echten Markup
  von `ha-integration-card` (Frontend 20260826.7): Die Karte ist eine einzige
  Zeile mit dem anklickbaren Kopf (Logo und Name) links und der Aktionsleiste
  rechts: zuerst die Integrations-Symbole, ganz rechts die Anzahl (etwa „10
  Geräte“). Die Anzahl bleibt ein Link zu den Geräten, der Name ein Link zur
  Integration. Der Injector legt je ein Stylesheet in die Roots von Container,
  Karte und Kartenkopf und lässt andere Seiten, die den Kopf verwenden,
  unberührt. Der Pfeil am Zeilenende und die Trennlinie über der Aktionsleiste
  sind ausgeblendet; das Logo schrumpft bei kleinen Zeilenhöhen (minimale
  Zeilenhöhe 32 px).

## 1.2.8

* **HA-Settings – Menüpunkte der Einstellungsseite.** Neben den abgerundeten
  Boxen gibt es jetzt Felder für die **Farbe der Box** (eine Farbe für alle
  Einträge – praktisch für ein einfarbiges Schema), die **Farbe des Symbols**,
  die **Boxgröße** und die **Symbolgröße**. Home Assistant setzt den Hintergrund
  jedes Icons inline, deshalb wird die Boxfarbe mit `!important` angewendet; die
  Größe wirkt über den Innenabstand um das Icon, weil die Box keine eigene Größe
  hat.
* **Neu: Listenansicht für Geräte & Dienste.** Die Integrationskarten werden als
  schlanke Zeilen angeordnet (Kopf links, Anzahl und Symbole rechts) statt als
  Kartenraster. Zeilenhöhe, Abstand und maximale Breite sind einstellbar. Der
  Injector findet die Seite im Shadow DOM, legt ein Stylesheet in die Roots von
  Container, Karten und deren Fußzeilen und beobachtet den Container, damit
  später geladene Karten dieselbe Behandlung bekommen. Karten, deren Struktur
  nicht erkannt wird, behalten ihre normale Höhe.
* **Überarbeitete Seite HA-Settings** im Stil der Seite Layout: einklappbare
  Einleitung, eine Karte pro Thema, daneben jeweils eine Vorschau.
* **Seite Theme:** Eine einklappbare Box über die volle Breite enthält
  *Grundlagen*, *Vorlagen* und *Farbpalette* nebeneinander. Darunter bleiben die
  Felder links, Vorschau und Export rechts.
* **Willkommenstext:** Der Tipp ist ein grüner Hinweiskasten wie *Wichtig* und
  *Hinweis*; der fehlende Doppelpunkt nach *Wichtig* ist wieder da.
* Umbenannt: *„Einstellungen (Site) von Home Assistant“* und *„Menüpunkte als
  abgerundete Boxen“*. Der englische Import-Button auf der Seite Theme trug die
  Beschriftung *„Importieren“*; behoben.

## 1.2.7

* **Fix – der rote Punkt in der Kopfzeile.** Ein kleiner Punkt erschien vor dem
  ersten Eintrag der Kopfzeile, sobald ein Rahmen um Einzelelemente gesetzt war.
  Home Assistant hält einen leeren Menü-Button (0 × 0 px) in der Leiste, und ein
  echter Rahmen, auch ein dünner, zeichnet auf einem Element ohne Größe einen
  Punkt. Die Rahmen der Buttons werden jetzt als innerer Schatten gezeichnet,
  der auf einem leeren Element nichts malt und die Linie unter dem aktiven
  Reiter nicht überschreiben kann. Der Abstand zwischen den Buttons kommt aus
  `gap` statt aus Rändern.
* **Neuer Menüpunkt HA-Settings** mit der ersten Funktion *Icons als abgerundete
  Boxen* für die Einstellungsseite, samt Eckenradius und Vorschau. Das Panel hat
  jetzt vier Bereiche. Siehe [HA-Settings](README_de.md#ha-settings).
* **Farbpalette aus einer Farbe** auf der Seite Theme – siehe
  [Farbpalette wählen](README_de.md#farbpalette-wählen).
* **Verlauf der zuletzt gespeicherten Stände** mit Wiederherstellung – siehe
  [Der Verlauf](README_de.md#der-verlauf). Er braucht eine zweite
  Speicherdatei (`ha_style_hub.history`) und einen neuen Websocket-Befehl
  (`ha_style_hub/history`, nur Administratoren). Das Ein- und Ausschalten von
  Kopfzeile oder Sidebar über die Schalter-Entitäten wird nicht aufgezeichnet.
* Der Willkommenstext nennt den neuen Menüpunkt, die Palette und den Verlauf.

## 1.2.6

* **Fix – Titelgröße und Schriftstärke auf der Seite Header.** Home Assistant
  zeigt in der Kopfzeile *entweder* den Dashboard-Titel *oder* die Reiter der
  Ansichten, nie beides. Sobald ein Dashboard mehr als eine Ansicht hat, gibt es
  keinen Titel, und die Reiter setzen ihre eigene Schrift, deshalb schienen
  beide Felder nichts zu bewirken. Sie gelten jetzt für den Titel **und** die
  Reiter der Ansichten. (Die Beschriftung lautet *„Titel- und Reitergröße
  (px)“*.)
* **Deckkraft des Hintergrunds (%)** für die Kopfzeile. Die Unschärfe hinter der
  Leiste funktionierte, sie verwischt aber nur, was *hinter* der Leiste liegt –
  bei einer deckenden Farbe ist da nichts zu sehen. Mit einer Deckkraft unter 100
  wird sie sichtbar; ein leerer Hintergrund nutzt die Farbe des Themes. Der
  Hinweis dazu stand bisher nur im Code und wird jetzt unter den Feldern
  angezeigt.
* **Ein Rahmen um jedes Element der Kopfzeile** – die Buttons (Menü, +, Suche,
  Assist, Stift) und die Reiter der Ansichten – mit Farbe, Breite und
  Eckenradius, jede Gruppe einzeln schaltbar. Die Reiter bekommen ihren Rahmen
  als inneren Schatten, damit die Linie unter der aktiven Ansicht bleibt, wo sie
  ist.
* Der Willkommenstext hat 15 px.
* Zwei Beschriftungen auf der Seite Header waren von der Sidebar geliehen
  (*„Rahmen der Einträge“*, *„Rahmenfarbe der Sidebar“*) und sagen jetzt, was sie
  meinen.
* Neue Datei [changelog.md](changelog.md).

## 1.2.5

* Der **Willkommenstext** ist einen Pixel größer, und die Absätze *Wichtig* und
  *Hinweis* stehen in einem Hinweiskasten – ein farbiger Balken links und ein
  Hauch von Hintergrund, so, wie GitHub eine Notiz kennzeichnet. Sichtbar, ohne
  sich vor den Rest zu drängen.
* **Speichern und Verwerfen zeigen ihre Beschriftung wieder,** wenn die Maus auf
  ihnen ruht. Die Beschriftung zeichnet das Panel selbst, statt sie dem Tooltip
  des Browsers zu überlassen: Der lässt sich nicht gestalten, lässt sich Zeit und
  bleibt in manchen Umgebungen ganz aus. Unter den Buttons in der Kopfleiste,
  über ihnen in der Fußleiste, wo unten kein Platz ist.
* Formulierung: Die Checkbox heißt jetzt *„Sidebar ausblenden“*, und die Box auf
  der Seite Header heißt *„HA Button rechts“* (nur deutsch – die englischen
  Texte sagten schon „buttons“).

## 1.2.4

* **Die vier Buttons, die Home Assistant am rechten Ende der Kopfzeile setzt** –
  *Hinzufügen* (+), *Suche*, *Assist* und *Dashboard bearbeiten* – lassen sich
  einzeln abschalten. Home Assistant gibt diesen Buttons nur eine laufende Nummer
  (`button-0`, `button-1`, …), und welche Nummer welcher Button ist, hängt davon
  ab, wie viele sichtbar sind; deshalb wird jeder an seinem Icon erkannt. Ein
  Button, dessen Icon keines der vier ist, bleibt unberührt, und ändert Home
  Assistant einmal ein Icon, hat die passende Checkbox einfach keine Wirkung
  mehr – nichts geht kaputt.
* **Die Willkommenskarte und die Theme-Karte lassen sich wegklappen.** Der Zustand
  wird pro Browser gemerkt, der Willkommenstext muss also nur einmal gelesen
  werden, und die Vorschau auf der Seite Theme rückt nach oben.
* **Speichern und Verwerfen sind jetzt Icons** – eine Diskette und ein
  gebogener Pfeil. Sie brauchen weniger Breite und keine Übersetzung; die
  Beschriftung bleibt als Tooltip und für Screenreader.
* Der **Willkommenstext** wurde neu geschrieben und erklärt jetzt die drei
  Bereiche, die zwei Schalter-Entitäten und wie Speichern, Verwerfen und
  Zurücksetzen funktionieren.
* Die Buttons **Export / Import / Zurücksetzen** unter *Sidebar → Layout*
  bekamen dieselbe erklärende Zeile, die die Boxen von Theme und Header schon
  hatten.

## 1.2.3

* **Die ganze Sidebar lässt sich ausblenden,** mit einer Checkbox unter *Sidebar
  → Layout* und als zweite Schalter-Entität. Der Inhalt daneben bekommt den
  Platz. Man sperrt sich nicht aus: Das Panel bleibt unter `/ha-style-hub`
  erreichbar, und der Schalter ist in Home Assistant.
* **Die Seite Header füllt jetzt die Breite,** aufgebaut wie die Seite Theme: die
  Einstellungen links, Vorschau, Vorlagen und Export rechts, wobei die Vorschau
  beim Scrollen im Bild bleibt.
* **Drei Vorlagen für die Kopfzeile** – *Glas*, *Schlank* und *Abgesetzt* –, die
  die Felder mit einem Klick füllen. Ob die Leiste ausgeblendet ist, bleibt
  unberührt: Das ist eine eigene Entscheidung, keine Frage des Aussehens.
* **Export und Import der Header-Einstellungen als `.json`-Datei,** damit sich ein
  Look an andere weitergeben lässt. Der Import liest auch einen kompletten HA
  Style Hub-Export und nimmt nur den Header-Teil daraus; Sidebar und Theme
  bleiben unberührt.
* Das **Menü** zeigt den aktiven Punkt in der Primärfarbe, demselben Akzent wie
  das Untermenü, und die oberste Ebene ist zwei Pixel größer als das Untermenü,
  damit sich die beiden Ebenen leicht unterscheiden lassen. Die Menüleiste selbst
  wanderte von der Kopfzeilenfarbe von Home Assistant auf den Kartenhintergrund –
  im Standard-Theme *ist* diese Farbe die Primärfarbe, und der aktive Punkt
  wäre darauf unsichtbar gewesen.
* Der **Willkommenstext** erwähnt die Seite Header und die zwei
  Schalter-Entitäten.

## 1.2.2

* **Das Menü wurde neu gebaut.** *Sidebar*, *Theme* und *Header* stehen oben
  nebeneinander; *Sidebar* öffnet ein Untermenü mit *Layout*, *Einträge* und
  *Aussehen*. Wer von der Sidebar weg- und wieder zurückwechselt, landet auf der
  Seite, die dort zuletzt offen war.
* **Die Header-Einstellungen sind auf eine eigene Seite gezogen,** neben *Theme*.
  Sie waren nie Teil des Themes – die Seite Theme teilt alles in Hell und
  Dunkel, die Header-Einstellungen gelten für beide Modi gleichzeitig –, eine
  eigene Seite ist also der richtige Ort.
* **Das Ausblenden der Kopfzeile ist jetzt eine Schalter-Entität.** Sie
  erscheint unter dem Gerät *HA Style Hub* und lässt sich als Button auf ein
  Dashboard legen oder in einer Automatisierung verwenden, statt dafür das Panel
  öffnen zu müssen. Die Checkbox im Panel und der Schalter sind zwei Ansichten
  desselben Wertes und stimmen immer überein: Beide speichern über genau
  denselben Weg, und jeder offene Browser wird sofort aktualisiert.
* Der Untertitel des Panels lautet jetzt *„Configure your Sidebar, Theme &
  Header“*.

## 1.2.1

* **Die Kopfzeile des Dashboards lässt sich gestalten,** in einer eigenen Box
  oben auf der Seite *Theme*, mit einer kleinen Live-Vorschau neben den Feldern:
  Hintergrund (auch als Verlauf), eine Unschärfe dahinter, Höhe, Text- und
  Icon-Farbe, Icon- und Titelgröße, Titelstärke, die Farben der Reiter der
  Ansichten sowie ein Rahmen und ein Eckenradius – ein Wert oder einer pro Seite
  und Ecke, wie überall sonst.
* **Die Kopfzeile lässt sich mit einem Schalter ausblenden.** Der Inhalt darunter
  rückt von selbst nach oben: Die Höhe wird über `--header-height` gesetzt, und
  Home Assistant berechnet den Versatz der Ansicht aus derselben Variable.
* Während ein Dashboard **bearbeitet** wird, zeigt Home Assistant seine eigene
  Werkzeugleiste mit Speichern und Beenden. Nichts davon berührt sie, und das
  Ausblenden gilt dort nie – ohne diese Leiste gäbe es keinen Weg aus dem
  Editor. Um den Editor bei ausgeblendeter Leiste zu öffnen, hänge `?edit=1` an
  die Adresse des Dashboards an.
* Diese Einstellungen sind **nicht Teil des Themes** und deshalb nicht in Hell
  und Dunkel geteilt: Home Assistant bietet für die Kopfzeile nur drei
  Theme-Variablen an, alles andere erledigt CSS, das die Integration in den
  eigenen Shadow DOM der Kopfzeile schreibt. Ein Satz Werte gilt für beide
  Modi.

## 1.2.0

* **Theme-Vorlagen.** Vier fertige Looks – *Glas*, *Kontrast*, *Flach* und *Warm* –,
  die jeweils beide Modi mit einem Klick füllen. Eine Vorlage schreibt nur in die
  Felder der Seite Theme: Danach ist jeder Wert wie gewohnt bearbeitbar, und
  gespeichert wird erst, wenn du auf Speichern drückst. Sie läuft durch
  denselben Code wie der YAML-Import, eine Vorlage ersetzt also die aktuellen
  Werte, statt sich in sie zu mischen.
* **Optionaler Neustart-Button im Raster.** Home Assistant hat in seiner Sidebar
  keinen solchen Button, dieser wird von der Integration angelegt. Er ist
  standardmäßig aus, nur Administratoren sehen ihn je (niemand sonst darf den
  Dienst dahinter aufrufen), und er fragt immer nach, bevor er neu startet (seit
  1.5.6 in einem eigenen Dialog mit einer Prüfung der Konfiguration). Er ist ein
  regulärer Eintrag: Name, Icon, Farben, Spaltenbreite, Position und
  Überschrift werden unter *Einträge* eingestellt wie bei jedem anderen.
* Das **Icon-Feld wanderte in den aufklappbaren Teil** einer Eintragszeile, der
  jetzt Textfarbe und Hintergrund in einer Zeile und darunter Icon-Farbe und
  Icon-Auswahl enthält. Die Icon-Auswahl von Home Assistant bringt ihre eigene
  Höhe von etwa 56 px mit und bietet keinen Hebel, sie zu ändern – in der
  Hauptzeile hatte sie die Verdichtung aus 1.1.9 rückgängig gemacht.
  Geschlossene Zeilen sind wieder 38 px hoch.
* **Zwischenüberschriften bekamen eine Höhe und einen Schalter für
  Großbuchstaben.** Das Höhenfeld ist standardmäßig leer (0), das behält das alte
  Verhalten bei: Der Text bestimmt die Höhe, und die Überschrift sitzt näher an
  ihren eigenen Einträgen als an denen darüber. Jeder andere Wert gibt der Zeile
  genau diese Höhe und zentriert den Text darin. Großbuchstaben bleiben der
  Standard und lassen sich pro Überschrift abschalten, womit auch der
  Buchstabenabstand entfällt, der nur für sie sinnvoll ist.
* **Fix:** Eine Überschrift konnte ihre Höhe ändern, wenn ihre Gruppe auf- oder
  zugeklappt wurde. Eine Überschrift ist eine Grid-Zelle, und eine Grid-Zelle
  wächst auf die Höhe ihrer Zeile – die von dem abhängt, was daneben sitzt. Das
  Einklappen einer Gruppe ändert, wie die Zeilen angeordnet werden, und die
  Überschrift wuchs oder schrumpfte mit. Sie behält jetzt ihre eigene Höhe, egal
  was ihre Nachbarn tun.
* Die Export-Box der Seite Theme heißt jetzt **„Export und Import (YAML)“** – der
  Import ist seit 1.1.5 darin, die Überschrift hatte nicht nachgezogen.
* Ein Theme, das noch den alten Projektnamen *„Sidebar Hub“* trägt, wird beim
  Laden der Konfiguration in **„HA Style Hub“ umbenannt**. Nur genau dieser alte
  Name; ein eigener Name bleibt unberührt. Hattest du das alte Theme in deinem
  Benutzerprofil ausgewählt, wähle es dort unter dem neuen Namen erneut.

## 1.1.9

* **Fix:** Der Eintrag direkt unter einer Überschrift ließ sich nicht darunter
  einsortieren. Um einen Eintrag zuzuordnen, musste man ihn auf eine *andere*
  Zeile ziehen, und die natürliche Geste für diesen ersten Eintrag ist, ihn genau
  dort nach rechts zu ziehen, wo er schon ist – was der Code als „nichts
  passiert“ behandelte. Das Ziehen nach rechts an Ort und Stelle funktioniert
  jetzt für jeden Eintrag, und ein auf die Überschrift selbst gezogener Eintrag
  wird direkt hinter dieser Überschrift einsortiert.
* Die Eintragsliste ist **deutlich kompakter**: Die Zeilen gingen von 54 auf 38 px,
  und der Abstand dazwischen wurde halbiert.
* `--dark-primary-color` ist **zurück,** und sowohl sie als auch
  `--light-primary-color` heißen jetzt *„Primärfarbe, dunkler Ton“* und *„heller
  Ton“*. Sie sind nicht die Primärfarbe für den Dunkel- und Hellmodus – sie sind
  ein dunklerer und ein hellerer Ton derselben Farbe, die innerhalb eines
  Modus nebeneinander verwendet werden. Die Entfernung der dunklen in 1.1.8
  beruhte auf einer falschen Annahme.

## 1.1.8

* **Einträge lassen sich unter einer Überschrift einsortieren.** Zieh einen Eintrag
  ein Stück nach rechts, und er rastet unter der Überschrift darüber ein; zieh
  ihn zurück nach links, um ihn herauszunehmen. Eine Überschrift nimmt ihre
  Gruppe beim Verschieben immer mit.
* **Überschriften lassen sich einklappen.** Schalte in der Überschriftenzeile
  *„Lässt sich zusammenklappen“* ein, und ein Klick auf die Überschrift in der
  Sidebar klappt ihre Einträge weg. Welche Überschriften eingeklappt sind, wird
  **pro Browser** gemerkt – es ist eine Ansicht, keine Einstellung: In der
  Konfiguration gespeichert, würde es für jeden Benutzer und jedes Gerät
  gleichzeitig gelten, und das Speichern ist Administratoren vorbehalten, ein
  normaler Benutzer könnte also nichts einklappen.
* Überschriften bekamen einen **Rahmen und einen Eckenradius**, jeweils als ein
  Wert oder einer pro Seite und pro Ecke.
* Die **Icon-Felder bieten die eigene Icon-Auswahl von Home Assistant** an, wenn
  sie geladen werden kann; sonst bleiben sie einfache Textfelder.
* *„HA Style Hub aktiv“* heißt jetzt **„Sidebar aktiv“** – es schaltet nur ab, was
  mit der Sidebar passiert. Ein registriertes Theme bleibt davon unberührt.
* `--dark-primary-color` ist von der Seite Theme verschwunden. Bei getrenntem
  Dunkel- und Hellmodus direkt daneben ist die Primärfarbe ohnehin schon pro
  Modus gesetzt.

## 1.1.7

* **Das Projekt heißt jetzt HA Style Hub.** Es kann inzwischen mehr als die
  Sidebar – der Theme-Editor gestaltet Home Assistant selbst –, und der alte Name
  sagte das nicht mehr. Der Integrationsordner und die Domain heißen
  `ha_style_hub`, Home Assistant sieht also eine **neue Integration**: Entferne
  die alte, füge die neue hinzu. Exportiere deine Konfiguration vorher und
  importiere sie danach, nichts wird automatisch übernommen.
* **Zwischenüberschriften.** Das `+` in der Box *Einträge* fügt eine Trennlinie
  hinzu. Sie hat einen Namen, ein Icon und eigene Farben, läuft über die volle
  Breite, hat kein Ziel und verschwindet, solange die Sidebar eingeklappt ist.
  Zieh sie dorthin, wo sie hingehört; das Papierkorb-Icon entfernt sie wieder.
* Der Reiter **Theme** hat keine zweite Scrollleiste mehr. Die rechte Spalte
  bleibt rechts und bleibt nur stehen, solange sie auf den Bildschirm passt –
  tut sie das nicht, scrollt sie einfach mit der Seite mit.
* Ein GitHub-Workflow validiert das Repository bei jedem Push mit hassfest und
  HACS, und ein zweiter hängt an jedes Release ein Zip an, damit Downloads
  gezählt werden.

## 1.1.6

* Eine dritte Vorschaukarte auf dem Reiter **Theme** zeigt einen Dialog auf seinem
  Scrim, einen Markdown-Codeausschnitt und einen Code-Editor, damit die Gruppe
  *Dialog und Code* sichtbar ist, während sie eingestellt wird, und nicht nur in
  Home Assistant selbst.
* Leere Felder folgen dort den eigenen Rückfallwerten von Home Assistant: Die
  Dialogfläche und der Code-Editor fallen auf den Kartenhintergrund zurück,
  Markdown-Code auf den Seitenhintergrund. Ohne eigene Scrim-Farbe dunkelt die
  Vorschau den Hintergrund so ab, wie Home Assistant es tut.
* Die Gruppe *Cards* behält ihren englischen Namen auch auf Deutsch – so heißen
  sie in Home Assistant durchgängig.

## 1.1.5

* **Themes lassen sich importieren.** Wähle auf dem Reiter **Theme** eine
  Theme-Datei oder füge ihren Inhalt ein: einen Export von hier, eine Datei aus
  deinem Ordner `themes` oder den Block `themes` einer `configuration.yaml`. Die
  Werte landen in den Feldern und lassen sich sofort weiterbearbeiten, und genau
  das ist der Punkt – ein vorhandenes Theme mitbringen und hier weiter
  verfeinern.
* Übernommen werden nur die Variablen, die diese Seite anbietet; alles andere
  bleibt zurück und wird gezählt, damit klar ist, was nicht mitgekommen ist.
  `rgb-*`-Variablen werden nicht gezählt, die leitet Home Assistant selbst ab.
* Ein Rahmen oder Radius, der als Kurzschreibweise mit vier Werten
  (`0px 3px 3px 0px`) geschrieben ist, wird in die vier Felder zurückgeteilt, mit
  eingeschaltetem Schalter, damit er bearbeitbar bleibt, statt als Zeichenkette
  in einer Box zu sitzen.
* Enthält die Datei mehrere Themes, erscheint ein Dropdown zur Auswahl.
* Der Import ersetzt das aktuelle Theme, statt sich hineinzumischen. Der
  Theme-Name bleibt, wie er ist, und gespeichert wird erst bei **Speichern**.

## 1.1.4

* Das breite Layout ist jetzt der Standard – der Schalter dafür ist weg. Aussehen,
  Theme und Layout nutzen die volle Breite und fallen auf einem schmalen
  Bildschirm von selbst auf eine Spalte zurück.
* **Der Reiter Erweitert ist weg.** Seine zwei Boxen sind dorthin gezogen, wo sie
  hingehören: die Box *Erweitert* zu **Layout**, *Zusätzliches CSS* zu
  **Aussehen**. Vier Reiter bleiben: Layout, Einträge, Aussehen, Theme.
* Eine kurze Einleitung oben auf dem Reiter **Layout** erklärt, was die vier
  Reiter tun und wie das Speichern funktioniert.
* **Fix:** Schriftskala und Schriftstärke hatten in der Theme-Vorschau keine
  Wirkung. Die Vorschau benutzte feste Pixelgrößen, deshalb kam nur die
  Schriftfamilie durch. Sie beginnt jetzt bei der eigenen Basis von Home
  Assistant (14 px mal die Skala), und alles darin folgt.
* **Fix:** Eine als einfache Zahl getippte Rahmenbreite oder ein Eckenradius
  bewirkte nichts. CSS verwirft eine Länge ohne Einheit, „5“ wurde also einfach
  fallen gelassen – jetzt wird daraus „5px“. Ein Wert, der schon eine Einheit hat
  (`1rem`, ein `var()`), bleibt unberührt, und die Beschriftungen sagen px.
* Die vier Werte für die Seiten und die Ecken stehen jetzt immer in einer Zeile,
  auf dem Reiter Theme genauso wie auf dem Reiter Aussehen.
* Die `rgb-*`-Variablen werden nicht mehr ins Theme geschrieben. Home Assistant
  leitet sie selbst ab, aus jedem Hex-Wert statt aus den sechs, die hier fest
  einprogrammiert waren.

## 1.1.3

* Das breite Layout ist jetzt eine eigene Einstellung in der Box **Erweitert** und
  gilt nur dort, wo es hilft: **Aussehen**, **Theme** und **Erweitert**. Layout
  und Einträge bleiben einspaltig.
* Die Karten sitzen nicht mehr in einem Raster, sondern fließen wie
  Zeitungsspalten, folgen also direkt aufeinander, statt eine Lücke zu lassen,
  wenn die Karte daneben gerade höher ist.
* **Theme:** Die Vorschau, die Theme-Box und der Export bleiben rechts verankert,
  während die Variablen links scrollen – kein Zurückscrollen mehr, um zu sehen,
  was eine Farbe bewirkt hat.
* **Theme:** Die Box *Sidebar* ist weg. Die Sidebar hat einen eigenen Reiter mit
  weit mehr Einstellungen als fünf Theme-Variablen.
* **Theme:** Kartenrahmen und Eckenradius lassen sich pro Seite und pro Ecke
  setzen, mit denselben Schaltern wie auf der Seite Aussehen.
* **Theme:** Schrift, Skala und Stärke sind jetzt Dropdowns statt freier Texte.

## 1.1.2

* **Neu: ein Theme-Editor.** Der neue Reiter **Theme** baut ein echtes Home-Assistant-Theme
  aus 57 Variablen in zwölf Gruppen, getrennt für Dunkel und Hell. Das Theme wird
  zur Laufzeit registriert, erscheint also in der Theme-Auswahl jedes
  Benutzerprofils, ohne `configuration.yaml` anzufassen. Auf Wunsch wird es
  gleich als Standard-Theme gesetzt.
* Eine **Live-Vorschau** mit zwei Beispielkarten – einem Dashboard und einer
  Einstellungsseite – zeigt die Werte des gerade bearbeiteten Modus. Leere Felder
  werden so gezeichnet, wie Home Assistant selbst sie zeichnen würde.
* *„Nach Hell / Dunkel kopieren“* übernimmt jeden Wert eines Modus in den anderen,
  *„Diesen Modus leeren“* leert ihn.
* **Theme-Export** als `.yaml`-Datei, fertig für die `configuration.yaml`.
* Die `rgb-*`-Varianten, die Home Assistant für transparente Farben nutzt, werden
  automatisch aus den Hex-Werten abgeleitet.
* `frontend.reload_themes` ersetzt die ganze Theme-Liste durch das, was im YAML
  steht. HA Style Hub hört auf dieses Ereignis und registriert sein Theme erneut,
  es kann also nicht unbemerkt verschwinden.

## 1.1.1

* **Fix:** Die Farben der Info-Badges gingen nach einer Weile wieder verloren. Das
  Panel kannte diese beiden Schlüssel nicht, verwarf sie bei jedem Neuladen der
  Konfiguration und schrieb diese Lücke beim nächsten Speichern zurück. Eine
  Prüfung vergleicht jetzt die Schlüsselmengen aller drei Dateien miteinander.
* **Fix:** Die Schriftstärke hatte keine Wirkung. Ein Dropdown gibt seinen Wert als
  Zahl zurück, und die Zahl wurde weiter hinten in der Kette verworfen.
* Ein Menü-Button sitzt neben Speichern und Verwerfen. Er erscheint immer, wenn
  Home Assistant die Sidebar selbst ausblendet – auf einem schmalen Bildschirm
  oder mit *„Sidebar immer ausblenden“* –, damit die Sidebar von dieser Seite aus
  erreichbar bleibt.
* Die Konfigurationsseite kann auf breiten Bildschirmen in zwei Spalten angezeigt
  werden.
* Für die Sidebar lässt sich eine Schrift auswählen, und die Box *„Text und
  Icons“* wurde neu geordnet: zuerst Farben und Icon-Größe, dann die drei
  Schriftfelder.
* Hover: eine Hintergrund-Deckkraft in Prozent, und die Box heißt jetzt *„Maus
  hover“*.

## 1.1.0

* Neue Option *„Scrollbalken ausblenden“* unter **Layout**. Die Liste scrollt
  weiterhin, nur der Balken verschwindet.
* Hover-Farben sind einstellbar: Hintergrund, Text und Icon, solange die Maus
  über einem Eintrag steht. Ein gesetzter Hover-Hintergrund schaltet die
  Standard-Ripple-Tönung ab, damit die gewählte Farbe die auf dem Bildschirm ist.
* Der Hintergrundverlauf lässt sich in der Oberfläche bauen – ein Schalter, eine
  zweite Farbe und eine Richtung aus einem Dropdown (acht lineare Richtungen plus
  radial). Ein von Hand ins Hintergrundfeld geschriebener Verlauf funktioniert
  unverändert weiter.

## 1.0.9

* Das Benachrichtigungsfenster bekam eigene Textfarben – eine für den Inhalt und
  eine für Kopftext und Icons. Sie erscheinen erst, wenn die Option für das
  Fenster eingeschaltet ist, und fallen, solange sie leer sind, auf die Textfarbe
  der Sidebar zurück. Ein dunkler Kopfhintergrund erzwingt keinen unlesbaren
  Titel mehr.
* *„Zählerblase“* heißt jetzt *„Info-Badge“*, was deutlicher sagt, was es ist.

## 1.0.8

* Im Kachel-Look sitzt die Zählerblase von *Einstellungen* und
  *Benachrichtigungen* jetzt auf dem Icon statt unter der Beschriftung. Ihr
  Hintergrund und ihre Textfarbe lassen sich unter *Aussehen* einstellen.
* Der **Export** speichert jetzt eine `.json`-Datei, statt eine Browser-Eingabe zu
  öffnen. Der **Import** öffnet einen Dialog mit Dateiauswahl und Textfeld und
  meldet defektes JSON direkt, statt das Eingefügte zu verwerfen.

## 1.0.7

* Speichern und Verwerfen sind in die Kopfleiste gewandert, wo sie immer in
  Reichweite sind. Die untere Leiste erscheint jetzt nur noch, wenn die Seite
  lang genug zum Scrollen ist, und sitzt so nicht mehr leer unter kurzen Seiten.
* Neues Feld *„Abstand Icon zu Text“* für den Kachel-Look. Es erscheint nur, solange
  der Kachel-Look tatsächlich greifen kann – im Zeilen-Look sitzen die beiden
  nebeneinander und brauchen keinen zusätzlichen Platz.
* **Fix:** Ausgeblendete Einträge tauchten in der Sidebar wieder auf. Seit 1.0.4
  setzten die Kachel- und Zeilenregeln `display: flex` auf einen zustandsbezogenen
  Selektor, der das `display: none` eines ausgeblendeten Eintrags überwog. Der
  Eintrag wird jetzt einmal in der allgemeinen Regel zum Flex-Container gemacht,
  wo er gegen diese nicht gewinnen kann.

## 1.0.6

* Neues Feld *„Titelfarbe“* im Kopfbereich – der Sidebar-Titel übernahm die Farbe
  des Kopfblocks und ließ sich nicht einzeln einstellen.

## 1.0.5

* Eintragsrahmen lassen sich pro Seite und der Eckenradius pro Ecke setzen, so
  sind eine einzelne Linie unten oder eine einzelne abgerundete Ecke möglich. Ein
  Schalter neben jedem Feld öffnet die vier Einzelwerte; ist er aus, gilt der
  Einzelwert wie bisher für alle Seiten.
* Neue Option *„Benachrichtigungsfenster mitgestalten“*: Hintergrund,
  Kopfhintergrund und Textfarbe werden auf das Fenster übertragen, das sich über
  den Eintrag Benachrichtigungen öffnet. Standardmäßig aus.

## 1.0.4

* **Fix:** Im Kachel-Look wurde die eingestellte Kachelhöhe auf die innere Box
  eines Eintrags angewendet statt auf den Eintrag selbst. Der Eintrag ist das
  Grid-Element, die Grid-Zeile konnte also kürzer werden als ihr eigener Inhalt,
  und die Beschriftung wurde abgeschnitten – am deutlichsten im eingeklappten
  Zustand mit eingeschaltetem *„Einstellungen, Benachrichtigungen und
  Benutzereintrag ins Raster verschieben“*. Kachel- und Zeilenhöhe sitzen jetzt
  am Eintrag, und der bestimmt die Zeilengröße.

## 1.0.3

* Die Icons sind in der eingeklappten Sidebar jetzt immer zentriert, wenn die
  Beschriftungen ausgeblendet sind – vorher blieben sie im Zeilen-Look am linken
  Rand der Zelle, mit leerem Platz daneben.
* Der Kopfblock folgt jetzt einer eigenen eingeklappten Breite. Home Assistant
  hat sie im eingeklappten Zustand fest auf 56 px programmiert, deshalb endete
  sein Hintergrund vor dem Rand der Sidebar; der Menü-Button ist darin ebenfalls
  zentriert.
* Untertitel der Kopfzeile geändert, Fußleiste neu angeordnet: Buttons links, die
  Statusmeldung rechts.
* Die Box *„Zusätzliches CSS“* zeigt ein ausgegrautes Beispiel, solange sie leer
  ist.

## 1.0.2

* **Fix:** *„Beschriftung im eingeklappten Zustand ausblenden“* hatte keine
  Wirkung, sobald die eingeklappte Sidebar mehr als eine Spalte nutzte. Die
  Kachelregeln erzwangen die Beschriftung wieder sichtbar, nachdem die Option
  schon ausgewertet war. Die Entscheidung wird jetzt in diese Regeln hineingereicht,
  statt obendrauf geschichtet zu werden.
* Die Option *„Den festen Block unten verankert lassen“* wurde entfernt. Sie hatte
  immer nur etwas bewirkt, solange *„Einstellungen, Benachrichtigungen und
  Benutzereintrag ins Raster verschieben“* aus war, und dort ist das eigene
  Verhalten von Home Assistant ohnehin das sinnvolle. Bestehende
  Konfigurationen verwerfen den Wert einfach.
* Das Feld *„Spalten (eingeklappt)“* weist jetzt darauf hin, dass mehr als eine
  Spalte eine breitere eingeklappte Sidebar braucht.

## 1.0.1

* **Fix:** Das Frontend-Modul konnte mit *„home-assistant element not found“*
  aufgeben und dann gar nichts anwenden. Es suchte das Element `home-assistant`,
  bevor Home Assistant es aufgewertet hatte, sein Shadow Root fehlte also noch.
  Jede Suche wartet jetzt auf den Shadow Root, und das Modul versucht es weiter,
  statt einmal aufzugeben.
* Startmeldungen sind leiser: Warten wird als Debug protokolliert, eine Warnung
  erscheint erst nach mehreren fehlgeschlagenen Versuchen.

## 1.0.0

* Erstes Release.
