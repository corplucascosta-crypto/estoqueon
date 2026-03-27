// =============================================
// SUPABASE CONFIGURATION - VERSÃO ÚNICA
// =============================================

// Usar nomes diferentes para evitar conflitos
const SB_URL = "https://uqmwegqpulqhwculfytr.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbXdlZ3FwdWxxaHdjdWxmeXRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk4NjI4MSwiZXhwIjoyMDc1NTYyMjgxfQ.ySQeZhEekxI9UxSD7Ndqax6e7ruC8KgVoZMalSMcL68";

// Criar cliente
const sbClient = window.supabase.createClient(SB_URL, SB_KEY);

// Variáveis globais
let invItems = [];
let dbItems = [];
let sysUsers = [];
let isAdminUser = false;
let loggedUser = null;
let editingUserId = null;
let currentCode = '';
let currentQty = 0;
let existingIdx = -1;
let searchTimeout = null;
let activeCountingType = '';
let sessionActive = false;

// Gráficos
let qtyChart = null;
let distChart = null;
let timeChart = null;
let columnsCache = null;

// Funções
function toSnake(str) {
    return String(str).replace(/([A-Z])/g, '_$1').toLowerCase();
}

function buildPayload(item) {
    return {
        code: item.code,
        description: item.description,
        system_quantity: item.systemQuantity || 0,
        counted_quantity: item.countedQuantity || 0,
        unit_value: item.unitValue || 0,
        counts: item.counts || 1,
        user_id: loggedUser ? loggedUser.id : null,
        created_at: item.date || new Date().toISOString()
    };
}

async function testConnection() {
    try {
        const { data, error } = await sbClient
            .from('products_base')
            .select('*')
            .limit(1);
        if (error) throw error;
        console.log('✅ Supabase conectado');
        return true;
    } catch (error) {
        console.error('❌ Erro:', error);
        return false;
    }
}

// Exportar globalmente
window.sbClient = sbClient;
window.invItems = invItems;
window.loggedUser = loggedUser;
window.isAdminUser = isAdminUser;
window.testConnection = testConnection;

console.log('✅ Supabase configurado');