# HA Style Hub – neues Panel-Layout („Bühne“)

Dieser Ordner enthält die Entwürfe für das neue Layout des Konfigurationspanels
(`custom_components/ha_style_hub/www/ha-style-hub-panel.js`). Es sind statische
HTML-Dateien mit Inline-Styles: Sie zeigen Aufbau, Maße, Abstände und Texte,
enthalten aber keine Logik. Im Browser öffnen oder als Quelltext lesen.

Die Entwürfe sind Vorlagen, kein Code zum Übernehmen. Das Panel bleibt reines
JavaScript ohne Build-Schritt, und alle bestehenden Funktionen bleiben erhalten.

Ein früherer Entwurf („Werkbank“, dunkel, mit Navigation links) lag kurz in
diesem Ordner. Er ist verworfen und durch diesen ersetzt.

## Grundidee

Die Mitte jeder Seite ist ein nachgebautes Home Assistant („Bühne“). Man klickt
dort an, was man ändern will; rechts erscheinen die Felder dazu. Es gibt ein
Vorschaubild für alle Bildschirmgrößen, keinen Umschalter PC / Tablet / Handy.

## Dateien

| Datei | Zeigt | Größe |
|---|---|---|
| `01-sidebar-eintraege.html` | Sidebar › Einträge, PC | 1440 × 900 |
| `02-sidebar-eintraege-tablet.html` | dieselbe Seite, Tablet | 1024 × 768 |
| `03-sidebar-eintraege-handy.html` | dieselbe Seite, Handy | 390 × 844 |
| `04-header.html` | Header | 1440 × 900 |
| `05-theme.html` | Theme | 1440 × 900 |
| `06-theme-dialoge-palette-vorlagen.html` | Theme-Dialoge „Palette aus einer Farbe“ und „Vorlagen“ | 1240 × 700 |
| `07-ha-settings.html` | HA-Settings | 1440 × 980 |
| `08-export-import.html` | zentrale Seite Export und Import | 1440 × 900 |
| `09-import-dialog.html` | Import-Dialog am Beispiel Theme | 720 × 620 |
| `10-info.html` | Info-Seite | 1440 × 1120 |
| `11-header-dialog-vorlagen.html` | Header-Dialog „Vorlagen“ | 820 × 560 |

Jede Datei hat eine feste Größe und ist nicht responsiv. Das Verhalten auf
Tablet und Handy zeigen nur die Dateien 02 und 03; die anderen Seiten sollen
demselben Muster folgen.

## Was verbindlich ist

**Kopfleiste (auf jeder Seite)**

- Links der Name, daneben die vier Bereiche als Umschalter: Sidebar, Theme,
  Header, HA-Settings. Daneben das Suchfeld über alle Einstellungen.
- Rechts in dieser Reihenfolge: Zähler der ungespeicherten Änderungen,
  Verwerfen, Speichern, Verlauf (Uhr-Symbol) – dann ein Trennstrich –
  Export/Import, zum Schluss Info. Verlauf gehört zu Verwerfen und Speichern.
- Tablet: das Such-Symbol steht links neben den Bereichen. Handy: die Bereiche
  stehen als Leiste unten, darüber eine Leiste mit Zähler, Verwerfen, Speichern
  und Verlauf; oben bleiben Suche, Export/Import und Info.

**Bühne und Felder**

- Links die Bühne mit dem Vorschaubild, rechts eine feste Spalte mit den
  Feldern (404 px am PC). Das gewählte Element ist im Vorschaubild umrandet und
  beschriftet („… · ausgewählt“).
- Geänderte Felder tragen einen Punkt; im Feld steht der vorherige Wert
  („geändert, vorher 2“). Gruppen zeigen, wie viele Werte geändert sind.
- Unter dem Vorschaubild steht rechts der Schalter „Vorher“ (gespeicherten
  Stand zum Vergleich zeigen).
- Kein Umschalter PC / Tablet / Handy. Der Umschalter Dunkel / Hell existiert
  nur auf der Theme-Seite.

**Sidebar** (Datei 01)

