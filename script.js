// 🔴 GAS WEB APP URL (NEW DEPLOYED URL ONLY)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwhzuzE0DCAhEQEjKhwoJ3K8UL9YpP7MxV3VWz8OQ5uMqS5FDhb1njVEDoUvTq8ZZqq/exec";

let itemMasterList = [];
let vendorMasterList = [];
let selectedVendor = "";
let editMode = false;
let editingPO = "";
let editingRow = null;

const loader = document.getElementById("loader");

function showLoader(){
  loader.classList.remove("hidden");
}

function hideLoader(){
  loader.classList.add("hidden"); 
}
function formatINR(num){
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


// ================= ELEMENTS =================
let paymentTerms = "NA";
const itemsDiv    = document.getElementById("items");

const subTotalEl  = document.getElementById("sub-total");
const gstAmtEl    = document.getElementById("gst-amt");
const totalEl     = document.getElementById("total");

const building = document.getElementById("building");
const street   = document.getElementById("street");
const state    = document.getElementById("state");
const pin      = document.getElementById("pin");
const phone    = document.getElementById("phone");
const gst      = document.getElementById("gst");

const poNumberEl  = document.getElementById("po-number");
const poDateInput = document.getElementById("po-date");
const poDateText  = document.getElementById("po-date-text");

// ================= DATE =================
function setTodayDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();

  poDateInput.value = `${yy}-${mm}-${dd}`;
  poDateText.textContent = `${dd}-${mm}-${yy}`;
}

function openDatePicker() {
  poDateInput.showPicker();
}

function updateDate(v) {
  if (!v) return;
  const [y,m,d] = v.split("-");
  poDateText.textContent = `${d}-${m}-${y}`;
}

// ================= ON LOAD =================
window.onload = async () => {

  showLoader();
  setTodayDate();

  try {

    // 🔥 ONE API CALL
    const res = await fetch(`${SCRIPT_URL}?action=getAllData`);
    const data = await res.json();

    vendorMasterList = data.partyList || [];
    itemMasterList   = data.itemList || [];
    window.poListData = data.poList || []; // cache

    // 🔥 PO NUMBER
    const poRes = await fetch(`${SCRIPT_URL}?action=getPONumber`);
    const poData = await poRes.json();
    poNumberEl.textContent = poData?.po || "PO-001";

    addItem();

  } catch (err) {

    alert("Initial data load failed");
    console.error(err);

  } finally {

    hideLoader();

  }
};

const partySearch = document.getElementById("partySearch");
const vendorSuggestions = document.getElementById("vendorSuggestions");


function clearVendorDetails(){

  selectedVendor = "";
  paymentTerms = "NA";

  building.value = "";
  street.value   = "";
  state.value    = "";
  pin.value      = "";
  phone.value    = "";
  gst.value      = "";

  partySearch.value = "";
}




