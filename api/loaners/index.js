const { TableClient } = require("@azure/data-tables");

// In-memory fallback storage for development/testing
let memoryStorage = {
  loaners: [],
  loanHistory: []
};

// Get Table Client for Azure Table Storage
function getTableClient(tableName) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    console.log("No Azure Storage connection string - using in-memory storage");
    return null;
  }

  return TableClient.fromConnectionString(connectionString, tableName);
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

// GET all loaners
async function getLoaners() {
  const tableClient = getTableClient("loaners");

  if (!tableClient) {
    return {
      loaners: memoryStorage.loaners,
      loanHistory: memoryStorage.loanHistory
    };
  }

  await ensureTable(tableClient);

  try {
    const loaners = [];
    const loanHistory = [];

    // Get all entities
    const entities = tableClient.listEntities();
    for await (const entity of entities) {
      if (entity.partitionKey === "loaner") {
        loaners.push({
          id: entity.rowKey,
          assetTag: entity.assetTag,
          name: entity.name,
          manufacturer: entity.manufacturer || undefined,
          model: entity.model || undefined,
          serialNumber: entity.serialNumber || undefined,
          status: entity.status,
          borrowerName: entity.borrowerName || undefined,
          borrowerEmail: entity.borrowerEmail || undefined,
          borrowerDepartment: entity.borrowerDepartment || undefined,
          checkoutDate: entity.checkoutDate || undefined,
          expectedReturnDate: entity.expectedReturnDate || undefined,
          actualReturnDate: entity.actualReturnDate || undefined,
          specs: entity.specs || undefined,
          condition: entity.condition || undefined,
          notes: entity.notes || undefined,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt
        });
      } else if (entity.partitionKey === "history") {
        loanHistory.push({
          id: entity.rowKey,
          loanerId: entity.loanerId,
          borrowerName: entity.borrowerName,
          borrowerEmail: entity.borrowerEmail || undefined,
          borrowerDepartment: entity.borrowerDepartment || undefined,
          checkoutDate: entity.checkoutDate,
          expectedReturnDate: entity.expectedReturnDate || undefined,
          actualReturnDate: entity.actualReturnDate || undefined,
          notes: entity.notes || undefined
        });
      }
    }

    return { loaners, loanHistory };
  } catch (error) {
    console.error("Error getting loaners:", error);
    return { loaners: [], loanHistory: [] };
  }
}

// Save or update a loaner
async function saveLoaner(loaner) {
  const tableClient = getTableClient("loaners");

  if (!tableClient) {
    const existingIndex = memoryStorage.loaners.findIndex(l => l.id === loaner.id);
    if (existingIndex >= 0) {
      memoryStorage.loaners[existingIndex] = loaner;
    } else {
      memoryStorage.loaners.push(loaner);
    }
    return loaner;
  }

  await ensureTable(tableClient);

  const entity = {
    partitionKey: "loaner",
    rowKey: loaner.id,
    assetTag: loaner.assetTag,
    name: loaner.name,
    manufacturer: loaner.manufacturer || "",
    model: loaner.model || "",
    serialNumber: loaner.serialNumber || "",
    status: loaner.status,
    borrowerName: loaner.borrowerName || "",
    borrowerEmail: loaner.borrowerEmail || "",
    borrowerDepartment: loaner.borrowerDepartment || "",
    checkoutDate: loaner.checkoutDate || "",
    expectedReturnDate: loaner.expectedReturnDate || "",
    actualReturnDate: loaner.actualReturnDate || "",
    specs: loaner.specs || "",
    condition: loaner.condition || "",
    notes: loaner.notes || "",
    createdAt: loaner.createdAt,
    updatedAt: loaner.updatedAt
  };

  await tableClient.upsertEntity(entity, "Replace");
  return loaner;
}

