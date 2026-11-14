# Supabase einrichten

Diese Anleitung verbindet das Projekt mit einer echten Datenbank und echten
Konten. Sie ist für uns beide geschrieben und setzt kein Vorwissen voraus.

Supabase ist nur für **Konten, Spielzeit, Freunde und Profilbilder** da. Spiele
und News liegen als Dateien im Repo, siehe [ADDING-A-GAME.md](ADDING-A-GAME.md).

**Wer macht was?** Die Schritte 1 bis 3 macht **einer** von uns, einmalig. Wir
teilen uns ein Supabase-Projekt. Schritt 4 (die `.env`-Datei) macht **jeder**
auf seinem eigenen Rechner. Schritt 5 macht jeder für sein eigenes Konto.

Dauer: etwa 15 Minuten. Supabase ändert seine Oberfläche gelegentlich; wenn ein
Menüpunkt leicht anders heißt als hier, ist trotzdem derselbe gemeint.

## 1. Supabase-Projekt anlegen

1. Auf <https://supabase.com> gehen und mit **Start your project** ein
   kostenloses Konto anlegen (am einfachsten mit dem GitHub-Konto).
2. **New project** klicken.
3. Ausfüllen:
   - **Name:** `NoSpaceStudio`
   - **Database Password:** auf **Generate a password** klicken und das
     Passwort in einem Passwort-Manager speichern. Wir brauchen es im Alltag
     nicht, aber es lässt sich später nur zurücksetzen, nicht wieder anzeigen.
   - **Region:** eine in Europa, z. B. `Central EU (Frankfurt)`.
   - **Plan:** Free.
4. **Create new project** klicken und ein bis zwei Minuten warten, bis das
   Projekt fertig ist.

## 2. Die Datenbank aufbauen (SQL ausführen)

Im Ordner `supabase/migrations/` liegen vier nummerierte Dateien. Jede baut
einen Teil der Datenbank. Sie müssen **in der Reihenfolge ihrer Nummern**
ausgeführt werden, jede genau einmal. In jeder Datei steht in Kommentaren
(Zeilen mit `--`), was die einzelnen Teile tun.

| Datei                  | Was sie anlegt                                            |
| ---------------------- | --------------------------------------------------------- |
| `0001_profiles.sql`    | Profile (Benutzername, Avatar), automatisch beim Anmelden |
| `0002_friendships.sql` | Freundschaften und Freundschaftsanfragen                  |
| `0003_playtime.sql`    | Spielzeit pro Nutzer und die Gesamtspielzeit pro Spiel    |
| `0004_storage.sql`     | Speicherplatz für Profilbilder                            |

Für jede der vier Dateien, beginnend mit `0001`:

1. In Supabase links auf **SQL Editor** klicken.
2. Oben auf **+** und dann **Create a new snippet** (ein leeres Eingabefeld).
3. Die Datei auf dem Rechner öffnen (z. B. in VS Code), **alles** markieren
   (`Cmd + A`), kopieren (`Cmd + C`) und in das Eingabefeld einfügen
   (`Cmd + V`).
4. Unten rechts auf **Run** klicken (oder `Cmd + Enter`).
5. Unten muss **Success. No rows returned** stehen. Dann weiter mit der
   nächsten Datei.

Falls Supabase vor dem Ausführen eine Warnung zeigt (z. B. „destructive
operations“): Das ist in Ordnung, die Dateien entziehen absichtlich einige
Rechte. Mit **Run this query** bestätigen.

**Wenn ein Fehler erscheint:** nichts weiter ausführen, die rote Fehlermeldung
kopieren und Claude zeigen. Eine Datei, die schon erfolgreich gelaufen ist,
nicht noch einmal ausführen (das gäbe den Fehler „already exists“).

**Kontrolle:** Links auf **Table Editor** klicken. Dort müssen vier Tabellen
stehen: `friendships`, `game_stats`, `playtime`, `profiles`. Alle sind leer.

## 3. Anmeldung einstellen

### Adressen erlauben

Supabase verschickt Links per E-Mail (Konto bestätigen, Passwort zurücksetzen).
Es muss wissen, auf welche Adresse diese Links zeigen dürfen.

1. Links auf **Authentication**, dann **URL Configuration**.
2. **Site URL** auf `http://localhost:5173` setzen und **Save changes**.
3. Bei **Redirect URLs** auf **Add URL** klicken, `http://localhost:5173/**`
   eintragen und speichern.

Wenn die Seite später online geht, kommen hier die echten Adressen dazu
(Phase 7).

### E-Mail-Bestätigung