// ================= ITEMS =================
function addItem() {

  const row = document.createElement("div");
  row.className = "item-row";

  row.innerHTML = `
    <div class="item-container" style="position:relative;">
      <input class="item-name" placeholder="Item name" autocomplete="off">
      <div class="item-suggestions hidden"></div>
      <textarea class="item-note" placeholder="Note" rows="2"></textarea>
    </div>

    <input class="qty" type="number" placeholder="Qty" oninput="calc()">

    <select>
      <option value="PCS">PCS</option>
      <option value="NOS">NOS</option>
      <option value="KG">KG</option>
      <option value="SET">SET</option>
      <option value="NO">NO</option>
      <option value="LTR">LTR</option>
    </select>

    <input class="rate" type="number" placeholder="Rate" oninput="calc()">
    <input class="amount" placeholder="Amount" readonly>

    <button type="button" class="del-btn" onclick="removeItem(this)">✕</button>
  `;

  itemsDiv.appendChild(row);

  const itemInput = row.querySelector(".item-name");
  const suggestionBox = row.querySelector(".item-suggestions");
  const rateInput = row.querySelector(".rate");

  // ================= CLICK → SHOW ALL ITEMS =================
  itemInput.addEventListener("click", (e) => {

    e.stopPropagation();

    if(!selectedVendor){
      alert("Please select vendor first");
      return;
    }

    renderItems("");

  });

  // ================= TYPE → FILTER =================
  itemInput.addEventListener("input", () => {

    const val = itemInput.value.toLowerCase();

    // 🔥 clear rate if not exact match
    const exactItem = itemMasterList.find(i =>
      i.name.toLowerCase() === val &&
      i.vendor.toLowerCase() === selectedVendor.toLowerCase()
    );

    if(!exactItem){
      rateInput.value = "";
      calc();
    }

    if(!val){
      suggestionBox.classList.add("hidden");
      return;
    }

    renderItems(val);

  });

  // ================= COMMON RENDER FUNCTION =================
  function renderItems(searchText){

    suggestionBox.innerHTML = "";

    const filtered = itemMasterList.filter(i =>
      i.vendor.toLowerCase() === selectedVendor.toLowerCase() &&
      (!searchText || i.name.toLowerCase().includes(searchText))
    );

    if(filtered.length === 0){
      suggestionBox.classList.add("hidden");
      return;
    }

    filtered.forEach(item => {

      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = item.name;

      div.addEventListener("click", (e) => {

        e.stopPropagation();

        itemInput.value = item.name;
        suggestionBox.classList.add("hidden");

        rateInput.value = item.rate || "";

        calc();
      });

      suggestionBox.appendChild(div);
    });

    suggestionBox.classList.remove("hidden");
  }
}

function clearItems(){
      document.querySelectorAll(".item-row").forEach(row => {
        row.querySelector(".item-name").value = "";
        row.querySelector(".rate").value = "";
        row.querySelector(".amount").value = "";
      });
      calc();
    }

document.addEventListener("click", (e) => { 

  if (!e.target.closest(".item-container")) {

    document.querySelectorAll(".item-suggestions").forEach(box => {
      box.classList.add("hidden");
    });

  }

});


function removeItem(btn) {
  if (document.querySelectorAll(".item-row").length === 1) return;
  btn.parentElement.remove();
  calc();
}

// ================= CALC =================
function calc() {
  let sub = 0;

  document.querySelectorAll(".item-row").forEach(r => {

    const qty  = Number(r.querySelector(".qty").value || 0);
    const rate = Number(r.querySelector(".rate").value || 0);

    const amt = Math.round((qty * rate) * 100) / 100;   // 🔥 YE LINE MISS THI

    r.querySelector(".amount").value = formatINR(amt);

    sub += amt;
  });

  const gstRate = Number(document.getElementById("gstRate").value);
  const gstVal = sub * gstRate;
  const total  = sub + gstVal;

  subTotalEl.textContent = formatINR(sub);
  gstAmtEl.textContent  = formatINR(gstVal);
  totalEl.textContent   = formatINR(total);
}



