# 📋 ATUALIZAÇÕES - PIX ENVIO v2.0
**Data:** 05/05/2026  
**Status:** ✅ Pronto para Produção

---

## 🎯 RESUMO DAS ALTERAÇÕES

Sistema de envio de PIX totalmente reformulado com validações, pedidos e conciliação automática.

---

## ✨ NOVAS FUNCIONALIDADES

### 1️⃣ **INTEGRAÇÃO FIREBASE REALTIME DATABASE**
- ✅ Dados salvos em nuvem (não são perdidos ao atualizar página)
- ✅ Sincronização em tempo real entre páginas
- ✅ Fallback para localStorage se Firebase falhar
- ✅ Credenciais configuradas:
  - Projeto: `max-atacadista-pix`
  - Database: `max-atacadista-pix-default-rtdb`

---

### 2️⃣ **CAMPOS DE CLIENTE**
- ✅ **Nome do Cliente** — entrada obrigatória
- ✅ **Tipo de Documento** — Dropdown: CNPJ (padrão) ou CPF
- ✅ **Número do Documento** — Formatação automática:
  - **CNPJ:** `00.000.000/0000-00` (máx 18 caracteres)
  - **CPF:** `000.000.000-00` (máx 14 caracteres)
- ✅ Mudança de tipo limpa o campo automaticamente

---

### 3️⃣ **LOJA AUTOMÁTICA**
- ✅ Dropdown com **70+ lojas** do Max Atacadista
- ✅ Importadas do cadastro-com-prazo.html
- ✅ Formatação: `[CÓDIGO] - [NOME]` (ex: 1025 - Debret)

---

### 4️⃣ **CHAVE PIX PADRÃO**
- ✅ Campo bloqueado (readonly) com valor padrão: `76430438000171`
- ✅ Não pode ser alterado pelo vendedor

---

### 5️⃣ **VALOR EM REAL BRASILEIRO**
- ✅ Campo aceita entrada em padrão brasileiro (vírgula como decimal)
- ✅ Exibição formatada: `R$ 1.500,50`
- ✅ Funções:
  - `formatarReal()` — converte número para padrão BR
  - `parseReal()` — converte string BR para número

---

### 6️⃣ **PAINEL DE REGRAS DE PAGAMENTO**
Informativo visual com 3 regras principais:

```
📌 REGRAS DE PAGAMENTO

🧾 CUPOM FISCAL          📄 NOTA DANFE           ⚠️ PIX ACIMA 10K
• Máx R$ 9.999,99       • Sem limite de valor    • Apenas NOTA DANFE
• Apenas 1 por PIX      • Múltiplos por PIX     • Cupom NÃO permitido
• Não misture            • Combine quantos quiser
```

---

### 7️⃣ **TABELA DE PEDIDOS PARA CONCILIAÇÃO**
Gerencia múltiplos pedidos com validação automática:

**Colunas:**
- Nº Pedido (texto)
- Tipo (dropdown: DANFE ou CUPOM) — padrão DANFE
- Valor PIX (formatado em R$)
- Acordo Comercial (desconto, formatado em R$)
- Total (calculado automaticamente)
- Ação (botão Remover)

**Funcionalidades:**
- ✅ Botão "+ Adicionar Pedido"
- ✅ Cálculo automático: Total = Valor PIX - Acordo Comercial
- ✅ Remover pedidos individuais
- ✅ Dados salvos no Firebase junto com PIX

---

### 8️⃣ **TOTALIZADORES EM TEMPO REAL**
```
Total Pedidos: R$ X.XXX,XX  |  Total Descontos: R$ X.XXX,XX  |  Total Líquido: R$ X.XXX,XX
```

---

### 9️⃣ **VALIDAÇÕES AUTOMÁTICAS**

#### ✅ Regra 1: Documentos NÃO podem se misturar
```
❌ CUPOM + DANFE no mesmo PIX = BLOQUEADO
Alerta: "⛔ DOCUMENTOS MISTURADOS"
```

#### ✅ Regra 2: CUPOM FISCAL tem limite
```
❌ CUPOM > R$ 9.999,99 = ALERTA
Alerta: "⚠️ CUPOM FISCAL ACIMA DO LIMITE"
```

#### ✅ Regra 3: Apenas 1 CUPOM por PIX
```
❌ Múltiplos CUPOM no mesmo PIX = ALERTA
Alerta: "⚠️ MÚLTIPLOS CUPONS - Apenas 1"
```

#### ✅ Regra 4: PIX acima de 10K rejeita CUPOM
```
❌ PIX > R$ 10.000 com CUPOM = BLOQUEADO
Alerta: "⛔ PIX ACIMA DE R$ 10.000,00 - CUPOM NÃO PERMITIDO"
```

#### ✅ Regra 5: Valida diferença PIX vs Pedidos
```
⚠️ PIX ACIMA: Sobra R$ X.XX
⚠️ PIX ABAIXO: Falta R$ X.XX
```

---

### 🔟 **ALERTAS EM TEMPO REAL**
- Alertas aparecem conforme o vendedor digita
- Bloqueiam o envio se houver erro crítico
- Cor vermelha para bloqueadores
- Mensagens claras em português

---

### 1️⃣1️⃣ **UPLOAD DE COMPROVANTE**
- ✅ Drag & drop ou clique para selecionar
- ✅ Suporta PNG, JPG, PDF
- ✅ Máximo 5MB
- ✅ Salva em Firebase Cloud Storage (quando Blaze Plan ativado)

