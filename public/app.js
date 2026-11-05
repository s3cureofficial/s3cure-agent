// S3cure – Web-App fürs iPhone (und jeden Browser). Spricht nur mit dem eigenen Agenten (/api/…).
// Seiten (Hash): #/login, #/ (alle Server), #/s/<id>/<status|services|docker|more>, #/logs/<id>/<service|container>/<name>, #/settings
(() => {
  'use strict';

  // ---------- Sprache ----------
  const LANG = /^de\b/i.test(navigator.language || '') ? 'de' : 'en';
  document.documentElement.lang = LANG;
  const DICT = {
    de: {
      tagline: 'Deine Server – immer dabei', user: 'Benutzer', password: 'Passwort', code: '2FA-Code', login: 'Anmelden', loggingIn: 'Anmelden …',
      loginHint: 'Den Code zeigt deine Authenticator-App. Benutzer legst du auf dem Server an: s3cure-agent user add <name> --admin',
      servers: 'Server', oneServer: '1 Server', nServers: '{n} Server', ok: 'Alles gut', warn: '{n} Warnung', warnN: '{n} Warnungen', offline: 'Nicht erreichbar',
      cpu: 'CPU', ram: 'RAM', disk: 'Platte', uptime: 'Läuft seit', network: 'Netzwerk', cores: '{n} Kerne · Last {l}', of: '{a} von {b}', free: '{a} frei',
      status: 'Status', services: 'Dienste', docker: 'Docker', more: 'Mehr', history: 'Verlauf', h24: '24 Std.', d7: '7 Tage', system: 'System',
      os: 'System', kernel: 'Kernel', hostname: 'Rechnername', problems: 'Probleme', noProblems: 'Keine Probleme',
      search: 'Suchen', all: 'Alle', failed: 'Fehler', running: 'Läuft', stopped: 'Aus', noServices: 'Keine Dienste gefunden.', noDocker: 'Docker ist auf diesem Server nicht installiert.', noContainers: 'Keine Container.',
      restart: 'Neu starten', start: 'Starten', stop: 'Stoppen', logs: 'Logs', cancel: 'Abbrechen', confirm: 'Bestätigen',
      confirmRestart: '{name} neu starten?', confirmStop: '{name} stoppen?', confirmStart: '{name} starten?',
      stopHint: 'Alles, was davon abhängt, ist danach nicht mehr erreichbar.', restartHint: 'Der Dienst ist für ein paar Sekunden nicht erreichbar.',
      done: 'Erledigt ✓', protectedHint: 'Geschützt – Stoppen geht nur auf dem Server selbst, damit du dich nicht aussperrst.', viewerHint: 'Nur ansehen – für Aktionen brauchst du Admin-Rechte.',
      reboot: 'Server neu starten', rebootTitle: '{name} neu starten?', rebootMsg: 'Der ganze Server startet neu und ist 1–2 Minuten nicht erreichbar. Gib zur Sicherheit einen frischen 2FA-Code ein.',
      rebootDone: 'Server startet neu …', audit: 'Protokoll', auditEmpty: 'Noch keine Einträge.', settings: 'Einstellungen',
      live: 'Live', refresh: 'Neu laden', filter: 'Filtern', noLogs: 'Keine Log-Einträge.', liveOnlyMain: 'Live gibt es nur für den Hauptserver.',
      install: 'Als App installieren', installMsg: 'Tippe unten auf Teilen und dann „Zum Home-Bildschirm“. Danach startet S3cure wie eine App – und kann dir Mitteilungen schicken.',
      notifications: 'Mitteilungen', notifyOn: 'Mitteilungen einschalten', notifyOff: 'Mitteilungen ausschalten', notifyTest: 'Test-Mitteilung senden',
      notifyDesc: 'Wenn ein Dienst ausfällt, die Platte voll wird oder ein Server nicht erreichbar ist.', notifyActive: 'Eingeschaltet auf diesem Gerät',
      notifyNeedsInstall: 'Auf dem iPhone gehen Mitteilungen nur, wenn S3cure auf dem Home-Bildschirm liegt (Teilen → Zum Home-Bildschirm).',
      notifyDenied: 'Mitteilungen sind blockiert. Erlaube sie in den iPhone-Einstellungen → Mitteilungen → S3cure.', notifyUnavailable: 'Dieser Browser kann keine Mitteilungen empfangen.',
      notifyBanner: 'Mitteilungen einschalten?', notifyBannerMsg: 'Dann sagt dir S3cure sofort Bescheid, wenn auf einem Server etwas nicht stimmt.', enable: 'Einschalten',
      account: 'Konto', role_admin: 'Admin – darf steuern', role_viewer: 'Nur ansehen', logout: 'Abmelden', version: 'Version', devices: '{n} Geräte mit Mitteilungen',
      error: 'Fehler', offlineNet: 'Keine Verbindung zum Server.', demo: 'Demo-Daten', ago: 'vor {n} Min.', now: 'gerade eben',
      days: '{d} T. {h} Std.', hours: '{h} Std. {m} Min.', sentTo: 'An {n} Gerät(e) gesendet.', back: 'Zurück',
      state_active: 'läuft', state_failed: 'Fehler', state_inactive: 'aus', state_activating: 'startet', state_deactivating: 'stoppt', state_running: 'läuft', state_exited: 'gestoppt', state_paused: 'pausiert', state_restarting: 'startet neu', state_created: 'angelegt', state_dead: 'beendet',
      act_login: 'angemeldet', 'act_login-failed': 'Anmeldung fehlgeschlagen', 'act_login-locked': 'gesperrt (zu viele Versuche)', act_reboot: 'Server neu gestartet', act_alert: 'Warnung',
      'act_service-start': 'Dienst gestartet', 'act_service-stop': 'Dienst gestoppt', 'act_service-restart': 'Dienst neu gestartet',
      'act_container-start': 'Container gestartet', 'act_container-stop': 'Container gestoppt', 'act_container-restart': 'Container neu gestartet',
      'coresShort': '{n} Kerne',
      'load': 'Last',
      'pinned': 'Angeheftet',
      'pinHint': 'Tippe in „Dienste“ oder „Docker“ auf einen Eintrag und dann auf „Anheften“ – dann siehst du ihn hier und kannst ihn mit einem Tipp neu starten.',
      'processes': 'Prozesse',
      'disks': 'Laufwerke',
      'pin': 'Anheften',
      'unpin': 'Lösen',
      'pinned1': 'Angeheftet ✓',
      'unpinned1': 'Gelöst',
      'share': 'Teilen',
      'copied': 'Kopiert ✓',
      'device': 'Gerät',
      'agoH': 'vor {n} Std.',
      'security': 'Sicherheit',
      'changePassword': 'Passwort ändern',
      'changePasswordDesc': 'Andere Geräte werden danach abgemeldet',
      'newPhone': 'Neues Handy für 2FA',
      'newPhoneDesc': 'Zwei-Faktor-Code auf ein anderes Gerät umziehen',
      'devicesTitle': 'Angemeldete Geräte',
      'devicesDesc': 'Sehen und abmelden',
      'admin': 'Verwaltung',
      'users': 'Benutzer',
      'usersDesc': 'Anlegen, Rechte, 2FA, löschen',
      'alertsTitle': 'Warnungen',
      'alertsDesc': 'Grenzen für Mitteilungen, Servername',
      'auditDesc': 'Wer hat wann was gemacht',
      'terminal': 'Terminal', 'terminalTile': 'Shell als root', 'files': 'Dateien', 'filesTile': 'Ansehen, bearbeiten, hochladen',
      'unlockTitle': 'Freischalten', 'unlockMsg': 'Terminal und Dateien haben volle root-Rechte. Bitte gib einen frischen Code aus deiner Authenticator-App ein. Gilt 15 Minuten ab der letzten Nutzung.',
      'unlockBtn': 'Freischalten', 'locked': 'Gesperrt', 'lockedMsg': 'Zum Schutz brauchst du einen frischen 2FA-Code.', 'lockNow': 'Sperren',
      'upDir': 'Nach oben', 'newFolder': 'Neuer Ordner', 'upload': 'Hochladen', 'folderName': 'Name des Ordners', 'create': 'Anlegen',
      'emptyDir': 'Dieser Ordner ist leer.', 'dirTruncated': 'Nur die ersten 5000 Einträge.', 'open': 'Öffnen', 'view': 'Ansehen', 'editFile': 'Bearbeiten',
      'downloadFile': 'Herunterladen', 'rename': 'Umbenennen', 'newName': 'Neuer Name', 'size': 'Größe', 'changed': 'Geändert', 'owner': 'Besitzer', 'rights': 'Rechte', 'pathL': 'Pfad',
      'linkTo': 'Verweist auf', 'deleteFileTitle': '„{name}“ löschen?', 'deleteFileMsg': 'Die Datei wird endgültig gelöscht. Das kann man nicht rückgängig machen.',
      'deleteDirMsg': 'Der Ordner wird mit allem Inhalt endgültig gelöscht. Das kann man nicht rückgängig machen.', 'deleted': 'Gelöscht ✓',
      'binaryFile': 'Das ist keine Textdatei – bitte herunterladen.', 'bigFile': 'Zu groß für die Vorschau (über 1 MB) – bitte herunterladen.',
      'saveFileTitle': 'Änderungen speichern?', 'saveFileMsg': '„{name}“ wird mit deinem Text überschrieben.', 'unsaved': 'Nicht gespeicherte Änderungen verwerfen?',
      'overwriteTitle': '„{name}“ ersetzen?', 'overwriteMsg': 'Im Ordner gibt es schon eine Datei mit diesem Namen. Sie wird überschrieben.', 'replace': 'Ersetzen',
      'uploading': 'Lade hoch … {i}/{n}', 'uploaded': '{n} hochgeladen ✓', 'onlyMain': 'Nur auf dem Hauptserver – öffne dafür die App des anderen Servers.',
      'act_unlock': 'Terminal/Dateien freigeschaltet', 'act_terminal-open': 'Terminal geöffnet', 'act_terminal-close': 'Terminal geschlossen',
      'act_file-save': 'Datei gespeichert', 'act_file-mkdir': 'Ordner angelegt', 'act_file-rename': 'Umbenannt', 'act_file-delete': 'Gelöscht',
      'act_file-download': 'Heruntergeladen', 'act_file-upload': 'Hochgeladen',
      'about': 'Über',
      'changePasswordSub': 'Zur Sicherheit brauchst du dein aktuelles Passwort und einen 2FA-Code.',
      'currentPassword': 'Aktuelles Passwort',
      'newPassword': 'Neues Passwort (mind. 10 Zeichen)',
      'repeatPassword': 'Neues Passwort wiederholen',
      'passwordsDiffer': 'Die neuen Passwörter sind verschieden.',
      'passwordChanged': 'Passwort geändert ✓ – andere Geräte sind abgemeldet.',
      'copy': 'Kopieren',
      'newPhoneSub': 'Scanne den QR-Code mit der Authenticator-App auf dem neuen Gerät und gib den Code ein, den sie jetzt zeigt. Erst dann wird umgestellt – der alte Code gilt bis dahin weiter.',
      'totpChanged': '2FA umgestellt ✓ – ab jetzt gilt der Code vom neuen Gerät.',
      'devicesSub': 'Hier bist du angemeldet. Unbekanntes Gerät? Abmelden und Passwort ändern.',
      'thisDevice': 'Dieses Gerät',
      'logoutOthers': 'Alle anderen abmelden',
      'close': 'Schließen',
      'alertsSub': 'Ab diesen Werten schickt S3cure eine Mitteilung (an alle mit eingeschalteten Mitteilungen).',
      'save': 'Speichern',
      'serverName': 'Name des Servers',
      'alertDisk': 'Platte voller als',
      'alertMem': 'Arbeitsspeicher voller als',
      'alertLoad': 'Last höher als',
      'perCore': 'Kerne',
      'alertSvc': 'Melden, wenn ein Dienst ausfällt',
      'saved': 'Gespeichert ✓',
      'addUser': 'Benutzer anlegen',
      'usersHint': 'Admins dürfen steuern (Dienste, Neustart) und Benutzer verwalten. „Nur ansehen“ sieht alles, kann aber nichts ändern.',
      'you': 'du',
      'lastLogin': 'zuletzt {when}',
      'neverLoggedIn': 'noch nie angemeldet',
      'addUserSub': 'Danach bekommst du einen QR-Code für die Authenticator-App der Person.',
      'role': 'Rolle',
      'initialPassword': 'Passwort (mind. 10 Zeichen)',
      'userCreated': '„{name}“ angelegt',
      'qrHandOver': 'Diesen QR-Code mit der Authenticator-App scannen (oder den Schlüssel abtippen). Er wird nur jetzt angezeigt.',
      'reset2fa': '2FA zurücksetzen',
      'deleteUser': 'Benutzer löschen',
      'reset2faTitle': '2FA von {name} zurücksetzen?',
      'reset2faMsg': 'Der alte Code gilt sofort nicht mehr und alle Geräte werden abgemeldet. Danach bekommst du einen neuen QR-Code.',
      'newQrFor': 'Neuer QR-Code für {name}',
      'deleteUserTitle': '{name} löschen?',
      'deleteUserMsg': 'Die Person wird sofort abgemeldet und kann sich nicht mehr anmelden.',
      'act_password': 'Passwort geändert',
      'act_totp': '2FA umgestellt',
      'act_user-add': 'Benutzer angelegt',
      'act_user-role': 'Rolle geändert',
      'act_user-2fa': '2FA zurückgesetzt',
      'act_user-delete': 'Benutzer gelöscht',
      'act_settings': 'Einstellungen geändert',
      'checks': 'Checks',
      'updates': 'Updates',
      'updatesTile': 'Anzeigen und installieren',
      'scripts': 'Skripte',
      'scriptsTile': 'Bibliothek, auf Servern ausführen',
      'inventory': 'Inventar',
      'inventoryTile': 'Hardware und Software',
      'ctype_http': 'Webseite',
      'ctype_ping': 'Ping',
      'ctype_port': 'Port',
      'ctype_cert': 'Zertifikat',
      'ctype_service': 'Dienst',
      'ctype_disk': 'Platte',
      'ctype_script': 'Skript',
      'cstate_ok': 'OK',
      'cstate_fail': 'Fehler',
      'cstate_warn': 'Unsicher',
      'cstate_pending': 'Wird geprüft',
      'cstate_paused': 'Pausiert',
      'addCheck': 'Check',
      'newCheck': 'Neuer Check',
      'noChecks': 'Noch keine Checks',
      'noChecksHint': 'Checks prüfen regelmäßig, ob deine Webseite, Ports, Zertifikate oder Dienste in Ordnung sind – und melden sich, wenn nicht.',
      'lastResult': 'Ergebnis',
      'lastCheck': 'Zuletzt',
      'interval': 'Intervall',
      'everyS': 'alle {n} s',
      'checkNow': 'Jetzt prüfen',
      'edit': 'Bearbeiten',
      'delete': 'Löschen',
      'deleteCheckTitle': '„{name}“ löschen?',
      'deleteCheckMsg': 'Der Check wird nicht mehr ausgeführt.',
      'editCheck': 'Check bearbeiten',
      'checkFormSub': 'Bei Fehlern meldet sich S3cure per Push, Discord, Webhook oder E-Mail (Einstellungen → Warnungs-Wege).',
      'checkType': 'Art',
      'name': 'Name',
      'optional': 'optional',
      'keyword': 'Muss enthalten (Text)',
      'hostLabel': 'Adresse',
      'certDays': 'Warnen ab (Tage vor Ablauf)',
      'serviceName': 'Dienst',
      'pathLabel': 'Pfad',
      'diskLimit': 'Warnen ab (%)',
      'checkScript': 'Skript (Exit-Code 0 = OK)',
      'failAfter': 'Warnen nach',
      'updatesUnsupported': 'Updates gibt es hier nur für Debian/Ubuntu (apt).',
      'updatesAvail': '{n} Updates verfügbar',
      'updatesNone': 'Alles aktuell ✓',
      'updatesSec': '{n} Sicherheits-Updates',
      'checkedAt': 'gesucht {when}',
      'rebootNeeded': 'Neustart nötig',
      'searchUpdates': 'Neu suchen',
      'installAll': 'Alle installieren',
      'installSec': 'Nur Sicherheit',
      'jobRunning': 'Läuft gerade',
      'jobLast': 'Letzter Auftrag',
      'failedExit': 'Fehler (Exit {n})',
      'packages': 'Pakete',
      'autoUpdates': 'Automatische Updates',
      'autoUpdatesOn': 'Updates automatisch installieren',
      'dayLabel': 'Tag',
      'daily': 'Täglich',
      'timeLabel': 'Uhrzeit',
      'wd0': 'Sonntag',
      'wd1': 'Montag',
      'wd2': 'Dienstag',
      'wd3': 'Mittwoch',
      'wd4': 'Donnerstag',
      'wd5': 'Freitag',
      'wd6': 'Samstag',
      'rebootRule': 'Danach neu starten',
      'rebootNever': 'Nie (nur Hinweis)',
      'rebootIfNeeded': 'Wenn nötig (z. B. neuer Kernel)',
      'searching': 'Suche Updates …',
      'installAllTitle': '{n} Updates installieren?',
      'installMsg': 'Dienste können dabei kurz neu starten. Das läuft im Hintergrund weiter, auch wenn du die App schließt.',
      'installing': 'Installation läuft …',
      'installSecTitle': '{n} Sicherheits-Updates installieren?',
      'scriptsHint': 'Laufen als root.',
      'newScript': 'Neu',
      'linesN': '{n} Zeilen',
      'noScripts': 'Noch keine Skripte.',
      'recentRuns': 'Letzte Ausführungen',
      'runHere': 'Hier ausführen',
      'runMany': 'Mehrere Server',
      'runTitle': '„{name}“ ausführen?',
      'runMsg': 'Läuft als root auf: {servers}',
      'run': 'Ausführen',
      'deleteScriptTitle': '„{name}“ löschen?',
      'deleteScriptMsg': 'Das Skript wird aus der Bibliothek entfernt. Der Verlauf bleibt.',
      'chooseServers': 'Auf welchen Servern?',
      'editScript': 'Skript bearbeiten',
      'scriptFormSub': 'Bash-Skript, läuft als root. Zum Speichern brauchst du einen 2FA-Code.',
      'descriptionLabel': 'Beschreibung',
      'scriptBody': 'Skript',
      'timeoutLabel': 'Abbrechen nach',
      'minN': '{n} min',
      'output': 'Ausgabe',
      'machine': 'Gerät',
      'vendor': 'Hersteller',
      'model': 'Modell',
      'serial': 'Seriennummer',
      'virt': 'Virtualisierung',
      'timezone': 'Zeitzone',
      'booted': 'Gestartet',
      'software': 'Software',
      'searchPackages': 'Paket suchen',
      'packagesN': '{n} Pakete ({m})',
      'hits': '{n} Treffer',
      'channels': 'Warnungs-Wege',
      'channelsDesc': 'Discord, Webhook, E-Mail',
      'channelsSub': 'Warnungen kommen immer als Push aufs Handy – hier kannst du zusätzlich Discord, eigene Webhooks und E-Mail einrichten.',
      'discordHooks': 'Discord-Webhooks (eine pro Zeile)',
      'discordHint': 'Discord: Kanal-Einstellungen → Integrationen → Webhooks → Neuer Webhook → URL kopieren.',
      'webhooks': 'Eigene Webhooks (JSON, eine pro Zeile)',
      'emailHead': 'E-Mail',
      'emailTo': 'An',
      'smtpHost': 'SMTP-Server',
      'smtpSecure': 'SSL/TLS (meist Port 465)',
      'sendTest': 'Test senden',
      'noChannels': 'Keine Wege eingerichtet.',
      'act_check-save': 'Check gespeichert',
      'act_check-delete': 'Check gelöscht',
      'act_updates-install': 'Updates installiert',
      'act_updates-schedule': 'Update-Zeitplan geändert',
      'act_script-save': 'Skript gespeichert',
      'act_script-delete': 'Skript gelöscht',
      'act_script-run': 'Skript ausgeführt',
      'act_notify-save': 'Warnungs-Wege geändert',
      'select': 'Auswählen',
      'selectedN': '{n} ausgewählt',
      'maintenance': 'Wartung',
      'runOnN': 'Skript auf {n} Servern',
      'bulkUpdatesTitle': 'Updates auf {n} Servern installieren?',
      'bulkStarted': 'Gestartet auf {ok} von {n} Servern',
      'bulkRebootTitle': '{n} Server neu starten?',
      'maintenanceOn': 'Wartung läuft',
      'maintUntil': 'bis {time} – keine Warnungen',
      'bootOn': 'Autostart aus',
      'bootOff': 'Autostart an',
      'tasks': 'Aufgaben',
      'tasksTile': 'Skripte nach Zeitplan',
      'processesTile': 'Ansehen und beenden',
      'notes': 'Notizen',
      'notesTile': 'Kunde, Standort, Tags',
      'end': 'Beenden',
      'maintHint': 'Warnungen vorübergehend stummschalten',
      'maintStartTitle': 'Wartung starten',
      'maintStartSub': 'Solange die Wartung läuft, schickt dieser Server keine Warnungen. Danach geht es automatisch weiter.',
      'duration': 'Dauer',
      'reason': 'Grund',
      'maintStarted': 'Wartung läuft ✓',
      'client': 'Kunde',
      'site': 'Standort',
      'tags': 'Tags',
      'notesSub': 'Kunde und Standort gruppieren die Server auf der Startseite.',
      'tagsHint': 'Tags (mit Komma trennen)',
      'notesPh': 'Zugänge, Besonderheiten, Ansprechpartner …',
      'schedDaily': 'täglich {time}',
      'schedWeekly': '{day} {time}',
      'schedHourly': 'stündlich, Minute {m}',
      'schedEvery': 'alle {n} min',
      'tasksHint': 'Skripte automatisch ausführen.',
      'newTask': 'Neu',
      'newTaskTitle': 'Neue Aufgabe',
      'scriptOne': 'Skript',
      'paused': 'pausiert',
      'noTasks': 'Noch keine Aufgaben',
      'noTasksHint': 'Lass Skripte automatisch laufen – z. B. jede Nacht aufräumen oder jeden Montag Backups prüfen.',
      'runNow': 'Jetzt ausführen',
      'deleteTaskTitle': '„{name}“ löschen?',
      'deleteTaskMsg': 'Die Aufgabe läuft danach nicht mehr. Das Skript bleibt.',
      'editTask': 'Aufgabe bearbeiten',
      'taskFormSub': 'Das Ergebnis jedes Laufs steht unter Skripte → Letzte Ausführungen.',
      'schedule': 'Zeitplan',
      'minuteLabel': 'Minute',
      'everyMin': 'Alle … Minuten',
      'taskActive': 'Aktiv',
      'st_daily': 'Täglich',
      'st_weekly': 'Wöchentlich',
      'st_hourly': 'Stündlich',
      'st_interval': 'Alle X Minuten',
      'killTerm': 'Beenden',
      'killNow': 'Sofort beenden',
      'killTitle': '{name} (PID {pid}) beenden?',
      'killNowMsg': 'Der Prozess wird sofort abgewürgt – ungespeicherte Daten gehen verloren.',
      'killTermMsg': 'Der Prozess wird gebeten, sich zu beenden.',
      'bootEnableTitle': '{name} beim Start einschalten?',
      'bootDisableTitle': '{name} beim Start ausschalten?',
      'bootEnableMsg': 'Der Dienst startet dann automatisch, wenn der Server hochfährt.',
      'bootDisableMsg': 'Der Dienst startet beim nächsten Hochfahren nicht mehr von selbst. Gerade läuft er weiter.',
      'bootEnable': 'Einschalten',
      'bootDisable': 'Ausschalten',
      'act_task-save': 'Aufgabe gespeichert',
      'act_task-delete': 'Aufgabe gelöscht',
      'act_task-run': 'Aufgabe ausgeführt',
      'act_maintenance-start': 'Wartung gestartet',
      'act_maintenance-end': 'Wartung beendet',
      'act_process-kill': 'Prozess beendet',
      'act_meta-save': 'Notizen geändert',
      'act_service-enable': 'Dienst beim Start an',
      'act_service-disable': 'Dienst beim Start aus',
    },
    en: {
      tagline: 'Your servers – always with you', user: 'User', password: 'Password', code: '2FA code', login: 'Sign in', loggingIn: 'Signing in…',
      loginHint: 'Your authenticator app shows the code. Create users on the server: s3cure-agent user add <name> --admin',
      servers: 'Servers', oneServer: '1 server', nServers: '{n} servers', ok: 'All good', warn: '{n} warning', warnN: '{n} warnings', offline: 'Unreachable',
      cpu: 'CPU', ram: 'RAM', disk: 'Disk', uptime: 'Uptime', network: 'Network', cores: '{n} cores · load {l}', of: '{a} of {b}', free: '{a} free',
      status: 'Status', services: 'Services', docker: 'Docker', more: 'More', history: 'History', h24: '24 h', d7: '7 days', system: 'System',
      os: 'System', kernel: 'Kernel', hostname: 'Hostname', problems: 'Problems', noProblems: 'No problems',
      search: 'Search', all: 'All', failed: 'Failed', running: 'Running', stopped: 'Stopped', noServices: 'No services found.', noDocker: 'Docker is not installed on this server.', noContainers: 'No containers.',
      restart: 'Restart', start: 'Start', stop: 'Stop', logs: 'Logs', cancel: 'Cancel', confirm: 'Confirm',
      confirmRestart: 'Restart {name}?', confirmStop: 'Stop {name}?', confirmStart: 'Start {name}?',
      stopHint: 'Everything that depends on it will be unreachable afterwards.', restartHint: 'The service will be unreachable for a few seconds.',
      done: 'Done ✓', protectedHint: 'Protected – stopping only works on the server itself, so you can’t lock yourself out.', viewerHint: 'View only – actions need admin rights.',
      reboot: 'Restart server', rebootTitle: 'Restart {name}?', rebootMsg: 'The whole server restarts and is unreachable for 1–2 minutes. For safety, enter a fresh 2FA code.',
      rebootDone: 'Server is restarting…', audit: 'Activity log', auditEmpty: 'No entries yet.', settings: 'Settings',
      live: 'Live', refresh: 'Reload', filter: 'Filter', noLogs: 'No log entries.', liveOnlyMain: 'Live is only available for the main server.',
      install: 'Install as app', installMsg: 'Tap Share below, then “Add to Home Screen”. S3cure then starts like an app – and can send you notifications.',
      notifications: 'Notifications', notifyOn: 'Turn on notifications', notifyOff: 'Turn off notifications', notifyTest: 'Send test notification',
      notifyDesc: 'When a service fails, the disk fills up or a server is unreachable.', notifyActive: 'On for this device',
      notifyNeedsInstall: 'On iPhone, notifications only work when S3cure is on the Home Screen (Share → Add to Home Screen).',
      notifyDenied: 'Notifications are blocked. Allow them in iPhone Settings → Notifications → S3cure.', notifyUnavailable: 'This browser cannot receive notifications.',
      notifyBanner: 'Turn on notifications?', notifyBannerMsg: 'S3cure will tell you right away when something is wrong on a server.', enable: 'Turn on',
      account: 'Account', role_admin: 'Admin – can control', role_viewer: 'View only', logout: 'Sign out', version: 'Version', devices: '{n} devices with notifications',
      error: 'Error', offlineNet: 'No connection to the server.', demo: 'Demo data', ago: '{n} min ago', now: 'just now',
      days: '{d} d {h} h', hours: '{h} h {m} min', sentTo: 'Sent to {n} device(s).', back: 'Back',
      state_active: 'running', state_failed: 'failed', state_inactive: 'stopped', state_activating: 'starting', state_deactivating: 'stopping', state_running: 'running', state_exited: 'stopped', state_paused: 'paused', state_restarting: 'restarting', state_created: 'created', state_dead: 'dead',
      act_login: 'signed in', 'act_login-failed': 'sign-in failed', 'act_login-locked': 'locked (too many attempts)', act_reboot: 'server restarted', act_alert: 'warning',
      'act_service-start': 'service started', 'act_service-stop': 'service stopped', 'act_service-restart': 'service restarted',
      'act_container-start': 'container started', 'act_container-stop': 'container stopped', 'act_container-restart': 'container restarted',
      'coresShort': '{n} cores',
      'load': 'Load',
      'pinned': 'Pinned',
      'pinHint': 'In “Services” or “Docker”, tap an entry and then “Pin” – it shows up here and can be restarted with one tap.',
      'processes': 'Processes',
      'disks': 'Disks',
      'pin': 'Pin',
      'unpin': 'Unpin',
      'pinned1': 'Pinned ✓',
      'unpinned1': 'Unpinned',
      'share': 'Share',
      'copied': 'Copied ✓',
      'device': 'Device',
      'agoH': '{n} h ago',
      'security': 'Security',
      'changePassword': 'Change password',
      'changePasswordDesc': 'Other devices are signed out afterwards',
      'newPhone': 'New phone for 2FA',
      'newPhoneDesc': 'Move the two-factor code to another device',
      'devicesTitle': 'Signed-in devices',
      'devicesDesc': 'See and sign out',
      'admin': 'Administration',
      'users': 'Users',
      'usersDesc': 'Add, roles, 2FA, delete',
      'alertsTitle': 'Alerts',
      'alertsDesc': 'Notification limits, server name',
      'auditDesc': 'Who did what and when',
      'terminal': 'Terminal', 'terminalTile': 'Root shell', 'files': 'Files', 'filesTile': 'View, edit, upload',
      'unlockTitle': 'Unlock', 'unlockMsg': 'Terminal and files have full root access. Please enter a fresh code from your authenticator app. Valid for 15 minutes after last use.',
      'unlockBtn': 'Unlock', 'locked': 'Locked', 'lockedMsg': 'For safety you need a fresh 2FA code.', 'lockNow': 'Lock',
      'upDir': 'Up', 'newFolder': 'New folder', 'upload': 'Upload', 'folderName': 'Folder name', 'create': 'Create',
      'emptyDir': 'This folder is empty.', 'dirTruncated': 'Only the first 5000 entries.', 'open': 'Open', 'view': 'View', 'editFile': 'Edit',
      'downloadFile': 'Download', 'rename': 'Rename', 'newName': 'New name', 'size': 'Size', 'changed': 'Changed', 'owner': 'Owner', 'rights': 'Permissions', 'pathL': 'Path',
      'linkTo': 'Points to', 'deleteFileTitle': 'Delete “{name}”?', 'deleteFileMsg': 'The file will be deleted permanently. This cannot be undone.',
      'deleteDirMsg': 'The folder and everything in it will be deleted permanently. This cannot be undone.', 'deleted': 'Deleted ✓',
      'binaryFile': 'Not a text file – please download it.', 'bigFile': 'Too big for preview (over 1 MB) – please download it.',
      'saveFileTitle': 'Save changes?', 'saveFileMsg': '“{name}” will be overwritten with your text.', 'unsaved': 'Discard unsaved changes?',
      'overwriteTitle': 'Replace “{name}”?', 'overwriteMsg': 'A file with this name already exists in the folder. It will be overwritten.', 'replace': 'Replace',
      'uploading': 'Uploading … {i}/{n}', 'uploaded': '{n} uploaded ✓', 'onlyMain': 'Main server only – open the app of the other server for this.',
      'act_unlock': 'terminal/files unlocked', 'act_terminal-open': 'terminal opened', 'act_terminal-close': 'terminal closed',
      'act_file-save': 'file saved', 'act_file-mkdir': 'folder created', 'act_file-rename': 'renamed', 'act_file-delete': 'deleted',
      'act_file-download': 'downloaded', 'act_file-upload': 'uploaded',
      'about': 'About',
      'changePasswordSub': 'For safety you need your current password and a 2FA code.',
      'currentPassword': 'Current password',
      'newPassword': 'New password (min. 10 characters)',
      'repeatPassword': 'Repeat new password',
      'passwordsDiffer': 'The new passwords differ.',
      'passwordChanged': 'Password changed ✓ – other devices are signed out.',
      'copy': 'Copy',
      'newPhoneSub': 'Scan the QR code with the authenticator app on the new device and enter the code it shows now. Only then it switches – the old code keeps working until then.',
      'totpChanged': '2FA switched ✓ – from now on the code from the new device counts.',
      'devicesSub': 'You are signed in here. Unknown device? Sign it out and change your password.',
      'thisDevice': 'This device',
      'logoutOthers': 'Sign out all others',
      'close': 'Close',
      'alertsSub': 'From these values S3cure sends a notification (to everyone with notifications on).',
      'save': 'Save',
      'serverName': 'Server name',
      'alertDisk': 'Disk fuller than',
      'alertMem': 'Memory fuller than',
      'alertLoad': 'Load higher than',
      'perCore': 'cores',
      'alertSvc': 'Notify when a service fails',
      'saved': 'Saved ✓',
      'addUser': 'Add user',
      'usersHint': 'Admins can control (services, reboot) and manage users. “View only” sees everything but cannot change anything.',
      'you': 'you',
      'lastLogin': 'last {when}',
      'neverLoggedIn': 'never signed in',
      'addUserSub': 'Afterwards you get a QR code for the person’s authenticator app.',
      'role': 'Role',
      'initialPassword': 'Password (min. 10 characters)',
      'userCreated': '“{name}” created',
      'qrHandOver': 'Scan this QR code with the authenticator app (or type the key). It is only shown now.',
      'reset2fa': 'Reset 2FA',
      'deleteUser': 'Delete user',
      'reset2faTitle': 'Reset 2FA of {name}?',
      'reset2faMsg': 'The old code stops working immediately and all devices are signed out. You then get a new QR code.',
      'newQrFor': 'New QR code for {name}',
      'deleteUserTitle': 'Delete {name}?',
      'deleteUserMsg': 'The person is signed out right away and can no longer sign in.',
      'act_password': 'password changed',
      'act_totp': '2FA switched',
      'act_user-add': 'user added',
      'act_user-role': 'role changed',
      'act_user-2fa': '2FA reset',
      'act_user-delete': 'user deleted',
      'act_settings': 'settings changed',
      'checks': 'Checks',
      'updates': 'Updates',
      'updatesTile': 'View and install',
      'scripts': 'Scripts',
      'scriptsTile': 'Library, run on servers',
      'inventory': 'Inventory',
      'inventoryTile': 'Hardware and software',
      'ctype_http': 'Website',
      'ctype_ping': 'Ping',
      'ctype_port': 'Port',
      'ctype_cert': 'Certificate',
      'ctype_service': 'Service',
      'ctype_disk': 'Disk',
      'ctype_script': 'Script',
      'cstate_ok': 'OK',
      'cstate_fail': 'Failed',
      'cstate_warn': 'Unsure',
      'cstate_pending': 'Checking',
      'cstate_paused': 'Paused',
      'addCheck': 'Check',
      'newCheck': 'New check',
      'noChecks': 'No checks yet',
      'noChecksHint': 'Checks regularly test whether your website, ports, certificates or services are fine – and tell you when they are not.',
      'lastResult': 'Result',
      'lastCheck': 'Last',
      'interval': 'Interval',
      'everyS': 'every {n} s',
      'checkNow': 'Check now',
      'edit': 'Edit',
      'delete': 'Delete',
      'deleteCheckTitle': 'Delete “{name}”?',
      'deleteCheckMsg': 'The check will no longer run.',
      'editCheck': 'Edit check',
      'checkFormSub': 'On failure S3cure notifies via push, Discord, webhook or email (Settings → Alert channels).',
      'checkType': 'Type',
      'name': 'Name',
      'optional': 'optional',
      'keyword': 'Must contain (text)',
      'hostLabel': 'Address',
      'certDays': 'Warn from (days before expiry)',
      'serviceName': 'Service',
      'pathLabel': 'Path',
      'diskLimit': 'Warn from (%)',
      'checkScript': 'Script (exit code 0 = OK)',
      'failAfter': 'Warn after',
      'updatesUnsupported': 'Updates are only available for Debian/Ubuntu (apt).',
      'updatesAvail': '{n} updates available',
      'updatesNone': 'All up to date ✓',
      'updatesSec': '{n} security updates',
      'checkedAt': 'checked {when}',
      'rebootNeeded': 'Restart needed',
      'searchUpdates': 'Check again',
      'installAll': 'Install all',
      'installSec': 'Security only',
      'jobRunning': 'Running now',
      'jobLast': 'Last job',
      'failedExit': 'Failed (exit {n})',
      'packages': 'Packages',
      'autoUpdates': 'Automatic updates',
      'autoUpdatesOn': 'Install updates automatically',
      'dayLabel': 'Day',
      'daily': 'Daily',
      'timeLabel': 'Time',
      'wd0': 'Sunday',
      'wd1': 'Monday',
      'wd2': 'Tuesday',
      'wd3': 'Wednesday',
      'wd4': 'Thursday',
      'wd5': 'Friday',
      'wd6': 'Saturday',
      'rebootRule': 'Restart afterwards',
      'rebootNever': 'Never (hint only)',
      'rebootIfNeeded': 'If needed (e.g. new kernel)',
      'searching': 'Checking for updates…',
      'installAllTitle': 'Install {n} updates?',
      'installMsg': 'Services may restart briefly. It keeps running in the background even if you close the app.',
      'installing': 'Installing…',
      'installSecTitle': 'Install {n} security updates?',
      'scriptsHint': 'Run as root.',
      'newScript': 'New',
      'linesN': '{n} lines',
      'noScripts': 'No scripts yet.',
      'recentRuns': 'Recent runs',
      'runHere': 'Run here',
      'runMany': 'Several servers',
      'runTitle': 'Run “{name}”?',
      'runMsg': 'Runs as root on: {servers}',
      'run': 'Run',
      'deleteScriptTitle': 'Delete “{name}”?',
      'deleteScriptMsg': 'The script is removed from the library. The history stays.',
      'chooseServers': 'On which servers?',
      'editScript': 'Edit script',
      'scriptFormSub': 'Bash script, runs as root. Saving needs a 2FA code.',
      'descriptionLabel': 'Description',
      'scriptBody': 'Script',
      'timeoutLabel': 'Cancel after',
      'minN': '{n} min',
      'output': 'Output',
      'machine': 'Machine',
      'vendor': 'Vendor',
      'model': 'Model',
      'serial': 'Serial number',
      'virt': 'Virtualization',
      'timezone': 'Time zone',
      'booted': 'Booted',
      'software': 'Software',
      'searchPackages': 'Search package',
      'packagesN': '{n} packages ({m})',
      'hits': '{n} matches',
      'channels': 'Alert channels',
      'channelsDesc': 'Discord, webhook, email',
      'channelsSub': 'Alerts always arrive as push on your phone – here you can add Discord, your own webhooks and email.',
      'discordHooks': 'Discord webhooks (one per line)',
      'discordHint': 'Discord: channel settings → Integrations → Webhooks → New webhook → copy URL.',
      'webhooks': 'Own webhooks (JSON, one per line)',
      'emailHead': 'Email',
      'emailTo': 'To',
      'smtpHost': 'SMTP server',
      'smtpSecure': 'SSL/TLS (usually port 465)',
      'sendTest': 'Send test',
      'noChannels': 'No channels set up.',
      'act_check-save': 'check saved',
      'act_check-delete': 'check deleted',
      'act_updates-install': 'updates installed',
      'act_updates-schedule': 'update schedule changed',
      'act_script-save': 'script saved',
      'act_script-delete': 'script deleted',
      'act_script-run': 'script run',
      'act_notify-save': 'alert channels changed',
      'select': 'Select',
      'selectedN': '{n} selected',
      'maintenance': 'Maintenance',
      'runOnN': 'Script on {n} servers',
      'bulkUpdatesTitle': 'Install updates on {n} servers?',
      'bulkStarted': 'Started on {ok} of {n} servers',
      'bulkRebootTitle': 'Restart {n} servers?',
      'maintenanceOn': 'Maintenance running',
      'maintUntil': 'until {time} – no alerts',
      'bootOn': 'Autostart off',
      'bootOff': 'Autostart on',
      'tasks': 'Tasks',
      'tasksTile': 'Scripts on a schedule',
      'processesTile': 'View and end',
      'notes': 'Notes',
      'notesTile': 'Client, site, tags',
      'end': 'End',
      'maintHint': 'Temporarily mute alerts',
      'maintStartTitle': 'Start maintenance',
      'maintStartSub': 'While maintenance runs, this server sends no alerts. Afterwards it continues automatically.',
      'duration': 'Duration',
      'reason': 'Reason',
      'maintStarted': 'Maintenance running ✓',
      'client': 'Client',
      'site': 'Site',
      'tags': 'Tags',
      'notesSub': 'Client and site group the servers on the home screen.',
      'tagsHint': 'Tags (comma separated)',
      'notesPh': 'Access, special notes, contacts …',
      'schedDaily': 'daily {time}',
      'schedWeekly': '{day} {time}',
      'schedHourly': 'hourly, minute {m}',
      'schedEvery': 'every {n} min',
      'tasksHint': 'Run scripts automatically.',
      'newTask': 'New',
      'newTaskTitle': 'New task',
      'scriptOne': 'Script',
      'paused': 'paused',
      'noTasks': 'No tasks yet',
      'noTasksHint': 'Let scripts run automatically – e.g. clean up every night or check backups every Monday.',
      'runNow': 'Run now',
      'deleteTaskTitle': 'Delete “{name}”?',
      'deleteTaskMsg': 'The task will no longer run. The script stays.',
      'editTask': 'Edit task',
      'taskFormSub': 'The result of each run is under Scripts → Recent runs.',
      'schedule': 'Schedule',
      'minuteLabel': 'Minute',
      'everyMin': 'Every … minutes',
      'taskActive': 'Active',
      'st_daily': 'Daily',
      'st_weekly': 'Weekly',
      'st_hourly': 'Hourly',
      'st_interval': 'Every X minutes',
      'killTerm': 'End',
      'killNow': 'Kill now',
      'killTitle': 'End {name} (PID {pid})?',
      'killNowMsg': 'The process is killed immediately – unsaved data is lost.',
      'killTermMsg': 'The process is asked to exit.',
      'bootEnableTitle': 'Start {name} at boot?',
      'bootDisableTitle': 'Stop starting {name} at boot?',
      'bootEnableMsg': 'The service then starts automatically when the server boots.',
      'bootDisableMsg': 'The service no longer starts by itself on the next boot. It keeps running for now.',
      'bootEnable': 'Turn on',
      'bootDisable': 'Turn off',
      'act_task-save': 'task saved',
      'act_task-delete': 'task deleted',
      'act_task-run': 'task run',
      'act_maintenance-start': 'maintenance started',
      'act_maintenance-end': 'maintenance ended',
      'act_process-kill': 'process ended',
      'act_meta-save': 'notes changed',
      'act_service-enable': 'service on at boot',
      'act_service-disable': 'service off at boot',
    },
  };
  const t = (k, p = {}) => String(DICT[LANG][k] ?? DICT.de[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (p[x] ?? ''));

  // ---------- Symbole ----------
  const PATHS = {
    back: 'M15 18l-6-6 6-6', chev: 'M9 18l6-6-6-6', refresh: 'M20 12a8 8 0 1 1-2.34-5.66 M20 4v5h-5', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    gauge: 'M12 14l4-4 M3.3 15a9 9 0 1 1 17.4 0', pulse: 'M3 12h4l3-8 4 16 3-8h4', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2', server: 'M5.5 4h13A2.5 2.5 0 0 1 21 6.5v2A2.5 2.5 0 0 1 18.5 11h-13A2.5 2.5 0 0 1 3 8.5v-2A2.5 2.5 0 0 1 5.5 4z M5.5 13h13a2.5 2.5 0 0 1 2.5 2.5v2a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-2A2.5 2.5 0 0 1 5.5 13z M7 7.5h.01 M7 16.5h.01',
    box: 'M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8', dots: 'M5 12h.01 M12 12h.01 M19 12h.01', alert: 'M10.3 4.3L2.8 17.5a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z M12 9.5v4 M12 17h.01',
    restart: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5', play: 'M7 4.5v15l12-7.5z', stop: 'M7 7h10v10H7z', logs: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
    power: 'M18.4 6.6a9 9 0 1 1-12.8 0 M12 2v10', bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-3.5-3.5',
    share: 'M12 3v12 M8 7l4-4 4 4 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7', close: 'M6 6l12 12 M18 6L6 18', list: 'M4 6h16 M4 12h16 M4 18h10', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    download: 'M12 3v12 M7 10l5 5 5-5 M5 21h14', code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16', edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
    terminal: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M7 10l3 2.5L7 15 M12.5 15H17', folder: 'M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z',
    file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5', link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    upload: 'M12 21V9 M7 14l5-5 5 5 M5 3h14', up: 'M12 19V5 M5 12l7-7 7 7', folderPlus: 'M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z M12 11v5 M9.5 13.5h5', lock: 'M7 11V7a5 5 0 0 1 10 0v4 M5 11h14v10H5z M12 15v2',
    check2: 'M5 12.5l4.5 4.5L19 7', tool: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z', cpu: 'M7 7h10v10H7z M10 10h4v4h-4z M9 3v4 M15 3v4 M9 17v4 M15 17v4 M3 9h4 M3 15h4 M17 9h4 M17 15h4',
    star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z', key: 'M15 7a4 4 0 1 1-3.8 5.2L4 19.4V21h3v-2h2v-2h2l1.2-1.2A4 4 0 0 1 15 7z M16 9h.01',
    phone: 'M8 2.5h8A1.5 1.5 0 0 1 17.5 4v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5z M11 18.5h2', users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M16 3.5a4 4 0 0 1 0 7.5 M22 21a7 7 0 0 0-4.5-6.5',
    sliders: 'M4 6h10 M18 6h2 M4 12h4 M12 12h8 M4 18h12 M20 18h0 M16 4v4 M10 10v4 M18 16v4', copy: 'M9 9h10v12H9z M5 15V3h10', info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-5 M12 8h.01', plus: 'M12 5v14 M5 12h14', trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3', logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3 M10 17l5-5-5-5 M15 12H3',
  };
  const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[n] || ''}"/></svg>`;

  // ---------- Hilfen ----------
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (u, tot) => (tot ? Math.round((100 * u) / tot) : null);
  const bytes = n => { if (n == null) return '–'; const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return n.toLocaleString(LANG, { maximumFractionDigits: n < 10 ? 1 : 0 }) + ' ' + u[i]; };
  const rate = n => bytes(n) + '/s';
  const upt = s => { if (s == null) return '–'; const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? t('days', { d, h }) : t('hours', { h, m }); };
  const level = v => (v == null ? '' : v >= 90 ? 'hi' : v >= 75 ? 'mid' : '');
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const shortName = n => String(n).replace(/\.service$/, '');
  const word = (prefix, k) => DICT[LANG][prefix + k] ?? DICT.de[prefix + k] ?? k; // Zustand/Aktion lesbar, Unbekanntes wie es ist
  // Breiten erst nach dem Einfügen setzen (Sicherheitsregeln erlauben keine style-Attribute im HTML)
  const applyWidths = root => { for (const d of root.querySelectorAll('[data-w]')) d.style.width = Math.max(0, Math.min(100, Number(d.dataset.w) || 0)) + '%'; };

  function toast(msg, bad = false) {
    const el = $('#toast');
    el.textContent = msg; el.className = bad ? 'bad' : ''; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  async function api(method, path, body) {
    let res;
    try {
      res = await fetch(path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-S3cure': '1' }, body: body ? JSON.stringify(body) : undefined });
    } catch { throw new Error(t('offlineNet')); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/login') { state.me = null; go('#/login'); throw new Error(data.error || '401'); }
    if (!res.ok) throw Object.assign(new Error(data.error || `${t('error')} ${res.status}`), { status: res.status, unlock: !!data.unlock });
    return data;
  }

  // ---------- Zustand und Navigation ----------
  const state = { seq: 0, me: null, servers: [], timers: [], es: null, filter: { q: '', chip: 'all' }, range: 24, psort: 'cpu' };
  const clearTimers = () => { state.timers.forEach(clearInterval); state.timers = []; if (state.es) { state.es.close(); state.es = null; } };
  // seq: Seitenaufbau, zu dem der Timer gehört – eine überholte Seite startet keinen mehr
  const every = (ms, fn, seq = state.seq) => seq === state.seq && state.timers.push(setInterval(() => { if (!document.hidden) fn(); }, ms));
  const go = h => { if (location.hash !== h) location.hash = h; else route(); };

  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', () => $('.top')?.classList.toggle('scrolled', window.scrollY > 4), { passive: true });

  async function route() {
    clearTimers(); closeSheet(); state.seq++;
    const h = location.hash || '#/';
    if (!state.me && h !== '#/login') {
      try { state.me = await api('GET', '/api/me'); } catch { return; }
    }
    window.scrollTo(0, 0);
    const p = h.slice(2).split('/').map(decodeURIComponent);
    if (h === '#/login') return renderLogin();
    if (p[0] === 's' && p[1]) return renderServer(p[1], p[2] || 'status');
    if (p[0] === 'logs' && p[3]) return renderLogs(p[1], p[2], p.slice(3).join('/'));
    if (p[0] === 'settings') return renderSettings();
    if (p[0] === 'users') return renderUsers();
    return renderHome();
  }

  // ---------- Anmelden ----------
  function renderLogin() {
    app.innerHTML = `
      <form class="login" autocomplete="on">
        <div class="brand"><img src="/icons/icon-180.png" alt=""><h1>S3cure</h1><p>${t('tagline')}</p></div>
        <div class="field"><label for="u">${t('user')}</label><input id="u" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required></div>
        <div class="field"><label for="p">${t('password')}</label><input id="p" name="password" type="password" autocomplete="current-password" required></div>
        <div class="field"><label for="c">${t('code')}</label><input id="c" name="code" class="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" required></div>
        <div class="err" hidden></div>
        <button class="btn primary block" type="submit">${t('login')}</button>
        <p class="hint">${esc(t('loginHint'))}</p>
      </form>`;
    const f = $('form', app);
    const u = store.get('s3:user');
    if (u) { f.username.value = u; f.password.focus(); } else f.username.focus();
    f.code.addEventListener('input', () => { f.code.value = f.code.value.replace(/\D/g, '').slice(0, 6); });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('button[type=submit]', f), err = $('.err', f);
      btn.disabled = true; btn.textContent = t('loggingIn'); err.hidden = true;
      try {
        await api('POST', '/api/login', { user: f.username.value.trim(), password: f.password.value, code: f.code.value });
        store.set('s3:user', f.username.value.trim().toLowerCase());
        state.me = await api('GET', '/api/me');
        registerSw();
        go('#/');
      } catch (ex) {
        err.textContent = ex.message; err.hidden = false; f.code.value = ''; f.code.focus();
      } finally { btn.disabled = false; btn.textContent = t('login'); }
    });
  }

  // ---------- Alle Server ----------
  function srvState(s) {
    if (!s.ok) return ['bad', t('offline')];
    const n = (s.issues || []).length || (s.failed || []).length;
    if (!n) return ['ok', t('ok')];
    const bad = (s.issues || []).some(i => i.level === 'bad') || (s.failed || []).length;
    return [bad ? 'bad' : 'warn', t(n === 1 ? 'warn' : 'warnN', { n })];
  }

  function bars(m) {
    if (!m) return '';
    const cpu = Math.round(m.cpu ?? 0), ram = pct(m.mem?.used, m.mem?.total), disk = m.disk ? pct(m.disk.total - m.disk.free, m.disk.total) : null;
    const b = (lbl, v) => `<div class="mini"><div class="lbl"><span>${lbl}</span><b>${v == null ? '–' : v + ' %'}</b></div><div class="track ${level(v)}"><div data-w="${v ?? 0}"></div></div></div>`;
    return `<div class="srv-bars">${b(t('cpu'), cpu)}${b(t('ram'), ram)}${b(t('disk'), disk)}</div>`;
  }

  // Startseite: kleine Ringe + Laufzeit/Last/Netz
  function homeStats(m) {
    if (!m) return '';
    const ram = pct(m.mem?.used, m.mem?.total), disk = m.disk ? pct(m.disk.total - m.disk.free, m.disk.total) : null;
    return `<div class="home-rings">${ring(m.cpu ?? null, t('cpu'), '')}${ring(ram, t('ram'), '')}${ring(disk, t('disk'), '')}</div>
      <div class="home-meta"><span>${ic('clock')}${esc(upt(m.uptime))}</span><span>${ic('gauge')}${(m.load || [0])[0].toFixed(2)}</span>${m.net ? `<span>↓ ${rate(m.net.rx)}</span>` : ''}</div>`;
  }

  function homeChecks(c) {
    if (!c || !Object.keys(c).length) return '';
    return `<div class="home-checks">${ic('pulse')}<span>${t('checks')}</span><span class="pill ok"><span class="dot"></span>${c.ok || 0}</span>${c.fail ? `<span class="pill bad"><span class="dot"></span>${c.fail}</span>` : ''}${c.warn ? `<span class="pill warn"><span class="dot"></span>${c.warn}</span>` : ''}</div>`;
  }

  function issuesHtml(s) {
    const list = s.ok ? (s.issues || []) : [{ text: s.error || t('offline'), level: 'bad' }];
    if (!list.length) return '';
    return `<div class="issues">${list.map(i => `<div class="issue ${i.level === 'warn' ? 'warn' : ''}">${ic('alert')}<span>${esc(i.text)}</span></div>`).join('')}</div>`;
  }

  async function renderHome() {
    const seq = state.seq;
    const admin = state.me.role === 'admin';
    const sel = new Set();
    let selecting = false;
    app.innerHTML = `
      <header class="top"><img class="logo" src="/icons/icon-180.png" alt=""><h1>S3cure<span class="sub"></span></h1>
        ${admin ? `<button class="icon-btn" data-a="select" aria-label="${t('select')}">${ic('check2')}</button>` : ''}
        <button class="icon-btn" data-a="refresh" aria-label="${t('refresh')}">${ic('refresh')}</button>
        <button class="icon-btn" data-a="settings" aria-label="${t('settings')}">${ic('gear')}</button></header>
      <main><div class="banners"></div><div class="list-srv"><div class="skeleton"></div><div class="skeleton"></div></div></main>
      <div class="bulkbar" hidden><span class="bulk-n"></span><span class="spacer"></span>
        <button class="btn small" data-b="script">${ic('code')}${t('scripts')}</button>
        <button class="btn small" data-b="updates">${ic('download')}${t('updates')}</button>
        <button class="btn small danger" data-b="reboot">${ic('power')}</button></div>`;
    $('[data-a=settings]', app).addEventListener('click', () => go('#/settings'));
    $('[data-a=refresh]', app).addEventListener('click', () => load(true));
    const bar = $('.bulkbar', app);
    const paintBar = () => { bar.hidden = !selecting; $('.bulk-n', bar).textContent = t('selectedN', { n: sel.size }); for (const b of bar.querySelectorAll('button')) b.disabled = !sel.size; };
    $('[data-a=select]', app)?.addEventListener('click', e => { selecting = !selecting; sel.clear(); e.currentTarget.classList.toggle('on', selecting); paintBar(); paint(); });
    renderBanners($('.banners', app));

    const card = s => {
      const [cls, txt] = srvState(s);
      const m = s.maintenance && s.maintenance.until > Date.now();
      const tags = (s.meta && s.meta.tags) || [];
      return `<a class="card srv ${selecting ? 'selecting' : ''} ${sel.has(s.id) ? 'picked' : ''}" href="#/s/${encodeURIComponent(s.id)}/status" data-id="${esc(s.id)}">
        <div class="srv-head">${selecting ? `<span class="pickbox">${sel.has(s.id) ? ic('check2') : ''}</span>` : ''}<span class="srv-name">${esc(s.name)}</span>${m ? `<span class="pill">${ic('tool')}${t('maintenance')}</span>` : `<span class="pill ${cls}"><span class="dot"></span>${esc(txt)}</span>`}</div>
        ${tags.length ? `<div class="tags">${tags.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
        ${s.ok ? homeStats(s.metrics) + homeChecks(s.checks) : ''}${issuesHtml(s)}</a>`;
    };
    const paint = () => {
      const box = $('.list-srv', app);
      if (!box || seq !== state.seq) return;
      // Nach Kunde und Standort gruppieren (ohne Zuordnung: oben)
      const groups = new Map();
      for (const s of state.servers) {
        const k = s.meta && (s.meta.client || s.meta.site) ? `${s.meta.client || ''}${s.meta.site ? ' · ' + s.meta.site : ''}`.replace(/^ · /, '') : '';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(s);
      }
      const keys = [...groups.keys()].sort((x, y) => (x === '' ? -1 : y === '' ? 1 : x.localeCompare(y)));
      box.innerHTML = keys.map(k => `${k && keys.length > 1 ? `<div class="section-title">${esc(k)}</div>` : k ? `<div class="section-title">${esc(k)}</div>` : ''}${groups.get(k).map(card).join('')}`).join('');
      applyWidths(box);
      if (selecting) for (const a of box.querySelectorAll('a.srv')) a.addEventListener('click', e => { e.preventDefault(); const id = a.dataset.id; if (sel.has(id)) sel.delete(id); else sel.add(id); paint(); paintBar(); });
    };
    const load = async spin => {
      const b = $('[data-a=refresh]', app);
      if (spin) b.classList.add('spin');
      try { state.servers = await api('GET', '/api/servers'); } catch (e) { toast(e.message, true); return; } finally { b.classList.remove('spin'); }
      $('.top .sub', app).textContent = (state.me.demo ? t('demo') + ' · ' : '') + (state.servers.length === 1 ? t('oneServer') : t('nServers', { n: state.servers.length }));
      paint();
    };

    // Sammelaktionen
    bar.querySelector('[data-b=script]').addEventListener('click', async () => {
      let list; try { list = await api('GET', '/api/scripts'); } catch (e) { toast(e.message, true); return; }
      const sh = openSheet(`<h2>${t('runOnN', { n: sel.size })}</h2><div class="list">${list.map(sc => `<div class="row" data-sc="${esc(sc.id)}">${ic('code')}<div class="r-main"><div class="r-title">${esc(sc.name)}</div><div class="r-sub">${esc(sc.description || '')}</div></div></div>`).join('')}</div><div class="s-btns"><button class="btn block" data-x="cancel">${t('cancel')}</button></div>`);
      sh.querySelector('[data-x=cancel]').addEventListener('click', closeSheet);
      for (const r of sh.querySelectorAll('[data-sc]')) r.addEventListener('click', () => {
        const sc = list.find(x => x.id === r.dataset.sc);
        confirmSheet(t('runTitle', { name: sc.name }), t('runMsg', { servers: [...sel].map(id => state.servers.find(x => x.id === id)?.name || id).join(', ') }), t('run'), async () => {
          const runs = await api('POST', `/api/scripts/${sc.id}/run`, { servers: [...sel] });
          runSheet(runs.map(x => x.id));
        });
      });
    });
    bar.querySelector('[data-b=updates]').addEventListener('click', () => confirmSheet(t('bulkUpdatesTitle', { n: sel.size }), t('installMsg'), t('installAll'), async () => {
      const res = await Promise.all([...sel].map(id => api('POST', `/api/s/${encodeURIComponent(id)}/updates/install`, {}).then(() => true).catch(() => false)));
      closeSheet(); toast(t('bulkStarted', { ok: res.filter(Boolean).length, n: res.length }), res.some(x => !x));
    }));
    bar.querySelector('[data-b=reboot]').addEventListener('click', () => formSheet({
      title: t('bulkRebootTitle', { n: sel.size }), sub: t('rebootMsg'), submit: t('reboot'), danger: true, fields: [codeField()],
      onSubmit: async f => { const r = await api('POST', '/api/bulk/reboot', { servers: [...sel], code: f.code.value }); closeSheet(); toast(t('bulkStarted', { ok: r.filter(x => x.ok).length, n: r.length })); },
    }));

    await load();
    every(15000, () => { if (!$('#sheet').hidden) return; load(); }, seq);
  }

  function renderBanners(box) {
    if (isIos() && !standalone() && !store.get('s3:noInstall')) {
      box.insertAdjacentHTML('beforeend', `<div class="banner" data-b="install">${ic('share')}<div><b>${t('install')}</b>${esc(t('installMsg'))}</div><button class="x" aria-label="×">${ic('close')}</button></div>`);
    } else if (pushSupported() && Notification.permission === 'default' && state.me.push && !store.get('s3:noPushAsk')) {
      box.insertAdjacentHTML('beforeend', `<div class="banner" data-b="push">${ic('bell')}<div><b>${t('notifyBanner')}</b>${esc(t('notifyBannerMsg'))}<div><button class="btn primary" data-a="enable">${t('enable')}</button></div></div><button class="x" aria-label="×">${ic('close')}</button></div>`);
      $('[data-a=enable]', box)?.addEventListener('click', async () => { if (await enablePush()) $('[data-b=push]', box)?.remove(); });
    }
    for (const x of box.querySelectorAll('.banner .x')) x.addEventListener('click', () => {
      const b = x.closest('.banner'); store.set(b.dataset.b === 'install' ? 's3:noInstall' : 's3:noPushAsk', '1'); b.remove();
    });
  }

  // ---------- Ein Server ----------
  async function renderServer(id, tab) {
    const seq = state.seq;
    const known = state.servers.find(s => s.id === id);
    const SUB = ['updates', 'scripts', 'inventory', 'audit', 'tasks', 'processes', 'files'];
    const sub = SUB.includes(tab);
    const multi = state.servers.length > 1 || sub;
    const navTab = sub ? 'more' : tab;
    app.innerHTML = `
      <header class="top">
        ${multi ? `<button class="icon-btn" data-a="back" aria-label="${t('back')}">${ic('back')}</button>` : '<img class="logo" src="/icons/icon-180.png" alt="">'}
        <h1><span class="nm">${esc(known ? known.name : '')}</span><span class="sub"></span></h1>
        <button class="icon-btn" data-a="refresh" aria-label="${t('refresh')}">${ic('refresh')}</button>
        <button class="icon-btn" data-a="settings" aria-label="${t('settings')}">${ic('gear')}</button>
      </header>
      <main class="page"><div class="skeleton"></div></main>
      <nav class="tabbar"><div class="tabs">
        ${[['status', 'gauge'], ['services', 'server'], ['docker', 'box'], ['checks', 'pulse'], ['more', 'dots']].map(([k, i]) => `<button data-t="${k}" class="${k === navTab ? 'on' : ''}">${ic(i)}<span>${t(k)}</span>${k === 'services' || k === 'checks' ? '<span class="badge" hidden></span>' : ''}</button>`).join('')}
      </div></nav>`;
    $('[data-a=back]', app)?.addEventListener('click', () => go(sub ? `#/s/${encodeURIComponent(id)}/more` : '#/'));
    $('[data-a=settings]', app).addEventListener('click', () => go('#/settings'));
    for (const b of app.querySelectorAll('.tabbar [data-t]')) b.addEventListener('click', () => go(`#/s/${encodeURIComponent(id)}/${b.dataset.t}`));
    if (!state.servers.length) api('GET', '/api/servers').then(l => { state.servers = l; const s = l.find(x => x.id === id); if (s && !sub) $('.top .nm', app).textContent = s.name; if (l.length > 1 && !$('[data-a=back]', app)) route(); }).catch(() => {});
    const main = $('main', app);
    const refreshBtn = $('[data-a=refresh]', app);
    const view = { status: viewStatus, services: viewServices, docker: viewDocker, checks: viewChecks, more: viewMore, updates: viewUpdates, scripts: viewScripts, inventory: viewInventory, audit: viewAudit, tasks: viewTasks, processes: viewProcesses, files: viewFiles }[tab] || viewStatus;
    const load = async spin => {
      if (spin) refreshBtn.classList.add('spin');
      try { await view(id, main); } catch (e) { toast(e.message, true); } finally { refreshBtn.classList.remove('spin'); }
    };
    refreshBtn.addEventListener('click', () => load(true));
    // Fehlerzahl am Checks-Tab auch auf den anderen Seiten
    if (tab !== 'checks') api('GET', `/api/s/${encodeURIComponent(id)}/checks`).then(l => { const b = $('.tabbar [data-t=checks] .badge', app); const n = l.filter(c => c.state.status === 'fail').length; if (b) { b.hidden = !n; b.textContent = n; } }).catch(() => {});
    await load();
    if (['status', 'services', 'docker', 'checks'].includes(tab)) every(tab === 'status' ? 10000 : 15000, () => view(id, main, true), seq);
  }

  // ----- Status -----
  // Angeheftete Dienste/Container pro Server (auf diesem Gerät gemerkt): ["service:nginx.service", "container:web"]
  const pinKey = id => 's3:pins:' + id;
  const getPins = id => { try { const l = JSON.parse(store.get(pinKey(id)) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; } };
  const setPins = (id, list) => store.set(pinKey(id), JSON.stringify(list));
  const togglePin = (id, kind, name) => { const k = `${kind}:${name}`; const l = getPins(id); setPins(id, l.includes(k) ? l.filter(x => x !== k) : [...l, k]); return !l.includes(k); };

  // Ring-Anzeige (SVG). Füllung über stroke-dashoffset als Attribut – style-Attribute sind gesperrt.
  function ring(v, label, sub) {
    const r = 30, c = 2 * Math.PI * r, val = v == null ? 0 : Math.max(0, Math.min(100, v));
    return `<div class="ring ${level(v)}"><div class="r-gfx"><svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="${r}" class="r-bg"/><circle cx="36" cy="36" r="${r}" class="r-fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - val / 100)).toFixed(1)}" transform="rotate(-90 36 36)"/></svg><div class="r-val">${v == null ? '–' : Math.round(v) + '<small>%</small>'}</div></div><div class="r-lbl">${label}</div><div class="r-sub">${esc(sub)}</div></div>`;
  }

  async function viewStatus(id, main, quiet) {
    const enc = encodeURIComponent(id);
    const pins = getPins(id);
    const needSvc = pins.some(p => p.startsWith('service:')), needCtr = pins.some(p => p.startsWith('container:'));
    const [o, procs, disks, svc, ctr] = await Promise.all([
      api('GET', `/api/s/${enc}/overview?hours=${state.range}`),
      api('GET', `/api/s/${enc}/processes?sort=${state.psort}`).catch(() => []),
      api('GET', `/api/s/${enc}/disks`).catch(() => []),
      needSvc ? api('GET', `/api/s/${enc}/services`).catch(() => null) : null,
      needCtr ? api('GET', `/api/s/${enc}/containers`).catch(() => null) : null,
    ]);
    const m = o.metrics || {};
    $('.top .nm', app).textContent = o.name;
    $('.top .sub', app).textContent = m.os || '';
    const failed = (o.failed || []).length;
    const badge = $('.tabbar .badge', app); if (badge) { badge.hidden = !failed; badge.textContent = failed; }
    const ram = pct(m.mem?.used, m.mem?.total), disk = m.disk ? pct(m.disk.total - m.disk.free, m.disk.total) : null, cpu = m.cpu ?? null;
    const issues = o.issues || [];
    const admin = state.me.role === 'admin';

    // Angeheftete Einträge mit aktuellem Zustand
    const pinned = pins.map(k => {
      const [kind, ...rest] = k.split(':'); const name = rest.join(':');
      const it = kind === 'service' ? svc?.list?.find(x => x.name === name) : ctr?.list?.find(x => x.name === name);
      return it ? { kind, name, it } : null;
    }).filter(Boolean);
    const pinRow = p => {
      const running = p.kind === 'service' ? p.it.active === 'active' : p.it.state === 'running';
      const dot = p.kind === 'service' ? svcState(p.it) : ctrState(p.it);
      return `<div class="row" data-pin="${esc(p.kind + ':' + p.name)}"><span class="dot ${dot}"></span><div class="r-main"><div class="r-title">${esc(p.kind === 'service' ? shortName(p.name) : p.name)}</div><div class="r-sub">${esc(p.kind === 'service' ? word('state_', p.it.active) : p.it.status)}</div></div>${admin ? `<button class="qbtn" data-q="${running ? 'restart' : 'start'}" aria-label="${t(running ? 'restart' : 'start')}">${ic(running ? 'restart' : 'play')}</button>` : ''}<span class="chev">${ic('chev')}</span></div>`;
    };

    const maint = o.maintenance || state.servers.find(x => x.id === id)?.maintenance;
    main.innerHTML = `
      ${maint && maint.until > Date.now() ? `<div class="banner maint-banner">${ic('tool')}<div><b>${t('maintenanceOn')}</b>${t('maintUntil', { time: new Date(maint.until).toLocaleString(LANG, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) })}${maint.reason ? ' · ' + esc(maint.reason) : ''}</div></div>` : ''}
      ${issues.length ? `<div class="card alert-card"><h3>${t('problems')}</h3>${issuesHtml({ ok: true, issues })}</div>` : ''}
      <div class="card rings">
        ${ring(cpu, t('cpu'), t('coresShort', { n: m.cpus || '?' }))}
        ${ring(ram, t('ram'), m.mem ? `${bytes(m.mem.used)} / ${bytes(m.mem.total)}` : '')}
        ${ring(disk, t('disk'), m.disk ? t('free', { a: bytes(m.disk.free) }) : '')}
      </div>
      <div class="tiles">
        <div class="tile"><div class="t-lbl">${t('uptime')}</div><div class="t-val small">${esc(upt(m.uptime))}</div><div class="t-sub">${t('load')} ${(m.load || []).map(x => x.toFixed(2)).join(' · ')}</div></div>
        <div class="tile"><div class="t-lbl">${t('network')}</div><div class="t-val small">↓ ${m.net ? rate(m.net.rx) : '–'}</div><div class="t-sub">↑ ${m.net ? rate(m.net.tx) : '–'}</div></div>
      </div>
      <div class="section-title">${t('pinned')}</div>
      ${pinned.length ? `<div class="list pins">${pinned.map(pinRow).join('')}</div>` : `<div class="card hint-card">${ic('star')}<span>${t('pinHint')}</span></div>`}
      <div class="card">
        <div class="chart-head"><h3>${t('history')}</h3><div class="seg-small"><button data-r="24" class="${state.range === 24 ? 'on' : ''}">${t('h24')}</button><button data-r="168" class="${state.range === 168 ? 'on' : ''}">${t('d7')}</button></div></div>
        ${chart(o.history || [])}
        <div class="chart-legend"><span><i class="lg cpu"></i>${t('cpu')}</span><span><i class="lg mem"></i>${t('ram')}</span><span><i class="lg disk"></i>${t('disk')}</span></div>
      </div>
      <div class="card">
        <div class="chart-head"><h3>${t('processes')}</h3><div class="seg-small"><button data-ps="cpu" class="${state.psort === 'cpu' ? 'on' : ''}">CPU</button><button data-ps="mem" class="${state.psort === 'mem' ? 'on' : ''}">RAM</button></div></div>
        <div class="procs">${procs.slice(0, 6).map(p => `<div class="proc"><div class="p-main"><b>${esc(p.name)}</b><span>${esc(p.user)} · PID ${p.pid}</span></div><div class="p-num"><b>${p.cpu.toFixed(1)} %</b><span>${bytes(p.rss)}</span></div></div>`).join('') || `<div class="empty">–</div>`}</div>
      </div>
      ${disks.length ? `<div class="card"><h3>${t('disks')}</h3>${disks.map(d => { const v = pct(d.total - d.free, d.total); return `<div class="disk"><div class="lbl"><span class="mnt">${esc(d.mount)}</span><b>${v} %</b></div><div class="track ${level(v)}"><div data-w="${v}"></div></div><div class="d-sub">${t('free', { a: bytes(d.free) })} · ${bytes(d.total)} · ${esc(d.type)}</div></div>`; }).join('')}</div>` : ''}
      <div class="card"><h3>${t('system')}</h3><dl class="kv"><dt>${t('hostname')}</dt><dd>${esc(m.hostname || '–')}</dd><dt>${t('os')}</dt><dd>${esc(m.os || '–')}</dd><dt>${t('kernel')}</dt><dd>${esc(m.kernel || '–')}</dd><dt>${t('cpu')}</dt><dd>${t('coresShort', { n: m.cpus || '?' })}</dd></dl></div>`;
    applyWidths(main);
    for (const b of main.querySelectorAll('[data-r]')) b.addEventListener('click', () => { state.range = Number(b.dataset.r); viewStatus(id, main); });
    for (const b of main.querySelectorAll('[data-ps]')) b.addEventListener('click', () => { state.psort = b.dataset.ps; viewStatus(id, main); });
    for (const r of main.querySelectorAll('[data-pin]')) {
      const p = pinned.find(x => `${x.kind}:${x.name}` === r.dataset.pin);
      r.addEventListener('click', e => { if (!e.target.closest('[data-q]')) itemSheet(id, p.kind, p.it); });
      r.querySelector('[data-q]')?.addEventListener('click', () => confirmAction(id, p.kind, p.it, r.querySelector('[data-q]').dataset.q, p.kind === 'service' ? shortName(p.name) : p.name));
    }
  }

  // Liniengrafik (SVG) für CPU, RAM, Platte in %
  function chart(points) {
    const W = 340, H = 120;
    if (points.length < 2) return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><text x="${W / 2}" y="${H / 2}" class="c-empty" text-anchor="middle">…</text></svg>`;
    const t0 = points[0][0], t1 = points[points.length - 1][0] || t0 + 1;
    const x = tm => ((tm - t0) / (t1 - t0 || 1)) * W;
    const y = v => H - 4 - (Math.max(0, Math.min(100, v)) / 100) * (H - 8);
    const line = k => points.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[k]).toFixed(1)}`).join('');
    const area = k => `${line(k)}L${W},${H}L0,${H}Z`;
    const grid = [25, 50, 75].map(v => `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="c-grid"/>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}<path d="${area(1)}" class="c-area"/><path d="${line(3)}" class="c-disk"/><path d="${line(2)}" class="c-mem"/><path d="${line(1)}" class="c-cpu"/></svg>`;
  }

  // ----- Dienste / Docker -----
  const svcState = s => (s.active === 'failed' ? 'bad' : s.active === 'active' ? 'ok' : /activating|deactivating|reloading/.test(s.active) ? 'warn' : '');
  const ctrState = c => (c.state === 'running' ? 'ok' : c.state === 'restarting' ? 'warn' : /dead|exited/.test(c.state) && /Exited \((?!0\))/.test(c.status) ? 'bad' : '');

  async function viewServices(id, main, quiet) {
    const r = await api('GET', `/api/s/${encodeURIComponent(id)}/services`);
    if (!r.available) { main.innerHTML = `<div class="empty">${t('noServices')}</div>`; return; }
    const list = r.list.sort((a, b) => (a.active === 'failed' ? 0 : 1) - (b.active === 'failed' ? 0 : 1) || a.name.localeCompare(b.name));
    const badge = $('.tabbar .badge', app); const nf = list.filter(s => s.active === 'failed').length; if (badge) { badge.hidden = !nf; badge.textContent = nf; }
    renderList(main, {
      quiet, items: list,
      chips: [['all', t('all'), () => true], ['failed', t('failed'), s => s.active === 'failed'], ['running', t('running'), s => s.active === 'active'], ['stopped', t('stopped'), s => s.active === 'inactive']],
      match: (s, q) => (s.name + ' ' + s.description).toLowerCase().includes(q),
      row: s => `<div class="row" data-k="${esc(s.name)}"><span class="dot ${svcState(s)}"></span><div class="r-main"><div class="r-title">${esc(shortName(s.name))}</div><div class="r-sub">${esc(word('state_', s.active))} · ${esc(s.description)}</div></div><span class="chev">${ic('chev')}</span></div>`,
      open: s => itemSheet(id, 'service', s),
      empty: t('noServices'),
    });
  }

  async function viewDocker(id, main, quiet) {
    const r = await api('GET', `/api/s/${encodeURIComponent(id)}/containers`);
    if (!r.available) { main.innerHTML = `<div class="empty">${t('noDocker')}</div>`; return; }
    renderList(main, {
      quiet, items: r.list,
      chips: [['all', t('all'), () => true], ['running', t('running'), c => c.state === 'running'], ['stopped', t('stopped'), c => c.state !== 'running']],
      match: (c, q) => (c.name + ' ' + c.image).toLowerCase().includes(q),
      row: c => `<div class="row" data-k="${esc(c.name)}"><span class="dot ${ctrState(c)}"></span><div class="r-main"><div class="r-title">${esc(c.name)}</div><div class="r-sub">${esc(c.status)} · ${esc(c.image)}</div></div><span class="chev">${ic('chev')}</span></div>`,
      open: c => itemSheet(id, 'container', c),
      empty: r.error || t('noContainers'),
    });
  }

  // Suchfeld + Filter + Liste (behält Eingabe beim automatischen Neuladen)
  function renderList(main, o) {
    const f = state.filter;
    if (!o.quiet || !$('.list', main)) {
      main.innerHTML = `<div class="search">${ic('search')}<input type="search" placeholder="${t('search')}" autocapitalize="none" autocorrect="off" spellcheck="false"></div><div class="chips"></div><div class="list"></div>`;
      const inp = $('input', main);
      inp.value = f.q;
      inp.addEventListener('input', () => { f.q = inp.value; paint(); });
    }
    function paint() {
      const q = f.q.trim().toLowerCase();
      const chip = o.chips.find(c => c[0] === f.chip) || o.chips[0];
      $('.chips', main).innerHTML = o.chips.map(([k, l, fn]) => `<button class="chip ${k === chip[0] ? 'on' : ''}" data-c="${k}">${esc(l)}<span class="n">${o.items.filter(fn).length}</span></button>`).join('');
      for (const b of main.querySelectorAll('.chip')) b.addEventListener('click', () => { f.chip = b.dataset.c; paint(); });
      const items = o.items.filter(chip[2]).filter(x => !q || o.match(x, q));
      const box = $('.list', main);
      box.innerHTML = items.length ? items.map(o.row).join('') : `<div class="empty">${esc(o.empty)}</div>`;
      for (const r of box.querySelectorAll('.row')) r.addEventListener('click', () => o.open(items.find(x => x.name === r.dataset.k)));
    }
    paint();
  }

  // ---------- Blatt mit Aktionen ----------
  function openSheet(html) {
    const sh = $('#sheet'), bd = $('#sheet-backdrop');
    sh.classList.remove('tall');
    sh.innerHTML = '<div class="grab"></div>' + html;
    sh.hidden = false; bd.hidden = false;
    bd.onclick = closeSheet;
    return sh;
  }
  function closeSheet() { $('#sheet').hidden = true; $('#sheet-backdrop').hidden = true; }

  function itemSheet(id, kind, it) {
    const admin = state.me.role === 'admin';
    const running = kind === 'service' ? it.active === 'active' : it.state === 'running';
    const title = kind === 'service' ? shortName(it.name) : it.name;
    const sub = kind === 'service' ? `${word('state_', it.active)} · ${it.description}` : `${it.status} · ${it.image}`;
    const canStop = running && !(kind === 'service' && it.protected);
    const sh = openSheet(`
      <h2>${esc(title)}</h2><div class="s-sub">${esc(sub)}</div>
      <div class="btn-row">
        ${admin ? `<button class="btn" data-x="restart">${ic('restart')}${t('restart')}</button>` : ''}
        ${admin ? (running ? `<button class="btn danger" data-x="stop" ${canStop ? '' : 'disabled'}>${ic('stop')}${t('stop')}</button>` : `<button class="btn" data-x="start">${ic('play')}${t('start')}</button>`) : ''}
        <button class="btn" data-x="logs">${ic('logs')}${t('logs')}</button>
        ${admin && kind === 'service' && /^(enabled|disabled)$/.test(it.enabled || '') ? `<button class="btn" data-x="boot">${ic('power')}${it.enabled === 'enabled' ? t('bootOn') : t('bootOff')}</button>` : ''}
        <button class="btn ${getPins(id).includes(kind + ':' + it.name) ? 'on' : ''}" data-x="pin">${ic('star')}${getPins(id).includes(kind + ':' + it.name) ? t('unpin') : t('pin')}</button>
      </div>
      ${!admin ? `<p class="hint">${esc(t('viewerHint'))}</p>` : running && kind === 'service' && it.protected ? `<p class="hint">${esc(t('protectedHint'))}</p>` : ''}
      <div class="s-btns"><button class="btn block" data-x="close">${t('cancel')}</button></div>`);
    sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
    sh.querySelector('[data-x=logs]').addEventListener('click', () => go(`#/logs/${encodeURIComponent(id)}/${kind}/${encodeURIComponent(it.name)}`));
    sh.querySelector('[data-x=boot]')?.addEventListener('click', () => {
      const on = it.enabled === 'enabled';
      confirmSheet(t(on ? 'bootDisableTitle' : 'bootEnableTitle', { name: title }), t(on ? 'bootDisableMsg' : 'bootEnableMsg'), t(on ? 'bootDisable' : 'bootEnable'), async () => {
        await api('POST', `/api/s/${encodeURIComponent(id)}/services/${encodeURIComponent(it.name)}/${on ? 'disable' : 'enable'}`); closeSheet(); toast(t('done')); route();
      }, on);
    });
    sh.querySelector('[data-x=pin]').addEventListener('click', () => { toast(togglePin(id, kind, it.name) ? t('pinned1') : t('unpinned1')); closeSheet(); if (/\/status$/.test(location.hash)) route(); });
    for (const a of ['restart', 'stop', 'start']) sh.querySelector(`[data-x=${a}]`)?.addEventListener('click', () => confirmAction(id, kind, it, a, title));
  }

  function confirmAction(id, kind, it, action, title) {
    const key = { restart: 'confirmRestart', stop: 'confirmStop', start: 'confirmStart' }[action];
    const sh = openSheet(`
      <h2>${esc(t(key, { name: title }))}</h2>
      <p class="s-msg muted">${action === 'stop' ? t('stopHint') : action === 'restart' ? t('restartHint') : ''}</p>
      <div class="s-btns"><button class="btn ${action === 'stop' ? 'primary' : 'primary'} block" data-x="go">${t(action)}</button><button class="btn block" data-x="cancel">${t('cancel')}</button></div>`);
    sh.querySelector('[data-x=cancel]').addEventListener('click', closeSheet);
    const btn = sh.querySelector('[data-x=go]');
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = '…';
      try {
        await api('POST', `/api/s/${encodeURIComponent(id)}/${kind === 'service' ? 'services' : 'containers'}/${encodeURIComponent(it.name)}/${action}`);
        closeSheet(); toast(t('done'));
        route();
      } catch (e) { closeSheet(); toast(e.message, true); }
    });
  }

  // ----- Mehr -----
  async function viewMore(id, main) {
    const admin = state.me.role === 'admin';
    const name = $('.top .nm', app).textContent || state.servers.find(s => s.id === id)?.name || '';
    const enc = encodeURIComponent(id);
    const tile = (k, icon, title, sub, cls = '') => `<button class="tile-btn ${cls}" data-go="${k}">${ic(icon)}<b>${title}</b><span>${sub}</span><i class="badge" hidden></i></button>`;
    main.innerHTML = `
      <div class="card maint"></div>
      <div class="tile-grid">
        ${tile('updates', 'download', t('updates'), t('updatesTile'))}
        ${tile('scripts', 'code', t('scripts'), t('scriptsTile'))}
        ${tile('inventory', 'box', t('inventory'), t('inventoryTile'))}
        ${tile('tasks', 'clock', t('tasks'), t('tasksTile'))}
        ${tile('processes', 'cpu', t('processes'), t('processesTile'))}
        <button class="tile-btn" data-a="notes">${ic('edit')}<b>${t('notes')}</b><span>${t('notesTile')}</span></button>
        ${admin && id === 'local' ? `<button class="tile-btn" data-a="term">${ic('terminal')}<b>${t('terminal')}</b><span>${t('terminalTile')}</span></button>${tile('files', 'folder', t('files'), t('filesTile'))}` : ''}
        ${admin ? tile('audit', 'list', t('audit'), t('auditDesc')) : ''}
      </div>
      <div class="list">
        <div class="row" data-a="settings">${ic('gear')}<div class="r-main"><div class="r-title">${t('settings')}</div><div class="r-sub">${t('notifications')} · ${t('account')}</div></div><span class="chev">${ic('chev')}</span></div>
      </div>
      ${admin ? `<div class="section-title"></div><button class="btn danger block" data-a="reboot">${ic('power')}${t('reboot')}</button>` : ''}`;
    for (const b of main.querySelectorAll('[data-go]')) b.addEventListener('click', () => go(`#/s/${enc}/${b.dataset.go}`));
    main.querySelector('[data-a=notes]').addEventListener('click', () => notesSheet(id));
    main.querySelector('[data-a=term]')?.addEventListener('click', () => { location.href = '/term.html'; });
    paintMaint(id, main.querySelector('.maint'));
    $('[data-a=settings]', main).addEventListener('click', () => go('#/settings'));
    $('[data-a=reboot]', main)?.addEventListener('click', () => rebootSheet(id, name));
    // Anzahl offener Updates nachladen
    api('GET', `/api/s/${enc}/updates`).then(u => {
      const b = main.querySelector('[data-go=updates] .badge');
      if (b && u.list && u.list.length) { b.hidden = false; b.textContent = u.list.length; b.classList.toggle('sec', u.list.some(p => p.security)); }
    }).catch(() => {});
  }


  // ----- Freischalten (Terminal, Dateien) -----
  function unlockSheet(after) {
    formSheet({
      title: t('unlockTitle'), sub: t('unlockMsg'), submit: t('unlockBtn'), fields: [codeField()],
      onSubmit: async f => { await api('POST', '/api/unlock', { code: f.code.value }); closeSheet(); after && after(); },
    });
    const c = $('#sheet input.code');
    c && c.addEventListener('input', () => { if (/^\d{6}$/.test(c.value)) c.form.requestSubmit(); });
  }

  // ----- Dateien -----
  async function viewFiles(id, main) {
    $('.top .nm', app).textContent = t('files');
    if (id !== 'local') { main.innerHTML = `<div class="card empty-card">${ic('folder')}<p>${t('onlyMain')}</p></div>`; return; }
    const at = state.fpath || sessionStorage.getItem('s3:fpath') || '';
    let d;
    try { d = await api('GET', '/api/files/list?path=' + encodeURIComponent(at)); }
    catch (e) {
      if (e.unlock) {
        main.innerHTML = `<div class="card empty-card">${ic('lock')}<b>${t('locked')}</b><p>${t('lockedMsg')}</p><button class="btn primary" data-a="unlock">${ic('lock')}${t('unlockBtn')}</button></div>`;
        main.querySelector('[data-a=unlock]').addEventListener('click', () => unlockSheet(() => viewFiles(id, main)));
        unlockSheet(() => viewFiles(id, main));
        return;
      }
      if (at && e.status === 404) { state.fpath = ''; sessionStorage.removeItem('s3:fpath'); return viewFiles(id, main); }
      throw e;
    }
    state.fpath = d.path; sessionStorage.setItem('s3:fpath', d.path);
    const go2 = p => { state.fpath = p; viewFiles(id, main).catch(e => toast(e.message, true)); };
    const join = n => (d.path === '/' ? '' : d.path) + '/' + n;
    const crumbs = d.path === '/' ? [''] : d.path.split('/');
    main.innerHTML = `
      <div class="fbar">
        <button class="qbtn" data-a="up" aria-label="${t('upDir')}" ${d.parent ? '' : 'disabled'}>${ic('up')}</button>
        <div class="crumbs">${crumbs.map((c, i) => `<button data-p="${esc(crumbs.slice(0, i + 1).join('/') || '/')}">${i === 0 ? '/' : esc(c)}</button>`).join('<span class="sep">›</span>')}</div>
      </div>
      <div class="fbtns">
        <button class="btn small" data-a="mkdir">${ic('folderPlus')}${t('newFolder')}</button>
        <button class="btn small" data-a="upload">${ic('upload')}${t('upload')}</button>
        <input type="file" multiple hidden>
      </div>
      ${d.entries.length ? `<div class="list files">${d.entries.map((f, i) => `<div class="row" data-i="${i}">
          <span class="ficon ${f.dir ? 'dir' : ''}">${ic(f.dir ? 'folder' : f.link ? 'link' : 'file')}</span>
          <div class="r-main"><div class="r-title">${esc(f.name)}</div><div class="r-sub">${f.dir ? '' : bytes(f.size) + ' · '}${f.mtime ? esc(new Date(f.mtime).toLocaleString(LANG, { dateStyle: 'short', timeStyle: 'short' })) : ''} · ${esc(f.owner)}</div></div>
          <button class="fmore" data-m="${i}" aria-label="…">${ic('dots')}</button></div>`).join('')}</div>`
        : `<div class="card empty">${t('emptyDir')}</div>`}
      ${d.truncated ? `<p class="muted small">${t('dirTruncated')}</p>` : ''}
      <div class="flock"><button class="btn small" data-a="lock">${ic('lock')}${t('lockNow')}</button></div>`;
    const crumbBox = main.querySelector('.crumbs'); crumbBox.scrollLeft = crumbBox.scrollWidth;
    for (const b of main.querySelectorAll('.crumbs button')) b.addEventListener('click', () => go2(b.dataset.p));
    main.querySelector('[data-a=up]').addEventListener('click', () => d.parent && go2(d.parent));
    main.querySelector('[data-a=lock]').addEventListener('click', async () => { await api('POST', '/api/unlock/end').catch(() => {}); viewFiles(id, main); });
    main.querySelector('[data-a=mkdir]').addEventListener('click', () => formSheet({
      title: t('newFolder'), sub: d.path, submit: t('create'), fields: [{ label: t('folderName'), name: 'name', attrs: 'autocapitalize="none" autocorrect="off" spellcheck="false" required maxlength="255"' }],
      onSubmit: async f => { const r = await api('POST', '/api/files/mkdir', { path: d.path, name: f.name.value.trim() }); closeSheet(); go2(r.path); },
    }));
    const picker = main.querySelector('input[type=file]');
    main.querySelector('[data-a=upload]').addEventListener('click', () => picker.click());
    picker.addEventListener('change', async () => {
      const list = [...picker.files]; picker.value = '';
      let n = 0;
      for (const [i, file] of list.entries()) {
        toast(t('uploading', { i: i + 1, n: list.length }));
        try { await uploadFile(d.path, file, false); n++; }
        catch (e) {
          if (e.status !== 409) { toast(e.message, true); continue; }
          const ok = await new Promise(res => { confirmSheet(t('overwriteTitle', { name: file.name }), t('overwriteMsg'), t('replace'), async () => { closeSheet(); res(true); }, true); $('#sheet [data-x=cancel]').addEventListener('click', () => res(false)); });
          if (ok) { try { await uploadFile(d.path, file, true); n++; } catch (e2) { toast(e2.message, true); } }
        }
      }
      if (n) toast(t('uploaded', { n }));
      viewFiles(id, main);
    });
    const open = f => (f.dir ? go2(join(f.name)) : fileSheet(id, main, d, f));
    for (const r of main.querySelectorAll('.files .row')) r.addEventListener('click', e => { if (e.target.closest('.fmore')) return; open(d.entries[r.dataset.i]); });
    for (const b of main.querySelectorAll('.fmore')) b.addEventListener('click', () => fileSheet(id, main, d, d.entries[b.dataset.m]));
  }

  async function uploadFile(dir, file, overwrite) {
    const res = await fetch(`/api/files/upload?path=${encodeURIComponent(dir)}&name=${encodeURIComponent(file.name)}${overwrite ? '&overwrite=1' : ''}`, { method: 'POST', credentials: 'same-origin', headers: { 'X-S3cure': '1', 'Content-Type': 'application/octet-stream' }, body: file });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `${t('error')} ${res.status}`), { status: res.status, unlock: !!data.unlock });
    return data;
  }

  function fileSheet(id, main, d, f) {
    const p = (d.path === '/' ? '' : d.path) + '/' + f.name;
    const reload = () => viewFiles(id, main).catch(e => toast(e.message, true));
    const sh = openSheet(`<h2 class="fname">${ic(f.dir ? 'folder' : f.link ? 'link' : 'file')}<span>${esc(f.name)}</span></h2>
      <div class="kv-card"><dl class="kv">
        <dt>${t('pathL')}</dt><dd class="mono">${esc(p)}</dd>
        ${f.dir ? '' : `<dt>${t('size')}</dt><dd>${bytes(f.size)}</dd>`}
        <dt>${t('changed')}</dt><dd>${f.mtime ? esc(new Date(f.mtime).toLocaleString(LANG)) : '–'}</dd>
        <dt>${t('owner')}</dt><dd>${esc(f.owner)}</dd><dt>${t('rights')}</dt><dd class="mono">${esc(f.mode)}</dd>
        ${f.link ? `<dt>${t('linkTo')}</dt><dd class="mono">${esc(f.target || '?')}</dd>` : ''}
      </dl></div>
      <div class="btn-row">
        ${f.dir ? `<button class="btn" data-x="open">${ic('folder')}${t('open')}</button>` : `<button class="btn" data-x="edit">${ic('edit')}${t('editFile')}</button><button class="btn" data-x="dl">${ic('download')}${t('downloadFile')}</button>`}
        <button class="btn" data-x="ren">${ic('edit')}${t('rename')}</button>
        <button class="btn danger" data-x="del">${ic('trash')}${t('delete')}</button>
      </div>
      <div class="s-btns"><button class="btn block" data-x="close">${t('close')}</button></div>`);
    sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
    sh.querySelector('[data-x=open]')?.addEventListener('click', () => { closeSheet(); state.fpath = p; reload(); });
    sh.querySelector('[data-x=dl]')?.addEventListener('click', () => {
      const a = document.createElement('a'); a.href = '/api/files/download?path=' + encodeURIComponent(p); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    });
    sh.querySelector('[data-x=edit]')?.addEventListener('click', () => editFile(p, f.name).catch(e => (e.unlock ? unlockSheet() : toast(e.message, true))));
    sh.querySelector('[data-x=ren]').addEventListener('click', () => {
      formSheet({
        title: t('rename'), sub: p, submit: t('save'), fields: [{ html: `<label>${t('newName')}<input name="name" value="${esc(f.name)}" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="255" required></label>` }],
        onSubmit: async fm => { await api('POST', '/api/files/rename', { path: p, name: fm.name.value.trim() }); closeSheet(); toast(t('saved')); reload(); },
      });
    });
    sh.querySelector('[data-x=del]').addEventListener('click', () => confirmSheet(t('deleteFileTitle', { name: f.name }), f.dir ? t('deleteDirMsg') : t('deleteFileMsg'), t('delete'), async () => {
      await api('POST', '/api/files/delete', { path: p }); closeSheet(); toast(t('deleted')); reload();
    }, true));
  }

  async function editFile(p, name) {
    const r = await api('GET', '/api/files/read?path=' + encodeURIComponent(p));
    if (r.binary || r.tooBig) { toast(r.binary ? t('binaryFile') : t('bigFile'), true); return; }
    const sh = openSheet(`<h2 class="fname">${ic('file')}<span>${esc(name)}</span></h2><div class="s-sub mono">${esc(p)}</div>
      <textarea class="editor" spellcheck="false" autocapitalize="none" autocorrect="off" wrap="off"></textarea>
      <div class="err" hidden></div>
      <div class="s-btns"><button class="btn primary block" data-x="save">${t('save')}</button><button class="btn block" data-x="cancel">${t('cancel')}</button></div>`);
    sh.classList.add('tall');
    const ta = sh.querySelector('.editor'); ta.value = r.text;
    let mtime = r.mtime;
    sh.querySelector('[data-x=cancel]').addEventListener('click', () => { if (ta.value !== r.text && !confirm(t('unsaved'))) return; closeSheet(); });
    sh.querySelector('[data-x=save]').addEventListener('click', () => {
      if (ta.value === r.text) { closeSheet(); return; }
      // Nachfrage im Editor selbst – bei „Abbrechen“ bleibt der Text erhalten
      if (!confirm(`${t('saveFileTitle')}\n${t('saveFileMsg', { name })}`)) return;
      const btn = sh.querySelector('[data-x=save]'), err = sh.querySelector('.err');
      btn.disabled = true; err.hidden = true;
      const write = () => api('POST', '/api/files/write', { path: p, text: ta.value, mtime });
      // Freischaltung abgelaufen (lange bearbeitet)? Code abfragen, ohne den Editor zu schließen
      write().catch(async e => {
        if (!e.unlock) throw e;
        const code = (prompt(`${t('unlockTitle')}: ${t('code')}`) || '').trim();
        if (!code) throw e;
        await api('POST', '/api/unlock', { code });
        return write();
      })
        .then(w => { mtime = w.mtime; closeSheet(); toast(t('saved')); })
        .catch(e => { err.textContent = e.message; err.hidden = false; })
        .finally(() => { btn.disabled = false; });
    });
  }

  // Wartungsfenster: Karte oben in „Mehr“
  async function paintMaint(id, box) {
    const admin = state.me.role === 'admin';
    let m; try { m = await api('GET', `/api/s/${encodeURIComponent(id)}/maintenance`); } catch { box.hidden = true; return; }
    box.classList.toggle('on', !!m.active);
    box.innerHTML = m.active
      ? `<div class="maint-row">${ic('tool')}<div><b>${t('maintenanceOn')}</b><span>${t('maintUntil', { time: new Date(m.until).toLocaleString(LANG, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) })}${m.reason ? ' · ' + esc(m.reason) : ''}</span></div>${admin ? `<button class="btn small" data-m="end">${t('end')}</button>` : ''}</div>`
      : `<div class="maint-row">${ic('tool')}<div><b>${t('maintenance')}</b><span>${t('maintHint')}</span></div>${admin ? `<button class="btn small" data-m="start">${t('start')}</button>` : ''}</div>`;
    box.querySelector('[data-m=end]')?.addEventListener('click', async () => { try { await api('POST', `/api/s/${encodeURIComponent(id)}/maintenance/end`); paintMaint(id, box); toast(t('done')); } catch (e) { toast(e.message, true); } });
    box.querySelector('[data-m=start]')?.addEventListener('click', () => formSheet({
      title: t('maintStartTitle'), sub: t('maintStartSub'), submit: t('start'),
      fields: [
        { html: `<label>${t('duration')}<select name="minutes">${[[30, '30 min'], [60, '1 h'], [120, '2 h'], [240, '4 h'], [480, '8 h'], [1440, '24 h']].map(([v, l]) => `<option value="${v}" ${v === 60 ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` },
        { name: 'reason', label: t('reason'), attrs: `maxlength="120" placeholder="${t('optional')}"` },
      ],
      onSubmit: async f => { await api('POST', `/api/s/${encodeURIComponent(id)}/maintenance`, { minutes: Number(f.minutes.value), reason: f.reason.value }); closeSheet(); paintMaint(id, box); toast(t('maintStarted')); },
    }));
  }

  // Kunde, Standort, Tags, Notizen
  async function notesSheet(id) {
    const admin = state.me.role === 'admin';
    let all = {}; try { all = await api('GET', '/api/meta'); } catch {}
    const m = all[id] || {};
    if (!admin) {
      const sh = openSheet(`<h2>${t('notes')}</h2><dl class="kv"><dt>${t('client')}</dt><dd>${esc(m.client || '–')}</dd><dt>${t('site')}</dt><dd>${esc(m.site || '–')}</dd><dt>${t('tags')}</dt><dd>${esc((m.tags || []).join(', ') || '–')}</dd></dl><pre class="code-pre notes-pre"></pre><div class="s-btns"><button class="btn block" data-x="close">${t('close')}</button></div>`);
      sh.querySelector('.notes-pre').textContent = m.notes || '–';
      sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
      return;
    }
    const sh = formSheet({
      title: t('notes'), sub: t('notesSub'), submit: t('save'),
      fields: [
        { html: `<div class="grid2"><label>${t('client')}<input name="client" value="${esc(m.client || '')}" maxlength="60"></label><label>${t('site')}<input name="site" value="${esc(m.site || '')}" maxlength="60"></label></div>` },
        { name: 'tags', label: t('tagsHint'), attrs: `value="${esc((m.tags || []).join(', '))}" placeholder="produktion, web"` },
        { html: `<label>${t('notes')}<textarea name="notes" rows="7" placeholder="${t('notesPh')}"></textarea></label>` },
      ],
      onSubmit: async f => { await api('POST', `/api/meta/${encodeURIComponent(id)}`, { client: f.client.value, site: f.site.value, tags: f.tags.value, notes: f.notes.value }); closeSheet(); toast(t('saved')); },
    });
    sh.querySelector('textarea[name=notes]').value = m.notes || '';
  }

  // ----- Geplante Aufgaben -----
  const schedText = s => s.type === 'daily' ? t('schedDaily', { time: s.time }) : s.type === 'weekly' ? t('schedWeekly', { day: t('wd' + s.day), time: s.time }) : s.type === 'hourly' ? t('schedHourly', { m: String(s.minute).padStart(2, '0') }) : t('schedEvery', { n: s.every });

  async function viewTasks(id, main) {
    $('.top .nm', app).textContent = t('tasks');
    const [list, scriptsList] = await Promise.all([api('GET', '/api/tasks'), api('GET', '/api/scripts')]);
    const admin = state.me.role === 'admin';
    const sname = sid => scriptsList.find(x => x.id === sid)?.name || '?';
    const srvName = sid => state.servers.find(x => x.id === sid)?.name || sid;
    main.innerHTML = `
      ${admin ? `<div class="sumrow"><span class="muted">${t('tasksHint')}</span><span class="spacer"></span><button class="btn small" data-a="add">${ic('plus')}${t('newTask')}</button></div>` : ''}
      ${list.length ? `<div class="list">${list.map(tk => `<div class="row" data-tk="${esc(tk.id)}"><span class="dot ${!tk.enabled ? '' : tk.lastStatus === 'fail' ? 'bad' : tk.lastStatus === 'running' ? 'warn' : tk.lastStatus === 'ok' ? 'ok' : ''}"></span><div class="r-main"><div class="r-title">${esc(tk.name)}${tk.enabled ? '' : ` <span class="pill">${t('paused')}</span>`}</div><div class="r-sub">${esc(schedText(tk.schedule))} · ${esc(sname(tk.script))} · ${esc(tk.servers.map(srvName).join(', '))}</div></div><span class="chev">${ic('chev')}</span></div>`).join('')}</div>`
        : `<div class="card empty-card">${ic('clock')}<b>${t('noTasks')}</b><p>${t('noTasksHint')}</p>${admin ? `<button class="btn primary" data-a="add">${ic('plus')}${t('newTask')}</button>` : ''}</div>`}`;
    for (const b of main.querySelectorAll('[data-a=add]')) b.addEventListener('click', () => taskForm(id, null, scriptsList, () => viewTasks(id, main)));
    for (const r of main.querySelectorAll('[data-tk]')) r.addEventListener('click', () => {
      const tk = list.find(x => x.id === r.dataset.tk);
      const sh = openSheet(`<h2>${esc(tk.name)}</h2><div class="s-sub">${esc(schedText(tk.schedule))}</div>
        <div class="kv-card"><dl class="kv"><dt>${t('scriptOne')}</dt><dd>${esc(sname(tk.script))}</dd><dt>${t('servers')}</dt><dd>${esc(tk.servers.map(srvName).join(', '))}</dd><dt>${t('lastCheck')}</dt><dd>${tk.lastRun ? ago(tk.lastRun) : '–'}</dd></dl></div>
        ${admin ? `<div class="btn-row"><button class="btn primary" data-x="run">${ic('play')}${t('runNow')}</button><button class="btn" data-x="edit">${ic('edit')}${t('edit')}</button></div>` : ''}
        <div class="s-btns">${admin ? `<button class="btn danger block" data-x="del">${ic('trash')}${t('delete')}</button>` : ''}<button class="btn block" data-x="close">${t('close')}</button></div>`);
      sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
      sh.querySelector('[data-x=run]')?.addEventListener('click', async () => { try { const runs = await api('POST', `/api/tasks/${tk.id}/run`); runSheet(runs.map(x => x.id), () => viewTasks(id, main)); } catch (e) { toast(e.message, true); } });
      sh.querySelector('[data-x=edit]')?.addEventListener('click', () => taskForm(id, tk, scriptsList, () => viewTasks(id, main)));
      sh.querySelector('[data-x=del]')?.addEventListener('click', () => confirmSheet(t('deleteTaskTitle', { name: tk.name }), t('deleteTaskMsg'), t('delete'), async () => { await api('POST', `/api/tasks/${tk.id}/delete`); closeSheet(); viewTasks(id, main); }, true));
    });
  }

  function taskForm(id, tk, scriptsList, after) {
    const s = tk ? tk.schedule : { type: 'daily', time: '03:00', day: 1, minute: 0, every: 60 };
    const chosen = new Set(tk ? tk.servers : [id]);
    const sh = openSheet(`
      <h2>${tk ? t('editTask') : t('newTaskTitle')}</h2><div class="s-sub">${t('taskFormSub')}</div>
      <form class="sheet-form">
        <label>${t('name')}<input name="name" value="${esc(tk?.name || '')}" maxlength="60" required></label>
        <label>${t('scriptOne')}<select name="script">${scriptsList.map(sc => `<option value="${esc(sc.id)}" ${tk?.script === sc.id ? 'selected' : ''}>${esc(sc.name)}</option>`).join('')}</select></label>
        <label>${t('schedule')}<select name="type">${['daily', 'weekly', 'hourly', 'interval'].map(k => `<option value="${k}" ${s.type === k ? 'selected' : ''}>${t('st_' + k)}</option>`).join('')}</select></label>
        <div class="grid2">
          <label class="tf" data-for="weekly">${t('dayLabel')}<select name="day">${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${s.day === d ? 'selected' : ''}>${t('wd' + d)}</option>`).join('')}</select></label>
          <label class="tf" data-for="daily weekly">${t('timeLabel')}<input name="time" type="time" value="${esc(s.time || '03:00')}"></label>
          <label class="tf" data-for="hourly">${t('minuteLabel')}<input name="minute" type="number" min="0" max="59" value="${esc(s.minute ?? 0)}"></label>
          <label class="tf" data-for="interval">${t('everyMin')}<input name="every" type="number" min="5" max="1440" value="${esc(s.every || 60)}"></label>
        </div>
        <div class="sub-head">${t('servers')}</div>
        <div class="list pick">${state.servers.map(x => `<label class="row"><input type="checkbox" name="srv" value="${esc(x.id)}" ${chosen.has(x.id) ? 'checked' : ''}><div class="r-main"><div class="r-title">${esc(x.name)}</div></div></label>`).join('')}</div>
        <label class="check"><input type="checkbox" name="enabled" ${tk?.enabled === false ? '' : 'checked'}><span>${t('taskActive')}</span></label>
        <div class="err" hidden></div>
        <div class="s-btns"><button class="btn primary block" type="submit">${t('save')}</button><button class="btn block" type="button" data-x="cancel">${t('cancel')}</button></div>
      </form>`);
    const f = sh.querySelector('form'), err = sh.querySelector('.err');
    const sync = () => { for (const d of f.querySelectorAll('.tf')) d.hidden = !d.dataset.for.split(' ').includes(f.type.value); };
    f.type.addEventListener('change', sync); sync();
    sh.querySelector('[data-x=cancel]').addEventListener('click', closeSheet);
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.hidden = true;
      try {
        await api('POST', '/api/tasks', { id: tk?.id, name: f.name.value, script: f.script.value, servers: [...f.querySelectorAll('input[name=srv]:checked')].map(i => i.value), enabled: f.enabled.checked,
          schedule: { type: f.type.value, time: f.time.value, day: Number(f.day.value), minute: Number(f.minute.value), every: Number(f.every.value) } });
        closeSheet(); toast(t('saved')); after();
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
  }

  // ----- Prozesse -----
  async function viewProcesses(id, main) {
    $('.top .nm', app).textContent = t('processes');
    const enc = encodeURIComponent(id);
    const list = await api('GET', `/api/s/${enc}/processes?sort=${state.psort}&limit=150`);
    const admin = state.me.role === 'admin';
    main.innerHTML = `
      <div class="sumrow"><div class="search grow">${ic('search')}<input type="search" placeholder="${t('search')}" autocapitalize="none" autocorrect="off" spellcheck="false"></div>
        <div class="seg-small"><button data-ps="cpu" class="${state.psort === 'cpu' ? 'on' : ''}">CPU</button><button data-ps="mem" class="${state.psort === 'mem' ? 'on' : ''}">RAM</button></div></div>
      <div class="list procs-list"></div>`;
    const inp = main.querySelector('input');
    const paint = () => {
      const q = inp.value.trim().toLowerCase();
      const hits = list.filter(p => !q || p.name.toLowerCase().includes(q) || p.user.includes(q) || String(p.pid) === q);
      main.querySelector('.procs-list').innerHTML = hits.map(p => `<div class="row" data-pid="${p.pid}"><div class="r-main"><div class="r-title">${esc(p.name)}</div><div class="r-sub">${esc(p.user)} · PID ${p.pid}</div></div><div class="p-num"><b>${p.cpu.toFixed(1)} %</b><span>${bytes(p.rss)}</span></div></div>`).join('') || `<div class="empty">–</div>`;
      for (const r of main.querySelectorAll('[data-pid]')) r.addEventListener('click', () => {
        const p = list.find(x => String(x.pid) === r.dataset.pid);
        const sh = openSheet(`<h2>${esc(p.name)}</h2><div class="s-sub">PID ${p.pid} · ${esc(p.user)}</div>
          <div class="kv-card"><dl class="kv"><dt>CPU</dt><dd>${p.cpu.toFixed(1)} %</dd><dt>${t('ram')}</dt><dd>${bytes(p.rss)} (${p.mem.toFixed(1)} %)</dd></dl></div>
          ${admin ? `<div class="btn-row"><button class="btn" data-x="term">${ic('stop')}${t('killTerm')}</button><button class="btn danger" data-x="kill">${ic('close')}${t('killNow')}</button></div>` : `<p class="hint">${t('viewerHint')}</p>`}
          <div class="s-btns"><button class="btn block" data-x="close">${t('close')}</button></div>`);
        sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
        const kill = signal => confirmSheet(t('killTitle', { name: p.name, pid: p.pid }), signal === 'KILL' ? t('killNowMsg') : t('killTermMsg'), signal === 'KILL' ? t('killNow') : t('killTerm'), async () => {
          await api('POST', `/api/s/${enc}/processes/${p.pid}/kill`, { signal }); closeSheet(); toast(t('done')); viewProcesses(id, main);
        }, true);
        sh.querySelector('[data-x=term]')?.addEventListener('click', () => kill('TERM'));
        sh.querySelector('[data-x=kill]')?.addEventListener('click', () => kill('KILL'));
      });
    };
    inp.addEventListener('input', paint);
    for (const b of main.querySelectorAll('[data-ps]')) b.addEventListener('click', () => { state.psort = b.dataset.ps; viewProcesses(id, main); });
    paint();
  }

  async function viewAudit(id, main) {
    $('.top .nm', app).textContent = t('audit');
    const log = await api('GET', '/api/audit');
    main.innerHTML = `<div class="list audit">${log.length ? log.slice(0, 150).map(e => `<div class="row"><span class="dot ${/failed|locked|reboot|stop|alert|delete/.test(e.action) ? 'warn' : 'ok'}"></span><div class="r-main"><div class="r-title">${esc(word('act_', e.action))}${e.target ? ' · ' + esc(e.target) : ''}</div><div class="r-sub">${esc(e.user)} · ${new Date(e.at).toLocaleString(LANG)}${e.ip ? ' · ' + esc(e.ip) : ''}${e.detail ? ' · ' + esc(e.detail) : ''}</div></div></div>`).join('') : `<div class="empty">${t('auditEmpty')}</div>`}</div>`;
  }

  // ----- Checks -----
  const CHECK_TYPES = ['http', 'ping', 'port', 'cert', 'service', 'disk', 'script'];
  const checkDot = st => (st === 'ok' ? 'ok' : st === 'fail' ? 'bad' : st === 'warn' ? 'warn' : '');
  const checkTarget = c => c.type === 'http' ? c.url : c.type === 'service' ? c.service : c.type === 'disk' ? `${c.path} < ${c.limit} %` : c.type === 'script' ? t('ctype_script') : c.port ? `${c.host}:${c.port}` : c.host;
  const histBar = h => `<div class="hbar">${(h || []).slice(-30).map(x => `<i class="${x[1] ? 'ok' : 'bad'}"></i>`).join('')}</div>`;

  async function viewChecks(id, main, quiet) {
    const list = await api('GET', `/api/s/${encodeURIComponent(id)}/checks`);
    const admin = state.me.role === 'admin';
    const nf = list.filter(c => c.state.status === 'fail').length;
    const badge = $('.tabbar [data-t=checks] .badge', app); if (badge) { badge.hidden = !nf; badge.textContent = nf; }
    const sum = list.reduce((m, c) => (m[c.state.status] = (m[c.state.status] || 0) + 1, m), {});
    main.innerHTML = `
      ${list.length ? `<div class="sumrow"><span class="pill ok"><span class="dot"></span>${sum.ok || 0} OK</span>${sum.fail ? `<span class="pill bad"><span class="dot"></span>${sum.fail} ${t('failed')}</span>` : ''}${sum.warn ? `<span class="pill warn"><span class="dot"></span>${sum.warn}</span>` : ''}${admin ? `<span class="spacer"></span><button class="btn small" data-a="add">${ic('plus')}${t('addCheck')}</button>` : ''}</div>` : ''}
      ${list.length ? `<div class="list">${list.sort((a, b) => (a.state.status === 'fail' ? 0 : 1) - (b.state.status === 'fail' ? 0 : 1) || a.name.localeCompare(b.name)).map(c => `<div class="row check" data-c="${esc(c.id)}"><span class="dot ${checkDot(c.state.status)}"></span><div class="r-main"><div class="r-title">${esc(c.name)}</div><div class="r-sub">${esc(word('ctype_', c.type))} · ${esc(c.state.msg || word('cstate_', c.state.status))}${c.state.ms != null ? ` · ${Math.round(c.state.ms)} ms` : ''}</div>${histBar(c.state.history)}</div><span class="chev">${ic('chev')}</span></div>`).join('')}</div>`
        : `<div class="card empty-card">${ic('pulse')}<b>${t('noChecks')}</b><p>${t('noChecksHint')}</p>${admin ? `<button class="btn primary" data-a="add">${ic('plus')}${t('addCheck')}</button>` : ''}</div>`}`;
    for (const b of main.querySelectorAll('[data-a=add]')) b.addEventListener('click', () => checkForm(id, null, main));
    for (const r of main.querySelectorAll('[data-c]')) r.addEventListener('click', () => checkSheet(id, list.find(c => c.id === r.dataset.c), main));
  }

  function checkSheet(id, c, main) {
    const admin = state.me.role === 'admin';
    const sh = openSheet(`
      <h2>${esc(c.name)}</h2><div class="s-sub">${esc(word('ctype_', c.type))} · ${esc(checkTarget(c))}</div>
      <div class="kv-card"><dl class="kv"><dt>${t('status')}</dt><dd><span class="pill ${checkDot(c.state.status)}"><span class="dot"></span>${esc(word('cstate_', c.state.status))}</span></dd>
        <dt>${t('lastResult')}</dt><dd>${esc(c.state.msg || '–')}</dd><dt>${t('lastCheck')}</dt><dd>${c.state.last ? ago(c.state.last) : '–'}</dd>
        <dt>${t('interval')}</dt><dd>${t('everyS', { n: c.interval })}</dd></dl>${histBar(c.state.history)}</div>
      <div class="btn-row"><button class="btn" data-x="run">${ic('refresh')}${t('checkNow')}</button>${admin ? `<button class="btn" data-x="edit">${ic('edit')}${t('edit')}</button>` : ''}</div>
      <div class="s-btns">${admin ? `<button class="btn danger block" data-x="del">${ic('trash')}${t('delete')}</button>` : ''}<button class="btn block" data-x="close">${t('close')}</button></div>`);
    sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
    sh.querySelector('[data-x=run]').addEventListener('click', async () => { try { await api('POST', `/api/s/${encodeURIComponent(id)}/checks/${c.id}/run`); closeSheet(); viewChecks(id, main); } catch (e) { toast(e.message, true); } });
    sh.querySelector('[data-x=edit]')?.addEventListener('click', () => checkForm(id, c, main));
    sh.querySelector('[data-x=del]')?.addEventListener('click', () => confirmSheet(t('deleteCheckTitle', { name: c.name }), t('deleteCheckMsg'), t('delete'), async () => { await api('POST', `/api/s/${encodeURIComponent(id)}/checks/${c.id}/delete`); closeSheet(); viewChecks(id, main); }, true));
  }

  function checkForm(id, c, main) {
    const type0 = c ? c.type : 'http';
    const sh = openSheet(`
      <h2>${c ? t('editCheck') : t('newCheck')}</h2><div class="s-sub">${t('checkFormSub')}</div>
      <form class="sheet-form">
        <label>${t('checkType')}<select name="type" ${c ? 'disabled' : ''}>${CHECK_TYPES.map(k => `<option value="${k}" ${k === type0 ? 'selected' : ''}>${esc(word('ctype_', k))}</option>`).join('')}</select></label>
        <label>${t('name')}<input name="name" value="${esc(c?.name || '')}" placeholder="${t('optional')}" maxlength="60"></label>
        <div class="tf" data-for="http"><label>URL<input name="url" value="${esc(c?.url || 'https://')}" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="url"></label><label>${t('keyword')}<input name="keyword" value="${esc(c?.keyword || '')}" placeholder="${t('optional')}"></label></div>
        <div class="tf" data-for="ping port cert"><label>${t('hostLabel')}<input name="host" value="${esc(c?.host || '')}" placeholder="example.com" autocapitalize="none" autocorrect="off" spellcheck="false"></label></div>
        <div class="tf" data-for="port cert"><label>Port<input name="port" type="number" inputmode="numeric" value="${esc(c?.port || '')}" placeholder="443"></label></div>
        <div class="tf" data-for="cert"><label>${t('certDays')}<input name="days" type="number" inputmode="numeric" value="${esc(c?.days || 14)}"></label></div>
        <div class="tf" data-for="service"><label>${t('serviceName')}<input name="service" value="${esc(c?.service || '')}" placeholder="nginx" autocapitalize="none" autocorrect="off" spellcheck="false"></label></div>
        <div class="tf" data-for="disk"><label>${t('pathLabel')}<input name="path" value="${esc(c?.path || '/')}" autocapitalize="none" spellcheck="false"></label><label>${t('diskLimit')}<input name="limit" type="number" inputmode="numeric" value="${esc(c?.limit || 90)}"></label></div>
        <div class="tf" data-for="script"><label>${t('checkScript')}<textarea name="body" rows="5" spellcheck="false" autocapitalize="none" placeholder="test -f /var/run/app.pid">${esc(c?.body || '')}</textarea></label></div>
        <div class="grid2"><label>${t('interval')}<select name="interval">${[30, 60, 300, 900, 3600].map(n => `<option value="${n}" ${(c?.interval || 60) === n ? 'selected' : ''}>${t('everyS', { n })}</option>`).join('')}</select></label>
          <label>${t('failAfter')}<select name="failAfter">${[1, 2, 3, 5].map(n => `<option value="${n}" ${(c?.failAfter || 2) === n ? 'selected' : ''}>${n}×</option>`).join('')}</select></label></div>
        <div class="err" hidden></div>
        <div class="s-btns"><button class="btn primary block" type="submit">${t('save')}</button><button class="btn block" type="button" data-x="cancel">${t('cancel')}</button></div>
      </form>`);
    const f = sh.querySelector('form'), err = sh.querySelector('.err');
    const sync = () => { const tp = f.type.value; for (const d of f.querySelectorAll('.tf')) d.hidden = !d.dataset.for.split(' ').includes(tp); };
    f.type.addEventListener('change', sync); sync();
    sh.querySelector('[data-x=cancel]').addEventListener('click', closeSheet);
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.hidden = true;
      const v = Object.fromEntries(new FormData(f)); v.type = f.type.value;
      try { await api('POST', `/api/s/${encodeURIComponent(id)}/checks`, { ...v, id: c?.id }); closeSheet(); toast(t('saved')); viewChecks(id, main); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
  }

  // ----- Updates -----
  async function viewUpdates(id, main, quiet) {
    $('.top .nm', app).textContent = t('updates');
    const enc = encodeURIComponent(id);
    const u = await api('GET', `/api/s/${enc}/updates`);
    const admin = state.me.role === 'admin';
    if (!u.supported) { main.innerHTML = `<div class="card empty-card">${ic('download')}<b>${t('updatesUnsupported')}</b></div>`; return; }
    const sec = u.list.filter(p => p.security).length;
    const running = u.job && !u.job.finished;
    const sch = u.schedule || { auto: false, day: -1, hour: 4, reboot: 'never' };
    main.innerHTML = `
      <div class="card upd-head">
        <div class="upd-num ${sec ? 'bad' : u.list.length ? 'warn' : 'ok'}">${u.list.length}</div>
        <div class="upd-text"><b>${u.list.length ? t('updatesAvail', { n: u.list.length }) : t('updatesNone')}</b><span>${sec ? t('updatesSec', { n: sec }) + ' · ' : ''}${u.refreshed ? t('checkedAt', { when: ago(u.refreshed) }) : ''}</span>
          ${u.rebootRequired ? `<span class="warn-text">${ic('alert')}${t('rebootNeeded')}</span>` : ''}</div>
      </div>
      ${admin ? `<div class="btn-row">
        <button class="btn" data-a="refresh-apt" ${running ? 'disabled' : ''}>${ic('refresh')}${t('searchUpdates')}</button>
        <button class="btn primary" data-a="install" ${running || !u.list.length ? 'disabled' : ''}>${ic('download')}${t('installAll')}</button>
        ${sec ? `<button class="btn" data-a="install-sec" ${running ? 'disabled' : ''}>${ic('shield')}${t('installSec')}</button>` : ''}
      </div>` : ''}
      ${u.job ? `<div class="section-title">${running ? t('jobRunning') : t('jobLast')}</div><div class="card job"><div class="job-head"><span class="pill ${running ? 'warn' : u.job.code === 0 ? 'ok' : 'bad'}"><span class="dot"></span>${running ? t('running') : u.job.code === 0 ? t('done') : t('failedExit', { n: u.job.code })}</span><span class="muted">${ago(u.job.started)} · ${esc(u.job.by || '')}</span></div><pre class="joblog"></pre></div>` : ''}
      ${u.list.length ? `<div class="section-title">${t('packages')}</div><div class="list">${u.list.map(p => `<div class="row static"><span class="dot ${p.security ? 'bad' : 'warn'}"></span><div class="r-main"><div class="r-title">${esc(p.name)}${p.security ? ` <span class="pill bad">${t('security')}</span>` : ''}</div><div class="r-sub">${esc(p.from)} → ${esc(p.version)}</div></div></div>`).join('')}</div>` : ''}
      ${admin ? `<div class="section-title">${t('autoUpdates')}</div>
      <form class="card sheet-form auto-form">
        <label class="check"><input type="checkbox" name="auto" ${sch.auto ? 'checked' : ''}><span>${t('autoUpdatesOn')}</span></label>
        <div class="grid2"><label>${t('dayLabel')}<select name="day"><option value="-1">${t('daily')}</option>${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${sch.day === d ? 'selected' : ''}>${t('wd' + d)}</option>`).join('')}</select></label>
          <label>${t('timeLabel')}<select name="hour">${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${sch.hour === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></label></div>
        <label>${t('rebootRule')}<select name="reboot"><option value="never" ${sch.reboot !== 'if-needed' ? 'selected' : ''}>${t('rebootNever')}</option><option value="if-needed" ${sch.reboot === 'if-needed' ? 'selected' : ''}>${t('rebootIfNeeded')}</option></select></label>
        <button class="btn block" type="submit">${t('save')}</button>
      </form>` : ''}`;
    const log = main.querySelector('.joblog');
    if (log) { log.textContent = u.job.log || ''; log.scrollTop = log.scrollHeight; }
    const days = main.querySelector('select[name=day]'); if (days && sch.day === -1) days.value = '-1';
    const start = async (path, body, msg) => { try { await api('POST', `/api/s/${enc}/updates/${path}`, body); toast(msg); viewUpdates(id, main); } catch (e) { toast(e.message, true); } };
    main.querySelector('[data-a=refresh-apt]')?.addEventListener('click', () => start('refresh', {}, t('searching')));
    main.querySelector('[data-a=install]')?.addEventListener('click', () => confirmSheet(t('installAllTitle', { n: u.list.length }), t('installMsg'), t('installAll'), async () => { closeSheet(); await start('install', {}, t('installing')); }));
    main.querySelector('[data-a=install-sec]')?.addEventListener('click', () => confirmSheet(t('installSecTitle', { n: sec }), t('installMsg'), t('installSec'), async () => { closeSheet(); await start('install', { packages: u.list.filter(p => p.security).map(p => p.name) }, t('installing')); }));
    main.querySelector('.auto-form')?.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.currentTarget;
      try { await api('POST', `/api/s/${enc}/updates/schedule`, { auto: f.auto.checked, day: Number(f.day.value), hour: Number(f.hour.value), reboot: f.reboot.value }); toast(t('saved')); } catch (ex) { toast(ex.message, true); }
    });
    // Läuft ein Auftrag: alle 2 Sekunden Protokoll nachladen
    if (running) {
      const tm = setInterval(async () => {
        if (!document.body.contains(main) || !location.hash.endsWith('/updates')) { clearInterval(tm); return; }
        try {
          const j = await api('GET', `/api/s/${enc}/updates/job`);
          const l = main.querySelector('.joblog'); if (l && j.job) { l.textContent = j.job.log; l.scrollTop = l.scrollHeight; }
          if (j.job && j.job.finished) { clearInterval(tm); viewUpdates(id, main); }
        } catch { clearInterval(tm); }
      }, 2000);
      state.timers.push(tm);
    }
  }

  // ----- Skripte -----
  async function viewScripts(id, main) {
    $('.top .nm', app).textContent = t('scripts');
    const [list, runs] = await Promise.all([api('GET', '/api/scripts'), api('GET', '/api/scripts/runs')]);
    const admin = state.me.role === 'admin';
    main.innerHTML = `
      ${admin ? `<div class="sumrow"><span class="muted">${t('scriptsHint')}</span><span class="spacer"></span><button class="btn small" data-a="add">${ic('plus')}${t('newScript')}</button></div>` : ''}
      <div class="list">${list.map(sc => `<div class="row" data-sc="${esc(sc.id)}">${ic('code')}<div class="r-main"><div class="r-title">${esc(sc.name)}</div><div class="r-sub">${esc(sc.description || t('linesN', { n: sc.lines }))}</div></div><span class="chev">${ic('chev')}</span></div>`).join('') || `<div class="empty">${t('noScripts')}</div>`}</div>
      ${runs.length ? `<div class="section-title">${t('recentRuns')}</div><div class="list">${runs.slice(0, 15).map(r => `<div class="row" data-run="${esc(r.id)}"><span class="dot ${r.status === 'running' ? 'warn' : r.code === 0 ? 'ok' : 'bad'}"></span><div class="r-main"><div class="r-title">${esc(r.scriptName)} · ${esc(r.serverName)}</div><div class="r-sub">${r.status === 'running' ? t('running') : `Exit ${r.code} · ${((r.ms || 0) / 1000).toFixed(1)} s`} · ${ago(r.started)} · ${esc(r.by)}</div></div><span class="chev">${ic('chev')}</span></div>`).join('')}</div>` : ''}`;
    main.querySelector('[data-a=add]')?.addEventListener('click', () => scriptForm(null, () => viewScripts(id, main)));
    for (const r of main.querySelectorAll('[data-sc]')) r.addEventListener('click', () => scriptSheet(id, list.find(x => x.id === r.dataset.sc), main));
    for (const r of main.querySelectorAll('[data-run]')) r.addEventListener('click', () => runSheet([r.dataset.run], () => viewScripts(id, main)));
  }

  async function scriptSheet(id, sc, main) {
    const admin = state.me.role === 'admin';
    let full = null;
    if (admin) { try { full = await api('GET', `/api/scripts/${sc.id}`); } catch {} }
    const others = state.servers.filter(s => s.ok);
    const sh = openSheet(`
      <h2>${esc(sc.name)}</h2><div class="s-sub">${esc(sc.description || '')}</div>
      ${full ? `<pre class="code-pre"></pre>` : ''}
      ${admin ? `<div class="btn-row"><button class="btn primary" data-x="run">${ic('play')}${t('runHere')}</button>${others.length > 1 ? `<button class="btn" data-x="multi">${ic('server')}${t('runMany')}</button>` : `<button class="btn" data-x="edit">${ic('edit')}${t('edit')}</button>`}</div>` : `<p class="hint">${t('viewerHint')}</p>`}
      <div class="s-btns">${admin && others.length > 1 ? `<button class="btn block" data-x="edit">${ic('edit')}${t('edit')}</button>` : ''}${admin ? `<button class="btn danger block" data-x="del">${ic('trash')}${t('delete')}</button>` : ''}<button class="btn block" data-x="close">${t('close')}</button></div>`);
    if (full) sh.querySelector('.code-pre').textContent = full.body;
    sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
    const runOn = servers => confirmSheet(t('runTitle', { name: sc.name }), t('runMsg', { servers: servers.map(x => state.servers.find(s => s.id === x)?.name || x).join(', ') }), t('run'), async () => {
      const runs = await api('POST', `/api/scripts/${sc.id}/run`, { servers });
      runSheet(runs.map(r => r.id), () => viewScripts(id, main));
    });
    sh.querySelector('[data-x=run]')?.addEventListener('click', () => runOn([id]));
    sh.querySelector('[data-x=multi]')?.addEventListener('click', () => pickServers(id, runOn));
    sh.querySelector('[data-x=edit]')?.addEventListener('click', () => scriptForm(full, () => viewScripts(id, main)));
    sh.querySelector('[data-x=del]')?.addEventListener('click', () => confirmSheet(t('deleteScriptTitle', { name: sc.name }), t('deleteScriptMsg'), t('delete'), async () => { await api('POST', `/api/scripts/${sc.id}/delete`); closeSheet(); viewScripts(id, main); }, true));
  }

  function pickServers(current, done) {
    const sh = openSheet(`<h2>${t('chooseServers')}</h2><div class="list pick">${state.servers.map(s => `<label class="row"><input type="checkbox" value="${esc(s.id)}" ${s.id === current ? 'checked' : ''} ${s.ok ? '' : 'disabled'}><div class="r-main"><div class="r-title">${esc(s.name)}</div><div class="r-sub">${s.ok ? t('ok') : t('offline')}</div></div></label>`).join('')}</div>
      <div class="s-btns"><button class="btn primary block" data-x="go">${ic('play')}${t('run')}</button><button class="btn block" data-x="cancel">${t('cancel')}</button></div>`);
    sh.querySelector('[data-x=cancel]').addEventListener('click', closeSheet);
    sh.querySelector('[data-x=go]').addEventListener('click', () => { const ids = [...sh.querySelectorAll('input:checked')].map(i => i.value); if (ids.length) done(ids); });
  }

  function scriptForm(sc, after) {
    const sh = formSheet({
      title: sc ? t('editScript') : t('newScript'), sub: t('scriptFormSub'), submit: t('save'),
      fields: [
        { name: 'name', label: t('name'), attrs: `value="${esc(sc?.name || '')}" maxlength="60" required` },
        { name: 'description', label: t('descriptionLabel'), attrs: `value="${esc(sc?.description || '')}" maxlength="300" placeholder="${t('optional')}"` },
        { html: `<label>${t('scriptBody')}<textarea name="body" rows="9" spellcheck="false" autocapitalize="none" autocorrect="off" class="code-input" placeholder="#!/bin/bash"></textarea></label>` },
        { html: `<label>${t('timeoutLabel')}<select name="timeout">${[60, 300, 900, 1800, 3600].map(n => `<option value="${n}" ${(sc?.timeout || 300) === n ? 'selected' : ''}>${n < 3600 ? t('minN', { n: n / 60 }) : '60 min'}</option>`).join('')}</select></label>` },
        codeField(),
      ],
      onSubmit: async f => { await api('POST', '/api/scripts', { id: sc?.id, name: f.name.value, description: f.description.value, body: f.body.value, timeout: Number(f.timeout.value), code: f.code.value }); closeSheet(); toast(t('saved')); after(); },
    });
    sh.querySelector('textarea[name=body]').value = sc?.body || '';
  }

  // Lauf(e) anzeigen und bis zum Ende nachladen
  function runSheet(ids, after) {
    const sh = openSheet(`<h2>${t('output')}</h2><div class="runs"></div><div class="s-btns"><button class="btn block" data-x="close">${t('close')}</button></div>`);
    sh.querySelector('[data-x=close]').addEventListener('click', () => { closeSheet(); after && after(); });
    const box = sh.querySelector('.runs');
    let tm;
    const paint = async () => {
      if (sh.hidden) { clearInterval(tm); return; }
      const runs = await Promise.all(ids.map(rid => api('GET', `/api/scripts/runs/${rid}`).catch(() => null)));
      box.innerHTML = runs.filter(Boolean).map(r => `<div class="run"><div class="job-head"><b>${esc(r.serverName)}</b><span class="pill ${r.status === 'running' ? 'warn' : r.code === 0 ? 'ok' : 'bad'}"><span class="dot"></span>${r.status === 'running' ? t('running') : `Exit ${r.code} · ${((r.ms || 0) / 1000).toFixed(1)} s`}</span></div><pre class="joblog"></pre></div>`).join('');
      runs.filter(Boolean).forEach((r, i) => { const pre = box.querySelectorAll('.joblog')[i]; pre.textContent = r.output || '…'; });
      if (runs.every(r => !r || r.status !== 'running')) clearInterval(tm);
    };
    paint(); tm = setInterval(paint, 1500); state.timers.push(tm);
  }

  // ----- Inventar -----
  async function viewInventory(id, main) {
    $('.top .nm', app).textContent = t('inventory');
    const enc = encodeURIComponent(id);
    const h = await api('GET', `/api/s/${enc}/inventory/hardware`);
    const kv = rows => `<dl class="kv">${rows.filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
    main.innerHTML = `
      <div class="card"><h3>${t('machine')}</h3>${kv([[t('vendor'), h.vendor], [t('model'), h.product], [t('serial'), h.serial], ['BIOS', h.bios], [t('virt'), h.virt], [t('hostname'), h.hostname], [t('timezone'), h.timezone], [t('booted'), h.booted ? new Date(h.booted).toLocaleString(LANG) : '']])}</div>
      <div class="card"><h3>${t('system')}</h3>${kv([[t('os'), h.os], [t('kernel'), h.kernel], [t('cpu'), `${h.cpu.model} · ${t('coresShort', { n: h.cpu.cores })}`], [t('ram'), bytes(h.memory)]])}</div>
      ${h.disks.length ? `<div class="card"><h3>${t('disks')}</h3>${h.disks.map(d => `<div class="inv-item"><b>${esc(d.name)}</b><span>${bytes(d.size)}${d.model ? ' · ' + esc(d.model) : ''}${d.rota ? ' · HDD' : ' · SSD'}</span>${d.parts.map(p => `<div class="inv-sub">${esc(p.name)} · ${bytes(p.size)}${p.fstype ? ' · ' + esc(p.fstype) : ''}${p.mount ? ' → ' + esc(p.mount) : ''}</div>`).join('')}</div>`).join('')}</div>` : ''}
      ${h.network.length ? `<div class="card"><h3>${t('network')}</h3>${h.network.map(n => `<div class="inv-item"><b>${esc(n.name)} <span class="pill ${n.up ? 'ok' : ''}">${n.up ? 'UP' : 'DOWN'}</span></b><span>${esc(n.mac)}</span>${n.addresses.map(a => `<div class="inv-sub mono">${esc(a)}</div>`).join('')}</div>`).join('')}</div>` : ''}
      <div class="section-title">${t('software')}</div>
      <div class="card"><div class="search">${ic('search')}<input type="search" placeholder="${t('searchPackages')}" autocapitalize="none" autocorrect="off" spellcheck="false"></div><div class="sw-info muted">…</div><div class="sw-list"></div></div>`;
    let sw = null;
    const inp = main.querySelector('.search input'), info = main.querySelector('.sw-info'), out = main.querySelector('.sw-list');
    const paint = () => {
      if (!sw) return;
      const q = inp.value.trim().toLowerCase();
      const hits = sw.list.filter(p => !q || p.name.toLowerCase().includes(q));
      info.textContent = t('packagesN', { n: sw.list.length, m: sw.manager || '–' }) + (q ? ` · ${t('hits', { n: hits.length })}` : '');
      out.innerHTML = hits.slice(0, 150).map(p => `<div class="sw-row"><span>${esc(p.name)}</span><span class="muted mono">${esc(p.version)}</span></div>`).join('');
    };
    inp.addEventListener('input', paint);
    api('GET', `/api/s/${enc}/inventory/software`).then(r => { sw = r; paint(); }).catch(e => { info.textContent = e.message; });
  }

  function rebootSheet(id, name) {
    const sh = openSheet(`
      <h2>${esc(t('rebootTitle', { name }))}</h2><p class="s-msg muted">${t('rebootMsg')}</p>
      <input class="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="000000">
      <div class="err" hidden></div>
      <div class="s-btns"><button class="btn primary block" data-x="go">${ic('power')}${t('reboot')}</button><button class="btn block" data-x="cancel">${t('cancel')}</button></div>`);
    const inp = sh.querySelector('input'), err = sh.querySelector('.err'), btn = sh.querySelector('[data-x=go]');
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 6); });
    sh.querySelector('[data-x=cancel]').addEventListener('click', closeSheet);
    btn.addEventListener('click', async () => {
      btn.disabled = true; err.hidden = true;
      try { await api('POST', `/api/s/${encodeURIComponent(id)}/reboot`, { code: inp.value }); closeSheet(); toast(t('rebootDone')); }
      catch (e) { err.textContent = e.message; err.hidden = false; btn.disabled = false; inp.value = ''; inp.focus(); }
    });
    setTimeout(() => inp.focus(), 300);
  }

  // ---------- Logs ----------
  async function renderLogs(id, kind, name) {
    const title = kind === 'service' ? shortName(name) : name;
    app.innerHTML = `
      <div class="logs-page">
        <header class="top"><button class="icon-btn" data-a="back" aria-label="${t('back')}">${ic('back')}</button><h1>${esc(title)}<span class="sub">${t('logs')}</span></h1>
          <button class="icon-btn" data-a="share" aria-label="${t('share')}">${ic('share')}</button>
          <button class="icon-btn" data-a="refresh" aria-label="${t('refresh')}">${ic('refresh')}</button></header>
        <div class="logbar"><div class="search">${ic('search')}<input type="search" placeholder="${t('filter')}" autocapitalize="none" autocorrect="off" spellcheck="false"></div>
          <button class="live" data-a="live"><span class="dot"></span>${t('live')}</button></div>
        <div class="logview"></div>
      </div>`;
    const view = $('.logview', app), inp = $('.logbar input', app), liveBtn = $('[data-a=live]', app);
    let lines = [];
    $('[data-a=back]', app).addEventListener('click', () => history.length > 1 ? history.back() : go(`#/s/${encodeURIComponent(id)}/${kind === 'service' ? 'services' : 'docker'}`));
    const fmt = l => {
      const cls = /\b(error|err|fail(ed)?|fatal|panic|critical|exception)\b/i.test(l) ? 'err' : /\b(warn(ing)?)\b/i.test(l) ? 'wrn' : '';
      const m = /^(\d{4}-\d\d-\d\d[T ][\d:.]+(?:[+-]\d{2}:?\d{2}|Z)?)\s?(.*)$/.exec(l);
      return `<div class="ln ${cls}">${m ? `<span class="ts">${esc(m[1].replace('T', ' ').slice(5, 19))}</span> ${esc(m[2])}` : esc(l)}</div>`;
    };
    const paint = (stick = true) => {
      const q = inp.value.trim().toLowerCase();
      const atBottom = view.scrollHeight - view.scrollTop - view.clientHeight < 60;
      const shown = q ? lines.filter(l => l.toLowerCase().includes(q)) : lines;
      view.innerHTML = shown.length ? shown.map(fmt).join('') : `<div class="empty">${t('noLogs')}</div>`;
      if (stick && (atBottom || !q)) view.scrollTop = view.scrollHeight;
    };
    const load = async () => {
      const b = $('[data-a=refresh]', app); b.classList.add('spin');
      try { const r = await api('GET', `/api/s/${encodeURIComponent(id)}/${kind === 'service' ? 'services' : 'containers'}/${encodeURIComponent(name)}/logs?lines=300`); lines = r.text.split('\n').filter(Boolean); paint(); }
      catch (e) { toast(e.message, true); } finally { b.classList.remove('spin'); }
    };
    $('[data-a=refresh]', app).addEventListener('click', load);
    // Teilen (iPhone: Teilen-Menü) oder in die Zwischenablage
    $('[data-a=share]', app).addEventListener('click', async () => {
      const q = inp.value.trim().toLowerCase();
      const text = (q ? lines.filter(l => l.toLowerCase().includes(q)) : lines).join('\n');
      try {
        if (navigator.share) await navigator.share({ title: `${title} – ${t('logs')}`, text });
        else { await navigator.clipboard.writeText(text); toast(t('copied')); }
      } catch (e) { if (e && e.name !== 'AbortError') { try { await navigator.clipboard.writeText(text); toast(t('copied')); } catch { toast(e.message, true); } } }
    });
    inp.addEventListener('input', () => paint(false));
    liveBtn.addEventListener('click', () => {
      if (state.es) { state.es.close(); state.es = null; liveBtn.classList.remove('on'); return; }
      if (id !== 'local') { toast(t('liveOnlyMain')); return; }
      const es = new EventSource(`/api/s/local/follow?kind=${kind}&name=${encodeURIComponent(name)}`);
      state.es = es; liveBtn.classList.add('on');
      lines = [];
      es.onmessage = e => { try { lines.push(JSON.parse(e.data)); if (lines.length > 3000) lines.splice(0, lines.length - 3000); paint(); } catch {} };
      es.onerror = () => { if (es.readyState === 2) { liveBtn.classList.remove('on'); state.es = null; } };
    });
    await load();
  }

  // ---------- Einstellungen ----------
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const b64ToBytes = s => { const p = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); };

  async function registerSw() {
    if (!('serviceWorker' in navigator)) return null;
    try { return await navigator.serviceWorker.register('/sw.js', { scope: '/' }); } catch { return null; }
  }

  async function currentSub() {
    if (!pushSupported()) return null;
    const reg = await navigator.serviceWorker.getRegistration('/');
    return reg ? reg.pushManager.getSubscription() : null;
  }

  async function enablePush() {
    if (!pushSupported()) { toast(isIos() && !standalone() ? t('notifyNeedsInstall') : t('notifyUnavailable'), true); return false; }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { toast(t('notifyDenied'), true); return false; }
      const reg = (await registerSw()) || (await navigator.serviceWorker.ready);
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(state.me.push) }));
      await api('POST', '/api/push/subscribe', { subscription: sub.toJSON() });
      toast(t('done'));
      return true;
    } catch (e) { toast(e.message, true); return false; }
  }

  // Gerät aus dem User-Agent („iPhone · Safari“)
  function deviceName(ua) {
    const u = String(ua || '');
    const dev = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Macintosh|Mac OS X/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : t('device');
    const br = /Edg\//.test(u) ? 'Edge' : /CriOS|Chrome\//.test(u) ? 'Chrome' : /FxiOS|Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : '';
    return br ? `${dev} · ${br}` : dev;
  }
  function ago(ms) {
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 2) return t('now');
    if (m < 60) return t('ago', { n: m });
    const h = Math.round(m / 60);
    if (h < 48) return t('agoH', { n: h });
    return new Date(ms).toLocaleDateString(LANG);
  }
  const settingRow = (key, icon, title, desc, chev = true) => `<div class="row" data-s="${key}">${ic(icon)}<div class="r-main"><div class="r-title">${title}</div>${desc ? `<div class="r-sub">${desc}</div>` : ''}</div>${chev ? `<span class="chev">${ic('chev')}</span>` : ''}</div>`;

  async function renderSettings() {
    const me = state.me;
    const admin = me.role === 'admin';
    app.innerHTML = `
      <header class="top"><button class="icon-btn" data-a="back" aria-label="${t('back')}">${ic('back')}</button><h1>${t('settings')}</h1></header>
      <main>
        <div class="profile card"><div class="avatar">${esc(me.user.slice(0, 1).toUpperCase())}</div><div><div class="p-name">${esc(me.user)}</div><div class="p-role">${t('role_' + me.role)} · ${esc(me.name)}</div></div></div>

        <div class="section-title">${t('notifications')}</div>
        <div class="card notify"><div class="n-head">${ic('bell')}<div><div class="r-title">${t('notifications')}</div><div class="r-sub">${t('notifyDesc')}</div></div></div><div class="n-actions"></div></div>

        <div class="section-title">${t('security')}</div>
        <div class="list">
          ${settingRow('password', 'key', t('changePassword'), t('changePasswordDesc'))}
          ${settingRow('totp', 'phone', t('newPhone'), t('newPhoneDesc'))}
          ${settingRow('devices', 'shield', t('devicesTitle'), t('devicesDesc'))}
        </div>

        ${admin ? `<div class="section-title">${t('admin')}</div>
        <div class="list">
          ${settingRow('users', 'users', t('users'), t('usersDesc'))}
          ${settingRow('channels', 'bell', t('channels'), t('channelsDesc'))}
          ${settingRow('alerts', 'sliders', t('alertsTitle'), t('alertsDesc'))}
          ${settingRow('audit', 'list', t('audit'), t('auditDesc'))}
        </div>` : ''}

        <div class="section-title">${t('about')}</div>
        <div class="list">${settingRow('about', 'info', 'S3cure Agent', `${t('version')} ${esc(me.version)}${me.demo ? ' · ' + t('demo') : ''}`, false)}</div>

        <button class="btn danger block logout" data-a="logout">${ic('logout')}${t('logout')}</button>
      </main>`;
    $('[data-a=back]', app).addEventListener('click', () => (history.length > 1 ? history.back() : go('#/')));
    $('[data-a=logout]', app).addEventListener('click', async () => {
      try { const s = await currentSub(); if (s) { await api('POST', '/api/push/unsubscribe', { subscription: s.toJSON() }).catch(() => {}); await s.unsubscribe(); } } catch {}
      await api('POST', '/api/logout').catch(() => {});
      state.me = null; go('#/login');
    });
    const on = (k, fn) => $(`[data-s=${k}]`, app)?.addEventListener('click', fn);
    on('password', passwordSheet);
    on('totp', totpSheet);
    on('devices', devicesSheet);
    on('users', () => go('#/users'));
    on('alerts', alertsSheet);
    on('channels', channelsSheet);
    on('audit', () => go('#/s/local/more'));

    const box = $('.n-actions', app);
    const paint = async () => {
      if (!pushSupported()) { box.innerHTML = `<p class="hint">${esc(isIos() && !standalone() ? t('notifyNeedsInstall') : t('notifyUnavailable'))}</p>`; return; }
      if (Notification.permission === 'denied') { box.innerHTML = `<p class="hint">${esc(t('notifyDenied'))}</p>`; return; }
      const sub = await currentSub();
      box.innerHTML = sub
        ? `<div class="n-state ok">${ic('bell')}<span>${t('notifyActive')}</span></div><div class="s-btns"><button class="btn block" data-n="test">${t('notifyTest')}</button><button class="btn block subtle" data-n="off">${t('notifyOff')}</button></div>`
        : `<div class="s-btns"><button class="btn primary block" data-n="on">${ic('bell')}${t('notifyOn')}</button></div>`;
      box.querySelector('[data-n=on]')?.addEventListener('click', async () => { if (await enablePush()) paint(); });
      box.querySelector('[data-n=test]')?.addEventListener('click', async () => { try { const r = await api('POST', '/api/push/test'); toast(t('sentTo', { n: r.sent })); } catch (e) { toast(e.message, true); } });
      box.querySelector('[data-n=off]')?.addEventListener('click', async () => { const s = await currentSub(); if (s) { await api('POST', '/api/push/unsubscribe', { subscription: s.toJSON() }).catch(() => {}); await s.unsubscribe(); } paint(); });
    };
    paint();
  }

  // Kleines Formular im Blatt: Felder + Fehlerzeile + Knöpfe; onSubmit bekommt das Formular
  function formSheet({ title, sub = '', fields, submit, onSubmit, danger = false }) {
    const sh = openSheet(`
      <h2>${esc(title)}</h2>${sub ? `<div class="s-sub">${esc(sub)}</div>` : ''}
      <form class="sheet-form" autocomplete="on">
        ${fields.map(f => f.html || `<label>${esc(f.label)}<input name="${f.name}" type="${f.type || 'text'}" ${f.attrs || ''}></label>`).join('')}
        <div class="err" hidden></div>
        <div class="s-btns"><button class="btn ${danger ? 'danger' : 'primary'} block" type="submit">${esc(submit)}</button><button class="btn block" type="button" data-x="cancel">${t('cancel')}</button></div>
      </form>`);
    const form = sh.querySelector('form'), err = sh.querySelector('.err'), btn = sh.querySelector('[type=submit]');
    for (const c of form.querySelectorAll('input.code')) c.addEventListener('input', () => { c.value = c.value.replace(/\D/g, '').slice(0, 6); });
    sh.querySelector('[data-x=cancel]').addEventListener('click', closeSheet);
    form.addEventListener('submit', async e => {
      e.preventDefault(); err.hidden = true; btn.disabled = true;
      try { await onSubmit(form); } catch (ex) { err.textContent = ex.message; err.hidden = false; } finally { btn.disabled = false; }
    });
    setTimeout(() => form.querySelector('input')?.focus(), 300);
    return sh;
  }
  const codeField = (name = 'code') => ({ html: `<label>${t('code')}<input name="${name}" class="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="000000"></label>` });

  function passwordSheet() {
    formSheet({
      title: t('changePassword'), sub: t('changePasswordSub'), submit: t('changePassword'),
      fields: [
        { name: 'current', label: t('currentPassword'), type: 'password', attrs: 'autocomplete="current-password" required' },
        { name: 'next', label: t('newPassword'), type: 'password', attrs: 'autocomplete="new-password" minlength="10" required' },
        { name: 'repeat', label: t('repeatPassword'), type: 'password', attrs: 'autocomplete="new-password" minlength="10" required' },
        codeField(),
      ],
      onSubmit: async f => {
        if (f.next.value !== f.repeat.value) throw new Error(t('passwordsDiffer'));
        await api('POST', '/api/me/password', { current: f.current.value, next: f.next.value, code: f.code.value });
        closeSheet(); toast(t('passwordChanged'));
      },
    });
  }

  // QR-Code (SVG vom eigenen Server) + Schlüssel zum Abtippen
  const qrBlock = r => `<div class="qr">${String(r.qr || '').startsWith('<svg') ? r.qr : ''}</div><div class="secret"><span>${esc(r.secret.replace(/(.{4})/g, '$1 ').trim())}</span><button class="qbtn" type="button" data-x="copy" aria-label="${t('copy')}">${ic('copy')}</button></div>`;
  const wireCopy = (sh, secret) => sh.querySelector('[data-x=copy]')?.addEventListener('click', () => navigator.clipboard.writeText(secret).then(() => toast(t('copied'))).catch(() => {}));

  async function totpSheet() {
    let r;
    try { r = await api('POST', '/api/me/totp/start'); } catch (e) { toast(e.message, true); return; }
    const sh = formSheet({
      title: t('newPhone'), sub: t('newPhoneSub'), submit: t('confirm'),
      fields: [{ html: qrBlock(r) }, codeField()],
      onSubmit: async f => { await api('POST', '/api/me/totp/confirm', { code: f.code.value }); closeSheet(); toast(t('totpChanged')); },
    });
    wireCopy(sh, r.secret);
  }

  async function devicesSheet() {
    let list;
    try { list = await api('GET', '/api/me/sessions'); } catch (e) { toast(e.message, true); return; }
    const paint = () => {
      const sh = openSheet(`
        <h2>${t('devicesTitle')}</h2><div class="s-sub">${t('devicesSub')}</div>
        <div class="list">${list.map(d => `<div class="row" data-id="${esc(d.id)}">${ic(/iPhone|Android/.test(deviceName(d.ua)) ? 'phone' : 'server')}<div class="r-main"><div class="r-title">${esc(deviceName(d.ua))}${d.current ? ` <span class="pill ok">${t('thisDevice')}</span>` : ''}</div><div class="r-sub">${esc(d.ip || '')} · ${ago(d.seen)}</div></div>${d.current ? '' : `<button class="qbtn danger" data-x="revoke" aria-label="${t('logout')}">${ic('logout')}</button>`}</div>`).join('')}</div>
        <div class="s-btns">${list.length > 1 ? `<button class="btn danger block" data-x="others">${t('logoutOthers')}</button>` : ''}<button class="btn block" data-x="close">${t('close')}</button></div>`);
      sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
      const revoke = async id => { try { list = await api('POST', '/api/me/sessions/revoke', { id }); toast(t('done')); paint(); } catch (e) { toast(e.message, true); } };
      for (const b of sh.querySelectorAll('[data-x=revoke]')) b.addEventListener('click', () => revoke(b.closest('[data-id]').dataset.id));
      sh.querySelector('[data-x=others]')?.addEventListener('click', () => revoke('others'));
    };
    paint();
  }

  async function alertsSheet() {
    let st;
    try { st = await api('GET', '/api/settings'); } catch (e) { toast(e.message, true); return; }
    const num = (name, label, v, min, max, unit) => ({ html: `<label>${esc(label)}<div class="num"><input name="${name}" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${v}"><span>${unit}</span></div></label>` });
    formSheet({
      title: t('alertsTitle'), sub: t('alertsSub'), submit: t('save'),
      fields: [
        { name: 'name', label: t('serverName'), attrs: `value="${esc(st.name)}" maxlength="40" required` },
        num('disk', t('alertDisk'), st.alerts.disk, 50, 99, '%'),
        num('mem', t('alertMem'), st.alerts.mem, 50, 99, '%'),
        num('load', t('alertLoad'), st.alerts.loadPerCpu, 1, 20, '× ' + t('perCore')),
        { html: `<label class="check"><input name="svc" type="checkbox" ${st.alerts.serviceFailed ? 'checked' : ''}><span>${t('alertSvc')}</span></label>` },
      ],
      onSubmit: async f => {
        await api('POST', '/api/settings', { name: f.name.value, alerts: { disk: f.disk.value, mem: f.mem.value, loadPerCpu: f.load.value, serviceFailed: f.svc.checked } });
        state.me = await api('GET', '/api/me');
        closeSheet(); toast(t('saved'));
      },
    });
  }

  // Warnungen zusätzlich an Discord, eigene Webhooks und per E-Mail
  async function channelsSheet() {
    let n;
    try { n = await api('GET', '/api/notify'); } catch (e) { toast(e.message, true); return; }
    const e = n.email || {};
    const sh = formSheet({
      title: t('channels'), sub: t('channelsSub'), submit: t('save'),
      fields: [
        { html: `<label>${t('discordHooks')}<textarea name="discord" rows="2" spellcheck="false" autocapitalize="none" autocorrect="off" placeholder="https://discord.com/api/webhooks/…"></textarea></label><p class="hint small">${t('discordHint')}</p>` },
        { html: `<label>${t('webhooks')}<textarea name="webhooks" rows="2" spellcheck="false" autocapitalize="none" autocorrect="off" placeholder="https://…"></textarea></label>` },
        { html: `<div class="sub-head">${t('emailHead')}</div>` },
        { name: 'to', label: t('emailTo'), type: 'email', attrs: `value="${esc(e.to || '')}" placeholder="${t('optional')}" autocapitalize="none"` },
        { html: `<div class="grid2"><label>${t('smtpHost')}<input name="host" value="${esc(e.host || '')}" placeholder="smtp.example.com" autocapitalize="none" autocorrect="off"></label><label>Port<input name="port" type="number" inputmode="numeric" value="${esc(e.port || 587)}"></label></div>` },
        { html: `<div class="grid2"><label>${t('user')}<input name="user" value="${esc(e.user || '')}" autocapitalize="none" autocorrect="off"></label><label>${t('password')}<input name="pass" type="password" value="${esc(e.pass || '')}" autocomplete="new-password"></label></div>` },
        { html: `<label class="check"><input name="secure" type="checkbox" ${e.secure ? 'checked' : ''}><span>${t('smtpSecure')}</span></label><button class="btn block" type="button" data-x="test">${ic('bell')}${t('sendTest')}</button>` },
      ],
      onSubmit: async f => {
        await api('POST', '/api/notify', {
          discord: f.discord.value.split(/\s+/).filter(Boolean), webhooks: f.webhooks.value.split(/\s+/).filter(Boolean),
          email: f.host.value.trim() ? { host: f.host.value.trim(), port: Number(f.port.value) || 587, secure: f.secure.checked, user: f.user.value, pass: f.pass.value, from: f.user.value, to: f.to.value } : null,
        });
        closeSheet(); toast(t('saved'));
      },
    });
    sh.querySelector('textarea[name=discord]').value = (n.discord || []).join('\n');
    sh.querySelector('textarea[name=webhooks]').value = (n.webhooks || []).join('\n');
    sh.querySelector('[data-x=test]').addEventListener('click', async () => {
      try {
        const r = await api('POST', '/api/notify/test', {});
        toast(r.length ? r.map(x => `${x.channel}: ${x.ok ? '✓' : '✕ ' + (x.error || '')}`).join(' · ') : t('noChannels'), r.some(x => !x.ok));
      } catch (ex) { toast(ex.message, true); }
    });
  }

  // ---------- Benutzer (Admin) ----------
  async function renderUsers() {
    if (state.me.role !== 'admin') return go('#/settings');
    app.innerHTML = `
      <header class="top"><button class="icon-btn" data-a="back" aria-label="${t('back')}">${ic('back')}</button><h1>${t('users')}</h1>
        <button class="icon-btn" data-a="add" aria-label="${t('addUser')}">${ic('plus')}</button></header>
      <main><div class="list users"><div class="empty">…</div></div><p class="hint pad">${t('usersHint')}</p></main>`;
    $('[data-a=back]', app).addEventListener('click', () => go('#/settings'));
    $('[data-a=add]', app).addEventListener('click', () => addUserSheet(paint));
    async function paint(list) {
      try { list = list || await api('GET', '/api/users'); } catch (e) { toast(e.message, true); return; }
      const box = $('.users', app);
      if (!box) return;
      box.innerHTML = list.map(u => `<div class="row" data-u="${esc(u.name)}"><div class="avatar sm">${esc(u.name.slice(0, 1).toUpperCase())}</div><div class="r-main"><div class="r-title">${esc(u.name)}${u.name === state.me.user ? ` <span class="pill">${t('you')}</span>` : ''}</div><div class="r-sub">${t('role_' + u.role)} · ${u.lastLogin ? t('lastLogin', { when: ago(u.lastLogin) }) : t('neverLoggedIn')}</div></div><span class="chev">${ic('chev')}</span></div>`).join('');
      for (const r of box.querySelectorAll('[data-u]')) r.addEventListener('click', () => userSheet(list.find(u => u.name === r.dataset.u), paint));
    }
    paint();
  }

  function addUserSheet(done) {
    formSheet({
      title: t('addUser'), sub: t('addUserSub'), submit: t('addUser'),
      fields: [
        { name: 'name', label: t('user'), attrs: 'autocapitalize="none" autocorrect="off" spellcheck="false" required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{1,31}"' },
        { html: `<label>${t('role')}<select name="role"><option value="viewer">${t('role_viewer')}</option><option value="admin">${t('role_admin')}</option></select></label>` },
        { name: 'password', label: t('initialPassword'), type: 'password', attrs: 'autocomplete="new-password" minlength="10" required' },
      ],
      onSubmit: async f => { const r = await api('POST', '/api/users', { name: f.name.value.trim(), role: f.role.value, password: f.password.value }); showQr(r, t('userCreated', { name: r.name })); done(); },
    });
  }

  function showQr(r, title) {
    const sh = openSheet(`<h2>${esc(title)}</h2><div class="s-sub">${t('qrHandOver')}</div>${qrBlock(r)}<div class="s-btns"><button class="btn primary block" data-x="close">${t('done')}</button></div>`);
    wireCopy(sh, r.secret);
    sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
  }

  function userSheet(u, done) {
    const self = u.name === state.me.user;
    const sh = openSheet(`
      <h2>${esc(u.name)}</h2><div class="s-sub">${t('role_' + u.role)} · ${u.lastLogin ? t('lastLogin', { when: ago(u.lastLogin) }) : t('neverLoggedIn')}</div>
      <div class="seg-big"><button data-role="viewer" class="${u.role === 'viewer' ? 'on' : ''}">${t('role_viewer')}</button><button data-role="admin" class="${u.role === 'admin' ? 'on' : ''}">${t('role_admin')}</button></div>
      <div class="s-btns">
        <button class="btn block" data-x="2fa">${ic('phone')}${t('reset2fa')}</button>
        ${self ? '' : `<button class="btn danger block" data-x="del">${ic('trash')}${t('deleteUser')}</button>`}
        <button class="btn block" data-x="close">${t('close')}</button>
      </div>`);
    sh.querySelector('[data-x=close]').addEventListener('click', closeSheet);
    for (const b of sh.querySelectorAll('[data-role]')) b.addEventListener('click', async () => {
      if (b.dataset.role === u.role) return;
      try { const list = await api('POST', `/api/users/${encodeURIComponent(u.name)}/role`, { role: b.dataset.role }); closeSheet(); toast(t('saved')); done(list); } catch (e) { toast(e.message, true); }
    });
    sh.querySelector('[data-x=2fa]').addEventListener('click', () => confirmSheet(t('reset2faTitle', { name: u.name }), t('reset2faMsg'), t('reset2fa'), async () => {
      const r = await api('POST', `/api/users/${encodeURIComponent(u.name)}/reset-2fa`); showQr(r, t('newQrFor', { name: u.name }));
    }));
    sh.querySelector('[data-x=del]')?.addEventListener('click', () => confirmSheet(t('deleteUserTitle', { name: u.name }), t('deleteUserMsg'), t('deleteUser'), async () => {
      const list = await api('POST', `/api/users/${encodeURIComponent(u.name)}/delete`); closeSheet(); toast(t('done')); done(list);
    }, true));
  }

  function confirmSheet(title, msg, okLabel, fn, danger = false) {
    const sh = openSheet(`<h2>${esc(title)}</h2><p class="s-msg muted">${esc(msg)}</p><div class="err" hidden></div><div class="s-btns"><button class="btn ${danger ? 'danger' : 'primary'} block" data-x="go">${esc(okLabel)}</button><button class="btn block" data-x="cancel">${t('cancel')}</button></div>`);
    sh.querySelector('[data-x=cancel]').addEventListener('click', closeSheet);
    const btn = sh.querySelector('[data-x=go]'), err = sh.querySelector('.err');
    btn.addEventListener('click', async () => { btn.disabled = true; try { await fn(); } catch (e) { err.textContent = e.message; err.hidden = false; btn.disabled = false; } });
  }

  // ---------- Start ----------
  registerSw();
  // Zurück in der App: aktuelle Daten holen – aber nicht, während ein Aktionsfenster offen ist
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.me && $('#sheet').hidden && /^#\/(s\/|$)|^$/.test(location.hash)) route(); });
  route();
})();
