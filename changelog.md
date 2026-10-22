# Changelog

The most important steps of every version of **HA Style Hub** (until 1.1.6 the
project was called *Sidebar Hub*). The long-form notes for each release are in
the [README](README.md#changelog).

Version numbers count up to `.9` and then move on to the next minor (1.2.9 →
1.3.0 → 1.3.1 → 1.3.2 → 1.3.3 → 1.3.4 → 1.3.5 → 1.3.6 → 1.3.7 →
1.3.8 → 1.3.9 → 1.4.0 → 1.4.1 → 1.4.2 → 1.4.3 → 1.4.4 → 1.4.5 →
1.4.6 → 1.4.7 → 1.4.8 → 1.4.9 → 1.5.0 → 1.5.1 → 1.5.2 → 1.5.3 → 1.5.4 → 1.5.5 → 1.5.6).

## 1.5.6

- **Restart in the look of the theme:** the restart entry of the sidebar and
  the restart button of the header open an own dialog instead of the browser
  window. It checks the configuration right away (like *Check
  configuration*), shows errors and warnings and only allows *Restart* with
  a valid configuration.
- **Header at the bottom:** *Position of the header* (*Top* / *Bottom*) on
  the Header page puts the bar of the dashboards at the lower edge; in the
  edit mode it stays at the top.

## 1.5.5

- **HA-Settings → Devices & services:** with *Style the page of an
  integration as well* switched on, the preview shows a model of an
  integration page (entry with an error, not loaded, normal hub) with all
  settings of the list, including the backgrounds for problems and their
  opacity - as wide as the list.
- **Menu entries of the Settings page:** an own icon per entry (icon picker of
  Home Assistant) under *Order and visibility*.
- **Own sidebar links:** right-click offers *Open link in new tab*.

## 1.5.4

- **Sensors in the header:** the plus of *Links* can add the state of any
  entity (value as Home Assistant formats it, click opens more-info), with
  own icon (picker), icon color, value color and *value only*; updated when
  Home Assistant reports a new value.
- **Collapsed sidebar:** own links, popups and the restart entry show their
  name as a tooltip, like Home Assistant's entries.
- **Settings page:** system monitor, backup and counters use the card shadow
  of the theme.
- **Page of an integration:** own background colors for entries with an error
  and for entries that are not loaded, with one opacity for both (HA-Settings).

## 1.5.3

- **A Lovelace card in the popup:** a popup shows links or a card, pasted as
  YAML from the code editor of a dashboard card (at most 50 KB), read by Home
  Assistant's own YAML parser; custom cards work when installed. Errors in the
  code are shown with their line.
- **Window size per popup:** width and height in px, 0 = automatic (the
  height follows the content up to 85 % of the screen); a fixed height is
  filled by the card. No scroll bar in the window.
- The preview on the Sidebar page shows the real card and the size.

## 1.5.2

- **Popup window:** tiles fill every row evenly - up to four per row on a
  computer, two on a phone.
- **Popup:** how to use it (click, Ctrl-/⌘-click, middle mouse button, closing)
  is shown in the dialog and at the entry.
- **Sidebar page:** suggested dashboard cards next to the sidebar, like on the
  Header page.

## 1.5.1

- **Popup links in the sidebar:** one entry that opens a window with several
  pages (dashboards, panels, settings pages, own paths); edited under
  *Entries* like a link plus its list of pages, with a preview of the window.
- The plus under *Entries* is now *Heading, link, popup*.
- **Quick colors:** *transparent* is always offered.

## 1.5.0

- **Theme preview:** every element in every tile can be clicked and opens the
  groups of its variables with the fields marked.
- **Info page:** the texts of the four areas cover all functions again.
- **Fixed:** the error message of *Create backup now* showed the wrong text and
  disappeared at once; a running backup stays visible after a change of page.
- **Clean-up:** unused texts, CSS rules and constants from older versions
  removed.

## 1.4.9

- **Menu preview with subtitles**, hidden when *hide the subtitle* is set.
- **System monitor:** *Show only own entities* hides processor, memory and
  storage.
- **Integration page:** own row height for entries, devices and sub-entries.
- **Theme preview:** every control in the tile *Controls* opens its groups and
  marks its fields.
- **Ctrl+Z** one step back, **Ctrl+Y / Ctrl+Shift+Z** forward again.
- **Sidebar page** button now inside the preview (bottom left) on Theme and
  Header, removed on HA-Settings.

## 1.4.8

- **Unsaved changes as a list** (click on *n unsaved*): every change with old
  → new value, *Show* and *Reset* per change.
- **Contrast check** for text colors, **quick colors** at every color field,
  **Ctrl+S** saves.
- **Menu entries:** own name, hidden subtitle and own icon colors per entry.
- **System monitor:** up to six own values (entities); **button "Create
  backup now"** below the backup box.
- **Profile page** (Home Assistant 2026.10) styled like the Settings page;
  **page of an integration** styled like the list view.
- **Theme: 229 new variables** (309 in total) - chart colors, energy, weather,
  code editor, design tokens, switches, header edit mode and more - with new
  preview tiles *Chart*, *Energy* and *Controls*.

## 1.4.7

- **Theme preview:** *Card design* and *Cards* also list *Base colors*,
  *Sliders and badges* no longer does.
- **Shadow designer** below the card shadow: templates and sliders for
  direction, distance, blur, spread, color, opacity and inset.
- **Theme preview:** the switches look like `ha-switch` of Home Assistant
  2026.10 (border, thumb), colored from the scale of the primary color.
- **Settings page on a phone:** the system monitor stays side by side, the
  favourites bar fills the width in even rows.
- **Overview box:** a second line for devices, integrations, apps, scenes,
  scripts, blueprints, users and tokens.

## 1.4.6

- **Fix: Devices & services as a list on Home Assistant 2026.10** - row
  height, row background, border and corners apply again; the new card
  structure of 2026.10 is recognised, the old one still works.
- **Simple / All fields** (Header and HA-Settings › Settings page): no field
  is hidden any more. Header: *Simple* expands only the group selected in the
  preview, *All fields* expands all groups.
- **Header: colour of the right side** - new field in *View tabs* for the
  buttons, own links and CPU/RAM/storage; *Tab colour* keeps colouring the
  tabs.
- **Theme: scale of the primary color** - the theme now contains
  `--ha-color-primary-05` … `-95`, computed from the primary color like Home
  Assistant does for its default theme, so newer buttons, switches,
  checkboxes and links follow the theme instead of staying blue.

## 1.4.5

- **Sidebar › Appearance:** the accordion switch next to the title, on by
  default.
- **Panel colors go into the theme:** colors set on the Header page and on
  *Sidebar › Appearance* are taken over automatically into the theme
  variables of the header and the sidebar (dark and light), as far as Home
  Assistant has a variable for them - so an exported theme contains them. A
  value set in the theme by hand stays. New button *Take over colors* in both
  groups.

## 1.4.4

- **HA-Settings › All fields:** menu entries, favourites bar and system monitor
  stand one below the other, each with its title and separated by a line.
- **Favourites:** the look of a favourite uses the full width of its card -
  colours as rows, height, border and corner radius in one row.
- **Theme colors of the sidebar** (new group on *Sidebar › Appearance*): the
  six sidebar variables of Home Assistant (`--sidebar-...`), dark / light.
  Stored, exported and imported with the theme; own values of the Appearance
  page take precedence.
- **Overview box (counters)** on the Settings page: devices, entities,
  integrations, apps, automations, scenes, scripts, custom cards, blueprints,
  users and tokens - each one can be switched on and off, position at the top
  or at the end.
- **Info / Export:** the boxes *Developed by* and *Complete configuration* are
  tinted with the primary colour instead of white.

## 1.4.3

- **HA-Settings:** *Simple / All fields* on the Settings page; *Simple* hides
  rarely used fields while they are on their default.
- **Accordion:** a small icon switch next to *Simple / All* (Theme, Header,
  HA-Settings). Accordion (default): only one group open at a time - the one
  clicked in the preview; off: groups open individually. Remembered per
  browser.
- **Sidebar preview:** collapsed, the menu icon at the top is centred, as the
  injector does it in Home Assistant.
- **Fixed height:** the panel is as high as the window, the preview no longer
  grows or shrinks with the open groups; the field column scrolls on its own.

## 1.4.2

- **Sidebar preview:** the mouse hover of the entries (Appearance) is shown
  when the mouse is over an entry, and *Hide the scrollbars* (Layout ›
  Behaviour) hides the scrollbar of the preview, too.
- **Theme colors of the header:** the four theme variables of the header
  (`--app-header-...`, `--app-theme-color`) moved from the Theme page to the
  Header page (new group, dark / light). The Theme page now has 14 groups.
- **Theme:** new card *Card design* in the preview, it opens the group
  *Cards*. *Palette from one color* is now called *Choose a palette*.
- **HA-Settings › Tables:** new *Row color* (`settings.table_row_background`)
  next to the colour of every second row.
- **Field column:** group titles are tinted with the accent colour (stronger
  while a group is open) and the column is 438 px wide on a PC.
- **Background:** around the preview the page background of the Home
  Assistant theme, so there is no visible edge below the panel.

## 1.4.1

- **Sidebar in the previews:** on the Theme, Header and HA-Settings pages the
  sidebar stands collapsed next to the model, as in Home Assistant (headings
  hidden); a click on it, or on *Sidebar page* below the preview, leads to the
  Sidebar page. Only the Sidebar page has *Expanded / Collapsed*.
- **Sidebar page:** the header and the cards of the dashboard next to the
  sidebar are clickable and lead to the Header page or to the Theme page.
- **Closer to Home Assistant:** the sidebar preview follows the injector more
  closely - gap and inner padding (collapsed at most 4 px), the gap between
  icon and text of the tiles, labels on two lines, headings (size, spacing,
  upper case, icon, caret, colours and borders), the 1 px divider on the right
  and the default border colour of the entries.
- **Fits the screen:** the preview gets smaller so the panel fits the height of
  the window; the field column is 418 px wide on a PC.
- **Theme:** with *All 15 groups*, picking another element closes the groups of
  the previous one.
- **Header preview:** like a typical dashboard - five icon tabs, two text tabs,
  two tabs with icon and text, no title; CPU and memory with a small label above
  the value; the buttons *add*, search, Assist and *edit* (pencil).
- **Header: Show storage space** (new, `header.show_disk`) - free and used
  disk space in front of the buttons, styled like CPU and memory, refreshed
  every minute (administrators only). The card is now called *Buttons on the
  right side*.
- **HA-Settings:** the page switch *Settings page / Devices & services /
  Tables* moved to the top of the field column, in the style of *Layout /
  Entries / Appearance*. System monitor and backup are two separate boxes in
  the preview, the favourites in the header bar are centred, the tip line is
  shown (and clickable).
- **HA-Settings: hover** of the menu entries also applies to the fields of the
  system monitor and the backup box.
- **HA-Settings: Hide the tip below the menu** (new, `settings.hide_tip`).
- **Devices & services:** columns as buttons *1 / 2 / 3* instead of two
  checkboxes; the background colour of the rows sits next to the maximum
  width.
- **Bigger previews:** Devices & services with 15 integrations, the table with
  four areas, 13 rows and a *State* column.
- **Kiosk mode:** *Hide the sidebar completely (kiosk mode)* at the bottom of
  the *Layout* column, like *Hide the header completely (kiosk mode)* on the
  Header page.
- **Fields:** colour fields next to number fields no longer overlap; the
  fields of a section heading are rearranged.

## 1.4.0

- **New layout of the panel ("stage"):** a bar at the top with the four areas
  Sidebar, Theme, Header and HA-Settings, a search over all settings, the
  counter of unsaved changes, Discard, Save and history, plus icons for
  Export / Import and Info.
- **Click in the preview:** every page shows a model of Home Assistant on the
  left. A click on what you want to change opens its fields in the column on
  the right; the chosen part is outlined and labelled. Below the preview:
  *Before* shows the saved state for comparison.
- **Changed fields** show a dot and their previous value; groups and areas
  count changes. Groups fold open and closed, the browser remembers it.
- **Sidebar:** Layout / Entries / Appearance at the top of the field column.
  Entries: the chosen entry folds open right in the list (colours as tiles);
  click an entry in the preview to select it, drag it there to reorder.
  Expanded / collapsed below the preview.
- **Theme:** the preview shows every colourable element (cards, sliders and
  badges, state colours, table, inputs, status colours, dialog and code, text
  and font, dashboard background); a click opens the matching groups.
  *Simple / All 15 groups*, palette and templates as dialogs, dark / light and
  *Copy to light* below the preview.
- **Header:** the header bar is selected in the preview, a click on tabs or
  buttons opens their group; *Simple / All fields* hides rarely used fields
  that are still on their default; templates as a dialog; *Hide the header
  completely* at the bottom.
- **HA-Settings:** the preview shows the Settings page, Devices & services or a
  table; menu entries, favourites bar and system monitor are clickable.
- **Export / Import** on one page, new: the sidebar on its own.
- **Info** page with welcome text, links, support, *HA Style Hub active*, debug
  and reset.
- Tablet (search as an icon, narrower field column, entry or list) and phone
  (areas at the bottom, Discard / Save above them).

## 1.3.9

- **Settings › System** gets the same columns and tiles as the Settings page.
- **Favourites bar:** centred; optionally centred in the header bar of the
  Settings page; each favourite folds out to edit its look (colours, icon,
  height, border, corners, capital letters, icon only).
- **System monitor** on the Settings page: processor, memory and storage, at
  the top or at the end, optionally with graphs; follows the width of the page.
- **Last backup** as a box of its own: when, size, name and location of the
  newest backup, at the top or at the end.
- **Menu entries:** mouse hover with colour and opacity.
- Texts of the welcome box and of the HA-Settings introduction brought up to
  date.
- **Header:** CPU and memory as small values in front of the buttons.

## 1.3.8

- **Settings page: order and visibility.** A new card on the HA-Settings page
  lists the menu entries of Home Assistant's Settings page, block by block.
  The arrows move an entry inside its block, the eye hides it. A block in
  which everything is hidden disappears.
- **Settings page: columns and tiles.** The menu entries in one, two or three
  columns; as tiles the icon stands above the name, without description and
  arrow. With two or three columns the page gets wider (960 / 1280 px).
- **Settings page: favourites bar.** Own links as a row of buttons at the top
  of the Settings page - added with the plus, with name, icon and colour, in
  an order of your own. At most 12.
- **Tables: rows.** A colour for every second row, a hover colour with
  opacity and a font size for all tables of Home Assistant.
- **New logo** in the panel header and as the image of the integration.

## 1.3.7

- **Header: restart button.** *Show the restart button in the header* (box
  *Buttons on the right*) puts the restart button in front of Home Assistant's
  buttons. Only administrators see it, and it asks before it restarts.
- **Header: own links.** The plus in the same box adds a link to a page of
  Home Assistant - picked from the same list as in the sidebar, or an own
  path. The links are listed in the box; name (tooltip), icon and colour can
  be edited there, the arrows change the order, the bin removes a link. They
  appear as buttons in front of Home Assistant's buttons. At most 12.
- **Header: hover for the view tabs.** Background colour and opacity under the
  mouse, in the box *View tabs*.

## 1.3.6

- **HA settings › Devices & services, list view: two or three columns.** Two
  new checkboxes, *Two columns* and *Three columns* (only one applies). The
  rows keep their height, border, background and hover. On a narrow screen the
  list drops to fewer columns by itself - a column never gets narrower than
  260 px. Also applies to the Apps list.
- **Sidebar › Entries: links to pages of Home Assistant.** The plus now opens a
  dialog: *section heading* or *link*. A link is picked from a list -
  automations, scenes, scripts, blueprints, devices, entities, helpers, areas,
  system pages, the tools (states, actions, template, ...) and more - or
  entered as an own path. It becomes a normal sidebar entry: name, icon,
  colours, position, column span, hiding and headings work as for every other
  entry. Links into the settings are only shown to administrators.

## 1.3.5

- **No more flash of the original design.** On the settings pages (menu
  entries, Devices & services list, Apps list, table group headers) and in the
  dashboard header the stylesheet is now written while Home Assistant draws
  the element, not a moment later. The integration hooks into the element
  classes the same way UIX does (`customElements.whenDefined` + wrapping
  `updated`). UIX does not have to be installed. The previous polling stays as
  a fallback.
- **Faster after a page reload.** The last configuration read from the server
  is remembered per browser (`localStorage`), so styling can start before the
  websocket connection is up. The answer of the server replaces it.
- **"HA Style Hub active".** The master switch has its old name back - it
  switches off sidebar, header and HA settings, only a registered theme stays -
  and moved into the box *HA Style Hub Settings*. *Advanced* now only holds
  *Hide the sidebar (kiosk mode)*. The box *HA Style Hub Settings* can be
  folded with a click on its heading; the browser remembers the state. The
  small triangles that mark a foldable box are larger now.
- **New logo** in the panel header and as brand icon / logo.

## 1.3.4

- **Sidebar › Layout, right column rearranged.** *Advanced* now holds *Sidebar
  active* and *Hide the sidebar (kiosk mode)*; *Export and import (JSON)* has
  its own box like on the other pages; *HA Style Hub Settings* holds the debug
  switch and *Reset everything*.
- **Debug output for sidebar, theme, header and HA settings.** With the debug
  switch on, the browser console shows per area what the integration found and
  applied (`[HA Style Hub] [sidebar]`, `[theme]`, `[header]`, `[settings]`).

## 1.3.3

- **Sidebar › Layout: tile and row height for the collapsed sidebar.** Two new
  fields, *Tile height, collapsed* and *Row height, collapsed*. `0` (the
  default) means "same as expanded", so nothing changes until you set a value.
  The expanded fields are now labelled *expanded*.
- **HA settings › Devices & services, list view: background of the rows.** A
  colour or a gradient; empty keeps Home Assistant's card colour. Also applies
  to the Apps list, and a gradient stays visible under the hover colour.
- **Reset button.** It always reset the *whole* configuration (sidebar, theme,
  header, HA settings, switches). It now sits in its own box below
  *Advanced* (orange heading), with a text that lists what is reset and a
  stronger confirmation. The state before stays in the history.
- **Theme page:** the label *Bearbeiteter Modus* is now *Modus* (*Mode*), and
  the mode switch, *Copy to light/dark* and *Clear this mode* fit in one row.
- **Wording.** *Hide the sidebar (kiosk mode)* / *Sidebar ausblenden
  (kiosk-mode)*, *Hide the header (kiosk mode)* / *Header ausblenden
  (kiosk-mode)* (also the names of the two switch entities), and the box
  *Headermenu des Dashboards* (*Dashboard header menu*).

## 1.3.2

A bug hunt through the whole code. No new functions.

- **Fix: saving could overwrite the configuration with defaults** when the
  page had not loaded it (yet) or loading had failed. Saving is blocked then,
  with a message.
- **Fix: a theme import without any known variable emptied both modes** behind
  its error message. The theme now stays as it was.
- **Fix: the error message of the main import dialog** appeared in the hidden
  theme dialog - the import seemed to do nothing.
- **Fix: a half typed color** such as `rgba(0,0,0` broke the whole sidebar
  stylesheet in the live preview (hidden entries came back, the order was
  lost). Values that would break out of a CSS declaration are ignored.
- **Fix: entry list and headings.** The arrows could move an entry above its
  own heading while it stayed assigned to it; dragging a heading onto one of
  its own entries sent the group to the end of the list; moving a heading
  created empty settings for every entry.
- **Fix: entries of a collapsed heading stayed hidden** after the heading was
  hidden or made non collapsible.
- **Fix: a dashboard renamed in Home Assistant** kept its old name in the
  sidebar until a reload.
- **Fix: "disable completely" left the header hidden**, and a hidden header or
  sidebar could stay hidden after the sidebar was rebuilt.
- **Fix: header opacity with a hand written gradient** in the color field
  removed the header background.
- **Fix: emptying a number field** wrote 0 - for an opacity that made the
  header or the hover color invisible. It now goes back to the default.
- **Fix: saving in the panel reset the two switch entities** (hide header,
  hide sidebar) when they had been switched elsewhere in the meantime.
- **Fix: an uploaded background image could be deleted before it was saved**
  when a second image was uploaded more than ten minutes later.
- **Fix: users without admin rights** did not get configuration changes live
  (only after a reload).
- **Fix: the history** did not mark the newest entry as the current state after
  some saves; headings can be collapsed with the keyboard; header and history
  dialog close on a click next to them; several import edge cases.
- Removed unused texts, styles and parameters.

## 1.3.1

- **Theme: dashboard background.** A new group with `--lovelace-background`
  as the background of every dashboard view that has none of its own. The
  preview shows it.
- **Theme: gradient for the dashboard background.** *Use a gradient* shows a
  second color and a direction (down, up, right, left, four diagonals, radial).
  The existing color field becomes the first color. Dark and light are
  separate.
- **Theme: background image.** Pick an image file right in the dashboard
  background box - no path to type. PNG, JPEG, GIF or WebP, up to 8 MB. The
  integration stores it in `www/ha_style_hub/` of the configuration folder and
  serves it itself. The image can fill the view, fit completely or be tiled,
  and stays put or scrolls. It sits on top of the color or gradient. Images no
  saved state refers to any more are deleted automatically.
- **Theme: state colors per device type.** Three new groups (devices, climate,
  security) with 21 colors: light, switch, fan, media player, cover, vacuum,
  binary sensor, person at home; heating, cooling, drying, fan only, auto;
  locked, unlocked, jammed; alarm armed (home, away, night), pending,
  triggered. These types have a color of their own in Home Assistant, so
  *Icon, active* does not change them.
- **HA-Settings: group headers of tables.** A new card sets background, text
  color, font size and font weight of the group headers in the tables
  (automations, entities, helpers, devices, ...).
- **HA-Settings: Apps as a list.** A checkbox under the list view turns the
  Apps page (formerly add-ons) into the same slim rows, with the same height,
  gap, width, border and hover.
- **Fix:** the color field next to a text field goes back to gray when the
  field is cleared with the cross, and follows while a hex value is typed.
- **Fix:** the spacing below "Settings" (and other entries with a counter
  bubble) in the tile look is the same as on the other tiles.
- **HA-Settings: new arrangement.** The card *Tables: group headers* moved to
  the left column, under the menu entries.
- **Theme: new arrangement.** The *Typography* box moved up to directly after
  *Cards*, so the two columns end at about the same height and there is less
  scrolling.

## 1.3.0

- **List view of Devices & services: border.** New fields for the **border
  width**, the **corner radius** and the **border color** of the rows, and a
  separate **border color for problems** (integrations with a setup error or
  that are not loaded - the red rows). Empty means "as Home Assistant draws
  it", 0 is a real value. The preview shows a row with a problem.
- **HA-Settings: border and corners per side.** The menu entries of the
  Settings page get a border and rounded corners; the rows of the list view
  can set each side and each corner separately, like the Appearance page.
- **List view: mouse hover.** A hover color with an opacity for the whole row.
- Shorter labels, so the fields line up: "Abstand zw. den Zeilen (px)" and
  "Maximale Breite Liste (px)".
- **Logo.** The panel header shows the HA Style Hub logo to the left of the
  title. The integration also ships its logo as `brand/icon.png` and
  `brand/logo.png`, which Home Assistant 2026.3 and later show in the
  integration list.
- **HA-Settings: export and import (JSON).** All HA-Settings can be saved as
  a file and read back in, from a file or pasted text. A complete HA Style Hub
  export works too; only its `settings` part is read.

## 1.2.9

- **Fix: list view of Devices & services** now matches the real structure
  of Home Assistant 2026.9: one line per integration - name on the left,
  the symbols and, at the far right, the count ("10 devices"). Clicking the name
  opens the integration, clicking the count opens its devices. The row
  height setting works again; the small arrow at the end of the row is
  hidden.

## 1.2.8

- **HA-Settings, menu entries of the Settings page:** besides the rounded
  boxes you can now set the **box color** (one color for all entries), the
  **icon color**, the **box size** and the **icon size**.
- **New: list view for Devices & services.** The integrations can be shown as
  slim rows instead of a grid of cards - with adjustable row height, gap and
  maximum width, and a preview on the page.
- The HA-Settings page is laid out like the Layout page: an introduction that
  can be folded, then one card per topic, each with its own preview.
- **Theme page:** a folding box on top holds *Basics*, *Templates* and
  *Color palette* side by side; below it the fields on the left and preview
  and export on the right, as before.
- Welcome text: the tip is a green box like *Important* and *Note*; *Wichtig*
  has its colon.
- Renamed: "Einstellungen (Site) von Home Assistant" and "Menüpunkte als
  abgerundete Boxen". The English Import button no longer says "Importieren".

## 1.2.7

- **Fix:** the small red dot in front of the first header entry is gone. The
  border around single elements was also drawn around the empty menu button
  Home Assistant keeps in the bar; borders are now drawn as an inner shadow, so
  empty elements stay invisible.
- **New menu entry "HA-Settings"** for settings of Home Assistant itself.
  First function: the icons on the Settings page as rounded boxes instead of
  circles, with an adjustable corner radius.
- **Color palette from one color** (Theme page): pick a main color and the
  colors of both modes are worked out from it, with readable text.
- **History** (clock icon at the top right): the last 10 saved states, with
  what changed and who saved; one click loads an earlier state back into the
  page.
- Welcome text mentions all of it.

## 1.2.6

- **Fix:** *Title size* and *Font weight* on the header page had no effect on
  dashboards with several views. Home Assistant shows either the title *or* the
  view tabs, never both, and the tabs set their own font. Both fields now apply
  to the title **and** the tabs.
- New field **Background opacity (%)** for the header. The blur behind the bar
  is only visible when the background shows through; it used to be invisible
  with a solid colour and the hint for it was never shown.
- **Borders around single elements** of the header: buttons (menu, +, search,
  assist, pencil) and view tabs get their own border, colour and corner radius.
- Welcome text set to 15 px; label fixes on the header page (border width and
  colour no longer read "entry" / "sidebar").
- This changelog.

## 1.2.5

- Callout boxes for *Important* / *Note* in the welcome text.
- Save / Discard show their label as a tooltip again (drawn by the panel).
- Wording fixes ("Sidebar ausblenden", "HA Button rechts").

## 1.2.4

- Each of the four header buttons Home Assistant adds (+, search, assist, edit)
  can be hidden; recognised by their icon.
- Welcome and theme cards can be folded (remembered per browser).
- Save / Discard became icons.

## 1.2.3

- **Hide the whole sidebar** (checkbox + second switch entity).
- Header page uses the full width, with three templates (*Glass*, *Slim*,
  *Detached*) and JSON export / import.
- Menu: active item in the primary colour, two levels visibly different.

## 1.2.2

- Menu rebuilt: *Sidebar* (Layout, Entries, Appearance) / *Theme* / *Header*.
- Header settings moved to their own page.
- **Switch entity** "Hide the header" for dashboards and automations.

## 1.2.1

- **Dashboard header styling** (background, gradient, blur, height, colours,
  icon and title size, view tabs, border, corners) with a live preview.
- Hide the header; the editor toolbar is never touched.

## 1.2.0

- **Theme templates** (*Glass*, *Contrast*, *Flat*, *Warm*).
- Optional **restart button** in the sidebar grid (administrators only, asks
  before restarting).
- Section headings: height and capital-letters switch; entry rows compact
  again (38 px).
- Fix: a heading changed its height when its group was folded.
- Legacy theme name "Sidebar Hub" migrated to "HA Style Hub".

## 1.1.9

- Fix: the entry directly below a heading can be filed under it.
- Entry list much more compact (54 → 38 px rows).
- `--dark-primary-color` is back, relabelled as a shade, not a mode.

## 1.1.8

- Entries can be filed under headings; headings can be folded (per browser).
- Border and radius for headings; HA's icon picker in the icon fields.

## 1.1.7

- **Renamed to HA Style Hub** (new domain `ha_style_hub` — remove the old
  integration, add the new one, import your export).
- Section headings (dividers) in the sidebar.
- GitHub workflows: hassfest / HACS validation and a release zip.

## 1.1.6

- Third theme preview card (dialog, markdown code, code editor).

## 1.1.5

- **Theme import** (file or paste, several themes in one file supported).

## 1.1.4

- Wide layout is the default; the Advanced tab is gone (boxes moved).
- Fixes: font scale / weight in the preview, unit-less border widths and radii.
- `rgb-*` variables are derived by Home Assistant, no longer written.

## 1.1.3

- Sticky right column on the theme page, newspaper-column card flow.
- Border / radius per side and corner on the theme page; dropdowns for fonts.

## 1.1.2

- **Theme editor**: a real Home Assistant theme from 57 variables in twelve
  groups, dark and light, registered at runtime, with live preview and YAML
  export.

## 1.1.1

- Fixes: info badge colours lost after reload; font weight without effect.
- Menu button in the panel when HA hides the sidebar; font picker; hover
  background opacity.

## 1.1.0

- Option to hide the scrollbar; hover colours; gradient background from the GUI.

## 1.0.9

- Own text colours for the notification drawer; "Counter bubble" → "Info badge".

## 1.0.8

- Badge on the icon in the tile look; export as `.json`, import dialog.

## 1.0.7

- Save / discard in the header bar; gap between icon and label.
- Fix: hidden entries reappeared.

## 1.0.6

- Field for the title colour.

## 1.0.5

- Border per side and radius per corner; notification drawer styling.

## 1.0.4

- Fix: tile height applied to the wrong element (clipped labels).

## 1.0.3

- Centred icons when collapsed; custom collapsed width followed by the header.

## 1.0.2

- Fix: hiding labels while collapsed with several columns.

## 1.0.1

- Fix: startup gave up with "home-assistant element not found"; quieter logs.

## 1.0.0

- First release.