- Die Unterseiten Layout, Einträge und Aussehen sind ein Umschalter oben in der
  Feldspalte. Es gibt sie nur auf der Sidebar-Seite.
- Einträge: Liste rechts, der gewählte Eintrag ist aufgeklappt und zeigt seine
  Felder direkt in der Liste. Ein Klick auf einen Eintrag im Vorschaubild wählt
  ihn aus.
- Unter dem Vorschaubild: Umschalter Ausgeklappt / Eingeklappt.

**Header** (Dateien 04 und 11)

- Die Kopfzeile ist im Vorschaubild ausgewählt. Felder in Gruppen zum
  Aufklappen; Umschalter „Einfach / Alle Felder“ blendet seltene Felder aus.
- Oben in der Feldspalte ein Button „Vorlagen“. Er öffnet den Dialog aus
  Datei 11 mit Glas, Schlank und Abgesetzt.
- Unten der Schalter „Kopfzeile ganz ausblenden“.

**Theme** (Dateien 05 und 06)

- Das Vorschaubild zeigt alle färbbaren Elemente: Karten, Regler und Badges,
  Zustandsfarben (Geräte, Klima, Sicherheit), Tabelle, Eingabefelder,
  Statusfarben, Dialog und Code, Text und Schrift, Dashboard-Hintergrund.
- Ein Klick auf ein Element öffnet rechts die passende Gruppe aus
  `THEME_GROUPS`. Gezeichnet ist nur der Zustand „Karten ausgewählt“.
- Ein Klick auf die Seitenleiste im Vorschaubild wechselt zur Seite Sidebar,
  ein Klick auf die Kopfzeile zur Seite Header. Beide tragen ein Schild mit
  Pfeil.
- Umschalter „Einfach / Alle 15 Gruppen“. Buttons „Palette aus einer Farbe“
  und „Vorlagen“ öffnen je einen Dialog (Datei 06).
- Unter dem Vorschaubild: Dunkel / Hell und „Nach Hell kopieren“.
- Unten in der Feldspalte: „Theme in Home Assistant eintragen“ und „Gleich als
  Standard-Theme verwenden“.

**HA-Settings** (Datei 07)

- Die Bühne zeigt die jeweilige Seite von Home Assistant. Ein Umschalter unter
  dem Vorschaubild wählt sie: Einstellungsseite, Geräte & Dienste, Tabellen.
- Anklickbar auf der Einstellungsseite: Menüpunkte, Favoriten-Leiste,
  Systemmonitor.
- „Rahmen und Ecken der Menüpunkte“ und „Mouse Hover“ sind von Anfang an
  ausgeklappt.

**Export und Import** (Dateien 08 und 09)

- Eine zentrale Seite, erreichbar über das Symbol in der Kopfleiste. Oben die
  komplette Konfiguration, darunter je eine Karte für Sidebar, Theme, Header
  und HA-Settings. Auf den Einzelseiten gibt es keinen Export/Import mehr.
- „Importieren“ öffnet wie bisher den Dialog mit Erklärung, Dateiauswahl und
  Einfügefeld.

**Info** (Datei 10)

- Erreichbar über das Info-Symbol in der Kopfleiste. Willkommenstext, Autor und
  Links, Support-Buttons, „Debug-Ausgaben in der Browser-Konsole“ und „Alles
  zurücksetzen“. Die beiden Funktionen ziehen aus der bisherigen Box „HA Style
  Hub Settings“ hierher um.

## Was nur Beispiel ist

- **Farben des Panels.** Die Entwürfe zeigen ein festes helles Beispiel mit
  Kobaltblau (`#2440D0`) als Akzent. Das Panel soll weiterhin die Farben des
  aktiven Home-Assistant-Themes verwenden, also die Variablen, die es heute
  schon nutzt (`--primary-background-color`, `--card-background-color`,
  `--divider-color`, `--primary-color`, `--primary-text-color`,
  `--secondary-text-color`). Keine Hex-Werte aus den Entwürfen übernehmen.
- **Text auf der Akzentfarbe.** Im Entwurf ist er weiß. Mit beliebiger
  Primärfarbe muss die Textfarbe zur Helligkeit der Primärfarbe passen. Das ist
  noch nicht gelöst.
