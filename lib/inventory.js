// Inventar: Hardware (Hersteller, Modell, Seriennummer, CPU, RAM, Platten, Netzwerk) und installierte Software.
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

const run = (cmd, args) => new Promise(r => execFile(cmd, args, { timeout: 15000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C' } }, (e, out) => r(e ? '' : String(out || ''))));
const read = f => { try { return fs.readFileSync(f, 'utf8').trim(); } catch { return ''; } };

// lsblk -J -b -> flache Liste der Platten mit Partitionen
function parseLsblk(json) {
  let d;
  try { d = JSON.parse(json); } catch { return []; }
  const out = [];
  for (const dev of d.blockdevices || []) {
    if (!['disk', 'nvme'].includes(dev.type)) continue;
    out.push({
      name: dev.name, size: Number(dev.size) || 0, model: (dev.model || '').trim(), rota: dev.rota === true || dev.rota === '1',
      parts: (dev.children || []).map(p => ({ name: p.name, size: Number(p.size) || 0, fstype: p.fstype || '', mount: p.mountpoint || (p.mountpoints || []).filter(Boolean)[0] || '' })),
    });
  }
  return out;
}

// ip -j addr -> Schnittstellen
function parseIp(json) {
  let d;
  try { d = JSON.parse(json); } catch { return []; }
  return d.filter(i => i.ifname !== 'lo' && !/^(veth|br-|docker)/.test(i.ifname)).map(i => ({
    name: i.ifname, mac: i.address || '', up: (i.flags || []).includes('UP'),
    addresses: (i.addr_info || []).filter(a => a.scope === 'global').map(a => `${a.local}/${a.prefixlen}`),
  }));
}

function parseDpkg(text) {
  return String(text).split('\n').map(l => l.split('\t')).filter(f => f.length >= 2 && f[0]).map(([name, version, size]) => ({ name, version, size: (Number(size) || 0) * 1024 }));
}

async function hardware({ demo = false } = {}) {
  if (demo) {
    return {
      vendor: 'Hetzner', product: 'vServer', serial: 'demo-0001', bios: 'SeaBIOS 1.16', virt: 'kvm',
      cpu: { model: 'AMD EPYC 7542 32-Core Processor', cores: 4 }, memory: 18 * 2 ** 30, os: 'Debian GNU/Linux 12 (bookworm)', kernel: 'Linux 6.1.0-26-amd64',
      timezone: 'Europe/Berlin', booted: Date.now() - 79000e3, hostname: 's3cure',
      disks: [{ name: 'sda', size: 80e9, model: 'QEMU HARDDISK', rota: false, parts: [{ name: 'sda1', size: 79e9, fstype: 'ext4', mount: '/' }] }],
      network: [{ name: 'eth0', mac: '96:00:02:ab:cd:ef', up: true, addresses: ['5.253.246.67/32', '2a01:4f8::1/64'] }],
    };
  }
  const dmi = f => read('/sys/class/dmi/id/' + f);
  const [lsblk, ip, virt, tz] = await Promise.all([
    run('lsblk', ['-J', '-b', '-o', 'NAME,SIZE,TYPE,MODEL,ROTA,FSTYPE,MOUNTPOINT']), run('ip', ['-j', 'addr']),
    run('systemd-detect-virt', []), run('timedatectl', ['show', '-p', 'Timezone', '--value']),
  ]);
  const cpus = os.cpus();
  return {
    vendor: dmi('sys_vendor'), product: dmi('product_name'), serial: dmi('product_serial'), bios: [dmi('bios_vendor'), dmi('bios_version')].filter(Boolean).join(' '),
    virt: virt.trim() === 'none' ? '' : virt.trim(),
    cpu: { model: (cpus[0] && cpus[0].model || '').trim(), cores: cpus.length }, memory: os.totalmem(),
    os: (/^PRETTY_NAME="?([^"\n]+)"?/m.exec(read('/etc/os-release')) || [])[1] || os.type(), kernel: `${os.type()} ${os.release()}`,
    timezone: tz.trim(), booted: Date.now() - os.uptime() * 1000, hostname: os.hostname(),
    disks: parseLsblk(lsblk), network: parseIp(ip),
  };
}

async function software({ demo = false } = {}) {
  if (demo) {
    const names = ['nginx', 'postgresql-15', 'redis-server', 'nodejs', 'docker-ce', 'fail2ban', 'openssh-server', 'curl', 'git', 'certbot', 'ufw', 'htop'];
    return { manager: 'dpkg', list: names.map((n, i) => ({ name: n, version: `1.${i}.0-1`, size: (i + 3) * 1e6 })) };
  }
  if (fs.existsSync('/usr/bin/dpkg-query')) return { manager: 'dpkg', list: parseDpkg(await run('dpkg-query', ['-W', '-f', '${Package}\t${Version}\t${Installed-Size}\n'])) };
  if (fs.existsSync('/usr/bin/rpm')) return { manager: 'rpm', list: (await run('rpm', ['-qa', '--qf', '%{NAME}\t%{VERSION}-%{RELEASE}\t%{SIZE}\n'])).split('\n').map(l => l.split('\t')).filter(f => f[0]).map(([name, version, size]) => ({ name, version, size: Number(size) || 0 })) };
  return { manager: null, list: [] };
}

module.exports = { hardware, software, parseLsblk, parseIp, parseDpkg };
