const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

// In-memory fallback storage for development/testing
let memoryStorage = {
  retiredDevices: [],
  deviceNotes: {},
  deviceOwners: {}
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

// GET all device settings
async function getSettings() {
  const tableClient = getTableClient("devicesettings");

  if (!tableClient) {
    return {
      retiredDevices: memoryStorage.retiredDevices,
      deviceNotes: memoryStorage.deviceNotes,
      deviceOwners: memoryStorage.deviceOwners
    };
  }

  await ensureTable(tableClient);

  try {
    // Get the single settings entity
    const entity = await tableClient.getEntity("settings", "main");
    return {
      retiredDevices: JSON.parse(entity.retiredDevices || "[]"),
      deviceNotes: JSON.parse(entity.deviceNotes || "{}"),
      deviceOwners: JSON.parse(entity.deviceOwners || "{}")
    };
  } catch (error) {
    if (error.statusCode === 404) {
      return { retiredDevices: [], deviceNotes: {}, deviceOwners: {} };
    }
    throw error;
  }
}

// Save all device settings
async function saveSettings(retiredDevices, deviceNotes, deviceOwners) {
  const tableClient = getTableClient("devicesettings");

  if (!tableClient) {
    memoryStorage.retiredDevices = retiredDevices;
    memoryStorage.deviceNotes = deviceNotes;
    memoryStorage.deviceOwners = deviceOwners || memoryStorage.deviceOwners;
    return;
  }

  await ensureTable(tableClient);

  const entity = {
    partitionKey: "settings",
    rowKey: "main",
    retiredDevices: JSON.stringify(retiredDevices),
    deviceNotes: JSON.stringify(deviceNotes),
    deviceOwners: JSON.stringify(deviceOwners || {}),
    updatedAt: new Date().toISOString()
  };

  await tableClient.upsertEntity(entity, "Replace");
}

// Update retired devices
async function updateRetiredDevices(deviceId, isRetired) {
  const settings = await getSettings();
  const retiredSet = new Set(settings.retiredDevices);

  if (isRetired) {
    retiredSet.add(deviceId);
  } else {
    retiredSet.delete(deviceId);
  }

  await saveSettings([...retiredSet], settings.deviceNotes, settings.deviceOwners);
  return [...retiredSet];
}

// Update device notes
async function updateDeviceNotes(deviceId, notes) {
  const settings = await getSettings();

  if (notes && notes.trim()) {
    settings.deviceNotes[deviceId] = notes.trim();
  } else {
    delete settings.deviceNotes[deviceId];
  }

  await saveSettings(settings.retiredDevices, settings.deviceNotes, settings.deviceOwners);
  return settings.deviceNotes;
}

// Update device owner
async function updateDeviceOwner(deviceId, owner) {
  const settings = await getSettings();

  if (owner && owner.trim()) {
    settings.deviceOwners[deviceId] = owner.trim();
  } else {
    delete settings.deviceOwners[deviceId];
  }

  await saveSettings(settings.retiredDevices, settings.deviceNotes, settings.deviceOwners);
  return settings.deviceOwners;
}

module.exports = async function (context, req) {
  const action = context.bindingData.action || "";
  const method = req.method.toUpperCase();

  // Add CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    // GET /api/device-settings - Get all settings
    if (method === "GET" && !action) {
      const settings = await getSettings();
      context.res = {
        status: 200,
        headers,
        body: settings
      };
      return;
    }

    // PUT /api/device-settings/retired - Update retired status
    if (method === "PUT" && action === "retired") {
      const { deviceId, isRetired } = req.body;

      if (!deviceId) {
        context.res = {
          status: 400,
          headers,
          body: { error: "deviceId is required" }
        };
        return;
      }

      const retiredDevices = await updateRetiredDevices(deviceId, isRetired);
      context.res = {
        status: 200,
        headers,
        body: { retiredDevices }
      };
      return;
    }

    // PUT /api/device-settings/notes - Update device notes
    if (method === "PUT" && action === "notes") {
      const { deviceId, notes } = req.body;

      if (!deviceId) {
        context.res = {
          status: 400,
          headers,
          body: { error: "deviceId is required" }
        };
        return;
      }

      const deviceNotes = await updateDeviceNotes(deviceId, notes);
      context.res = {
        status: 200,
        headers,
        body: { deviceNotes }
      };
      return;
    }

    // PUT /api/device-settings/owners - Update device owner
    if (method === "PUT" && action === "owners") {
      const { deviceId, owner } = req.body;

      if (!deviceId) {
        context.res = {
          status: 400,
          headers,
          body: { error: "deviceId is required" }
        };
        return;
      }

      const deviceOwners = await updateDeviceOwner(deviceId, owner);
      context.res = {
        status: 200,
        headers,
        body: { deviceOwners }
      };
      return;
    }

    // POST /api/device-settings - Bulk update (for import)
    if (method === "POST" && !action) {
      const { retiredDevices, deviceNotes } = req.body;
      await saveSettings(retiredDevices || [], deviceNotes || {});
      context.res = {
        status: 200,
        headers,
        body: { success: true }
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