- **Farben im Vorschaubild.** Das nachgebaute Home Assistant ist mit einem
  dunkelblauen Beispiel-Theme gezeichnet. Im Panel zeigt es die Werte, die
  gerade bearbeitet werden.
- **Inhalte.** Einträge, Zähler, Hex-Werte, Pfade und die vier Variablen unter
  „Hintergründe“ sind Beispieldaten. Welche Variable zu welchem Element und in
  welche Gruppe gehört, bestimmt weiterhin `THEME_GROUPS` im Code.
- **Farbstreifen und Vorschaubilder in den Dialogen** (Dateien 06 und 11) sind
  skizziert, nicht die echten Werte der Vorlagen.
- **Schriften.** Die Entwürfe laden Schibsted Grotesk und IBM Plex Mono von
  Google Fonts. Ob das Panel eigene Schriften laden soll oder bei der Schrift
  von Home Assistant bleibt, ist nicht entschieden.

## Texte

Die Erklärtexte stammen aus den bestehenden Übersetzungen im Panel und sollen
bleiben: Import- und Export-Hinweise, Palette, Theme- und Header-Vorlagen samt
Rückfragen, Debug, Zurücksetzen. Abweichungen:

- **Sidebar-Export ist neu.** Bisher gibt es den kompletten Export, Theme (YAML),
  Header und HA-Settings. Ein Export nur für die Sidebar fehlt im Code; Funktion
  und Text (siehe Datei 08) müssen ergänzt werden, auch auf Englisch.
- **Willkommenstext an drei Stellen angepasst** (Datei 10): Bei Layout entfällt
  „Export und Import“; „in der Box HA Style Hub Settings“ heißt „rechts auf
  dieser Seite“; der Schlusssatz verweist auf das Export/Import-Symbol oben
  rechts.
- **Fußzeile der Export-Seite** („Ein Import wird sofort … Der Stand davor
  bleibt im Verlauf.“) ist neu. Ob ein Import im Verlauf landet, ist nicht
  geprüft – Satz anpassen oder streichen.
- **Überschriften der Bühne** („Deine Seitenleiste.“, „Die Farben von Home
  Assistant.“ und die Hinweise daneben) sind neu.
- **Support-Satz auf der Info-Seite** ist noch ein Platzhalter
  (`[DEIN SUPPORT-TEXT]`).
- Alle neuen Texte brauchen einen englischen Eintrag.

## Links auf der Info-Seite

- GitHub: <https://github.com/jayjojayson/ha_style_hub>
- Problem melden: <https://github.com/jayjojayson/ha_style_hub/issues>
- Dokumentation: <https://jayjojayson.github.io/ha_style_hub/>
- Ko-fi: <https://ko-fi.com/jayjojayson>
- PayPal: <https://www.paypal.me/quadFlyerFW>

## Noch offen

- **Anklickbares Vorschaubild.** Das ist der größte Umbau: Heute gibt es
  Vorschauen je Seite, aber keine, in der man Elemente auswählt. Wie das im
  Code gelöst wird, ist nicht untersucht.
- **Theme-Gruppe „Kopfzeile“.** Der Klick auf die Kopfzeile im Vorschaubild
  führt zur Seite Header. Die Theme-Gruppe „Kopfzeile“ ist damit nur über „Alle
  15 Gruppen“ erreichbar. Ob das so bleiben soll, ist nicht entschieden.
- Suche über alle Einstellungen: Im Entwurf gibt es nur das Feld. Wie die
  Trefferliste aussieht, ist nicht entworfen.
- Sidebar › Layout und Sidebar › Aussehen sind nicht entworfen. HA-Settings ist
  nur für „Menüpunkte“ entworfen, die Vorschauen für Geräte & Dienste und
  Tabellen fehlen.
- Tablet- und Handy-Ansichten für Header, Theme, HA-Settings, Export und Info
  fehlen.
- Die Entwürfe wurden nicht im Browser gegengeprüft; einzelne Abstände können
  danebenliegen.