// ================= SAVE + PDF =================
async function generatePO(){

  if(vendorLoading){
    alert("Please wait, vendor details loading...");
    return;
  }

  if(!selectedVendor){
    alert("Please select Vendor");
    return;
  }

  const rows = document.querySelectorAll(".item-row");
  if(rows.length === 0){
    alert("Add at least one item");
    return;
  }

  // 🔥 Open tab immediately (popup safe)
  const pdfTab = window.open("", "_blank");

  if(!pdfTab){
    alert("Popup blocked. Please allow popups for this site.");
    return;
  }

  // 🔥 Loader UI inside new tab
  pdfTab.document.write(`
    <html>
      <head>
        <title>Generating PO</title>
        <style>
          body{
            margin:0;
            display:flex;
            align-items:center;
            justify-content:center;
            height:100vh;
            font-family: Inter, Arial, sans-serif;
            background:#f4f6f9;
            flex-direction:column;
          }
          .spinner{
            width:60px;
            height:60px;
            border:6px solid #e0e0e0;
            border-top:6px solid #2f80ed;
            border-radius:50%;
            animation:spin 1s linear infinite;
            margin-bottom:20px;
          }
          @keyframes spin{
            0%{ transform:rotate(0deg); }
            100%{ transform:rotate(360deg); }
          }
          h2{
            font-weight:600;
            color:#333;
          }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Generating PO. Please Wait...</h2>
      </body>
    </html>
  `);

  document.querySelector(".primary-btn").disabled = true;
  showLoader();

  try{


    const payload = {
      row: editMode && editingRow ? Number(editingRow) : "",
      po: editMode ? editingPO : poNumberEl.textContent,  // ✅ FIXED
      party: selectedVendor,
      date: poDateText.textContent,
      vendorName: selectedVendor,
      vendorAddress:
        building.value + "<br>" +
        street.value + "<br>" +
        state.value + " - " + pin.value + "<br>" +
        "Phone : " + phone.value,
      vendorGST: gst.value,
      paymentTerms: paymentTerms,
      subTotal: subTotalEl.textContent,
      gst: gstAmtEl.textContent,
      gstRate: document.getElementById("gstRate").value,
      total: totalEl.textContent,
      commonNote: document.getElementById("commonNote").value,

      items: Array.from(rows).map(r => ({
        name: r.querySelector(".item-name").value.trim(),
        note: r.querySelector(".item-note").value.trim(),
        qty:  r.querySelector(".qty").value,
        unit: r.querySelector("select").value,
        rate: r.querySelector(".rate").value,
        amt:  r.querySelector(".amount").value,
      }))
    };

    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));

    const res = await fetch(SCRIPT_URL,{
      method:"POST",
      body: formData
    });

    const result = await res.json();

    if(!result.success){
      throw new Error(result.error || "Save failed");
    }

    // 🔥 PDF open
    await openPDFWithRetry(result.pdfUrl, pdfTab);

    // 🔥 reset edit mode
    editMode = false;
    editingPO = "";

    // 🔥 reload
    setTimeout(() => {
      if(pdfTab && !pdfTab.closed){
        window.location.reload();
      }
    }, 3000);

    const btn = document.getElementById("saveBtn");
    btn.textContent = "Generate & Save";
    btn.style.background = "";

  }catch(err){

    if(pdfTab && !pdfTab.closed){
      pdfTab.close();
    }

    alert("Error: " + err.message);

  }finally{

    hideLoader();
    document.querySelector(".primary-btn").disabled = false;

  }
}

async function openPDFWithRetry(url, tab){

  let attempts = 0;
  const maxAttempts = 10;

  while(attempts < maxAttempts){

    try{
      const res = await fetch(url, { method: "HEAD" });

      if(res.ok){
        tab.location.href = url;
        return;
      }

    }catch(e){}

    await new Promise(r => setTimeout(r, 800));
    attempts++;
  }

  // fallback (force open)
  tab.location.href = url;
}


function openVendorModal(){
  document.getElementById("vendorModal").classList.remove("hidden");
}

function closeVendorModal(){
  document.getElementById("vendorModal").classList.add("hidden");
}

function showVendorLoader(){
  document.getElementById("vendorLoader").classList.remove("hidden");
}

function hideVendorLoader(){
  document.getElementById("vendorLoader").classList.add("hidden");
}

function saveVendor(){

  const vendor = {
    name: v_name.value,
    person: v_person.value,
    building: v_building.value,
    street: v_street.value,
    state: v_state.value,
    pin: v_pin.value,
    phone: v_phone.value,
    gst: v_gst.value,
    terms: v_terms.value
  };

  showVendorLoader();

  fetch(SCRIPT_URL, {
    method:"POST",
    body: (()=> {
      const f = new FormData();
      f.append("action","addVendor");
      f.append("data",JSON.stringify(vendor));
      return f;
    })()
  })
  .then(r=>r.json())
  .then(res=>{
    if(res.success){
      location.reload();
    }else{
      alert("Failed");
    }
  })
  .catch(err=>{
    alert("Error saving vendor");
    console.error(err);
  })
  .finally(()=>{
    hideVendorLoader();
  });
}


// ================= SMART SEARCH =================

