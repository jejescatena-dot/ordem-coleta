/**
 * Portal Televendas — Módulo de Autenticação Universal
 * Inclua APÓS os scripts do Firebase CDN e ANTES do JS da página
 *
 * Uso:
 *   PortalAuth.init('nome-da-pagina.html', function(user, grupo) { ... });
 *
 * API pública:
 *   PortalAuth.login()
 *   PortalAuth.logout()
 *   PortalAuth.getUser()      → objeto Firebase user
 *   PortalAuth.getGrupo()     → 'admin' | 'financeiro' | 'vendedor' | 'prevencao'
 *   PortalAuth.isAdmin()      → boolean
 *   PortalAuth.getDb()        → Firebase database instance
 *   PortalAuth.getAuth()      → Firebase auth instance
 *   PortalAuth.LABELS         → { admin: 'Administrador', ... }
 *   PortalAuth.ICONS          → { admin: '⚙️', ... }
 *   PortalAuth.PAGES          → matriz de permissões
 */

const PortalAuth = (function () {
  'use strict';

  // ── CONFIGURAÇÃO FIREBASE ──────────────────────────────────────────────────
  const FB_CONFIG = {
    apiKey: 'AIzaSyCJ5Wbw9OvcFidj1vRC6nkOpVS-AVIIwMk',
    authDomain: 'max-atacadista-pix.firebaseapp.com',
    databaseURL: 'https://max-atacadista-pix-default-rtdb.firebaseio.com',
    projectId: 'max-atacadista-pix',
    storageBucket: 'max-atacadista-pix.firebasestorage.app',
    messagingSenderId: '351864711547',
    appId: '1:351864711547:web:2436c483b3c6c513f8b5de',
  };

  // ── MATRIZ DE PERMISSÕES ───────────────────────────────────────────────────
  // Grupos permitidos por página. Adicionar novos grupos/páginas aqui.
  const PAGES = {
    'index.html':               ['admin', 'financeiro-sede', 'financeiro-loja', 'vendedor', 'prevencao'],
    'pix-envio.html':           ['admin', 'vendedor', 'financeiro-sede'],
    'pix-gerenciamento.html':   ['admin', 'financeiro-sede', 'financeiro-loja'],
    'conciliacao-pix.html':     ['admin', 'financeiro-sede'],
    'cadastro-com-prazo.html':  ['admin', 'financeiro-sede', 'vendedor'],
    'ordem-de-coleta.html':     ['admin', 'vendedor', 'prevencao'],
    'atualizacoes.html':        ['admin', 'financeiro-sede', 'financeiro-loja', 'vendedor', 'prevencao'],
    'sugestoes-melhorias.html': ['admin', 'financeiro-sede', 'financeiro-loja', 'vendedor', 'prevencao'],
    'admin-usuarios.html':      ['admin'],
  };

  const GRUPO_LABELS = {
    admin:             'Administrador',
    'financeiro-sede': 'Financeiro Sede',
    'financeiro-loja': 'Financeiro Loja',
    vendedor:          'Vendedor',
    prevencao:         'Prevenção de Perdas',
  };

  const GRUPO_ICONS = {
    admin:             '⚙️',
    'financeiro-sede': '💰',
    'financeiro-loja': '🏪',
    vendedor:          '🛍️',
    prevencao:         '🔒',
  };

  const GRUPO_DESCS = {
    'financeiro-sede': 'Envio, gerenciamento e conciliação de PIX — equipe da sede',
    'financeiro-loja': 'Gerenciamento de PIX recebido — equipe das lojas',
    vendedor:          'Envio de PIX e acompanhamento de pedidos de venda',
    prevencao:         'Gestão de ordens de coleta e controles de segurança',
  };

  // ── LOJAS ──────────────────────────────────────────────────────────────────
  const LOJAS_PA = {
    1025:'Max Debret (Foz do Iguaçu/PR)',
    1037:'Max Tiradentes (Londrina/PR)',
    1050:'Max Eldorado Prudente (Pres. Prudente/SP)',
    1057:'Max Floresta (Cascavel/PR)',
    1060:'Max Apucarana (Cascavel/PR)',
    1065:'Max Colombo (Maringá/PR)',
    1066:'Max São Cristóvão (Cascavel/PR)',
    1067:'Max Paranaguá (Paranaguá/PR)',
    1070:'Max Linha Verde (Curitiba/PR)',
    1073:'Max Potirendaba (SJRP/SP)',
    1075:'Max Bairro Alto (Curitiba/PR)',
    1076:'Max Campo Comprido (Curitiba/PR)',
    1079:'Max São José (São José dos Pinhais/PR)',
    1084:'Max Zona Norte SJRP (SJRP/SP)',
    1085:'Max Arapongas (Arapongas/PR)',
    1086:'Max Foz BR 277 (Foz do Iguaçu/PR)',
    1089:'Max Pinhais (Pinhais/PR)',
    1090:'Max FRG (Fazenda Rio Grande/PR)',
    1091:'Max Araucária (Araucária/PR)',
    1092:'Max Chapada (Ponta Grossa/PR)',
    1093:'Max Rolândia (Rolândia/PR)',
    1094:'Max Tito Muffato (Cascavel/PR)',
    1097:'Max Catanduva (Catanduva/SP)',
    1102:'Max Toledo (Toledo/PR)',
    1104:'Max Bela Vista (Apucarana/PR)',
    1105:'Max Guanabara (Pres. Prudente/SP)',
    1106:'Max Ourinhos (Ourinhos/SP)',
    1107:'Max Fernandópolis (Fernandópolis/SP)',
    1109:'Max Beltão (Francisco Beltrão/PR)',
    1110:'Max Cambé (Cambé/PR)',
    1111:'Max Colombo RMC (Colombo/PR)',
    1112:'Max Medianeira (Medianeira/PR)',
    1113:'Max Campo Largo (Campo Largo/PR)',
    1114:'Max Cianorte (Cianorte/PR)',
    1116:'Max Jardim Carvalho (Ponta Grossa/PR)',
    1118:'Max Sorocaba Ipanema (Sorocaba/SP)',
    1120:'Max Marechal (Marechal C. Rondon/PR)',
    1122:'Max Hauer (Curitiba/PR)',
    1123:'Max Pioneiros (Londrina/PR)',
    1126:'Max Taubaté (Taubaté/SP)',
    1127:'Max Sorocaba Norte (Sorocaba/SP)',
    1128:'Max São José dos Campos (SJC/SP)',
    1129:'Max Lapa (São Paulo/SP)',
    1130:'Max Eldorado Rio Preto (SJRP/SP)',
    1131:'Max Santo André (Santo André/SP)',
    1132:'Max Votorantim (Votorantim/SP)',
    1133:'Max Guarulhos (Guarulhos/SP)',
    1134:'Max Piracicaba (Piracicaba/SP)',
    1135:'Max Cedral (Pres. Prudente/SP)',
    1136:'Max Interlagos (São Paulo/SP)',
    1137:'Max Butantã (São Paulo/SP)',
    1138:'Max Marília (Marília/SP)',
    1139:'Max Mogi (Mogi das Cruzes/SP)',
    1140:'Max São Bernardo (São Bernardo/SP)',
    1141:'Max Campinas (Campinas/SP)',
    1142:'Max Assis (Assis/SP)',
    1144:'Max JK Foz (Foz do Iguaçu/PR)',
    1145:'Max João Bettega (Curitiba/PR)',
    1146:'Max Oficinas (Ponta Grossa/PR)',
    1148:'Max Jaçanã (São Paulo/SP)',
    1149:'Max Morumbi (São Paulo/SP)',
    1150:'Max Safira (Foz do Iguaçu/PR)',
    1151:'Max Olímpia (Olímpia/SP)',
    1152:'Max Castro (Castro/PR)',
    1153:'Max Torres (Cambé/PR)',
    1154:'Max Votuporanga (Votuporanga/SP)',
    1155:'Max Guaíra (Guaíra/PR)',
    1156:'Max Sarandi (Sarandi/PR)',
    1157:'Max Umuarama (Umuarama/PR)',
    1158:'Max Marília Norte (Marília/SP)',
  };

  // ── STATE INTERNO ──────────────────────────────────────────────────────────
  let _db, _auth;
  let _user        = null;
  let _grupo       = null;
  let _pageId      = null;
  let _onReady     = null;
  let _notifRef    = null;
  let _pendingRef  = null;
  let _selectedGrp = null;
  const OVERLAY_ID = 'portal-auth-root';

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init(pageId, onReadyCallback) {
    _pageId  = pageId;
    _onReady = onReadyCallback;

    if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    _auth = firebase.auth();
    _db   = firebase.database();

    _injectStyles();
    _injectOverlay();
    _applyTheme();

    _auth.onAuthStateChanged(_onAuthChange);
  }

  // ── FLUXO DE AUTENTICAÇÃO ─────────────────────────────────────────────────
  async function _onAuthChange(user) {
    if (!user) {
      _user = null; _grupo = null;
      _showState('login');
      return;
    }
    _user = user;
    _showState('loading');

    try {
      // 1. É admin pelo nó admins/?
      const adminSnap = await _db.ref('admins/' + user.uid).once('value');
      if (adminSnap.exists()) {
        _grupo = 'admin';
        _bootstrapUser();
        return;
      }

      // 2. Sistema novo: nó users/
      const userSnap = await _db.ref('users/' + user.uid).once('value');
      if (userSnap.exists()) {
        const data = userSnap.val();
        if (data.status === 'approved') {
          let gr = data.grupo;
          // Retrocompat: grupo legado 'financeiro' → 'financeiro-sede'
          if (gr === 'financeiro') {
            gr = 'financeiro-sede';
            _db.ref('users/' + user.uid + '/grupo').set('financeiro-sede'); // migra silenciosamente
          }
          _grupo = gr;
          if (!_hasAccess()) { _showState('denied'); return; }
          _bootstrapUser();
          return;
        }
        if (data.status === 'denied') { _showState('denied'); return; }
        // status === 'pending'
        _showState('pending');
        return;
      }

      // 3. Legado: vendedores aprovados → migrar automaticamente
      const vendSnap = await _db.ref('vendedores/' + user.uid).once('value');
      if (vendSnap.exists()) {
        const v = vendSnap.val();
        await _db.ref('users/' + user.uid).set({
          email:        user.email,
          name:         user.displayName || user.email,
          photo:        user.photoURL || '',
          grupo:        'vendedor',
          status:       'approved',
          requestedGrupo: 'vendedor',
          approvedAt:   v.approvedAt || new Date().toISOString(),
          approvedBy:   v.approvedBy || 'system-migration',
          migratedAt:   new Date().toISOString(),
        });
        _grupo = 'vendedor';
        if (!_hasAccess()) { _showState('denied'); return; }
        _bootstrapUser();
        return;
      }

      // 4. Legado: vendedoresPendentes → migrar
      const pendLegSnap = await _db.ref('vendedoresPendentes/' + user.uid).once('value');
      if (pendLegSnap.exists()) {
        const p = pendLegSnap.val();
        await _db.ref('users/' + user.uid).set({
          email:        user.email,
          name:         user.displayName || user.email,
          photo:        user.photoURL || '',
          grupo:        null,
          status:       'pending',
          requestedGrupo: 'vendedor',
          requestedAt:  p.requestedAt || new Date().toISOString(),
        });
        _showState('pending');
        return;
      }

      // 5. Usuário totalmente novo → seletor de grupo
      _showState('group-select');

    } catch (err) {
      console.error('[PortalAuth]', err);
      _showState('denied');
    }
  }

  // ── SOLICITAÇÃO DE ACESSO ─────────────────────────────────────────────────
  async function _submitGroupRequest(grupo, extra) {
    if (!_user || !grupo) return;
    const now = new Date().toISOString();
    const ex  = extra || {};

    await _db.ref('users/' + _user.uid).set({
      email:          _user.email,
      name:           ex.nome || _user.displayName || _user.email,
      photo:          _user.photoURL || '',
      grupo:          null,
      status:         'pending',
      requestedGrupo: grupo,
      requestedAt:    now,
      cpf:            ex.cpf     || null,
      cracha:         ex.cracha  || null,
      loja:           ex.loja    || null,
      telefone:       ex.tel     || null,
    });

    // Registra índice de CPF para evitar duplicatas
    if (ex.cpf) {
      await _db.ref('cpf-index/' + ex.cpf).set(_user.uid);
    }

    // Notificação no Firebase para admins
    await _db.ref('notifications/pending/' + _user.uid).set({
      name:           ex.nome || _user.displayName || _user.email,
      email:          _user.email,
      requestedGrupo: grupo,
      requestedAt:    now,
      seen:           false,
    });

    _showState('pending');
  }

  // ── BOOTSTRAP DO APP ──────────────────────────────────────────────────────
  async function _bootstrapUser() {
    // Verifica se o app está habilitado (apenas não-admins, exceto portal e painel admin)
    if (_grupo !== 'admin' && _pageId && _pageId !== 'index.html' && _pageId !== 'admin-usuarios.html') {
      try {
        const appId   = _pageId.replace('.html', '');
        const cfgSnap = await _db.ref('app-config/' + appId + '/enabled').once('value');
        if (cfgSnap.exists() && cfgSnap.val() === false) {
          _showState('maintenance');
          return;
        }
      } catch(e) { /* Se não conseguir ler, deixa acessar */ }
    }

    _showState(null); // Esconde overlay, mostra app

    // Preenche avatar e nome no nav (se existirem)
    const avatar = document.getElementById('userAvatar');
    const name   = document.getElementById('userName');
    if (avatar) avatar.src = _user.photoURL || '';
    if (name)   name.textContent = _user.displayName || _user.email;

    // Injeta bell de notificações para admins (em todas as páginas)
    if (_grupo === 'admin') _setupAdminNotif();

    if (_onReady) _onReady(_user, _grupo);
  }

  function _hasAccess() {
    if (!_pageId || !PAGES[_pageId]) return true; // página não listada = aberta
    return PAGES[_pageId].includes(_grupo);
  }

  // ── NOTIFICAÇÃO ADMIN (SINO) ───────────────────────────────────────────────
  function _setupAdminNotif() {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    // Injeta sino se não existir
    if (!document.getElementById('pa-bell')) {
      const bell = document.createElement('a');
      bell.id = 'pa-bell';
      bell.href = 'admin-usuarios.html';
      bell.title = 'Usuários pendentes de aprovação';
      bell.style.cssText = [
        'display:inline-flex', 'align-items:center', 'gap:6px',
        'background:var(--surface)', 'border:1px solid var(--border)',
        'padding:4px 14px', 'border-radius:20px', 'font-size:12px',
        'text-decoration:none', 'color:var(--text-2)', 'transition:all .2s',
        'white-space:nowrap', 'cursor:pointer',
      ].join(';');
      bell.innerHTML = '🔔 <span id="pa-bell-txt"></span>';
      navRight.insertBefore(bell, navRight.firstChild);
    }

    // Listener de pendentes (novo sistema)
    if (_notifRef) _notifRef.off();
    _notifRef = _db.ref('users').orderByChild('status').equalTo('pending');
    _notifRef.on('value', (snap) => {
      let count = 0;
      snap.forEach(() => count++);
      // + legado não migrado
      _db.ref('vendedoresPendentes').once('value').then((ls) => {
        ls.forEach(() => count++);
        _updateBell(count);
      });
    });
  }

  function _updateBell(count) {
    const bell = document.getElementById('pa-bell');
    const txt  = document.getElementById('pa-bell-txt');
    if (!bell) return;
    if (count > 0) {
      bell.style.borderColor = 'var(--amber, #f59e0b)';
      bell.style.color = 'var(--amber, #f59e0b)';
      if (txt) txt.textContent = count + ' pendente' + (count > 1 ? 's' : '');
    } else {
      bell.style.borderColor = 'var(--border)';
      bell.style.color = 'var(--text-2)';
      if (txt) txt.textContent = '';
    }
  }

  // ── TEMA ─────────────────────────────────────────────────────────────────
  function _applyTheme() {
    const root = document.documentElement;
    let saved = 'dark';
    try {
      const stored = localStorage.getItem('mx-theme');
      if (stored) saved = stored;
      else saved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch(e) {}
    root.setAttribute('data-theme', saved);

    // Vincula botões quando o nav aparecer
    const observer = new MutationObserver(() => {
      const btnL = document.getElementById('themeLight');
      const btnD = document.getElementById('themeDark');
      if (btnL && btnD && !btnL._paBound) {
        btnL._paBound = true;
        function applyTheme(t) {
          root.setAttribute('data-theme', t);
          try { localStorage.setItem('mx-theme', t); } catch(e) {}
          btnL.classList.toggle('active', t === 'light');
          btnD.classList.toggle('active', t === 'dark');
        }
        applyTheme(root.getAttribute('data-theme') || 'dark');
        btnL.addEventListener('click', () => applyTheme('light'));
        btnD.addEventListener('click', () => applyTheme('dark'));
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  }

  // ── OVERLAY ───────────────────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('pa-styles')) return;
    const s = document.createElement('style');
    s.id = 'pa-styles';
    s.textContent = `
      #${OVERLAY_ID} {
        position:fixed; inset:0; z-index:9000;
        background:var(--bg,#080810);
        display:flex; align-items:flex-start; justify-content:center;
        padding:16px; font-family:var(--font,'Inter',sans-serif);
        overflow-y:auto;
      }
      #${OVERLAY_ID}.pa-hidden { display:none !important; }
      .pa-card {
        background:var(--surface,rgba(255,255,255,.04));
        border:1px solid var(--border,rgba(255,255,255,.08));
        border-radius:20px; padding:28px 28px;
        max-width:460px; width:100%; text-align:center;
        backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
        margin:auto;
      }
      .pa-logo {
        width:64px; height:64px; border-radius:16px;
        display:inline-flex; align-items:center; justify-content:center;
        font-size:28px; font-weight:900; color:#fff; font-style:italic;
        letter-spacing:-2px; margin-bottom:24px;
        background:var(--cyan,#0891b2);
      }
      .pa-icon-box {
        width:64px; height:64px; border-radius:16px;
        display:inline-flex; align-items:center; justify-content:center;
        font-size:30px; margin-bottom:24px;
      }
      .pa-title  { font-size:24px; font-weight:800; color:var(--text,#f0f0f5); margin-bottom:8px; }
      .pa-desc   { font-size:14px; color:var(--text-2,rgba(240,240,245,.55)); margin-bottom:28px; line-height:1.6; }
      .pa-desc-sm{ font-size:12px; color:var(--text-3,rgba(240,240,245,.3)); margin-bottom:0; line-height:1.6; margin-top:12px; }
      .pa-google-btn {
        display:inline-flex; align-items:center; justify-content:center; gap:12px;
        background:#fff; color:#14141c;
        border:1px solid rgba(0,0,0,.12);
        padding:12px 24px; border-radius:10px;
        font-size:14px; font-weight:600; cursor:pointer;
        font-family:inherit; transition:all .2s; width:100%;
      }
      .pa-google-btn:hover { box-shadow:0 4px 12px rgba(0,0,0,.15); transform:translateY(-1px); }
      .pa-google-btn svg { width:18px; height:18px; flex-shrink:0; }
      .pa-link-btn {
        display:inline-block; margin-top:16px;
        font-size:12px; color:var(--text-3,rgba(240,240,245,.3));
        cursor:pointer; text-decoration:underline;
        background:none; border:none; font-family:inherit;
        transition:color .2s;
      }
      .pa-link-btn:hover { color:var(--text-2,rgba(240,240,245,.55)); }
      .pa-spinner {
        width:40px; height:40px; border-radius:50%;
        border:3px solid var(--border,rgba(255,255,255,.08));
        border-top-color:var(--cyan,#0891b2);
        animation:pa-spin .8s linear infinite;
        margin:0 auto 20px;
      }
      @keyframes pa-spin { to { transform:rotate(360deg); } }
      .pa-input {
        background:var(--surface,rgba(255,255,255,.04));
        border:1px solid var(--border,rgba(255,255,255,.08));
        border-radius:10px; padding:10px 14px;
        font-size:13px; color:var(--text,#f0f0f5);
        font-family:inherit; width:100%; outline:none;
        transition:border-color .2s;
      }
      .pa-input:focus { border-color:var(--cyan,#0891b2); }
      .pa-input::placeholder { color:var(--text-3,rgba(240,240,245,.3)); }
      .pa-avatar-row {
        display:flex; align-items:center; gap:12px;
        background:rgba(255,255,255,.03);
        border:1px solid var(--border,rgba(255,255,255,.08));
        border-radius:12px; padding:8px 12px;
        margin-bottom:12px; text-align:left;
      }
      .pa-avatar-row img {
        width:36px; height:36px; border-radius:50%;
        border:2px solid var(--border,rgba(255,255,255,.08)); flex-shrink:0;
      }
      .pa-avatar-name  { font-size:13px; font-weight:600; color:var(--text,#f0f0f5); }
      .pa-avatar-email { font-size:11px; color:var(--text-2,rgba(240,240,245,.55)); }
      .pa-group-list   { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; text-align:left; }
      .pa-group-opt {
        display:flex; align-items:center; gap:10px;
        background:var(--surface,rgba(255,255,255,.04));
        border:2px solid var(--border,rgba(255,255,255,.08));
        border-radius:10px; padding:8px 12px; cursor:pointer;
        transition:all .2s; font-family:inherit; width:100%;
        color:var(--text,#f0f0f5);
      }
      .pa-group-opt:hover  { border-color:var(--cyan,#0891b2); background:rgba(8,145,178,.06); }
      .pa-group-opt.pa-sel { border-color:var(--cyan,#0891b2); background:rgba(8,145,178,.1); }
      .pa-group-icon { font-size:18px; }
      .pa-group-name { font-size:13px; font-weight:700; }
      .pa-group-desc { font-size:11px; color:var(--text-2,rgba(240,240,245,.55)); margin-top:1px; }
      .pa-store-wrap { position:relative; }
      .pa-store-drop {
        display:none; position:absolute; top:calc(100% + 2px); left:0; right:0;
        background:#0e0e1e; border:1px solid rgba(255,255,255,.14);
        border-radius:8px; max-height:160px; overflow-y:auto; z-index:9100;
        box-shadow:0 12px 40px rgba(0,0,0,.6);
      }
      .pa-store-drop.open { display:block; }
      .pa-store-opt {
        padding:7px 12px; cursor:pointer; font-size:12px;
        color:rgba(240,240,245,.6); border-bottom:1px solid rgba(255,255,255,.06);
        transition:background .12s; text-align:left;
      }
      .pa-store-opt:last-child { border-bottom:none; }
      .pa-store-opt:hover { background:rgba(255,255,255,.07); color:var(--text,#f0f0f5); }
      .pa-store-more { cursor:default; color:rgba(240,240,245,.3); font-size:11px; }
      .pa-btn {
        background:var(--cyan,#0891b2); color:#fff; border:none;
        padding:12px 24px; border-radius:10px; font-size:14px;
        font-weight:600; cursor:pointer; font-family:inherit;
        transition:all .2s; width:100%;
      }
      .pa-btn:hover    { background:#0a7ba8; transform:translateY(-1px); }
      .pa-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
    `;
    document.head.appendChild(s);
  }

  function _injectOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    const div = document.createElement('div');
    div.id = OVERLAY_ID;
    div.className = 'pa-hidden';
    document.body.insertAdjacentElement('afterbegin', div);
  }

  function _showState(state) {
    const root = document.getElementById(OVERLAY_ID);
    if (!root) return;

    // Limpa listener de pending ao sair do estado
    if (_pendingRef) { _pendingRef.off(); _pendingRef = null; }

    if (!state) {
      // Esconde overlay e mostra seções do app
      root.className = 'pa-hidden';
      const nav     = document.getElementById('appNav');
      const header  = document.getElementById('appHeader');
      const content = document.getElementById('appContent');
      if (nav)     nav.style.display     = 'flex';
      if (header)  header.style.display  = 'block';
      if (content) content.style.display = 'block';
      return;
    }

    // Garante que seções do app fiquem escondidas enquanto overlay aparece
    const nav     = document.getElementById('appNav');
    const header  = document.getElementById('appHeader');
    const content = document.getElementById('appContent');
    if (nav)     nav.style.display     = 'none';
    if (header)  header.style.display  = 'none';
    if (content) content.style.display = 'none';

    root.className = '';

    const googleIcon = `<svg viewBox="0 0 24 24"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/><path fill="#fbbc04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;

    const avatarRow = _user ? `
      <div class="pa-avatar-row">
        <img src="${_esc(_user.photoURL || '')}" onerror="this.style.display='none'" alt="">
        <div>
          <div class="pa-avatar-name">${_esc(_user.displayName || '')}</div>
          <div class="pa-avatar-email">${_esc(_user.email || '')}</div>
        </div>
      </div>` : '';

    const templates = {

      loading: `<div class="pa-card">
        <div class="pa-spinner"></div>
        <div class="pa-desc">Verificando acesso...</div>
      </div>`,

      login: `<div class="pa-card">
        <div class="pa-logo">M</div>
        <div class="pa-title">Portal Televendas</div>
        <div class="pa-desc">Faça login com sua conta autorizada do Grupo Muffato para continuar.</div>
        <button class="pa-google-btn" onclick="PortalAuth.login()">${googleIcon} Entrar com Google</button>
      </div>`,

      'group-select': `<div class="pa-card" style="max-width:520px">
        <div class="pa-logo" style="width:48px;height:48px;font-size:22px;margin-bottom:14px">M</div>
        <div class="pa-title" style="font-size:20px;margin-bottom:4px">Solicitar Acesso</div>
        <div class="pa-desc" style="margin-bottom:12px">Preencha seus dados e selecione seu perfil.</div>
        ${avatarRow}
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;text-align:left">
          <input id="pa-nome"     class="pa-input" type="text" placeholder="Nome completo *" maxlength="80" oninput="PortalAuth._validateForm()">
          <input id="pa-cpf"      class="pa-input" type="text" placeholder="CPF (000.000.000-00) *" maxlength="14" oninput="PortalAuth._maskCpf(this);PortalAuth._validateForm()">
          <div id="pa-cpf-err" style="font-size:11px;color:#e31e24;margin-top:-4px;display:none"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input id="pa-cracha" class="pa-input" type="text" placeholder="Nº Crachá *" maxlength="20" oninput="PortalAuth._validateForm()">
            <div class="pa-store-wrap">
              <input id="pa-loja-search" class="pa-input" type="text" placeholder="Nº Loja *" autocomplete="off"
                oninput="PortalAuth._filterStores()" onfocus="PortalAuth._openStoreDrop()" onblur="setTimeout(()=>PortalAuth._closeStoreDrop(),200)">
              <div class="pa-store-drop" id="pa-store-drop"></div>
              <input id="pa-loja" type="hidden">
            </div>
          </div>
          <input id="pa-telefone" class="pa-input" type="tel" placeholder="Celular (00) 00000-0000 *" maxlength="15" oninput="PortalAuth._maskTel(this);PortalAuth._validateForm()">
        </div>
        <div class="pa-group-list">
          ${Object.entries(GRUPO_LABELS).filter(([k]) => k !== 'admin').map(([key, label]) => `
            <button class="pa-group-opt" data-grupo="${key}" onclick="PortalAuth._selGrp(this)">
              <span class="pa-group-icon">${GRUPO_ICONS[key]}</span>
              <div>
                <div class="pa-group-name">${label}</div>
                <div class="pa-group-desc">${GRUPO_DESCS[key] || ''}</div>
              </div>
            </button>`).join('')}
        </div>
        <button class="pa-btn" id="pa-submit-btn" onclick="PortalAuth._confirmGrp()" disabled>Solicitar Acesso</button>
        <button class="pa-link-btn" onclick="PortalAuth.logout()">Sair da conta</button>
      </div>`,

      pending: `<div class="pa-card">
        <div class="pa-icon-box" style="background:rgba(245,158,11,.15);">⏳</div>
        <div class="pa-title">Aguardando Aprovação</div>
        <div class="pa-desc">Sua solicitação foi enviada! Um administrador irá revisar e liberar seu acesso em breve.</div>
        ${avatarRow}
        <div class="pa-desc-sm">Esta tela atualiza automaticamente quando seu acesso for liberado.</div>
        <button class="pa-btn" onclick="PortalAuth._checkApproval()" style="margin-top:16px;margin-bottom:8px;">🔄 Verificar aprovação</button>
        <button class="pa-link-btn" onclick="PortalAuth.logout()">Sair da conta</button>
      </div>`,

      maintenance: `<div class="pa-card">
        <div class="pa-icon-box" style="background:rgba(245,158,11,.15);">🔧</div>
        <div class="pa-title">Em Manutenção</div>
        <div class="pa-desc">Esta funcionalidade está temporariamente indisponível. A equipe já está trabalhando nisso — tente novamente em breve.</div>
        ${avatarRow}
        <a href="index.html" class="pa-btn" style="text-decoration:none;display:block;text-align:center;margin-bottom:8px;">← Voltar ao Portal</a>
        <button class="pa-link-btn" onclick="PortalAuth.logout()">Sair da conta</button>
      </div>`,

      denied: `<div class="pa-card">
        <div class="pa-icon-box" style="background:rgba(227,30,36,.15);">🚫</div>
        <div class="pa-title">Acesso Negado</div>
        <div class="pa-desc">Seu acesso foi removido ou negado. Se for um engano, você pode solicitar novamente — um administrador irá revisar.</div>
        ${avatarRow}
        <button class="pa-btn" onclick="PortalAuth._reRequest()" style="margin-bottom:8px;">Solicitar acesso novamente</button>
        <button class="pa-link-btn" onclick="PortalAuth.logout()">Sair da conta</button>
      </div>`,
    };

    root.innerHTML = templates[state] || templates.loading;

    // Pós-renderização
    if (state === 'group-select') _initStorePicker();

    // Listener em tempo real: transição automática pending → approved
    if (state === 'pending' && _user && _db) {
      _pendingRef = _db.ref('users/' + _user.uid);
      _pendingRef.on('value', (snap) => {
        if (!snap.exists()) return;
        if (snap.val().status === 'approved') {
          if (_pendingRef) { _pendingRef.off(); _pendingRef = null; }
          _onAuthChange(_user);
        }
      });
    }
  }

  // ── SELETOR DE GRUPO (chamado pelo onclick inline) ─────────────────────────
  function _selGrp(btn) {
    _selectedGrp = btn.dataset.grupo;
    document.querySelectorAll('.pa-group-opt').forEach(b => b.classList.remove('pa-sel'));
    btn.classList.add('pa-sel');
    _validateForm();
  }

  async function _confirmGrp() {
    if (!_selectedGrp) return;
    const nome   = (document.getElementById('pa-nome')     || {}).value || '';
    const cpfRaw = (document.getElementById('pa-cpf')      || {}).value || '';
    const cracha = (document.getElementById('pa-cracha')   || {}).value || '';
    const loja   = (document.getElementById('pa-loja')     || {}).value || '';
    const tel    = (document.getElementById('pa-telefone') || {}).value || '';
    const cpf    = _cpfSanitize(cpfRaw);

    const btn = document.getElementById('pa-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }

    try {
      // Verifica se CPF já tem cadastro
      const cpfSnap = await _db.ref('cpf-index/' + cpf).once('value');
      if (cpfSnap.exists()) {
        const err = document.getElementById('pa-cpf-err');
        if (err) { err.textContent = 'Já existe um cadastro com este CPF. Entre em contato com o suporte.'; err.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = 'Solicitar Acesso'; }
        return;
      }
      await _submitGroupRequest(_selectedGrp, { nome, cpf, cracha, loja, tel });
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Solicitar Acesso'; }
      alert('Erro ao enviar solicitação: ' + e.message);
    }
  }

  // ── HELPERS ────────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function _cpfSanitize(cpf) { return String(cpf || '').replace(/\D/g, ''); }

  function _validateCpfDigits(cpf) {
    cpf = _cpfSanitize(cpf);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let s = 0, r;
    for (let i = 1; i <= 9; i++) s += +cpf[i-1] * (11-i);
    r = (s * 10) % 11; if (r === 10 || r === 11) r = 0; if (r !== +cpf[9]) return false;
    s = 0;
    for (let i = 1; i <= 10; i++) s += +cpf[i-1] * (12-i);
    r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
    return r === +cpf[10];
  }

  function _maskCpf(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9)      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    input.value = v;
  }

  function _maskTel(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6)      v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    input.value = v;
  }

  async function _checkApproval() {
    if (!_user) return;
    _showState('loading');
    await _onAuthChange(_user);
  }

  async function _reRequest() {
    if (!_user) return;
    try {
      // Lê o CPF salvo para limpar o índice
      const snap = await _db.ref('users/' + _user.uid).once('value');
      if (snap.exists()) {
        const data = snap.val();
        if (data.cpf) {
          await _db.ref('cpf-index/' + data.cpf).remove();
        }
      }
      // Remove o registro do usuário para liberar nova solicitação
      await _db.ref('users/' + _user.uid).remove();
      await _db.ref('notifications/pending/' + _user.uid).remove();
      _selectedGrp = null;
      _showState('group-select');
    } catch (e) {
      alert('Erro ao limpar cadastro: ' + e.message);
    }
  }

  // ── STORE PICKER ──────────────────────────────────────────────────────────
  function _initStorePicker() {
    _buildStoreDrop('');
    try {
      const last = localStorage.getItem('pa-lastloja');
      if (last && LOJAS_PA[+last]) _selectLoja(+last);
    } catch(e) {}
  }

  function _buildStoreDrop(q) {
    const drop = document.getElementById('pa-store-drop');
    if (!drop) return;
    const list = Object.entries(LOJAS_PA).sort((a, b) => +a[0] - +b[0]);
    const filtered = q
      ? list.filter(([c, nm]) => String(c).includes(q) || nm.toLowerCase().includes(q.toLowerCase()))
      : list;
    const shown = filtered.slice(0, 25);
    drop.innerHTML = shown.map(([c, nm]) =>
      `<div class="pa-store-opt" onmousedown="PortalAuth._selectLoja(${c})">${c} — ${nm}</div>`
    ).join('') + (filtered.length > 25
      ? `<div class="pa-store-opt pa-store-more">+${filtered.length - 25} lojas…</div>`
      : '');
  }

  function _filterStores() {
    const q = (document.getElementById('pa-loja-search') || {}).value || '';
    // Limpa seleção se usuário digitou algo diferente
    const hid = document.getElementById('pa-loja');
    if (hid) { hid.value = ''; }
    _buildStoreDrop(q);
    _openStoreDrop();
    _validateForm();
  }

  function _openStoreDrop() {
    _buildStoreDrop((document.getElementById('pa-loja-search') || {}).value || '');
    const drop = document.getElementById('pa-store-drop');
    if (drop) drop.classList.add('open');
  }

  function _closeStoreDrop() {
    const drop = document.getElementById('pa-store-drop');
    if (drop) drop.classList.remove('open');
  }

  function _selectLoja(cod) {
    const nm = LOJAS_PA[+cod];
    if (!nm) return;
    const search = document.getElementById('pa-loja-search');
    const hid    = document.getElementById('pa-loja');
    if (search) search.value = cod + ' — ' + nm;
    if (hid)    hid.value    = String(cod);
    try { localStorage.setItem('pa-lastloja', String(cod)); } catch(e) {}
    _closeStoreDrop();
    _validateForm();
  }

  function _validateForm() {
    const nome   = (document.getElementById('pa-nome')     || {}).value || '';
    const cpfRaw = (document.getElementById('pa-cpf')      || {}).value || '';
    const cracha = (document.getElementById('pa-cracha')   || {}).value || '';
    const loja   = (document.getElementById('pa-loja')     || {}).value || ''; // hidden, preenchido via _selectLoja
    const tel    = (document.getElementById('pa-telefone') || {}).value || '';
    const cpfOk  = _validateCpfDigits(cpfRaw);
    const telOk  = tel.replace(/\D/g, '').length >= 10;
    const allOk  = nome.trim() && cpfOk && cracha.trim() && loja.trim() && telOk && _selectedGrp;
    const btn    = document.getElementById('pa-submit-btn');
    if (btn) btn.disabled = !allOk;
    // Feedback inline do CPF
    const err = document.getElementById('pa-cpf-err');
    if (err) {
      const digits = cpfRaw.replace(/\D/g, '');
      if (digits.length === 11 && !cpfOk) { err.textContent = 'CPF inválido'; err.style.display = 'block'; }
      else                                 { err.textContent = ''; err.style.display = 'none'; }
    }
  }

  // ── API PÚBLICA ────────────────────────────────────────────────────────────
  return {
    init,

    login() {
      const p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      _auth.signInWithPopup(p).catch(e => alert('Erro ao fazer login: ' + e.message));
    },

    logout() {
      if (_notifRef) { _notifRef.off(); _notifRef = null; }
      _auth.signOut();
    },

    getUser:  () => _user,
    getGrupo: () => _grupo,
    isAdmin:  () => _grupo === 'admin',
    getDb:    () => _db,
    getAuth:  () => _auth,

    async getAppConfig() {
      if (!_db) return {};
      try {
        const snap = await _db.ref('app-config').once('value');
        return snap.val() || {};
      } catch(e) { return {}; }
    },

    LABELS: GRUPO_LABELS,
    ICONS:  GRUPO_ICONS,
    PAGES,

    // Expostos para onclick inline nos templates
    _selGrp,
    _confirmGrp,
    _maskCpf,
    _maskTel,
    _validateForm,
    _reRequest,
    _checkApproval,
    _filterStores,
    _openStoreDrop,
    _closeStoreDrop,
    _selectLoja,
  };
})();