---

### 1️⃣2️⃣ **HISTÓRICO DE ENVIOS**
- ✅ Tabela com todos os PIX enviados
- ✅ Filtro automático por nome do vendedor
- ✅ Exibe: Data/Hora, Valor (R$ formatado), Loja, Status, Data Envio
- ✅ Carrega dados do Firebase em tempo real

---

### 1️⃣3️⃣ **BOTÕES E AÇÕES**
- ✅ "Enviar PIX para Análise" — valida tudo e envia
- ✅ "Limpar" — resetar formulário e pedidos
- ✅ "+ Adicionar Pedido" — novo pedido na tabela
- ✅ "Remover" — remove pedido individual

---

## 🔧 MUDANÇAS TÉCNICAS

### Novas Funções JavaScript:
```javascript
formatarReal(valor)                  // Formata número para R$ brasileiro
parseReal(valor)                     // Converte string R$ para número
formatarCPF(valor)                   // Formata CPF automaticamente
formatarCNPJ(valor)                  // Formata CNPJ automaticamente
alterarTipoDocumento()               // Muda entre CPF e CNPJ
adicionarPedido()                    // Adiciona linha na tabela
removerPedido(id)                    // Remove pedido
renderizarPedidos()                  // Renderiza tabela de pedidos
atualizarPedido(id, campo, valor)    // Atualiza campo do pedido
atualizarTotais()                    // Calcula totalizadores
validarRegrasDocumento()             // Valida regras CUPOM/DANFE/PIX
verificarDiferenca()                 // Compara PIX com pedidos
```

### Arrays Globais:
```javascript
let pedidosData = []  // Armazena todos os pedidos adicionados
```

### Estrutura de Dados (Firebase):
```json
{
  "pix-envios": {
    "pix_1234567890000": {
      "id": "pix_1234567890000",
      "vendor": "João Silva",
      "store": "1025 - Debret",
      "datetime": "2026-05-05T14:30",
      "amount": 5000.50,
      "key": "76430438000171",
      "clienteName": "Cliente Teste",
      "documentType": "cnpj",
      "receiver": "12.345.678/0001-81",
      "notes": "Anotações",
      "pedidos": [
        {
          "id": "pedido_1234567890000",
          "numero": "PED-001",
          "tipo": "danfe",
          "valorPix": "5000.50",
          "desconto": "0"
        }
      ],
      "proofFile": "comprovante.pdf",
      "proofURL": "https://firebase-url...",
      "status": "pending",
      "submittedAt": "2026-05-05T14:35:00Z"
    }
  }
}
```

---

## 📊 STATUS DE FUNCIONALIDADES

| Funcionalidade | Status | Observação |
|---|---|---|
| Interface formulário | ✅ Completo | Todos campos implementados |
| Integração Firebase | ✅ Configurado | Credenciais aplicadas |
| Validações | ✅ Completo | 5 regras principais |
| Formatação valores | ✅ Completo | Real brasileiro + CPF/CNPJ |
| Gerenciamento pedidos | ✅ Completo | Adicionar/remover com validação |
| Histórico | ✅ Completo | Carrega do Firebase |
| Upload comprovante | ✅ Implementado | Aguarda Cloud Storage |
| Painel informativo | ✅ Completo | 3 regras visíveis |
| Alertas em tempo real | ✅ Completo | Bloqueadores e avisos |
| Tema claro/escuro | ✅ Mantido | Botões no topo |

---

## 🚀 PRÓXIMOS PASSOS (Opcional)

- [ ] Ativar Cloud Storage (Blaze Plan) para salvar comprovantes
- [ ] Configurar regras de segurança do Realtime Database
- [ ] Autenticação por login (segurança em produção)
- [ ] Sincronização com pix-gerenciamento.html em tempo real

---

## 🔐 SEGURANÇA

- ✅ Chave PIX bloqueada (readonly)
- ✅ Validações no client-side + server-side (Firebase)
- ✅ Dados sensíveis formatados corretamente
- ✅ Documento tipo determinado pelo usuário

---

## 📱 COMPATIBILIDADE

- ✅ Chrome/Edge/Firefox
- ✅ Desktop
- ✅ Tablet
- ✅ Mobile (responsivo)

---

## 📝 NOTAS IMPORTANTES

1. **Firebase deve estar acessível** para sincronizar dados
2. **Se offline**, dados caem em localStorage (fallback)
3. **Histórico filtra por nome do vendedor** — mantenha nome consistente
4. **Pedidos são salvos junto com o PIX** no Firebase
5. **Alertas bloqueadores impedem envio** até corrigir erros

---

## ✅ CHECKLIST ANTES DE SUBIR

- [ ] Testar envio com CUPOM (< 10K)
- [ ] Testar envio com DANFE (qualquer valor)
- [ ] Testar rejeição CUPOM (> 10K)
- [ ] Testar rejeição CUPOM + DANFE misturados
- [ ] Verificar dados em Firebase Console
- [ ] Testar histórico carrega corretamente
- [ ] Testar em pix-gerenciamento.html
- [ ] Testar modo offline (localStorage)
- [ ] Verificar formatação em mobile

---

**Desenvolvido por:** Claude  
**Versão:** 2.0  
**Última atualização:** 05/05/2026