function renderVendorList(arr){

  vendorSuggestions.innerHTML = "";

  if(arr.length === 0){
    vendorSuggestions.classList.add("hidden");
    return;
  }

  arr.forEach(obj => {

    const div = document.createElement("div");
    div.className = "suggestion-item";

    // Show both vendor + person in dropdown
    div.textContent = obj.person 
      ? `${obj.vendor} (${obj.person})`
      : obj.vendor;

    div.onclick = () => {

      // normalize vendor
      selectedVendor = (obj.vendor || "").toString().trim();

      partySearch.value = selectedVendor;

      vendorSuggestions.classList.add("hidden");

      // 🔥 ALWAYS fill from object (no dependency)
      building.value = obj.building || "";
      street.value   = obj.street || "";
      state.value    = obj.state || "";
      pin.value      = obj.pin || "";
      phone.value    = obj.phone || "";
      gst.value      = obj.gst || "";

      paymentTerms = obj.terms || "NA";

      clearItems(); // important

    };

    vendorSuggestions.appendChild(div);
  });

  vendorSuggestions.classList.remove("hidden");
}


// CLICK → SHOW ALL
partySearch.addEventListener("click", (e) => {
  e.stopPropagation();   // 🔥 important
  renderVendorList(vendorMasterList);
});

partySearch.addEventListener("focus", () => {
  renderVendorList(vendorMasterList);
});



// TYPE → SEARCH BOTH
partySearch.addEventListener("input", () => {

  const value = partySearch.value.trim().toLowerCase();

  if(!value){
    clearVendorDetails();
    return;
  }

  const filtered = vendorMasterList.filter(v =>
    (v.vendor && v.vendor.toLowerCase().includes(value)) ||
    (v.person && v.person.toLowerCase().includes(value))
  );

  renderVendorList(filtered);

});

let vendorLoading = false;

function refreshPage(){
  location.reload();
}

let lastSheetState = null;

async function checkSheetUpdate(){
  try{
    const res = await fetch(`${SCRIPT_URL}?action=lastUpdated`);
    const data = await res.json();

    if(lastSheetState === null){
      lastSheetState = data.time;
      return;
    }

    if(data.time !== lastSheetState){
      location.reload();
    }

  }catch(err){
    console.log("Sheet check failed");
  }
}

setInterval(checkSheetUpdate, 15000); // every 15 sec

function showList(btn){
  if(btn) setActiveTab(btn);

  document.querySelectorAll(".form-section").forEach(el=>{
    el.style.display="none";
  });

  document.querySelector(".po-footer").style.display="none";

  document.getElementById("poListSection").classList.remove("hidden");

  loadPOList();
}

function showCreate(btn){
  if(btn) setActiveTab(btn);

  document.querySelectorAll(".form-section").forEach(el=>{
    el.style.display="block";
  });

  document.querySelector(".po-footer").style.display="block";

  document.getElementById("poListSection").classList.add("hidden");
}

function loadPOList(){

  const data = window.poListData || [];

  const body = document.getElementById("poTableBody");
  body.innerHTML = "";

  data.forEach(r => {

    body.innerHTML += `
      <tr>
        <td>${r.po}</td>
        <td>${formatDateDMY(r.date)}</td>
        <td>${r.party}</td>
        <td>₹ ${formatINR(r.total)}</td>
        <td>
          <span class="action-btn" title="View PDF" onclick="viewPDF('${r.po}')">👁️</span>
          <span class="action-btn" onclick="openEdit('${r.po}')">✏️</span>
          <span class="action-btn" onclick="deletePO('${r.po}')">🗑️</span>
        </td>
      </tr>
    `;
  });
}

function viewPDF(po){

  const data = (window.poListData || []).find(p => p.po === po);

  if(!data){
    alert("PO not found");
    return;
  }

  if(!data.pdf){
    alert("PDF not available");
    return;
  }

  window.open(data.pdf, "_blank");
}

async function deletePO(po){

  if(!confirm("Delete PO?")) return;

  const res = await fetch(SCRIPT_URL,{
    method:"POST",
    body:new URLSearchParams({
      action:"deletePO",
      po:po
    })
  });

  const data = await res.json();

  if(!data.success){
    alert("Delete failed");
  }

  loadPOList();
}

let currentPO = "";