Standardmäßig muss jedes neue Konto seine E-Mail-Adresse über einen Link
bestätigen. Das soll auch so bleiben. Es gibt aber einen Haken: Der eingebaute
E-Mail-Versand von Supabase ist nur zum Testen gedacht und verschickt nur
**wenige E-Mails pro Stunde**. Wer beim Entwickeln viele Test-Konten anlegt,
bekommt irgendwann keine E-Mails mehr.

Zum Entwickeln kann man die Bestätigung deshalb vorübergehend abschalten:

1. **Authentication** → **Sign In / Providers** → **Email** aufklappen.
2. **Confirm email** ausschalten und speichern.

Neue Konten sind dann sofort angemeldet. **Vor dem Online-Gehen wieder
einschalten** (und einen richtigen E-Mail-Versand einrichten, Phase 7).

## 4. Die `.env`-Datei ausfüllen (jeder auf seinem Rechner)

Die App muss wissen, mit welchem Supabase-Projekt sie sprechen soll. Das steht
in einer Datei namens `.env`, die nur lokal existiert und nie zu GitHub
hochgeladen wird.

1. Im Terminal im Projektordner die Vorlage kopieren (nur, falls es noch keine
   `.env` gibt):

   ```bash
   cp .env.example .env
   ```

2. In Supabase oben auf **Connect** klicken (oder **Project Settings** →
   **API Keys** bzw. **Data API**). Dort stehen zwei Werte:
   - die **Project URL**, z. B. `https://abcdefghijkl.supabase.co`
   - der öffentliche Schlüssel. Er heißt **anon public** oder
     **Publishable key** (beginnt mit `eyJ…` oder `sb_publishable_…`).
3. Die `.env` öffnen und beide Werte eintragen, ohne Anführungszeichen und
   ohne Leerzeichen:

   ```
   VITE_SUPABASE_URL=https://abcdefghijkl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. Den Dev-Server neu starten: im Terminal mit `Ctrl + C` beenden, dann

   ```bash
   npm run dev
   ```

   Die `.env` wird nur beim Start gelesen. Ohne Neustart ändert sich nichts.

> **Wichtig:** Niemals den Schlüssel **service_role** bzw. **Secret key**
> eintragen. Der umgeht alle Schutzregeln der Datenbank und darf nie in die
> App, nie in die `.env` und nie zu GitHub. Der öffentliche Schlüssel dagegen
> ist ungefährlich; ihn dürfen wir uns auch per Chat schicken.

**Kontrolle:** <http://localhost:5173/sign-in> öffnen. Der gelbe Hinweis
„Accounts are not connected yet“ über dem Formular ist verschwunden.

## 5. Konto anlegen

1. In der App oben rechts auf **Sign in**, dann **Create an account**.
2. Benutzername, E-Mail und Passwort eingeben. Neben dem Benutzernamen
   erscheint ein grüner Haken, wenn er noch frei ist.
3. Falls die E-Mail-Bestätigung eingeschaltet ist: den Link in der E-Mail
   anklicken. Danach ist man angemeldet.
4. Kontrolle in Supabase: **Table Editor** → Tabelle **profiles**. Dort steht
   jetzt eine Zeile mit dem eigenen Benutzernamen.

## Wenn etwas nicht klappt

| Problem                                                   | Ursache und Lösung                                                                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gelber Hinweis „Accounts are not connected yet“ bleibt    | `.env` fehlt, enthält noch die Beispielwerte oder der Dev-Server wurde nicht neu gestartet.                                                                            |
| Beim Registrieren: „This username is no longer available“ | Der Name wurde gerade vergeben. Erscheint das bei **jedem** Namen, ist `0001_profiles.sql` nicht (vollständig) gelaufen.                                               |
| Es kommt keine E-Mail an                                  | Spam-Ordner prüfen. Sonst ist das Stundenlimit erreicht: eine Stunde warten oder die Bestätigung zum Entwickeln abschalten (Schritt 3).                                |
| Der Link in der E-Mail führt auf eine Fehlerseite         | Die Adressen aus Schritt 3 fehlen, oder der Dev-Server läuft nicht.                                                                                                    |
| „Email not confirmed“ beim Anmelden                       | Erst den Link in der Bestätigungs-E-Mail anklicken. Notfalls in Supabase unter **Authentication** → **Users** das Konto löschen und neu registrieren.                  |
| Nach einer Woche Pause: nichts lädt mehr                  | Kostenlose Projekte werden bei Inaktivität pausiert. Im Supabase-Dashboard auf **Restore project** klicken. (In Phase 7 bauen wir einen automatischen Schutz dagegen.) |
