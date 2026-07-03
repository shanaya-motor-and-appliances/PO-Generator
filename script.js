// 🔴 GAS WEB APP URL (NEW DEPLOYED URL ONLY)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwhzuzE0DCAhEQEjKhwoJ3K8UL9YpP7MxV3VWz8OQ5uMqS5FDhb1njVEDoUvTq8ZZqq/exec";

let itemMasterList = [];
let vendorMasterList = [];
let selectedVendor = "";
let editMode = false;
let editingPO = "";
let currentVendorProfile = null;
let vendorEditMode = false;

const loader = document.getElementById("loader");

const loaderText = document.getElementById("loaderText");

function setLoaderText(text){
  if(loaderText){
    loaderText.textContent = text;
  }
}

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
    window.receivingListData =data.receivingList || [];
    window.historyListData = data.historyList || [];

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

    /* RESTORE PAGE */

    const activePage =
        sessionStorage.getItem("activePage");

    if(activePage === "receiving"){

        const btn = document.querySelector(
            '.nav-item[onclick*="showReceiving"]'
        );

        showReceiving(btn);

    }else if(activePage === "records"){

        const btn = document.querySelector(
            '.nav-item[onclick*="showList"]'
        );

        showList(btn);
    }else if(activePage === "settings"){

        const btn = document.querySelector(
            '.nav-item[onclick*="showSettings"]'
        );

        showSettings(btn);
    }

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
      <option value="MTR">MTR</option>
      <option value="PKT">PKT</option>
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
        row.querySelector(".item-note").value = item.note || "";

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

  // ITEM DROPDOWN
  if (!e.target.closest(".item-container")) {
    document.querySelectorAll(".item-suggestions").forEach(box => {
      box.classList.add("hidden");
    });
  }

  // VENDOR DROPDOWN
  if (!e.target.closest(".search-box-container")) {
    vendorSuggestions.classList.add("hidden");
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

  if(!selectedVendor){
    alert("Please select Vendor");
    return;
  }

  const rows = document.querySelectorAll(".item-row");
  if(rows.length === 0){
    alert("Add at least one item");
    return;
  }

  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  setLoaderText("Generating PO...");
  showLoader();

  try{


    const payload = {
      row: "",
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

    // 🔥 UPDATE LOCAL CACHE
    window.poListData.unshift({
      po: payload.po,
      date: payload.date,
      party: payload.party,
      total: payload.total,
      note: payload.commonNote,
      items: JSON.stringify(payload.items),
      pdf: result.pdfUrl,
      status: "ACTIVE"
    });

    // 🔥 REFRESH RECORD TABLE
    renderPOList(window.poListData);

    // 🔥 OPEN INSIDE APP
    openPDFModal(
      result.pdfUrl,
      payload.po,
      true
    );

    // 🔥 reset edit mode
    editMode = false;
    editingPO = "";

    const btn = document.getElementById("saveBtn");
    btn.textContent = "Generate & Save";
    btn.style.background = "";

  }catch(err){

    alert("Error: " + err.message);

  }finally{

    hideLoader();
    const btn = document.getElementById("saveBtn");
    btn.disabled = false;
  }
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
    terms: v_terms.value,

    oldVendor:
        currentVendorProfile?.vendor || ""
  };

  if(!v_name.value.trim()){
   alert("Vendor name required");
   return;
 }

  setVendorLoaderText("Saving Vendor...");
  showVendorLoader();



  fetch(SCRIPT_URL, {
    method:"POST",
    body: (()=> {
      const f = new FormData();
      f.append("action", vendorEditMode ? "updateVendor" : "addVendor");
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

function refreshPage(){

  setLoaderText("Syncing Data...");
  showLoader();

  location.reload();
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

let lastSheetState = null;

async function checkSheetUpdate(){
  try{
    const res = await fetch(`${SCRIPT_URL}?action=lastUpdated`);
    const data = await res.json();

    if(lastSheetState === null){
      lastSheetState = data.time;
      return;
    }

    if(
      data.time !== lastSheetState &&
      !document.getElementById("pdfModal")
        .classList.contains("hidden")
    ){
      return;
    }

    if(
      data.time !== lastSheetState &&
      sessionStorage.getItem("activePage") !== "create"
    ){
      location.reload();
    }

  }catch(err){
    console.log("Sheet check failed");
  }
}

setInterval(checkSheetUpdate, 15000); // every 15 sec

function showList(btn){

  sessionStorage.setItem(
      "activePage",
      "records"
  );

  if(btn) setActiveTab(btn);

  document.getElementById("createSection")
    .classList.add("hidden");

  document.getElementById("poListSection")
    .classList.remove("hidden");

  document.getElementById("receivingSection")
    .classList.add("hidden");

  document.getElementById("settingsSection")
    .classList.add("hidden");

  loadPOList();
}

function showCreate(btn){

  sessionStorage.setItem(
      "activePage",
      "create"
  );

  if(btn) setActiveTab(btn);

  document.getElementById("createSection")
    .classList.remove("hidden");

  document.getElementById("poListSection")
    .classList.add("hidden");

  document.getElementById("receivingSection")
    .classList.add("hidden");

  document.getElementById("settingsSection")
    .classList.add("hidden");
}

function loadPOList(){
    renderPOList(window.poListData || []);
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

  if(data.status === "CANCELLED"){

    alert("PO not available due to cancelled");
    return;
  }

  openPDFModal( data.pdf, po, false);
}



function openPDFModal(url, title = "PDF Viewer", shouldReload = false){

  const modal =
    document.getElementById("pdfModal");

  const frame =
    document.getElementById("pdfFrame");

  const downloadBtn =
    document.getElementById("pdfDownloadBtn");

  const titleEl =
    document.getElementById("pdfTitle");

  const fileIdMatch =
    url.match(/\/d\/(.*?)\//);

  if(!fileIdMatch){

    alert("Invalid PDF URL");
    return;
  }

  const fileId = fileIdMatch[1];

  // PDF Preview
  frame.src =
    `https://drive.google.com/file/d/${fileId}/preview`;

  // Direct Download
  const downloadUrl =
    `https://drive.google.com/uc?export=download&id=${fileId}`;

  downloadBtn.href = downloadUrl;

  // Suggested file name
  downloadBtn.setAttribute(
    "download",
    `${title}.pdf`
  );

  titleEl.textContent = title;

  window.shouldReloadAfterPDFClose =
  shouldReload;

  modal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  lucide.createIcons();
}

function closePDFModal(){

  document.getElementById("pdfModal")
    .classList.add("hidden");

  document.getElementById("pdfFrame")
    .src = "";

  document.body.style.overflow = "";

  // 🔥 RELOAD ONLY AFTER NEW PO
  if(window.shouldReloadAfterPDFClose){

    window.shouldReloadAfterPDFClose = false;

    location.reload();
  }
}


async function cancelPO(po){

  const confirmCancel =
    confirm(
      "Cancel this PO?"
    );

  if(!confirmCancel) return;

  setLoaderText("Cancelling PO...");
  showLoader();

  try{

    const res = await fetch(
      SCRIPT_URL,
      {
        method:"POST",

        body:new URLSearchParams({
          action:"cancelPO",
          po:po
        })
      }
    );

    const data =
      await res.json();

    if(!data.success){

      alert("Cancel failed");
      return;
    }

    // UPDATE CACHE
    const poObj =
      (window.poListData || [])
      .find(p => p.po === po);

    if(poObj){
      poObj.status = "CANCELLED";
    }

    renderPOList(
      window.poListData || []
    );

  }catch(err){

    console.error(err);

    alert("Error cancelling PO");

  }finally{

    hideLoader();
  }
}

async function openEdit(po){

  const data =
    (window.poListData || [])
    .find(p => p.po === po);

  if(data?.status === "CANCELLED"){

    alert("Cancelled PO cannot be edited");
    return;
  }

  editMode = true;
  editingPO = po;

  showCreate(
    document.getElementById("nav-create")
  );
  setLoaderText("Opening PO...");
  showLoader();

  try{

    // 🔥 GET FROM CACHE (NO API CALL)
    const data = (window.poListData || []).find(p => p.po === po);

    if(!data){
      alert("PO not found");
      return;
    }

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
      last.querySelector("select").value = it.unit || "PCS";

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

function formatDateDMY(dateStr){

    if(!dateStr) return "";

    // 🔥 DATE OBJECT HANDLE
    if(dateStr instanceof Date){

        const dd = String(dateStr.getDate())
            .padStart(2,"0");

        const mm = String(dateStr.getMonth()+1)
            .padStart(2,"0");

        const yy = dateStr.getFullYear();

        return `${dd}/${mm}/${yy}`;
    }

    // 🔥 convert to string safely
    dateStr = dateStr.toString();

    // ISO
    if(dateStr.includes("T")){

        const d = new Date(dateStr);

        const dd = String(d.getDate())
            .padStart(2,"0");

        const mm = String(d.getMonth()+1)
            .padStart(2,"0");

        const yy = d.getFullYear();

        return `${dd}/${mm}/${yy}`;
    }

    // YYYY-MM-DD
    if(dateStr.includes("-")){

        const parts = dateStr.split("-");

        if(parts.length === 3){
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }

    return dateStr;
}

function setActiveTab(btn){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
}

function filterPOList(){

  const value = document.getElementById("poSearch").value.toLowerCase();

  const data = window.poListData || [];

  const filtered = data.filter(r =>
    (r.po && r.po.toLowerCase().includes(value)) ||
    (r.party && r.party.toLowerCase().includes(value))
  );

  renderPOList(filtered);
}

let clockStarted = false;

function startClock() {

    if(clockStarted) return;
    clockStarted = true;

    setInterval(() => {
        const now = new Date();
        const clock = document.getElementById('live-clock');

        if(clock){
            clock.textContent =
              now.toLocaleTimeString('en-IN', { hour12: true });
        }
    }, 1000);
}

// Refined PO List Rendering
function renderPOList(data) {

    const body = document.getElementById("poTableBody");

    body.innerHTML = data.map(r => `
        <tr class="${
          r.status === 'CANCELLED'
          ? 'cancelled-row'
          : ''
        }">
            <td><span class="po-tag">${r.po}</span></td>
            <td>${formatDateDMY(r.date)}</td>
            <td class="vendor-cell">

            <div class="vendor-wrap">

              <strong>${r.party}</strong>

            </div>

          </td>
            <td class="amount-cell">₹ ${formatINR(r.total)}</td>
            <td class="text-right">
                <div class="action-group">

                  <button
                    class="icon-btn view"
                    onclick="viewPDF('${r.po}')"
                    title="View PDF"
                  >
                    <i data-lucide="external-link"></i>
                  </button>

                  ${
                    r.status === "CANCELLED"
                    ?

                    `
                      <div class="cancelled-text">
                          Cancelled
                      </div>
                    `

                    :

                    `
                      <button
                        class="icon-btn edit"
                        onclick="openEdit('${r.po}')"
                        title="Edit"
                      >
                        <i data-lucide="edit-3"></i>
                      </button>

                      <button
                        class="icon-btn delete"
                        onclick="cancelPO('${r.po}')"
                        title="Cancel PO"
                      >
                        <i data-lucide="ban"></i>
                      </button>
                    `
                  }

                </div>
            </td>
        </tr>
    `).join("");

    lucide.createIcons();
    startClock();
}

let receivingData = [];
let currentReceiving = null;

function showReceiving(btn){

  sessionStorage.setItem(
      "activePage",
      "receiving"
  );

    if(btn) setActiveTab(btn);

    document.getElementById("createSection")
        .classList.add("hidden");

    document.getElementById("poListSection")
        .classList.add("hidden");

    document.getElementById("receivingSection")
        .classList.remove("hidden");

    document.getElementById("settingsSection")
        .classList.add("hidden");

    loadReceivingList();
    switchReceivingTab("pending");
}

function loadReceivingList(){

    receivingData =
        window.receivingListData || [];

    renderReceivingTable();
}

function handleReceivingSearch(){

    if(activeReceivingTab === "pending"){

        filterReceivingTable();

    }else{

        filterHistoryTable();
    }
}

function filterReceivingTable(){

    const value =
        document.getElementById("receivingSearch")
        .value
        .toLowerCase()
        .trim();

    const rows =
        document.querySelectorAll(
            "#receivingTableBody tr"
        );

    rows.forEach(row => {

        const text =
            row.innerText.toLowerCase();

        row.style.display =
            text.includes(value)
            ? ""
            : "none";
    });
}

function renderReceivingTable(){

    const body = document.getElementById(
        "receivingTableBody"
    );

    let html = "";

    (window.poListData || [])
    .filter(po => po.status !== "CANCELLED")
    .forEach(po => {

        let items = [];

        try{

            items = JSON.parse(po.items || "[]");

        }catch(err){

            console.log(
                "Invalid JSON for PO:",
                po.po
            );

            return;
        }

    items.forEach((item,index) => {

            const totalReceived =
                receivingData
                .filter(r =>
                    r.po == po.po &&
                    r.item == item.name
                )
                .reduce((sum,r)=>
                    sum + Number(r.receivedQty),
                0);

            const pending =
                Number(item.qty) - totalReceived;

            const excess =
                totalReceived - Number(item.qty);

            const pendingFormatted =
                formatQty(pending);

            const excessFormatted =
                formatQty(excess);

            const receivedFormatted =
                formatQty(totalReceived);

            const poQtyFormatted =
                formatQty(item.qty);

            const lastInvoice =
                formatDateDMY(
                    receivingData
                    .filter(r =>
                        r.po == po.po &&
                        r.item == item.name
                    )
                    .slice(-1)[0]?.invoiceDate
                ) || "-";

                        html += `
                            <tr>

                    <td>${po.po}</td>
                    <td>${po.party}</td>
                    <td>${formatDateDMY(po.date)}</td>
                    <td>${item.name}</td>

                    <td>${poQtyFormatted}</td>

                    <td>${receivedFormatted}</td>

                    <td>
                        ${
                            excess > 0
                            ?
                            `<span class="excess-badge">
                                ${excessFormatted}
                            </span>`

                            :

                            pending <= 0

                            ?

                            `<span class="completed-badge">
                                Completed
                            </span>`

                            :

                            `<span class="pending-badge">
                                ${pendingFormatted}
                            </span>`
                        }
                    </td>

                    <td>

                        <button
                            class="receive-btn"
                            onclick='openReceivingModal(${JSON.stringify({
                                po: po.po,
                                vendor: po.party,
                                poDate: po.date,
                                item: item.name,
                                poQty: item.qty,
                                received: totalReceived,
                                pending: pending
                            })})'
                        >
                            <i data-lucide="package-check"></i>
                        </button>

                    </td>

                </tr>
            `;
        });
    });

    body.innerHTML = html;
    lucide.createIcons();
}

function openReceivingModal(data){

    currentReceiving = data;

    document.getElementById("receivingModal")
        .classList.remove("hidden");

    document.getElementById("r_po").value =
        data.po;

    document.getElementById("r_item").value =
        data.item;

    document.getElementById("r_poqty").value =
        data.poQty;

    document.getElementById("r_received").value =
        data.received;

    document.getElementById("r_pending").value =
        data.pending;

    document.getElementById("r_newqty").value = "";

    document.getElementById("r_invoice").value = "";

    document.getElementById("r_invoice_number").value = "";
}

function closeReceivingModal(){

    document.getElementById("receivingModal")
        .classList.add("hidden");
}

async function saveReceiving(){

    const qty = Number(
        document.getElementById("r_newqty").value
    );

    const invoiceNumber =
        document.getElementById("r_invoice_number")
        .value
        .trim();

    const invoiceDate =
        document.getElementById("r_invoice").value;

    if(!qty || qty <= 0){
        alert("Enter valid quantity");
        return;
    }

    if(!invoiceNumber){
        alert("Enter invoice number");
        return;
    }

    if(!invoiceDate){
        alert("Select invoice date");
        return;
    }
    setLoaderText(
        "Saving Receiving Entry..."
    );

    showLoader();

    const saveBtn = document.querySelector(
        "#receivingModal .btn-save"
    );

    if(saveBtn){
        saveBtn.disabled = true;
    }

    try{

      const payload = {
          po: currentReceiving.po,
          vendor: currentReceiving.vendor,
          poDate: currentReceiving.poDate,
          item: currentReceiving.item,
          poQty: currentReceiving.poQty,
          receivedQty: qty,
          totalReceived: currentReceiving.received,
          invoiceNumber: invoiceNumber,
          invoiceDate: invoiceDate
      };

        const formData = new FormData();

        formData.append(
            "action",
            "saveReceiving"
        );

        formData.append(
            "data",
            JSON.stringify(payload)
        );

        const res = await fetch(SCRIPT_URL,{
            method:"POST",
            body:formData
        });

        const result = await res.json();

        if(!result.success){
            throw new Error(result.error);
        }

        closeReceivingModal();

        /* STAY ON RECEIVING PAGE */
        sessionStorage.setItem(
            "activePage",
            "receiving"
        );

        /* RELOAD */
        location.reload();

    }catch(err){

        alert(err.message);

    }finally{

      if(saveBtn){
          saveBtn.disabled = false;
      }
        hideLoader();
    }
}


const vendorLoaderText =
document.getElementById("vendorLoaderText");

function setVendorLoaderText(text){

    if(vendorLoaderText){
        vendorLoaderText.textContent = text;
    }
}

function formatQty(num){

    num = Number(num || 0);

    // round figure
    if(Number.isInteger(num)){
        return num.toString();
    }

    // decimal
    return num.toFixed(2);
}

function showSettings(btn){

    sessionStorage.setItem(
        "activePage",
        "settings"
    );

    if(btn) setActiveTab(btn);

    document.getElementById("createSection")
        .classList.add("hidden");

    document.getElementById("poListSection")
        .classList.add("hidden");

    document.getElementById("receivingSection")
        .classList.add("hidden");

    document.getElementById("settingsSection")
        .classList.remove("hidden");

    renderVendorSettings(
        vendorMasterList || []
    );
}

function renderVendorSettings(data){

    const body =
        document.getElementById(
            "vendorSettingsBody"
        );

    body.innerHTML = data.map(v => `
        <tr>
            <td>
                <button
                    class="vendor-open-btn"
                    onclick='openVendorProfile(${JSON.stringify(v)})'
                >
                    ${v.vendor || "-"}
                </button>
            </td>

            <td>${v.person || "-"}</td>

            <td>${v.phone || "-"}</td>

            <td>${v.gst || "-"}</td>

            <td>${v.state || "-"}</td>
        </tr>
    `).join("");

    lucide.createIcons();
}

function filterVendorSettings(){

    const value =
        document
        .getElementById(
            "vendorSettingsSearch"
        )
        .value
        .toLowerCase();

    const filtered =
        (vendorMasterList || []).filter(v =>

            (v.vendor || "")
            .toLowerCase()
            .includes(value)

            ||

            (v.person || "")
            .toLowerCase()
            .includes(value)
        );

    renderVendorSettings(filtered);
}

function openVendorProfile(vendor){

  currentVendorProfile = vendor;

    const modal =
        document.getElementById(
            "vendorProfileModal"
        );

    // HEADER
    document.getElementById(
        "vendorProfileName"
    ).textContent =
        vendor.vendor || "-";

    document.getElementById(
        "vendorAvatar"
    ).textContent =
        (vendor.vendor || "V")
        .charAt(0)
        .toUpperCase();

    // DETAILS
    document.getElementById(
        "vp_address"
    ).textContent =
        `${vendor.building || ""},
         ${vendor.street || ""},
         ${vendor.state || "-"} - ${vendor.pin || "-"}`;

    document.getElementById(
        "vp_person"
    ).textContent =
        vendor.person || "-";

    document.getElementById(
        "vp_phone"
    ).textContent =
        vendor.phone || "-";

    document.getElementById(
        "vp_gst"
    ).textContent =
        vendor.gst || "-";

    document.getElementById(
        "vp_terms"
    ).textContent =
        vendor.terms || "-";

    // MATERIALS
    const materialsWrap =
        document.getElementById(
            "vendorMaterials"
        );

    const items =
        (itemMasterList || [])
        .filter(i =>
            i.vendor === vendor.vendor
        );

    // TOTAL PO COUNT
    const totalPOs =
        (window.poListData || [])
        .filter(p =>
            p.party === vendor.vendor
        ).length;

    document.getElementById(
        "vp_total_po"
    ).textContent = totalPOs;


    // UNIQUE ITEMS WITH RATE
    const uniqueItems = [];

    items.forEach(i => {

        const exists =
            uniqueItems.find(x =>
                x.name === i.name
            );

        if(!exists){

            uniqueItems.push({
                name: i.name,
                rate: i.rate
            });
        }
    });

    materialsWrap.innerHTML =
        uniqueItems.length

        ?

        uniqueItems.map(item => `
            <div class="material-chip">

                ${item.name}

                <span>
                    ₹ ${formatINR(item.rate || 0)}
                </span>

            </div>
        `).join("")

        :

        `<p>No materials found</p>`;

    modal.classList.remove("hidden");

    document.body.style.overflow =
        "hidden";
}

function editVendorProfile(){

    if(!currentVendorProfile) return;

    vendorEditMode = true;

    // CLOSE PROFILE
    closeVendorProfile();

    // OPEN MODAL
    openVendorModal();

    // TITLE CHANGE
    document.querySelector(
        "#vendorModal h2"
    ).textContent = "Edit Vendor";

    // FILL DATA
    v_name.value =
        currentVendorProfile.vendor || "";

    v_person.value =
        currentVendorProfile.person || "";

    v_building.value =
        currentVendorProfile.building || "";

    v_street.value =
        currentVendorProfile.street || "";

    v_state.value =
        currentVendorProfile.state || "";

    v_pin.value =
        currentVendorProfile.pin || "";

    v_phone.value =
        currentVendorProfile.phone || "";

    v_gst.value =
        currentVendorProfile.gst || "";

    v_terms.value =
        currentVendorProfile.terms || "";

    // BUTTON TEXT
    document.querySelector(
        "#vendorModal .btn-save"
    ).textContent = "Update Vendor";
}

function closeVendorProfile(){

    document.getElementById(
        "vendorProfileModal"
    ).classList.add("hidden");

    document.body.style.overflow = "";
}

function loadHistoryTable(){

    renderHistoryTable(
        window.historyListData || []
    );
}

function renderHistoryTable(data){

    const tbody =
        document.getElementById("historyTableBody");

    tbody.innerHTML = "";

    if(data.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    No History Found
                </td>
            </tr>
        `;

        return;
    }

    data.forEach(row => {

        tbody.innerHTML += `
            <tr>
                <td>${row.po}</td>
                <td>${row.vendor}</td>
                <td>${formatDisplayDate(row.poDate)}</td>
                <td>${row.item}</td>
                <td>${row.invoice}</td>
                <td>${formatDisplayDate(row.invoiceDate)}</td>
                <td>${row.qty}</td>
            </tr>
        `;
    });
}

function filterHistoryTable(){

    const value =
        document.getElementById("receivingSearch")
        .value
        .toLowerCase()
        .trim();

    const filtered =
        (window.historyListData || []).filter(r =>

            (r.po || "")
            .toLowerCase()
            .includes(value)

            ||

            (r.vendor || "")
            .toLowerCase()
            .includes(value)

            ||

            (r.item || "")
            .toLowerCase()
            .includes(value)

            ||

            (r.invoice || "")
            .toLowerCase()
            .includes(value)
        );

    renderHistoryTable(filtered);
}

function formatDisplayDate(dateValue){

    if(!dateValue) return "";

    const d = new Date(dateValue);

    if(isNaN(d)) return dateValue;

    const day =
        String(d.getDate()).padStart(2, "0");

    const month =
        String(d.getMonth() + 1).padStart(2, "0");

    const year =
        d.getFullYear();

    return `${day}/${month}/${year}`;
}

let activeReceivingTab = "pending";

function switchReceivingTab(type){

    activeReceivingTab = type;

    const pendingBtn =
        document.getElementById("receivingPendingTab");

    const historyBtn =
        document.getElementById("receivingHistoryTab");

    const pendingWrap =
        document.getElementById("pendingReceivingWrapper");

    const historyWrap =
        document.getElementById("historyReceivingWrapper");

    // RESET
    pendingBtn.classList.remove("active");
    historyBtn.classList.remove("active");

    pendingWrap.classList.add("hidden");
    historyWrap.classList.add("hidden");

    // ACTIVE
    if(type === "pending"){

        pendingBtn.classList.add("active");

        pendingWrap.classList.remove("hidden");

    }else{

        historyBtn.classList.add("active");

        historyWrap.classList.remove("hidden");

        loadHistoryTable();
    }

    // CLEAR SEARCH
    document.getElementById(
        "receivingSearch"
    ).value = "";
}
