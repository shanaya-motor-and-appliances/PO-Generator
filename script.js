// 🔴 GAS WEB APP URL (NEW DEPLOYED URL ONLY)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwhzuzE0DCAhEQEjKhwoJ3K8UL9YpP7MxV3VWz8OQ5uMqS5FDhb1njVEDoUvTq8ZZqq/exec";

let itemMasterList = [];
let vendorMasterList = [];
let selectedVendor = "";

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

    /* ===== PO NUMBER ===== */
    const poRes = await fetch(`${SCRIPT_URL}?action=getPONumber`);
    const poData = await poRes.json();
    poNumberEl.textContent = poData?.po || "PO-001/2025-26";


    /* ===== PARTY LIST ===== */
    const partyRes = await fetch(`${SCRIPT_URL}?action=partyList`);
    const list = await partyRes.json();

    vendorMasterList = Array.isArray(list) ? list : [];


    /* ===== ITEM MASTER LIST ===== */
    const itemRes = await fetch(`${SCRIPT_URL}?action=itemList`);
    const items = await itemRes.json();

    itemMasterList = Array.isArray(items) ? items : [];


    /* ===== ADD FIRST ITEM ROW ===== */
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



document.addEventListener("click", (e) => {
  if (!e.target.closest(".vendor-container")) {
    vendorSuggestions.classList.add("hidden");
  }
});

function clearVendorDetails(){

  selectedVendor = "";

  building.value = "";
  street.value   = "";
  state.value    = "";
  pin.value      = "";
  phone.value    = "";
  gst.value      = "";

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
      <option value="PKT">PKT</option>
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
  const noteInput = row.querySelector(".item-note");

  // 🔥 TYPE FILTER
  itemInput.addEventListener("input", () => {

    const val = itemInput.value.toLowerCase();
    suggestionBox.innerHTML = "";

    if(!val){
      suggestionBox.classList.add("hidden");
      return;
    }

    const filtered = itemMasterList.filter(i =>
      i.toLowerCase().includes(val)
    );

    if(filtered.length === 0){
      suggestionBox.classList.add("hidden");
      return;
    }

    filtered.forEach(name => {

      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = name;

      div.onclick = () => {
        itemInput.value = name;
        suggestionBox.classList.add("hidden");

        // 🔥 AUTO FILL DETAILS
        fetch(`${SCRIPT_URL}?action=itemDetails&name=${encodeURIComponent(name)}`)
          .then(r => r.json())
          .then(data => {

            if(data.rate) rateInput.value = data.rate;

            calc();
          });

      };

      suggestionBox.appendChild(div);
    });

    suggestionBox.classList.remove("hidden");

  });

  // Outside click hide
  document.addEventListener("click", (e)=>{
    if(!e.target.closest(".item-container")){
      suggestionBox.classList.add("hidden");
    }
  });

}



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
      po: poNumberEl.textContent,
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

    // 🔥 Load real PDF after generation
    pdfTab.location.href = result.pdfUrl;

    setTimeout(() => {window.location.reload();}, 2000);

  }catch(err){

    pdfTab.close();
    alert("Error: " + err.message);

  }finally{

    hideLoader();
    document.querySelector(".primary-btn").disabled = false;

  }
}


function openVendorModal(){
  document.getElementById("vendorModal").classList.remove("hidden");
}

function closeVendorModal(){
  document.getElementById("vendorModal").classList.add("hidden");
}

function saveVendor(){

  const vendor = {
    name: v_name.value,
    building: v_building.value,
    street: v_street.value,
    state: v_state.value,
    pin: v_pin.value,
    phone: v_phone.value,
    gst: v_gst.value,
    terms: v_terms.value
  };

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
      alert("Vendor Added");
      location.reload();
    }else{
      alert("Failed");
    }
  });
}

// ================= VENDOR SEARCH =================


function renderVendorList(arr){

  vendorSuggestions.innerHTML = "";

  if(arr.length === 0){
    vendorSuggestions.classList.add("hidden");
    return;
  }

  arr.forEach(name => {

    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.textContent = name;

    div.onclick = () => {

      partySearch.value = name;
      selectedVendor = name;
      vendorSuggestions.classList.add("hidden");

      loadVendorDetails(name);

    };

    vendorSuggestions.appendChild(div);
  });

  vendorSuggestions.classList.remove("hidden");
}


// CLICK → SHOW ALL
partySearch.addEventListener("focus", () => {
  renderVendorList(vendorMasterList);
});


// TYPE → FILTER
partySearch.addEventListener("input", () => {

  const currentValue = partySearch.value.trim();

  // Agar user ne selected vendor ko modify ya delete kiya
  if(currentValue !== selectedVendor){
    clearVendorDetails();
  }

  const filtered = vendorMasterList.filter(v =>
    v.toLowerCase().includes(currentValue.toLowerCase())
  );

  renderVendorList(filtered);

});



// OUTSIDE CLICK CLOSE
document.addEventListener("click", (e) => {
  if (!e.target.closest(".vendor-container")) {
    vendorSuggestions.classList.add("hidden");
  }
});


let vendorLoading = false;

async function loadVendorDetails(name){

  vendorLoading = true;

  try{

    const r = await fetch(`${SCRIPT_URL}?action=partyDetails&name=${encodeURIComponent(name)}`);
    const d = await r.json();

    if(!d || !d.building){
      alert("Vendor not found");
      return;
    }

    building.value = d.building || "";
    street.value   = d.street   || "";
    state.value    = d.state    || "";
    pin.value      = d.pin      || "";
    phone.value    = d.phone    || "";
    gst.value      = d.gst      || "";

    paymentTerms = d.terms || "NA";

    selectedVendor = name;  // 🔥 SET AFTER LOAD

  }finally{
    vendorLoading = false;
  }
}


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

