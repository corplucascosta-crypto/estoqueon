// =============================================
// SUPABASE CONFIGURATION
// =============================================

// Configuração do Supabase
const SUPABASE_URL = "https://uqmwegqpulqhwculfytr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbXdlZ3FwdWxxaHdjdWxmeXRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk4NjI4MSwiZXhwIjoyMDc1NTYyMjgxfQ.ySQeZhEekxI9UxSD7Ndqax6e7ruC8KgVoZMalSMcL68";

// Criar cliente Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// VARIÁVEIS GLOBAIS DO SISTEMA
// =============================================

let inventoryItems = [];
let itemDatabase = [];
let systemUsers = [];
let isAdmin = false;
let currentUser = null;
let currentEditingUserId = null;
let currentItemCode = '';
let currentCountedQuantity = 0;
let existingItemIndex = -1;
let itemCodeSearchTimeout = null;
let currentCountingType = '';
let countingSessionActive = false;

// Variáveis para gráficos
let quantityChart = null;
let distributionChart = null;
let timelineChart = null;
let chartsInitialized = false;
let inventoryColumnsCache = null;

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

function camelToSnake(str) {
    return String(str).replace(/([A-Z])/g, '_$1').toLowerCase();
}

function buildInventoryPayload(item) {
    const payload = {
        code: item.code,
        description: item.description,
        system_quantity: item.systemQuantity || 0,
        counted_quantity: item.countedQuantity || 0,
        unit_value: item.unitValue || 0,
        counts: item.counts || 1,
        user_id: currentUser ? currentUser.id : null,
        created_at: item.date || new Date().toISOString()
    };
    return payload;
}

async function testSupabaseConnection() {
    try {
        console.log('🔌 Testando conexão Supabase...');
        const { data, error } = await supabaseClient
            .from('products_base')
            .select('*')
            .limit(1);
        if (error) throw error;
        console.log('✅ Supabase conectado!');
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão:', error);
        return false;
    }
}

// Expor variáveis globalmente
window.supabaseClient = supabaseClient;
window.inventoryItems = inventoryItems;
window.currentUser = currentUser;
window.isAdmin = isAdmin;
window.testSupabaseConnection = testSupabaseConnection;

console.log('✅ supabase.js carregado com sucesso');