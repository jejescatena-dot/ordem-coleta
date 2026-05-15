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
 *   PortalAuth.getStorage()   → Firebase storage instance
 *   PortalAuth.getLojas()     → objeto com todas as lojas { codigo: {...} }
 *   PortalAuth.addLoja(codigo, nome, dados)    → cria nova loja (admin only)
 *   PortalAuth.updateLoja(codigo, dados)       → atualiza loja (admin only)
 *   PortalAuth.deleteLoja(codigo)              → soft-delete loja (admin only)
 *   PortalAuth.getLojasPorEstado(estado)       → filtra lojas por estado
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
    'boletos-controle.html':    ['admin', 'vendedor', 'financeiro-sede', 'financeiro-loja'],
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
  let _db, _auth, _storage;
  let _user        = null;
  let _grupo       = null;
  let _pageId      = null;
  let _onReady     = null;
  let _notifRef    = null;
  let _pendingRef  = null;
  let _selectedGrp = null;
  let _lojas       = null; // Cache de lojas carregadas do Firebase
  const OVERLAY_ID = 'portal-auth-root';

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init(pageId, onReadyCallback) {
    _pageId  = pageId;
    _onReady = onReadyCallback;

    if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    _auth    = firebase.auth();
    _db      = firebase.database();
    _storage = firebase.storage();

    _injectStyles();
    _injectOverlay();
    _applyTheme();

    // Aguarda resultado do redirect ANTES de escutar mudanças de auth
    _auth.getRedirectResult()
      .then(result => {
        // Se houver resultado, significa que voltamos de um redirect
        console.log('[PortalAuth] Redirect result processado');
      })
      .catch(e => {
        console.error('[PortalAuth] Erro ao processar redirect:', e);
      })
      .finally(() => {
        // Agora configura o listener de estado
        _auth.onAuthStateChanged(_onAuthChange);
      });
  }

  // ── CARREGAMENTO DE LOJAS ──────────────────────────────────────────────────
  async function _loadLojas() {
    try {
      const snap = await _db.ref('lojas').once('value');
      if (snap.exists()) {
        _lojas = snap.val();
        // Verifica se há lojas que precisam ser migradas (sem cidade/estado)
        const needsMigration = Object.values(_lojas).some(loja => !loja.cidade && !loja.estado);
        if (needsMigration && _user && _grupo === 'admin') {
          console.log('[PortalAuth] Detectadas lojas que precisam migração. Aguarde...');
          await _migrateLojas();
          // Recarrega as lojas após migração
          const snap2 = await _db.ref('lojas').once('value');
          _lojas = snap2.val();
        }
      } else {
        // Se não existem lojas no Firebase, inicializa com LOJAS_PA
        await _initLojas();
        const snap2 = await _db.ref('lojas').once('value');
        _lojas = snap2.val();
        // Se ainda assim não conseguiu, usa fallback estruturado
        if (!_lojas) {
          const estruturadas = {};
          Object.entries(LOJAS_PA).forEach(([codigo, nome]) => {
            const parsed = _parseLojaInfo(codigo, nome);
            estruturadas[codigo] = {
              codigo: parseInt(codigo),
              nome: parsed.nome,
              cidade: parsed.cidade,
              estado: parsed.estado,
              endereco: parsed.endereco,
              ativo: true
            };
          });
          _lojas = estruturadas;
        }
      }
    } catch(e) {
      console.warn('[PortalAuth] Falha ao carregar lojas do Firebase, usando fallback:', e);
      // Transforma LOJAS_PA (strings) em formato estruturado (objetos com cidade/estado/endereco)
      const estruturadas = {};
      Object.entries(LOJAS_PA).forEach(([codigo, nome]) => {
        const parsed = _parseLojaInfo(codigo, nome);
        estruturadas[codigo] = {
          codigo: parseInt(codigo),
          nome: parsed.nome,
          cidade: parsed.cidade,
          estado: parsed.estado,
          endereco: parsed.endereco,
          ativo: true
        };
      });
      _lojas = estruturadas;
    }
  }

  // Inicializa lojas no Firebase com dados de LOJAS_PA (apenas na primeira vez)
  async function _initLojas() {
    try {
      const lojas = {};
      Object.entries(LOJAS_PA).forEach(([codigo, nome]) => {
        const parsed = _parseLojaInfo(codigo, nome);
        lojas[codigo] = {
          codigo: parseInt(codigo),
          nome: parsed.nome,
          cidade: parsed.cidade,
          estado: parsed.estado,
          endereco: parsed.endereco,
          ativo: true,
          criadoEm: new Date().toISOString()
        };
      });
      await _db.ref('lojas').set(lojas);
      console.log('[PortalAuth] Lojas inicializadas no Firebase');
    } catch(e) {
      console.error('[PortalAuth] Erro ao inicializar lojas:', e);
    }
  }

  // Parse de informações de loja: "Max Debret (Foz do Iguaçu/PR)" → {nome, cidade, estado, endereco}
  function _parseLojaInfo(codigo, fullName) {
    // Formato: "Max Debret (Foz do Iguaçu/PR)" → cidade: Foz do Iguaçu, estado: PR
    const match = fullName.match(/^(.+?)\s*\((.+?)\)$/);
    if (!match) {
      return {
        nome: fullName,
        cidade: '',
        estado: '',
        endereco: { rua: '', numero: '', complemento: '', bairro: '', cep: '', referencia: '' }
      };
    }
    const nome = match[1].trim();
    const localPart = match[2].trim(); // "Foz do Iguaçu/PR"
    const [cidade, estado] = localPart.split('/').map(s => s.trim());
    return {
      nome,
      cidade: cidade || '',
      estado: estado || '',
      endereco: { rua: '', numero: '', complemento: '', bairro: '', cep: '', referencia: '' }
    };
  }

  // Migração: corrige lojas existentes com formato antigo
  async function _migrateLojas() {
    if (!_user || _grupo !== 'admin') {
      console.error('[PortalAuth] Apenas admin pode migrar lojas');
      return;
    }
    try {
      const snap = await _db.ref('lojas').once('value');
      if (!snap.exists()) {
        console.log('[PortalAuth] Nenhuma loja para migrar');
        return;
      }
      const lojas = snap.val();
      const updates = {};
      Object.entries(lojas).forEach(([codigo, loja]) => {
        // Se a loja já tem cidade/estado, pula
        if (loja.cidade || loja.estado) {
          console.log(`[PortalAuth] Loja ${codigo} já migrada`);
          return;
        }
        // Caso contrário, faz parse do nome
        const parsed = _parseLojaInfo(codigo, loja.nome);
        updates[`lojas/${codigo}`] = {
          ...loja,
          nome: parsed.nome,
          cidade: parsed.cidade,
          estado: parsed.estado
        };
      });
      if (Object.keys(updates).length > 0) {
        await _db.ref().update(updates);
        console.log(`[PortalAuth] ${Object.keys(updates).length} lojas migradas com sucesso`);
      } else {
        console.log('[PortalAuth] Todas as lojas já estão migradas');
      }
    } catch(e) {
      console.error('[PortalAuth] Erro ao migrar lojas:', e);
    }
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
        if (data.status === 'denied')   { _showState('denied');   return; }
        if (data.status === 'inactive') { _showState('inactive'); return; }
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

    _showState(null); // Esc