async function openEdit(po){

  editMode = true;
  editingPO = po;

  showCreate();
  showLoader();

  try{

    // 🔥 GET FROM CACHE (NO API CALL)
    const data = (window.poListData || []).find(p => p.po === po);

    if(!data){
      alert("PO not found");
      return;
    }

    // 🔥 FIND ROW (important for update)
    const index = (window.poListData || []).findIndex(p => p.po === po);
    editingRow = index >= 0 ? index + 2 : 0; // +2 because header + 0 index

    // ================= BASIC =================
    poNumberEl.textContent = po;
    document.getElementById("commonNote").value = data.note || "";
    document.getElementById("gstRate").value = data.sub 
      ? (data.gst / data.sub) 
      : "0.18";

    // ================= VENDOR =================
    selectedVendor = data.party;
    partySearch.value = data.party;

    // 🔥 vendor details from master list
    const vendorObj = (vendorMasterList || []).find(v => v.vendor === data.party);

    building.value = vendorObj?.building || "";
    street.value   = vendorObj?.street || "";
    state.value    = vendorObj?.state || "";
    pin.value      = vendorObj?.pin || "";
    phone.value    = vendorObj?.phone || "";
    gst.value      = vendorObj?.gst || "";

    paymentTerms = vendorObj?.terms || "NA";

    // ================= ITEMS =================
    document.getElementById("items").innerHTML = "";

    const items = JSON.parse(data.items || "[]");

    items.forEach(it => {

      addItem();

      const rows = document.querySelectorAll(".item-row");
      const last = rows[rows.length - 1];

      last.querySelector(".item-name").value = it.name;
      last.querySelector(".item-note").value = it.note || "";
      last.querySelector(".qty").value  = it.qty;
      last.querySelector(".rate").value = it.rate;

    });

    calc();

  }catch(err){
    alert("Edit load failed");
    console.error(err);
  }finally{
    hideLoader();
  }

  const btn = document.getElementById("saveBtn");
  btn.textContent = "Update";
  btn.style.background = "#22c55e";
}

function closeEdit(){
  const modal = document.getElementById("editModal");
  modal.classList.add("hidden");
  modal.style.display = "none";
}

async function updatePO(){

  const note = document.getElementById("editNote").value;
  const gst  = document.getElementById("editGst").value;

  const items = [];

  document.querySelectorAll("#editItems .item-row").forEach(r => {
    items.push({
      name: r.querySelector(".e-name").value,
      qty: r.querySelector(".e-qty").value,
      rate: r.querySelector(".e-rate").value
    });
  });

  const res = await fetch(SCRIPT_URL,{
    method:"POST",
    body:new URLSearchParams({
      action:"updatePO",
      po:currentPO,
      note:note,
      gst:gst,
      items: JSON.stringify(items)
    })
  });

  const data = await res.json();

  if(!data.success){
    alert("Update failed");
    return;
  }

  closeEdit();
  loadPOList();
}

function renderEditItems(items){

  const box = document.getElementById("editItems");
  box.innerHTML = "";

  items.forEach(i => {

    box.innerHTML += `
      <div class="item-row">
        <input class="e-name" value="${i.name}">
        <input class="e-qty" type="number" value="${i.qty}" oninput="calcEdit()">
        <input class="e-rate" type="number" value="${i.rate}" oninput="calcEdit()">
        <input class="e-amt" readonly>
      </div>
    `;
  });

  calcEdit();
}

function calcEdit(){

  let sub = 0;

  document.querySelectorAll("#editItems .item-row").forEach(r => {

    const qty  = Number(r.querySelector(".e-qty").value || 0);
    const rate = Number(r.querySelector(".e-rate").value || 0);

    const amt = qty * rate;
    r.querySelector(".e-amt").value = formatINR(amt);

    sub += amt;
  });

  const gstRate = Number(document.getElementById("editGst").value);
  const total = sub + (sub * gstRate);

  document.getElementById("editTotal").textContent = formatINR(total);
}

function formatDateDMY(dateStr){

  if(!dateStr) return "";

  // 🔥 ISO format handle (2026-04-02T18:30:00.000Z)
  if(dateStr.includes("T")){
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  // 🔥 YYYY-MM-DD
  if(dateStr.includes("-")){
    const parts = dateStr.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // 🔥 fallback
  return dateStr;
}

function setActiveTab(btn){
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
}
