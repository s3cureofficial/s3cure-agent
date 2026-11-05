# Changelog – S3cure Agent

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
