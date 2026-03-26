# 📦 Estoque-On

Sistema Gerencial de Controle de Estoque

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![License](https://img.shields.io/badge/license-MIT-green)
![Vercel](https://img.shields.io/badge/deploy-vercel-black)

## 🚀 Sobre o Projeto

Sistema completo para controle de inventário, permitindo contagem de produtos, dashboard analítico e gerenciamento de usuários.

### Funcionalidades

- ✅ Contagem de inventário por tipo (Avaria, RH, Outro)
- ✅ Busca automática de produtos por código (DUN/EAN/PLU)
- ✅ Dashboard com gráficos e KPIs
- ✅ Gerenciamento de usuários com níveis de acesso
- ✅ Importação de base de dados via Excel
- ✅ Exportação de relatórios
- ✅ Histórico de contagens

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework:** Bootstrap 5
- **Gráficos:** Chart.js
- **Backend:** Supabase (PostgreSQL)
- **Exportação:** SheetJS (XLSX)

## 📁 Estrutura do Projeto

estoqueon/
├── index.html # Página principal
├── css/
│ └── style.css # Estilos
├── js/
│ ├── app.js # Inicialização
│ ├── config/ # Configurações
│ ├── modules/ # Módulos funcionais
│ └── utils/ # Utilitários
├── version.json # Versão do sistema
├── CHANGELOG.md # Histórico de alterações
└── package.json # Dependências


## 🔐 Acesso

| Perfil | Matrícula | Senha |
|--------|-----------|-------|
| Admin | admin | admin123 |
| Usuário | (criar conta) | (definir) |

## 🌐 Deploy

Acesse: [https://estoqueon.vercel.app](https://estoqueon.vercel.app)

## 📝 Como Contribuir

1. Faça um fork do projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

MIT

---

Desenvolvido por Lucas Costa