// Delete a loaner
async function deleteLoaner(id) {
  const tableClient = getTableClient("loaners");

  if (!tableClient) {
    memoryStorage.loaners = memoryStorage.loaners.filter(l => l.id !== id);
    // Also delete related history
    memoryStorage.loanHistory = memoryStorage.loanHistory.filter(h => h.loanerId !== id);
    return true;
  }

  await ensureTable(tableClient);

  try {
    await tableClient.deleteEntity("loaner", id);

    // Also delete related history entries
    const entities = tableClient.listEntities({
      queryOptions: { filter: `partitionKey eq 'history' and loanerId eq '${id}'` }
    });
    for await (const entity of entities) {
      await tableClient.deleteEntity("history", entity.rowKey);
    }

    return true;
  } catch (error) {
    if (error.statusCode === 404) return true;
    throw error;
  }
}

// Add a loan history entry
async function addLoanHistory(entry) {
  const tableClient = getTableClient("loaners");

  if (!tableClient) {
    memoryStorage.loanHistory.push(entry);
    return entry;
  }

  await ensureTable(tableClient);

  const entity = {
    partitionKey: "history",
    rowKey: entry.id,
    loanerId: entry.loanerId,
    borrowerName: entry.borrowerName,
    borrowerEmail: entry.borrowerEmail || "",
    borrowerDepartment: entry.borrowerDepartment || "",
    checkoutDate: entry.checkoutDate,
    expectedReturnDate: entry.expectedReturnDate || "",
    actualReturnDate: entry.actualReturnDate || "",
    notes: entry.notes || ""
  };

  await tableClient.upsertEntity(entity, "Replace");
  return entry;
}

// Update a loan history entry (for recording returns)
async function updateLoanHistory(id, updates) {
  const tableClient = getTableClient("loaners");

  if (!tableClient) {
    const index = memoryStorage.loanHistory.findIndex(h => h.id === id);
    if (index >= 0) {
      memoryStorage.loanHistory[index] = { ...memoryStorage.loanHistory[index], ...updates };
    }
    return memoryStorage.loanHistory[index];
  }

  await ensureTable(tableClient);

  try {
    const entity = await tableClient.getEntity("history", id);
    const updatedEntity = {
      ...entity,
      ...updates
    };
    await tableClient.upsertEntity(updatedEntity, "Replace");
    return updatedEntity;
  } catch (error) {
    console.error("Error updating loan history:", error);
    throw error;
  }
}

module.exports = async function (context, req) {
  const id = context.bindingData.id || "";
  const method = req.method.toUpperCase();

  // Add CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    // GET /api/loaners - Get all loaners and history
    if (method === "GET" && !id) {
      const data = await getLoaners();
      context.res = {
        status: 200,
        headers,
        body: data
      };
      return;
    }

    // POST /api/loaners - Create a new loaner
    if (method === "POST" && !id) {
      const loaner = req.body;

      if (!loaner || !loaner.id) {
        context.res = {
          status: 400,
          headers,
          body: { error: "Loaner data with id is required" }
        };
        return;
      }

      const saved = await saveLoaner(loaner);
      context.res = {
        status: 201,
        headers,
        body: saved
      };
      return;
    }

    // PUT /api/loaners/{id} - Update a loaner
    if (method === "PUT" && id) {
      const loaner = req.body;

      if (!loaner) {
        context.res = {
          status: 400,
          headers,
          body: { error: "Loaner data is required" }
        };
        return;
      }

      loaner.id = id;
      const saved = await saveLoaner(loaner);
      context.res = {
        status: 200,
        headers,
        body: saved
      };
      return;
    }

    // DELETE /api/loaners/{id} - Delete a loaner
    if (method === "DELETE" && id) {
      await deleteLoaner(id);
      context.res = {
        status: 200,
        headers,
        body: { success: true }
      };
      return;
    }

    // POST /api/loaners/history - Add loan history entry
    if (method === "POST" && id === "history") {
      const entry = req.body;

      if (!entry || !entry.id) {
        context.res = {
          status: 400,
          headers,
          body: { error: "History entry with id is required" }
        };
        return;
      }

      const saved = await addLoanHistory(entry);
      context.res = {
        status: 201,
        headers,
        body: saved
      };
      return;
    }

    // PUT /api/loaners/history/{historyId} - Update loan history entry
    if (method === "PUT" && id.startsWith("history-")) {
      const updates = req.body;
      const updated = await updateLoanHistory(id, updates);
      context.res = {
        status: 200,
        headers,
        body: updated
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
