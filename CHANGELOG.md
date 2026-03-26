# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

## [1.0.0] - 2026-03-26

### Adicionado
- Sistema modularizado com separação de arquivos CSS/JS
- Autenticação de usuários com Supabase
- Contagem de inventário com busca por código
- Dashboard analítico com gráficos (Chart.js)
- Gerenciamento de usuários (CRUD completo)
- Importação de base de dados via Excel
- Exportação de relatórios para Excel
- Sessões de contagem por tipo (Avaria, RH, Outro)
- Histórico de contagens por item
- KPIs e métricas em tempo real

### Melhorias
- Performance otimizada no lançamento de contagens
- Debounce reduzido para 300ms (resposta mais rápida)
- Interface responsiva para dispositivos móveis

### Corrigido
- Delay ao registrar contagem após pressionar Enter
- Erros de sincronização com Supabase
- Validação de campos obrigatórios

### Tecnologias
- HTML5 / CSS3
- JavaScript (Vanilla)
- Bootstrap 5
- Chart.js
- Supabase (Backend)
- XLSX (Exportação Excel)

---

## Próximas versões

### [1.1.0] - Planejado
- [ ] Scanner de código de barras via câmera
- [ ] Exportação de relatórios em PDF
- [ ] Filtros avançados no histórico
- [ ] Reset de senha por email
- [ ] Modo offline com sincronização

### [1.2.0] - Em estudo
- [ ] Dashboard com mais gráficos
- [ ] Notificações em tempo real
- [ ] Multi-empresas
- [ ] API para integração com outros sistemas