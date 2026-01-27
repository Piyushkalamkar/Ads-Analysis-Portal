/* ================= GLOBAL ================= */

let masterData = [];
let normalizedData = [];
let metricChart = null;

const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const statusEl = document.getElementById("status");
const out = document.getElementById("output");

const groupSelect = document.getElementById("groupSelect");
const assetInput = document.getElementById("assetInput");
const assetList = document.getElementById("assetList");
const imprFilter = document.getElementById("imprFilter");
const campaignSelect = document.getElementById("campaignSelect");

imprFilter.addEventListener("change", applyFilters);
/* ================= FILE UPLOAD ================= */

fileInput.addEventListener("change", async (e) => {
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
    },
  });
});

/* ================= HELPERS ================= */

function removeTopLines(text) {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.toLowerCase().startsWith("campaign,"));
  return idx >= 0 ? lines.slice(idx).join("\n") : text;
}

function getCol(row, name) {
  for (let k in row) {
    if (
      k
        .toLowerCase()
        .replace(/\s/g, "")
        .includes(name.toLowerCase().replace(/\s/g, ""))
    ) {
      return row[k];
    }
  }
  return "";
}

function filterByLastDayImpr(data) {
  const assetMap = new Map();

  // group by asset
  data.forEach((r) => {
    if (!assetMap.has(r.assetName)) assetMap.set(r.assetName, []);
    assetMap.get(r.assetName).push(r);
  });

  let finalData = [];

  assetMap.forEach((rowsForAsset) => {
    const days = [...new Set(rowsForAsset.map((r) => r.day))].sort();

    const lastDay = days[days.length - 1];

    const lastRec = rowsForAsset.find((x) => x.day === lastDay);

    if (!lastRec) return;

    const impr = getLastDayImpr(rowsForAsset);

    // keep only >=1000
    if (impr >= 1000) {
      finalData.push(...rowsForAsset);
    }
  });

  return finalData;
}

function getLastDayImpr(rows) {
  const days = [...new Set(rows.map((r) => r.day))].sort();

  const lastDay = days[days.length - 1];

  const lastRec = rows.find((x) => x.day === lastDay);

  if (!lastRec) return 0;

  return parseInt(String(lastRec["Impr."]).replace(/,/g, "")) || 0;
}

/* ================= BUILD PORTAL ================= */

function buildPortal(rows) {
  // Normalize once
  normalizedData = rows
    .map((r) => {
      const raw = getCol(r, "App asset");
      const p = raw.split(";");

      return {
        campaign: getCol(r, "Campaign"),
        adgroup: getCol(r, "Ad group"),

        assetName: (p[0] || "").trim(),
        assetLink: (p[1] || "").trim(),

        day: getCol(r, "Day"),

        "Impr.": getCol(r, "Impr"),
        CTR: getCol(r, "CTR"),
        "Avg.CPC": getCol(r, "Avg.CPC"),
        "Cost/conv.": getCol(r, "Cost / conv"),
        "Cost/Install": getCol(r, "Cost/Install"),
        "Cost/In-app action": getCol(r, "Cost/In-app"),
        Installs: getCol(r, "Installs"),
        "Conv.value/cost": getCol(r, "Conv.value"),
        Cost: getExactCol(r, "Cost"),
      };
    })
    .filter((r) => r.assetName && r.day);

  /* Populate Campaign dropdown */
  const campaigns = [...new Set(normalizedData.map((d) => d.campaign))];
  populateCampaigns(campaigns);

  function populateCampaigns(list) {
    campaignSelect.innerHTML = '<option value="">All Campaigns</option>';

    list.forEach((c) => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      campaignSelect.appendChild(o);
    });
  }

  if (!normalizedData.length) {
    statusEl.textContent = "No valid data found";
    return;
  }

  statusEl.textContent = "Data loaded";

  /* Campaign heading */
  document.getElementById("campaignHeading").textContent = "All Campaigns";

  /* Populate Ad Group dropdown */
  const groups = [...new Set(normalizedData.map((d) => d.adgroup))];
  populateGroups(groups);

  /* Populate App Assets */
  const assets = [...new Set(normalizedData.map((d) => d.assetName))];
  populateAssetList(assets);

  /* Default render */
  applyFilters();
}

/* ================= DROPDOWNS ================= */

function populateGroups(groups) {
  groupSelect.innerHTML = '<option value="">All Ad Groups</option>';

  groups.forEach((g) => {
    const o = document.createElement("option");
    o.value = g;
    o.textContent = g;
    groupSelect.appendChild(o);
  });
}

function updateGroupsByCampaign(data) {
  const groups = [...new Set(data.map((d) => d.adgroup))];

  populateGroups(groups);
}

function populateAssetList(list) {
  assetList.innerHTML = "";
  list.forEach((a) => {
    const opt = document.createElement("option");
    opt.value = a;
    assetList.appendChild(opt);
  });
}

/* ================= FILTER EVENTS ================= */

groupSelect.addEventListener("change", () => {
  // Reset asset search when group changes
  assetInput.value = "";

  // Apply filter for new group
  applyFilters();
});

campaignSelect.addEventListener("change", () => {
  // Reset lower filters
  groupSelect.value = "";
  assetInput.value = "";

  // Update heading dynamically
  const selectedCampaign = campaignSelect.value;

  document.getElementById("campaignHeading").textContent =
    selectedCampaign || "All Campaigns";

  applyFilters();
});

