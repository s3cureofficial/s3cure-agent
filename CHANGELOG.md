# Changelog – S3cure Agent

## 1.1.3 – 2026-11-05

### Verbessert
- **Startseite:** Die Server-Karte zeigt Ring-Anzeigen für CPU, RAM und Platte sowie Laufzeit, Last und Netzwerk.
- **Aktionsfenster:** Neu starten, Stoppen, Logs und Anheften als übersichtliches 2×2-Raster.

### Behoben
- Die kleinen Balken auf der Startseite waren zerschossen (ein neuer Knopf-Stil hat sie überschrieben).
- Die Kopfleiste ist jetzt deckend statt weichgezeichnet – Name und Symbol sind auf dem iPhone wieder gestochen scharf.

### English
- Home card with rings, uptime, load and network; 2×2 action buttons. Fixed broken bars on the home screen and blurry header text on iPhone.

## 1.1.2 – 2026-11-05

### Behoben
- **Nach einem Update zeigte das iPhone weiter die alte App**, wenn ein Proxy davor die Dateien zwischenspeichert (z. B. „Cache Assets“ im Nginx Proxy Manager). App-Dateien tragen jetzt die Versionsnummer in der Adresse und werden nach jedem Update garantiert neu geladen.
- install.sh weist beim Nginx Proxy Manager darauf hin, „Cache Assets“ auszuschalten.

### English
- After an update, iPhones kept showing the old app when a proxy cached the files. App files now carry the version in their URL.

## 1.1.1 – 2026-11-05

### Behoben
- Ein Update (install.sh erneut ausführen) stellte die selbst gewählte Docker-Adresse des Agenten (z. B. 172.17.0.1) wieder um – danach meldete der Nginx Proxy Manager „502 Bad Gateway“. Die eingestellte Adresse bleibt jetzt erhalten.

### English
- Re-running install.sh no longer resets a custom Docker bind address (which caused 502 in Nginx Proxy Manager).

## 1.1.0 – 2026-11-05

### Neu
- **Status neu gestaltet:** Ring-Anzeigen für CPU, RAM und Platte, Laufzeit und Netzwerk, **Top-Prozesse** (nach CPU oder RAM) und **alle Laufwerke** mit Füllstand.
- **Dienste und Container anheften:** Im Aktionsfenster „Anheften“ – angeheftete erscheinen auf der Status-Seite und lassen sich mit einem Tipp neu starten.
- **Passwort ändern** in der App (mit aktuellem Passwort und 2FA-Code; andere Geräte werden abgemeldet).
- **Neues Handy für 2FA:** Zwei-Faktor-Code auf ein anderes Gerät umziehen – umgestellt wird erst nach einem Code vom neuen Gerät.
- **Angemeldete Geräte** ansehen und einzeln oder alle anderen abmelden.
- **Benutzer verwalten** (Admin): anlegen mit QR-Code, Rolle ändern, 2FA zurücksetzen, löschen. Der letzte Admin ist geschützt.
- **Warnungen einstellen** (Admin): Grenzen für Platte, Arbeitsspeicher und Last, Mitteilung bei ausgefallenen Diensten, Name des Servers.
- **Logs teilen oder kopieren.**

### Behoben
- Knöpfe bei „Mitteilungen“ in den Einstellungen überlappten sich.
- Die Schrift in der Kopfleiste wirkte auf dem iPhone unscharf.
- Nach einem Update zeigte die App bis zu einer Stunde noch das alte Aussehen.

### English
- Redesigned status (rings, top processes, all disks), pin services/containers for one-tap restart, change password, move 2FA to a new phone, signed-in devices, user management for admins, alert limits, share logs. Fixed overlapping buttons, blurry header text on iPhone and stale app files after updates.

## 1.0.1 – 2026-11-05

### Verbessert
- **Nginx Proxy Manager (Docker):** install.sh erkennt ihn, lässt den Agenten zusätzlich auf der Docker-Adresse des Servers hören (nur vom Server und seinen Containern erreichbar), gibt Port 7777 bei aktiver Firewall nur für Docker-Netze frei und zeigt die Werte für den Proxy Host an.
- **Echte Besucher-IP hinter einem Proxy:** Sperre nach Fehlversuchen und Protokoll gelten für die IP des Besuchers – nicht für den Proxy. Gefälschte X-Forwarded-For-Einträge zählen nicht.

### Behoben
- Benutzer, die man mit `s3cure-agent user add` anlegt (oder löscht), gelten im laufenden Agenten sofort – ohne Neustart.

### English
- Detects Nginx Proxy Manager in Docker and binds to the Docker gateway; real client IP behind proxies for lockout and log; users added via the CLI work immediately.

## 1.0.0 – 2026-11-05

### Neu
- **iPhone-App** über Safari „Zum Home-Bildschirm“ (kein App Store nötig), hell und dunkel, Deutsch und Englisch.
- **Status** mit CPU, Arbeitsspeicher, Platte, Laufzeit, Netzwerk und Verlauf (24 Stunden / 7 Tage).
- **Dienste** (systemd) und **Docker-Container**: starten, stoppen, neu starten, Logs – auch live.
- **Server neu starten** – nur für Admins und nur mit frischem 2FA-Code.
- **Mitteilungen** (Web Push), wenn ein Dienst ausfällt, die Platte voll wird, der Arbeitsspeicher knapp ist oder ein Server nicht erreichbar ist – und wenn wieder alles gut ist.
- **Anmeldung mit Passwort und 2FA**, Sperre nach Fehlversuchen, mehrere Benutzer (Admin oder „nur ansehen“), Protokoll aller Aktionen.
- **Mehrere Server** in einer App (weitere Agenten per Schlüssel einbinden).
- **install.sh**: richtet den Agenten als systemd-Dienst ein, auf Wunsch mit nginx oder Caddy und HTTPS-Zertifikat.

### English
- iPhone web app (Add to Home Screen), status with history, systemd services and Docker containers with start/stop/restart and live logs, server reboot with a fresh 2FA code, push notifications, password + TOTP sign-in, multiple users and servers, activity log, one-command install with optional nginx/Caddy + HTTPS.
