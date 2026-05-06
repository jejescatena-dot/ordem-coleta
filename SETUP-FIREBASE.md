# 🔧 Configuração do Firebase para Sistema PIX

## ✅ STATUS DO SETUP

**Projeto Firebase Criado:** Max Atacadista PIX  
**ID do Projeto:** `max-atacadista-pix`  
**Número do Projeto:** `351864711547`

### ✅ Concluído
- ✅ Projeto Firebase criado
- ✅ Realtime Database criado (US - us-central1)
- ✅ Web App registrado ("Pix Televendas")
- ✅ Credenciais extraídas e aplicadas nos arquivos HTML

### ⏳ Pendente
- ⏳ Cloud Storage (requer upgrade para Blaze Plan)
- ⏳ Configurar regras de segurança

## Por que Firebase?
- ✅ **Banco de dados em nuvem** — dados não são perdidos ao atualizar
- ✅ **Sem backend próprio** — funciona 100% client-side
- ✅ **Armazenamento de arquivos** — salva comprovantes em nuvem
- ✅ **Tempo real** — atualizações automáticas entre páginas
- ✅ **Gratuito com limite** — Spark Plan oferece 1GB de dados (Realtime DB)

---

## ✅ Passo 1-5: Já Concluído! 

Projeto criado, Realtime Database configurado e credenciais aplicadas nos arquivos HTML.

### Suas Credenciais (já estão nos arquivos):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCJ5Wbw9OvcFidj1vRC6nkOpVS-AVIlwMk",
  authDomain: "max-atacadista-pix.firebaseapp.com",
  databaseURL: "https://max-atacadista-pix-default-rtdb.firebaseio.com",
  projectId: "max-atacadista-pix",
  storageBucket: "max-atacadista-pix.firebasestorage.app",
  messagingSenderId: "351864711547",
  appId: "1:351864711547:web:2436c483b3c6c513f8b5de",
  measurementId: "G-K36P51TK4M"
};
```

**Atualizado em:**
- ✅ `pix-envio.html` (linha 587)
- ✅ `pix-gerenciamento.html` (linha 281)

---

## ⏳ Próximo Passo: Cloud Storage (Opcional)

O Realtime Database já está funcionando para armazenar dados PIX. Para upload de comprovantes:

1. Acesse **[https://console.firebase.google.com/project/max-atacadista-pix/storage](https://console.firebase.google.com/project/max-atacadista-pix/storage)**
2. Clique em **"Fazer upgrade do projeto"** para ativar Blaze Plan (pague conforme o uso)
3. Complete o processo de criação da conta de faturamento

---

## 📋 Próximo Passo: Configurar Regras de Segurança

Quando estiver pronto para produção, configure as regras:

### Para Realtime Database:
1. Acesse [https://console.firebase.google.com/project/max-atacadista-pix/database/max-atacadista-pix-default-rtdb/rules](https://console.firebase.google.com/project/max-atacadista-pix/database/max-atacadista-pix-default-rtdb/rules)
2. Substitua as regras por:

```json
{
  "rules": {
    "pix-envios": {
      ".read": true,
      ".write": true,
      "$uid": {
        ".validate": "newData.hasChildren(['vendor', 'store', 'amount', 'datetime'])"
      }
    },
    "pix-pedidos": {
      ".read": true,
      ".write": true
    },
    "pix-alocacoes": {
      ".read": true,
      ".write": true
    }
  }
}
```

4. Clique em **"Publicar"**

### Para Cloud Storage:
1. No Firebase Console, vá para **"Storage"**
2. Abra a aba **"Regras"**
3. Substitua por:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /pix-comprovantes/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

4. Clique em **"Publicar"**

---

## 7️⃣ Estrutura de dados (referência)

Seus dados serão organizados assim no Firebase:

```
pix-envios/
├── pix_1714000000000/
│   ├── id: "pix_1714000000000"
│   ├── vendor: "João Silva"
│   ├── store: "Loja 001"
│   ├── datetime: "2026-05-05T10:30"
│   ├── amount: 1500
│   ├── status: "pending"
│   └── proofURL: "https://firebaseurl.com/..."
└── pix_1714000001000/
    └── ...

pix-alocacoes/
├── aloc_1714000002000/
│   ├── pixId: "pix_1714000000000"
│   ├── orderIds: ["PED-001", "PED-002"]
│   └── status: "conciled"
```

---

## ✅ Teste rápido

1. Abra `pix-envio.html` no navegador
2. Preencha o formulário e envie um PIX
3. Verifique se aparece no **Firebase Realtime Database**
4. Abra `pix-gerenciamento.html` — deve ver o PIX automaticamente

---

## 🚀 Para produção (depois)

Quando tiver usuários reais, ative autenticação:
1. Vá para **"Authentication"** no Firebase
2. Configure login por email/senha ou Google
3. Altere as regras para permitir acesso apenas autenticado

Regra mais segura:
```json
"pix-envios": {
  ".read": "auth != null",
  ".write": "auth != null"
}
```

---

## 🆘 Troubleshooting

**"Firebase não configurado"?**
- Verifique se as credenciais estão corretas
- Confirme que database e storage foram criados

**"Erro de CORS"?**
- Adicione seu domínio às origens autorizadas no Firebase
- Console > Autenticação > Configurações > Domínios autorizados

**Dados não aparecem?**
- Abra o DevTools (F12) e procure por mensagens de erro
- Verifique as regras de segurança

---

Pronto! 🎉 Sistema funcionando com banco de dados em nuvem!
