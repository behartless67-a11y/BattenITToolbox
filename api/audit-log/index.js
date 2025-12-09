const { TableClient } = require("@azure/data-tables");

// In-memory fallback storage for development/testing
let memoryStorage = [];

// Get Table Client for Azure Table Storage
function getTableClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    console.log("No Azure Storage connection string - using in-memory storage");
    return null;
  }

  return TableClient.fromConnectionString(connectionString, "auditlog");
}

// Initialize table if it doesn't exist
async function ensureTable(tableClient) {
  if (!tableClient) return;
  try {
    await tableClient.createTable();
  } catch (error) {
    // Table already exists - ignore error
    if (error.statusCode !== 409) {
      console.error("Error creating table:", error.message);
    }
  }
}

// Add an audit log entry
async function addAuditEntry(entry) {
  const tableClient = getTableClient();
  const timestamp = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const logEntry = {
    id,
    timestamp,
    ...entry
  };

  if (!tableClient) {
    memoryStorage.push(logEntry);
    // Keep only last 1000 entries in memory
    if (memoryStorage.length > 1000) {
      memoryStorage = memoryStorage.slice(-1000);
    }
    return logEntry;
  }

  await ensureTable(tableClient);

  // Use entityType as partition key and timestamp-based rowKey for efficient querying
  const entity = {
    partitionKey: entry.entityType || "general",
    rowKey: `${timestamp}_${id}`,
    id,
    timestamp,
    entityType: entry.entityType || "",
    entityId: entry.entityId || "",
    entityName: entry.entityName || "",
    action: entry.action || "",
    field: entry.field || "",
    oldValue: entry.oldValue !== undefined ? String(entry.oldValue) : "",
    newValue: entry.newValue !== undefined ? String(entry.newValue) : "",
    userId: entry.userId || "",
    userName: entry.userName || "",
    userEmail: entry.userEmail || "",
    details: entry.details || ""
  };

  await tableClient.upsertEntity(entity, "Replace");
  return logEntry;
}

// Get audit entries for a specific entity
async function getAuditEntries(entityType, entityId, limit = 50) {
  const tableClient = getTableClient();

  if (!tableClient) {
    let entries = memoryStorage;

    if (entityType) {
      entries = entries.filter(e => e.entityType === entityType);
    }
    if (entityId) {
      entries = entries.filter(e => e.entityId === entityId);
    }

    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return entries.slice(0, limit);
  }

  await ensureTable(tableClient);

  try {
    const entries = [];
    let query = {};

    if (entityType && entityId) {
      // Query for specific entity
      query = {
        queryOptions: {
          filter: `partitionKey eq '${entityType}' and entityId eq '${entityId}'`
        }
      };
    } else if (entityType) {
      // Query for entity type
      query = {
        queryOptions: {
          filter: `partitionKey eq '${entityType}'`
        }
      };
    }

    const iterator = tableClient.listEntities(query);

    for await (const entity of iterator) {
      entries.push({
        id: entity.id,
        timestamp: entity.timestamp,
        entityType: entity.entityType,
        entityId: entity.entityId,
        entityName: entity.entityName,
        action: entity.action,
        field: entity.field,
        oldValue: entity.oldValue,
        newValue: entity.newValue,
        userId: entity.userId,
        userName: entity.userName,
        userEmail: entity.userEmail,
        details: entity.details
      });
    }

    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return entries.slice(0, limit);
  } catch (error) {
    console.error("Error getting audit entries:", error);
    return [];
  }
}

// Get recent audit entries across all entities
async function getRecentAuditEntries(limit = 100) {
  const tableClient = getTableClient();

  if (!tableClient) {
    const entries = [...memoryStorage];
    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return entries.slice(0, limit);
  }

  await ensureTable(tableClient);

  try {
    const entries = [];
    const iterator = tableClient.listEntities();

    for await (const entity of iterator) {
      entries.push({
        id: entity.id,
        timestamp: entity.timestamp,
        entityType: entity.entityType,
        entityId: entity.entityId,
        entityName: entity.entityName,
        action: entity.action,
        field: entity.field,
        oldValue: entity.oldValue,
        newValue: entity.newValue,
        userId: entity.userId,
        userName: entity.userName,
        userEmail: entity.userEmail,
        details: entity.details
      });
    }

    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return entries.slice(0, limit);
  } catch (error) {
    console.error("Error getting recent audit entries:", error);
    return [];
  }
}

module.exports = async function (context, req) {
  const entityType = context.bindingData.entityType || "";
  const entityId = context.bindingData.entityId || "";
  const method = req.method.toUpperCase();

  // Add CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    // POST /api/audit-log - Add a new audit entry
    if (method === "POST") {
      const entry = req.body;

      if (!entry || !entry.action) {
        context.res = {
          status: 400,
          headers,
          body: { error: "Audit entry with action is required" }
        };
        return;
      }

      const saved = await addAuditEntry(entry);
      context.res = {
        status: 201,
        headers,
        body: saved
      };
      return;
    }

    // GET /api/audit-log - Get recent audit entries
    if (method === "GET" && !entityType) {
      const limit = parseInt(req.query.limit) || 100;
      const entries = await getRecentAuditEntries(limit);
      context.res = {
        status: 200,
        headers,
        body: { entries }
      };
      return;
    }

    // GET /api/audit-log/{entityType} - Get audit entries for entity type
    // GET /api/audit-log/{entityType}/{entityId} - Get audit entries for specific entity
    if (method === "GET" && entityType) {
      const limit = parseInt(req.query.limit) || 50;
      const entries = await getAuditEntries(entityType, entityId, limit);
      context.res = {
        status: 200,
        headers,
        body: { entries }
      };
      return;
    }

    // Not found
    context.res = {
      status: 404,
      headers,
      body: { error: "Not found" }
    };

  } catch (error) {
    console.error("API Error:", error);
    context.res = {
      status: 500,
      headers,
      body: { error: error.message }
    };
  }
};
