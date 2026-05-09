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
    'index.html':               ['admin', 'financeiro', 'vendedor', 'prevencao'],
    'pix-envio.html':           ['admin', 'financeiro', 'vendedor'],
    'pix-gerenciamento.html':   ['admin', 'financeiro'],
    'conciliacao-pix.html':     ['admin', 'financeiro'],
    'cadastro-com-prazo.html':  ['admin', 'financeiro', 'vendedor'],
    'ordem-de-coleta.html':     ['admin', 'vendedor', 'prevencao'],
    'atualizacoes.html':        ['admin', 'financeiro', 'vendedor', 'prevencao'],
    'sugestoes-melhorias.html': ['admin', 'financeiro', 'vendedor', 'prevencao'],
    'admin-usuarios.html':      ['admin'],
  };

  const GRUPO_LABELS = {
    admin:     'Administrador',
    financeiro:'Financeiro',
    vendedor:  'Vendedor',
    prevencao: 'Prevenção de Perdas',
  };

  const GRUPO_ICONS = {
    admin:     '⚙️',
    financeiro:'💰',
    vendedor:  '🛍️',
    prevencao: '🔒',
  };

  const GRUPO_DESCS = {
    financeiro: 'Acesso ao gerenciamento financeiro e conciliação de PIX',
    vendedor:   'Envio de PIX e acompanhamento de pedidos de venda',
    prevencao:  'Gestão de ordens de coleta e controles de segurança',
  };

  // ── STATE INTERNO ──────────────────────────────────────────────────────────
  let _db, _auth;
  let _user        = null;
  let _grupo       = null;
  let _pageId      = null;
  let _onReady     = null;
  let _notifRef    = null;
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
          _grupo = data.grupo;
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
  async function _submitGroupRequest(grupo) {
    if (!_user || !grupo) return;
    const now = new Date().toISOString();

    await _db.ref('users/' + _user.uid).set({
      email:        _user.email,
      name:         _user.displayName || _user.email,
      photo:        _user.photoURL || '',
      grupo:        null,
      status:       'pending',
      requestedGrupo: grupo,
      requestedAt:  now,
    });

    // Notificação no Firebase para admins
    await _db.ref('notifications/pending/' + _user.uid).set({
      name:         _user.displayName || _user.email,
      email:        _user.email,
      requestedGrupo: grupo,
      requestedAt:  now,
      seen:         false,
    });

    _showState('pending');
  }

  // ── BOOTSTRAP DO APP ──────────────────────────────────────────────────────
  function _bootstrapUser() {
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
        display:flex; align-items:center; justify-content:center;
        padding:20px; font-family:var(--font,'Inter',sans-serif);
      }
      #${OVERLAY_ID}.pa-hidden { display:none !important; }
      .pa-card {
        background:var(--surface,rgba(255,255,255,.04));
        border:1px solid var(--border,rgba(255,255,255,.08));
        border-radius:20px; padding:48px 40px;
        max-width:460px; width:100%; text-align:center;
        backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
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
      .pa-avatar-row {
        display:flex; align-items:center; gap:12px;
        background:rgba(255,255,255,.03);
        border:1px solid var(--border,rgba(255,255,255,.08));
        border-radius:12px; padding:10px 14px;
        margin-bottom:20px; text-align:left;
      }
      .pa-avatar-row img {
        width:36px; height:36px; border-radius:50%;
        border:2px solid var(--border,rgba(255,255,255,.08)); flex-shrink:0;
      }
      .pa-avatar-name  { font-size:13px; font-weight:600; color:var(--text,#f0f0f5); }
      .pa-avatar-email { font-size:11px; color:var(--text-2,rgba(240,240,245,.55)); }
      .pa-group-list   { display:flex; flex-direction:column; gap:10px; margin-bottom:24px; text-align:left; }
      .pa-group-opt {
        display:flex; align-items:center; gap:14px;
        background:var(--surface,rgba(255,255,255,.04));
        border:2px solid var(--border,rgba(255,255,255,.08));
        border-radius:12px; padding:14px 16px; cursor:pointer;
        transition:all .2s; font-family:inherit; width:100%;
        color:var(--text,#f0f0f5);
      }
      .pa-group-opt:hover  { border-color:var(--cyan,#0891b2); background:rgba(8,145,178,.06); }
      .pa-group-opt.pa-sel { border-color:var(--cyan,#0891b2); background:rgba(8,145,178,.1); }
      .pa-group-icon { font-size:24px; }
      .pa-group-name { font-size:14px; font-weight:700; }
      .pa-group-desc { font-size:12px; color:var(--text-2,rgba(240,240,245,.55)); margin-top:2px; }
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

      'group-select': `<div class="pa-card">
        <div class="pa-logo">M</div>
        <div class="pa-title">Solicitar Acesso</div>
        <div class="pa-desc">Bem-vindo(a)! Selecione seu perfil e envie a solicitação. Um administrador irá aprovar em breve.</div>
        ${avatarRow}
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
        <div class="pa-desc-sm">Você pode fechar esta janela e tentar acessar novamente após a aprovação.</div>
        <button class="pa-link-btn" onclick="PortalAuth.logout()">Sair da conta</button>
      </div>`,

      denied: `<div class="pa-card">
        <div class="pa-icon-box" style="background:rgba(227,30,36,.15);">🚫</div>
        <div class="pa-title">Acesso Negado</div>
        <div class="pa-desc">Você não tem permissão para acessar esta área. Se acredita que é um erro, entre em contato com o administrador.</div>
        <button class="pa-link-btn" onclick="PortalAuth.logout()">Sair da conta</button>
      </div>`,
    };

    root.innerHTML = templates[state] || templates.loading;
  }

  // ── SELETOR DE GRUPO (chamado pelo onclick inline) ─────────────────────────
  function _selGrp(btn) {
    _selectedGrp = btn.dataset.grupo;
    document.querySelectorAll('.pa-group-opt').forEach(b => b.classList.remove('pa-sel'));
    btn.classList.add('pa-sel');
    const submitBtn = document.getElementById('pa-submit-btn');
    if (submitBtn) submitBtn.disabled = false;
  }

  async function _confirmGrp() {
    if (!_selectedGrp) return;
    const btn = document.getElementById('pa-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
    try {
      await _submitGroupRequest(_selectedGrp);
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

    LABELS: GRUPO_LABELS,
    ICONS:  GRUPO_ICONS,
    PAGES,

    // Expostos para onclick inline nos templates
    _selGrp,
    _confirmGrp,
  };
})();
