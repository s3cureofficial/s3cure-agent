# Changelog – S3cure Agent

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
