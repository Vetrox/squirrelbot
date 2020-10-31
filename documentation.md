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

Dann muss jedes Modul momentan auch eine Help-Page beinhalten. Dies könnte sich in naher Zukunft ändern. Dann wird sie in die Attributes verschoben. Sie muss, wie auch die attributes, am Ende der Datei mit der Nodejs-Funktion `module.exports` exportiert werden.

## Api
Ich habe eine eigene Datei namens `api.js` erstellt. Diese werde ich im Laufe der Zeit auch noch mit weiteren Funktionen bestücken. Momentan beinhaltet sie folgende Funktionen (im Sinne von Kategorien):
- Datenbanken
- Commands / Message Handling

### Commands
Die Klasse `bot.api.Command` hat folgende Attribute:
- `name`: Der Name des Commands.
- `description`: Eine Beschreibung des Commands. Diese Kann dem User vermitteln, wie man den Command benutzen kann. Die Beschreibung der einzelnen Parameter geschieht allerdings in der Klasse `Parameter`, zu der ich gleich komme.
- `par_desc_map`: Ein Wörterbuch (Dictionary/Map), das jedem `Parameter`-Namen (hierbei ist der Name, also z.B. `-name`; oder `-required_equal`) das entsprechende `Parameter` Objekt zuweist. Wie ein Parameter Objekt aufgebaut ist zeige ich gleich.


Constructor throws (err = require('error.js')):
- `err.Command`: Wenn der Command mit Unlogischen Daten versucht wurde zu initialisieren.

Member Funktion `check` (die auch in `parse_message` benutzt wird) throws:
- `err.Find`: Wenn ein vom User gegebener Parameter (startet mit einem Minus) nicht in der Liste an Parametern für den Command gefunden wurde.
- `err.ParameterArguments`: Wenn der User einem Parameter die falsche Anzahl an Argumenten gegeben hat.
- `err.ParameterDependency`: Wenn ein Parameter auf anderen Parametern beruht, und diese nicht gesetzt waren und auch nicht default-initialized werden sollen. Später auch: Wenn ein Parameter gesetzt wurde, der auf der Blacklist von diesem Parameter stand.
- `err.ParameterRequired`: Wenn ein Parameter `required` ist, aber nicht default-initialized werden soll und der User vergessen hat ihn zu setzen. 

### Parameter
Die Klasse `bot.api.Parameter` hat folgende Attribute:
- `parname`: Der Name des Parameters. Also z.B. `-name`. Bitte achte darauf, dass Du das `-` vor dem Namen ebenfalls übergibst. Ansonsten wird ein Error erscheinen. Zu Errors in jeder Funktion siehe Sektion 'throws' in jeder Javascript-Funktion (oder auch hier in der Dokumentation).
- `type`: Hier hast du die Möglichkeit anzugeben, dass dein Parameter `required` oder `optional` ist. Gibst du `required` an, checkt die Api darauf, ob der User den Parameter angegeben hat. Sollte er das nicht getan haben, prüft die Api darauf, ob der Parameter das attribut `default_construct` auf `true` stehen hat. Dazu später mehr.
- `dependent_params`: Eine Liste an Parametern, ohne die der Parameter keinen Sinn ergibt. Angenommen du hast einen Parameter Namens `-loglevel`. Es ergibt offensichtlich keinen Sinn, den Parameter anzugeben, wenn der Parameter `-log_channel` (welcher Beispielsweise als Argument den Channel nimmt, in dem er loggen soll) nicht gesetzt ist. Anmerkung: Später wird es hier auch noch die Möglichkeit geben, eine Liste an Parametern auszuschließen.
- `description`: Die Beschreibung zu diesem Parameter. Deshalb musst du nicht alle Beschreibungen von jedem Parameter in die Beschreibung vom Command packen.
- `arg_check_lambda`: Eine Javascript Lambda-Funktion. Sie darf nur `true` oder `false` zurückgeben. Sie überprüft die Anzahl der vom User angegeben Argumente für diesen Parameter. Wenn du möchtest, dass der User nur ein Argument zu deinem Parameter angibt, dann sieht die Lambda-Funktion so aus:
```js
arg_check_lambda = (nr_of_arguments) => return nr_of_arguments === 1; 
``` 
- `default_args`: Eine Liste an Standardargumenten für den Parameter. Ein `-name` Parameter kann beispielsweise als Standardwert `['lorem_ipsum']` haben. Hinweis: Diese Liste ist bald/jetzt nur von nützen, wenn du auch `default_construct` auf `true` gesetzt hast.
- `default_construct`: Kann `true` oder `false` sein. Sagt aus, ob der Parameter mithilfe der `default_args` Liste kreiert werden darf, falls der User ihn weggelassen hat.


Constructor throws (err = require('error.js')):
- `err.InvalidData`: Wenn `parname` nicht mit einem `-` beginnt.

### bot.api.parse_message
Die Funktion nimmt eine `message` (die Rohe Discordjs-Message) und die `attributes` von einem Modul und gibt entweder `false` zurück, wenn die Nachricht nicht zu diesem Modul gehört, oder sie gibt eine strukturierte Information über die Eingegeben Nachricht zurück:
```js
parse_message('!modulName commandName -parameter3 -parameter1 par1arg1 par1arg2', attributes);
// gibt NUR im Modul mit dem Namen Folgendes zurück:
{
	name: 'commandName',
	params: {
		'-parameter1': ['par1arg1', 'par1arg2'],
		'-parameter2': ['default_constructed_argument1'],
		'-parameter3': []
	}
}
``` 
Hier sieht man beispielsweise, dass `-parameter2` ein `dependent_param` von `-parameter3` oder `-parameter1` war. Man sieht auch, dass die Reihenfolge der Parameter keine Rolle spielt.

throws (err = require('error.js')):
- `err.CommandNameNotFound`: Wenn der vom User angegebene Command nicht in der Liste an Commands in dem Modul gefunden wurde.
- `err.Command`: Bei allen Fehlern in der `bot.api.Command.check()` Funktion. Hinweis: Die Fehler beinhalten meistens (später immer) sehr gute Nachrichten (`error.message`), die (wenn ich alle übersetzt habe) auch sehr gut verwendet werden können, um dem User mitzuteilen, was er falsch gemacht hat.
