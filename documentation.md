# Documentation
## Voraussetzungen
Ein wenig Erfahrung in Javascript und Git.

## Installation
Installiere dir Nodejs Version 14.14.0 von der Website. Leider ist Discord.js noch nicht auf die neue Nodejs Version (15.0.1) geupdated worden.

<https://nodejs.org/download/release/v14.14.0/>

Clone dir das Repo. Nähere Details folgen hier später.

Installiere alle im Readme aufgelisteten Module (TODO: npm -i stattdessen testen) mithilfe des npm install Kommandos.

## Benutzung
Wechsle auf deinen eigenen branch, um nicht gegenseitig in Konflikt zu kommen, falls einer ein Feature weiterprogrammiert.

HINWEIS: Halte diesen Branch immer aktuell (wie?), um den 'merge' auf den main branch hinterher einfacher zu machen.

## Interne Strukturen
Das Repo hat einen 'modules' Ordner. Wenn du ein neues Modul (also eine Kategorie/ ein Feature des Bots) kreiren willst, kopiere dir die help.js Datei und benenne sie um. Zur Empfohlenen Struktur eines jeden Moduls komme ich später.

Die API (Application Programming Interface) für den Bot kannst du von überall erreichen. Ein Beispiel siehst du auch in help.js:
```js
let res = bot.api.parse_message(message, attributes);
```
Bot ist eine Globale (von jedem Modul erreichbare) Variable. Sie beinhaltet außerdem das Discord.js client-Objekt. Ein Beispiel ist:
```js
let botName = bot.client.user.username;
```
Nähere Details zu dem 'Client'-Objekt findest du in der Documentation von Discordjs (<https://discord.js.org/#/docs/main/stable/general/welcome>).

### Beispielstruktur für ein Modul
Am Anfang startet jedes Modul (in diesem Falle ist das gleichnamige Nodejs-Modul gemeint) mit ein paar 'require' Ausdrücken. Diese laden die exportierten variablen des angegebenen Moduls in die aktuelle Datei. In diesem Falle läd Nodejs das Nodejs-Modul 'discord.js' in die Konstante 'Discord'.
```js
const Discord = require('discord.js');
```
Damit wir beispielsweise `Discord.Client()` aufrufen können, mussten die Macher von Discordjs die Klasse 'Client' exportieren. Dies geschieht am Ende eines jeden Nodejs-Moduls folgendermaßen:
```js
class Client() {/*...*/}
/*...*/
module.exports.Client = Client
```
Oder so:
```js
class Client() {/*...*/}
/*...*/
module.exports = {Client: Client}
```
Nun aber weiter in der Struktur vom Modul. Bis jetzt hatten wir nur die 'require' Ausdrücke. Anschließend kommt ein wichtiger Teil für den Bot. Ein jedes Modul (hiebei handelt es sich um ein Bot-Modul; kein Nodejs-Modul) muss eine Konstante namens `attributes` beinhalten. Sie ist ein Wörterbuch (Dictionary). Sie muss immer beinhalten:

- `modulename` (also der name des Moduls. Hierbei ist es wichtig den Dateinamen zu nehmen.)

Wenn dein Modul Commands zulassen soll muss `attributes` auch noch folgendes beinhalten:
- `commands` (Eine js-Liste an `bot.api.Command`)

Das `help.js` Modul beinhaltet Commands. Für genauere Informationen Zu den Commands siehe Sektion 'Api'.

Dann muss jedes Modul momentan auch eine Help-Page beinhalten. Dies könnte sich in naher Zukunft ändern. Sie muss, wie auch die attributes, unten exportiert werden.