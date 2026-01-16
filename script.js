/* ================= GLOBAL ================= */

let masterData = [];
let normalizedData = [];

const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const statusEl = document.getElementById("status");
const out = document.getElementById("output");

const groupSelect = document.getElementById("groupSelect");
const assetInput = document.getElementById("assetInput");
const assetList = document.getElementById("assetList");

/* ================= FILE UPLOAD ================= */

fileInput.addEventListener("change", async e => {

  const file = e.target.files[0];
  if (!file) return;

  fileName.textContent = file.name;

  const text = await file.text();
  const cleanCSV = removeTopLines(text);

  Papa.parse(cleanCSV, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      masterData = res.data;
      buildPortal(masterData);
    }
  });
});

/* ================= HELPERS ================= */

function removeTopLines(text) {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex(l =>
    l.toLowerCase().startsWith("campaign,")
  );
  return idx >= 0 ? lines.slice(idx).join("\n") : text;
}

function getCol(row, name) {
  for (let k in row) {
    if (
      k.toLowerCase().replace(/\s/g, "")
      .includes(name.toLowerCase().replace(/\s/g, ""))
    ) {
      return row[k];
    }
  }
  return "";
}

/* ================= BUILD PORTAL ================= */

function buildPortal(rows) {

  // Normalize once
  normalizedData = rows.map(r => {

    const raw = getCol(r, "App asset");
    const p = raw.split(";");

    return {
      campaign: getCol(r, "Campaign"),
      adgroup: getCol(r, "Ad group"),

      assetName: (p[0] || "").trim(),
      assetLink: (p[1] || "").trim(),

      day: getCol(r, "Day"),

      "Impr.": getCol(r, "Impr"),
      "CTR": getCol(r, "CTR"),
      "Avg.CPC": getCol(r, "Avg.CPC"),
      "Cost/conv.": getCol(r, "Cost / conv"),
      "Cost/Install": getCol(r, "Cost/Install"),
      "Cost/In-app action": getCol(r, "Cost/In-app"),
      "Installs": getCol(r, "Installs"),
      "Conv.value/cost": getCol(r, "Conv.value"),
      "Cost": getCol(r, "Cost")
    };

  }).filter(r => r.assetName && r.day);

  if (!normalizedData.length) {
    statusEl.textContent = "No valid data found";
    return;
  }

  statusEl.textContent = "Data loaded";

  /* Campaign heading */
  document.getElementById("campaignHeading").textContent =
    normalizedData[0].campaign || "";

  /* Populate Ad Group dropdown */
  const groups = [...new Set(normalizedData.map(d => d.adgroup))];
  populateGroups(groups);

  /* Populate App Assets */
  const assets = [...new Set(normalizedData.map(d => d.assetName))];
  populateAssetList(assets);

  /* Default render */
  applyFilters();
}

/* ================= DROPDOWNS ================= */

function populateGroups(groups) {
  groupSelect.innerHTML =
    '<option value="">All Ad Groups</option>';

  groups.forEach(g => {
    const o = document.createElement("option");
    o.value = g;
    o.textContent = g;
    groupSelect.appendChild(o);
  });
}

function populateAssetList(list) {
  assetList.innerHTML = "";
  list.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a;
    assetList.appendChild(opt);
  });
}

/* ================= FILTER EVENTS ================= */

groupSelect.addEventListener("change", applyFilters);
assetInput.addEventListener("input", applyFilters);

/* ================= APPLY FILTER ================= */

function applyFilters() {

  const g = groupSelect.value;
  const a = assetInput.value.toLowerCase();

  let filtered = normalizedData;

  if (g)
    filtered = filtered.filter(x =>
      x.adgroup === g
    );

  if (a)
    filtered = filtered.filter(x =>
      x.assetName.toLowerCase().includes(a)
    );

  renderTables(filtered);
}

/* ================= RENDER TABLE ================= */

function renderTables(data) {

  const assetMap = new Map();

  data.forEach(r => {
    if (!assetMap.has(r.assetName))
      assetMap.set(r.assetName, []);
    assetMap.get(r.assetName).push(r);
  });

  out.innerHTML = "";

  assetMap.forEach((rowsForAsset, asset) => {

    const days = [
      ...new Set(rowsForAsset.map(r => r.day))
    ].sort();

    const table = document.createElement("table");

    /* HEADER */
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    const link = rowsForAsset[0].assetLink;

    th.innerHTML = `
      <a href="${link}" target="_blank"
      style="color:#2563eb;font-weight:600;text-decoration:none">
      ${asset}
      </a>
    `;
    tr.appendChild(th);

    days.forEach(d => {
      const th2 = document.createElement("th");
      th2.textContent = d;
      tr.appendChild(th2);
    });

    thead.appendChild(tr);
    table.appendChild(thead);

    /* BODY */
    const metrics = [
      "Impr.",
      "CTR",
      "Avg.CPC",
      "Cost/conv.",
      "Cost/Install",
      "Cost/In-app action",
      "Installs",
      "Conv.value/cost",
      "Cost"
    ];

    const tbody = document.createElement("tbody");

    metrics.forEach(m => {

      const trm = document.createElement("tr");
      const tdn = document.createElement("td");
      tdn.textContent = m;
      trm.appendChild(tdn);

      days.forEach(d => {
        const rec =
          rowsForAsset.find(x => x.day === d);

        const td = document.createElement("td");
        td.textContent = rec ? rec[m] : "";
        trm.appendChild(td);
      });

      tbody.appendChild(trm);
    });

    table.appendChild(tbody);
    out.appendChild(table);
  });
}

const clearBtn = document.getElementById("clearFilters");

clearBtn.addEventListener("click", () => {

  // Reset dropdown
  groupSelect.value = "";

  // Reset asset search
  assetInput.value = "";

  // Show all data again
  renderTables(normalizedData);

});