assetInput.addEventListener("input", applyFilters);

/* ================= APPLY FILTER ================= */

function applyFilters() {
  const c = campaignSelect.value;
  const g = groupSelect.value;
  const a = assetInput.value.toLowerCase();
  const imprChecked = imprFilter.checked;

  let filtered = normalizedData;

  /* Campaign */
  if (c) filtered = filtered.filter((x) => x.campaign === c);

  /* Update groups by campaign */
  updateGroupsByCampaign(filtered);

  /* Group */
  if (g) filtered = filtered.filter((x) => x.adgroup === g);

  /* Asset */
  if (a)
    filtered = filtered.filter((x) => x.assetName.toLowerCase().includes(a));

  /* Impression filter */
  if (imprChecked) {
    filtered = filterByLastDayImpr(filtered);
  }

  updateAssetListByGroup(filtered);
  renderTables(filtered);
}

/* ================= RENDER TABLE ================= */

function renderTables(data) {
  /* Group by App Asset */
  const assetMap = new Map();

  data.forEach((r) => {
    if (!assetMap.has(r.assetName)) assetMap.set(r.assetName, []);
    assetMap.get(r.assetName).push(r);
  });

  /* SORT BY LAST DATE IMPRESSION (GLOBAL) */
  const sortedAssets = [...assetMap.entries()].sort((a, b) => {
    const imprA = getLastDayImpr(a[1]);
    const imprB = getLastDayImpr(b[1]);

    return imprB - imprA; // DESC
  });

  out.innerHTML = "";

  sortedAssets.forEach(([asset, rowsForAsset]) => {
    const days = [...new Set(rowsForAsset.map((r) => r.day))].sort();

    const table = document.createElement("table");

    /* HEADER */
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    const link = rowsForAsset[0].assetLink;

    th.innerHTML = `
      <a href="${link}" target="_blank"
      style="color:#2563eb;font-weight:600">
      ${asset}
      </a>
    `;
    tr.appendChild(th);

    days.forEach((d) => {
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
      "Cost",
    ];

    const tbody = document.createElement("tbody");

    metrics.forEach((m) => {
      const trm = document.createElement("tr");
      const tdn = document.createElement("td");
      tdn.textContent = m;
      trm.appendChild(tdn);

      days.forEach((d, idx) => {
        const rec = rowsForAsset.find((x) => x.day === d);

        const td = document.createElement("td");

        if (!rec) {
          td.textContent = "";
          trm.appendChild(td);
          return;
        }

        td.textContent = rec[m];
        td.style.cursor = "pointer";

        td.addEventListener("click", () => {
          showLineGraph(asset, m, rowsForAsset);
        });

        /* COLOR LOGIC */
        if (idx > 0) {
          const prevDay = days[idx - 1];
          const prevRec = rowsForAsset.find((x) => x.day === prevDay);

          if (prevRec) {
            const cur = parseFloat(String(rec[m]).replace(/[₹,%]/g, ""));
            const prev = parseFloat(String(prevRec[m]).replace(/[₹,%]/g, ""));

            if (!isNaN(cur) && !isNaN(prev)) {
              // CTR
              if (m === "CTR") {
                if (cur > prev) td.style.color = "green";
                if (cur < prev) td.style.color = "red";
              }

              // CPC & CPI
              if (m === "Avg.CPC" || m === "Cost/Install") {
                if (cur > prev) td.style.color = "red";
                if (cur <= prev) td.style.color = "green";
              }

              td.style.fontWeight = "600";
            }
          }
        }

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

function updateAssetListByGroup(data) {
  const assets = [...new Set(data.map((d) => d.assetName))];

  assetList.innerHTML = "";

  assets.forEach((a) => {
    const opt = document.createElement("option");
    opt.value = a;
    assetList.appendChild(opt);
  });
}

function getExactCol(row, exactName) {
  for (let k in row) {
    if (k.trim().toLowerCase() === exactName.trim().toLowerCase()) {
      return row[k];
    }
  }
  return "";
}

/* ================= GRAPH MODAL ================= */

function showLineGraph(assetName, metric, rowsForAsset) {
  const days = [...new Set(rowsForAsset.map((r) => r.day))].sort();

  const values = days.map((d) => {
    const rec = rowsForAsset.find((x) => x.day === d);
    return rec
      ? parseFloat(String(rec[metric]).replace(/[₹,%]/g, ""))
      : null;
  });

  // SHOW MODAL
  const modal = document.getElementById("graphModal");
  modal.style.display = "block";

  // IMPORTANT: correct canvas ID
  const canvas = document.getElementById("chartCanvas");
  const ctx = canvas.getContext("2d");

  // Destroy previous chart
  if (metricChart) {
    metricChart.destroy();
  }

  metricChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: days,
      datasets: [
        {
          label: `${assetName} – ${metric}`,
          data: values,
          borderWidth: 3,
          tension: 0.3,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

/* ================= CLOSE MODAL ================= */

document.getElementById("closeGraph").addEventListener("click", () => {
  document.getElementById("graphModal").style.display = "none";
});

window.addEventListener("click", (e) => {
  const modal = document.getElementById("graphModal");
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

