// =============================================
// SUPABASE CONFIGURATION
// =============================================

const supabaseUrl = "https://uqmwegqpulqhwculfytr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbXdlZ3FwdWxxaHdjdWxmeXRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk4NjI4MSwiZXhwIjoyMDc1NTYyMjgxfQ.ySQeZhEekxI9UxSD7Ndqax6e7ruC8KgVoZMalSMcL68";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Global variables
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

// Chart variables
let quantityChart, distributionChart, timelineChart;
let chartsInitialized = false;
let inventoryColumnsCache = null;

// Helper: convert camelCase to snake_case
function camelToSnake(str) {
    return String(str).replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Build inventory payload for Supabase
function buildInventoryPayload(item) {
    const payload = {};
    const map = {
        code: 'code',
        description: 'description',
        systemQuantity: 'system_quantity',
        countedQuantity: 'counted_quantity',
        unitValue: 'unit_value',
        counts: 'counts',
        date: 'created_at'
    };
    
    for (const key in map) {
        if (Object.prototype.hasOwnProperty.call(item, key) && item[key] !== undefined) {
            payload[map[key]] = item[key];
        }
    }
    
    if (currentUser && currentUser.id) {
        payload.user_id = currentUser.id;
    } else {
        throw new Error('Usuário não autenticado');
    }
    
    payload.code = payload.code || item.code;
    payload.created_at = payload.created_at || item.date || new Date().toISOString();
    
    return payload;
}

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabaseClient
            .from('products_base')
            .select('*')
            .limit(1);
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            inventoryColumnsCache = Object.keys(data[0]).map(k => k.toLowerCase());
        } else {
            inventoryColumnsCache = [];
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão:', error);
        return false;
    }
}