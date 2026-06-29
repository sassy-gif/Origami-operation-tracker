console.log("JS is running 🚀");
"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

console.log("Firebase file loaded");

const firebaseConfig = {
  apiKey: "AIzaSyDPaZC-3BhFuTsfdnTQmgjjQLsYHkw7ZR0",
  authDomain: "origami-tracker.firebaseapp.com",
  projectId: "origami-tracker",
  storageBucket: "origami-tracker.firebasestorage.app",
  messagingSenderId: "248992245803",
  appId: "1:248992245803:web:0eed4d8c515dc9cbd7a26e",
  measurementId: "G-J7GF6YTBH6"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

setDoc(doc(db, "test", "hello"), {
  message: "Firebase is alive 🚀",
  time: Date.now()
})
.then(() => console.log("WRITE SUCCESS"))
.catch((err) => console.log("WRITE ERROR:", err));

let DB = { clients:[], projects:[], team:[], tasks:[], users:[] };
let view = "dashboard";
let q = "";
let currentUser = null;
let currentUserRole = null;
let unsubscribers = [];

const $ = (s,el=document)=>el.querySelector(s);
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today = ()=> new Date().toISOString().slice(0,10);
const money = n => (Number(n)||0).toLocaleString("en-US") + " ETB";
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const COLLECTIONS = ["clients","projects","team","tasks","users"];

function startSync(){
  unsubscribers.forEach(u=>u());
  unsubscribers = [];
  COLLECTIONS.forEach(coll=>{
    const unsub = onSnapshot(collection(db, coll), snap=>{
      DB[coll] = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      render();
    }, err=>{
      console.error(coll, err);
      toast("Sync issue loading " + coll + ".");
    });
    unsubscribers.push(unsub);
  });
}
function stopSync(){
  unsubscribers.forEach(u=>u());
  unsubscribers = [];
}

async function saveRecord(coll, record){
  const id = record.id || uid();
  const data = { ...record };
  delete data.id;
  try{
    await setDoc(doc(db, coll, id), data);
    return true;
  }catch(e){
    console.error(e);
    toast("Could not save \u2014 check your connection and try again.");
    return false;
  }
}
async function deleteRecord(coll, id){
  try{
    await deleteDoc(doc(db, coll, id));
    return true;
  }catch(e){
    console.error(e);
    toast("Could not delete \u2014 check your connection and try again.");
    return false;
  }
}

function plus(days){ const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }

async function seedIfEmpty(){
  const snaps = await Promise.all(COLLECTIONS.map(c=>getDocs(collection(db,c))));
  const allEmpty = snaps.every(s=>s.empty);
  if(!allEmpty) return;

  const team = [
    {id:"t1", name:"Zaim", role:"Managing Director"},
    {id:"t2", name:"Nebiyu", role:"Research & Intelligence"},
    {id:"t3", name:"Meron Tezazu", role:"Project Coordinator"},
    {id:"t4", name:"Peniel Haile", role:"EA & CRM Lead"},
  ];
  const clients = [
    {id:"c1", name:"Acordia Investment Group", contact:"", industry:"Real Estate / Coffee", status:"Active", retainer:0, notes:"HMS Fine Coffee & Jewelry + Acordia Real Estate."},
    {id:"c2", name:"Amrogn Restaurant Group", contact:"", industry:"Hospitality", status:"Active", retainer:0, notes:"SOP library + management presentation."},
    {id:"c3", name:"Kokobu Manufacturing", contact:"Hirut", industry:"Manufacturing", status:"Active", retainer:0, notes:"E-commerce + CRM, TikTok, recruitment."},
    {id:"c4", name:"Luxe Union", contact:"", industry:"Premium Matchmaking", status:"Active", retainer:0, notes:"Content system + video scripts."},
    {id:"c5", name:"Elysian Perfume", contact:"Salih", industry:"Beauty / Fragrance", status:"Active", retainer:0, notes:"Seminar funnel, Getfam Hotel event."},
  ];
  const projects = [
    {id:"p1", title:"Acordia luxury proposal site", clientId:"c1", ownerId:"t1", status:"Review", priority:"High", due:plus(4), fee:0, progress:80},
    {id:"p2", title:"Amrogn SOP translation (Amharic)", clientId:"c2", ownerId:"t3", status:"In progress", priority:"Medium", due:plus(9), fee:0, progress:55},
    {id:"p3", title:"Kokobu e-commerce + CRM build", clientId:"c3", ownerId:"t1", status:"Not started", priority:"Medium", due:plus(21), fee:0, progress:0},
    {id:"p4", title:"Luxe Union TikTok scripts 9 & 10", clientId:"c4", ownerId:"t2", status:"Delivered", priority:"Low", due:plus(-3), fee:0, progress:100},
    {id:"p5", title:"Elysian seminar funnel + deck", clientId:"c5", ownerId:"t3", status:"In progress", priority:"High", due:plus(-1), fee:150000, progress:40},
  ];
  const tasks = [
    {id:"k1", title:"Finalize Acordia hero imagery", projectId:"p1", assigneeId:"t1", status:"Doing", due:plus(1)},
    {id:"k2", title:"Proofread Amharic SOP section 3", projectId:"p2", assigneeId:"t4", status:"To do", due:plus(3)},
    {id:"k3", title:"Confirm Getfam Hotel booking", projectId:"p5", assigneeId:"t3", status:"To do", due:plus(-1)},
    {id:"k4", title:"Draft Kokobu sitemap", projectId:"p3", assigneeId:"t2", status:"To do", due:plus(10)},
    {id:"k5", title:"Send Elysian installment 1 invoice", projectId:"p5", assigneeId:"t4", status:"Doing", due:plus(0)},
    {id:"k6", title:"Archive Luxe Union deliverables", projectId:"p4", assigneeId:"t4", status:"Done", due:plus(-2)},
  ];

  await Promise.all([
    ...team.map(r=>saveRecord("team", r)),
    ...clients.map(r=>saveRecord("clients", r)),
    ...projects.map(r=>saveRecord("projects", r)),
    ...tasks.map(r=>saveRecord("tasks", r)),
  ]);
}

const clientName = id => (DB.clients.find(x=>x.id===id)||{}).name || "\u2014";
const teamName   = id => (DB.team.find(x=>x.id===id)||{}).name || "Unassigned";
const projTitle  = id => (DB.projects.find(x=>x.id===id)||{}).title || "\u2014";

function statusPill(s){
  const map={
    "Active":"blue","Prospect":"gold","Dormant":"gray",
    "Not started":"gray","In progress":"blue","Review":"gold","Delivered":"green",
    "To do":"gray","Doing":"blue","Done":"green"
  };
  return `<span class="pill ${map[s]||"gray"}">${esc(s)}</span>`;
}
function prioPill(p){
  const map={High:"red",Medium:"gold",Low:"gray"};
  return `<span class="pill ${map[p]||"gray"}">${esc(p)}</span>`;
}
const isOpenProject = p => p.status!=="Delivered";
const isOpenTask = k => k.status!=="Done";
function dueClass(date, open){
  if(!date) return "ok";
  if(!open) return "ok";
  if(date < today()) return "past";
  if(date <= plus(7)) return "soon";
  return "ok";
}
function dueLabel(date){
  if(!date) return "\u2014";
  const d=new Date(date), n=new Date(today());
  const diff=Math.round((d-n)/86400000);
  if(diff<0) return Math.abs(diff)+"d overdue";
  if(diff===0) return "Today";
  if(diff===1) return "Tomorrow";
  return "in "+diff+"d";
}

function timeAgo(timestamp){
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff/60000);
  if(mins < 1) return "just now";
  if(mins < 60) return mins+"m ago";
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return hrs+"h ago";
  const days = Math.floor(hrs/24);
  return days+"d ago";
}

function render(){
  if(!currentUser) return;
  $("#nav").querySelectorAll("button").forEach(b=>b.classList.toggle("on", b.dataset.view===view));

  $("#nav").querySelectorAll("button").forEach(b=>{
    const v = b.dataset.view;
    const employeeAllowed = ["dashboard","projects","tasks","profile","calendar"];
    const visible = currentUserRole==="boss" || employeeAllowed.includes(v);
    b.style.display = visible ? "" : "none";
  });
  const titles={dashboard:"Dashboard",clients:"Clients",projects:"Projects",team:"Team",tasks:"Tasks",profile:"Profile",calendar:"Calendar"};
  const eyebrows={dashboard:"Command Center",clients:"Accounts",projects:"Engagements",team:"People",tasks:"Workstream",profile:"Your account",calendar:"Schedule"};
  $("#title").textContent=titles[view];
  $("#eyebrow").textContent=eyebrows[view];
  const onList = view!=="dashboard";
  $("#addBtn").style.display = onList?"block":"none";
  $("#addBtn").textContent = "+ Add " + ({clients:"client",projects:"project",team:"member",tasks:"task"}[view]||"");
  if(view==="dashboard") renderDashboard();
  if(view==="clients") renderClients();
  if(view==="projects") renderProjects();
  if(view==="team") renderTeam();
  if(view==="tasks") renderTasks();
  if(view==="profile") renderProfile();
  if(view==="calendar") renderCalendar();
}

function renderDashboard(){
  const teamPreview = currentUserRole==="boss" ? DB.team.slice(0,4) : [];
  const projectsPreview = (currentUserRole==="boss" ? DB.projects : DB.projects.filter(p=>p.ownerId===currentUser.uid))
    .filter(isOpenProject)
    .slice(0,4);
  const miniCalToday = new Date();
  const miniCalYear = miniCalToday.getFullYear();
  const miniCalMonth = miniCalToday.getMonth();
  const miniCalDaysInMonth = new Date(miniCalYear, miniCalMonth+1, 0).getDate();
  const miniCalStartWeekday = new Date(miniCalYear, miniCalMonth, 1).getDay();
  const miniCalDueDates = new Set([
    ...DB.projects.filter(p=>isOpenProject(p) && p.due && (currentUserRole==="boss" || p.ownerId===currentUser.uid)).map(p=>p.due),
    ...DB.tasks.filter(k=>isOpenTask(k) && k.due && (currentUserRole==="boss" || k.assigneeId===currentUser.uid)).map(k=>k.due)
  ]);
  const activeClients = DB.clients.filter(c=>c.status==="Active").length;
  const openProjects = DB.projects.filter(isOpenProject);
  const visibleProjectsForRing = currentUserRole==="boss" ? DB.projects : DB.projects.filter(p=>p.ownerId===currentUser.uid);
  const visibleTasksForRing = currentUserRole==="boss" ? DB.tasks : DB.tasks.filter(k=>k.assigneeId===currentUser.uid);
  const projDonePct = visibleProjectsForRing.length ? Math.round(visibleProjectsForRing.filter(p=>p.status==="Delivered").length / visibleProjectsForRing.length * 100) : 0;
  const taskDonePct = visibleTasksForRing.length ? Math.round(visibleTasksForRing.filter(k=>k.status==="Done").length / visibleTasksForRing.length * 100) : 0;
  const overdue = openProjects.filter(p=>p.due && p.due<today()).length
                + DB.tasks.filter(k=>isOpenTask(k) && k.due && k.due<today()).length;
  const pipeline = openProjects.reduce((s,p)=>s+(Number(p.fee)||0),0);
  const dueWeek = DB.tasks.filter(k=>isOpenTask(k) && k.due && k.due>=today() && k.due<=plus(7)).length;

  const statuses=["Not started","In progress","Review","Delivered"];
  const counts=statuses.map(s=>DB.projects.filter(p=>p.status===s).length);
  const maxc=Math.max(1,...counts);
  const totalProjForDonut = counts.reduce((a,b)=>a+b,0) || 1;
  const donutColors = ["#8a8f9c", "#4a90d9", "#d9a548", "#4caf6e"];
  let donutOffset = 0;
  const donutSegments = statuses.map((s,i)=>{
    const pct = counts[i]/totalProjForDonut;
    const seg = { status:s, count:counts[i], pct:Math.round(pct*100), color:donutColors[i], offset:donutOffset };
    donutOffset += pct*100;
    return seg;
  });

const workload = DB.users.filter(u=>u.role==="employee" || u.role==="boss").map(u=>{
  const n = DB.projects.filter(p=>p.ownerId===u.id && isOpenProject(p)).length
          + DB.tasks.filter(k=>k.assigneeId===u.id && isOpenTask(k)).length;
  return {name: u.name || u.email.split("@")[0], n};
});
const maxw=Math.max(1,...workload.map(w=>w.n));

  const due = [
    ...openProjects.filter(p=>p.due).map(p=>({type:"Project",label:p.title,due:p.due,goto:"projects"})),
    ...DB.tasks.filter(k=>isOpenTask(k)&&k.due).map(k=>({type:"Task",label:k.title,due:k.due,goto:"tasks"}))
  ].sort((a,b)=>a.due<b.due?-1:1).slice(0,7);

  $("#content").innerHTML = `
   <div class="dash-top-row">
  <div class="panel progress-overview-card">
    <h3>Progress Overview</h3>
    <div class="body progress-overview-body">
      <div class="ring-block">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="8"/>
          <circle cx="42" cy="42" r="36" fill="none" stroke="var(--gold,#D9A8E8)" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="${2*Math.PI*36}" stroke-dashoffset="${2*Math.PI*36 - (projDonePct/100)*2*Math.PI*36}"
            transform="rotate(-90 42 42)"/>
        </svg>
        <div class="ring-label"><div class="ring-pct">${projDonePct}%</div><div class="ring-sub">Projects done</div></div>
      </div>
      <div class="ring-block">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="8"/>
          <circle cx="42" cy="42" r="36" fill="none" stroke="var(--blue,#4a90d9)" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="${2*Math.PI*36}" stroke-dashoffset="${2*Math.PI*36 - (taskDonePct/100)*2*Math.PI*36}"
            transform="rotate(-90 42 42)"/>
        </svg>
        <div class="ring-label"><div class="ring-pct">${taskDonePct}%</div><div class="ring-sub">Tasks done</div></div>
      </div>
    </div>
  </div>

  <div class="kpi-card kpi-icon-card" data-goto="projects">
    <div class="kpi-icon kpi-icon-red">&#128197;</div>
    <div class="kpi-icon-text">
      <div class="kpi-icon-label">OVERDUE</div>
      <div class="kpi-icon-val">${overdue}</div>
      <div class="kpi-icon-sub">projects + tasks past due</div>
    </div>
  </div>

  <div class="kpi-card kpi-icon-card" data-goto="projects">
    <div class="kpi-icon kpi-icon-gold">&#128176;</div>
    <div class="kpi-icon-text">
      <div class="kpi-icon-label">ACTIVE VALUE</div>
      <div class="kpi-icon-val">${money(pipeline)}</div>
      <div class="kpi-icon-sub">across open projects</div>
    </div>
  </div>
</div>

<div class="dash-kpi-row-5">
  <div class="kpi-card kpi-icon-card" data-goto="clients">
    <div class="kpi-icon kpi-icon-green">&#128101;</div>
    <div class="kpi-icon-text">
      <div class="kpi-icon-label">ACTIVE CLIENTS</div>
      <div class="kpi-icon-val">${activeClients}</div>
      <div class="kpi-icon-sub">${DB.clients.length} total accounts</div>
    </div>
  </div>
  <div class="kpi-card kpi-icon-card" data-goto="projects">
    <div class="kpi-icon kpi-icon-blue">&#128193;</div>
    <div class="kpi-icon-text">
      <div class="kpi-icon-label">OPEN PROJECTS</div>
      <div class="kpi-icon-val">${openProjects.length}</div>
      <div class="kpi-icon-sub">${DB.projects.length} all-time</div>
    </div>
  </div>
  <div class="kpi-card kpi-icon-card" data-goto="tasks">
    <div class="kpi-icon kpi-icon-purple">&#128198;</div>
    <div class="kpi-icon-text">
      <div class="kpi-icon-label">DUE THIS WEEK</div>
      <div class="kpi-icon-val">${dueWeek}</div>
      <div class="kpi-icon-sub">tasks in next 7 days</div>
    </div>
  </div>
</div>

    <div class="dash-quad-row">
      <div class="panel quad-panel">
        <h3>Projects by status</h3>
        <div class="body quad-donut-body">
          <svg width="92" height="92" viewBox="0 0 140 140" class="donut-svg">
            <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="18"/>
            ${donutSegments.map(seg=>{
              if(seg.pct<=0) return "";
              const circumference = 2*Math.PI*56;
              const dash = (seg.pct/100)*circumference;
              const gap = circumference - dash;
              const rotation = (seg.offset/100)*360 - 90;
              return `<circle cx="70" cy="70" r="56" fill="none" stroke="${seg.color}" stroke-width="18"
                stroke-dasharray="${dash} ${gap}" transform="rotate(${rotation} 70 70)"/>`;
            }).join("")}
            <text x="70" y="75" text-anchor="middle" class="donut-total-label">${DB.projects.length}</text>
          </svg>
          <div class="quad-donut-legend">
            ${donutSegments.map(seg=>`
              <div class="quad-legend-row">
                <span class="donut-dot" style="background:${seg.color}"></span>
                <span class="quad-legend-label">${seg.status}</span>
                <span class="quad-legend-val">${seg.pct}%</span>
              </div>`).join("")}
          </div>
        </div>
      </div>

      <div class="panel quad-panel">
        <h3>Team workload</h3>
        <div class="body quad-workload-body">
          ${workload.map(w=>`
            <div class="bar-row clickable-bar quad-bar-row" data-goto="tasks">
              <div class="nm">${esc(w.name)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${w.n/maxw*100}%"></div></div>
              <div class="ct">${w.n}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="panel quad-panel">
        <h3>Due soon</h3>
        <div class="body quad-due-body">
          ${due.length? `<div class="quad-due-list">${due.slice(0,5).map(d=>{
            const cl=dueClass(d.due,true);
            return `
              <div class="quad-due-row" data-goto="${d.goto}">
                <span class="due-dot-sm ${cl}"></span>
                <span class="quad-due-label">${esc(d.label)}</span>
                <span class="when ${cl}">${dueLabel(d.due)}</span>
              </div>`;
          }).join("")}</div>` : `<div class="empty"><b>Nothing pending</b>You're all caught up.</div>`}
        </div>
      </div>

      <div class="panel quad-panel preview-card" id="miniCalCard">
        <h3>Calendar</h3>
        <div class="body quad-cal-body">
          <div class="mini-cal-grid">
            ${["S","M","T","W","T","F","S"].map(d=>`<div class="mc-weekday">${d}</div>`).join("")}
            ${Array.from({length:miniCalStartWeekday}).map(()=>`<div class="mc-cell empty"></div>`).join("")}
            ${Array.from({length:miniCalDaysInMonth}).map((_,i)=>{
              const day = i+1;
              const dateStr = `${miniCalYear}-${String(miniCalMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const isToday = dateStr===today();
              const hasDue = miniCalDueDates.has(dateStr);
              return `<div class="mc-cell ${isToday?"today":""} ${hasDue?"has-due":""}">${day}</div>`;
            }).join("")}
          </div>
          <div class="preview-seemore">Open calendar &rarr;</div>
        </div>
      </div>
    </div>

    <div class="dash-preview-row">
    ${teamPreview.length ? `
    <div class="panel preview-card" style="margin-top:18px" id="teamPreviewCard">
      <h3>Team</h3>
      <div class="body">
        ${teamPreview.map(m=>`
          <div class="preview-row">
            <div class="avatar-circle small">${esc((m.name||"?").charAt(0).toUpperCase())}</div>
            <div class="preview-row-text">
              <div class="pr-name">${esc(m.name)}</div>
              <div class="pr-sub">${esc(m.role||"\u2014")}</div>
            </div>
          </div>`).join("")}
        <div class="preview-seemore">See all team &rarr;</div>
      </div>
    </div>` : ""}
    <div class="panel preview-card" id="projectsPreviewCard">
      <h3>Projects</h3>
      <div class="body">
        ${projectsPreview.length ? projectsPreview.map(p=>`
          <div class="preview-row">
            <div class="preview-row-text">
              <div class="pr-name">${esc(p.title)}</div>
              <div class="pr-sub">${statusPill(p.status)} ${p.due?dueLabel(p.due):""}</div>
            </div>
          </div>`).join("") : `<div class="pr-sub">Nothing active right now.</div>`}
        <div class="preview-seemore">See all projects &rarr;</div>
      </div>
    </div>
    </div>
  `;

  if($("#teamPreviewCard")){
    $("#teamPreviewCard").onclick = ()=>{ view="team"; render(); };
  }
  if($("#miniCalCard")){
    $("#miniCalCard").onclick = ()=>{ view="calendar"; render(); };
  }
  if($("#projectsPreviewCard")){
    $("#projectsPreviewCard").onclick = ()=>{ view="projects"; render(); };
  }
  $("#content").querySelectorAll("[data-goto]").forEach(el=>{
    el.onclick = ()=>{ view = el.dataset.goto; render(); };
  });
}

$("#globalSearch").addEventListener("input", e=>{
  const term = e.target.value.trim().toLowerCase();
  const resultsEl = $("#globalSearchResults");
  if(!term){ resultsEl.innerHTML=""; resultsEl.style.display="none"; return; }

  const results = [];
  DB.clients.forEach(c=>{
    if(c.name && c.name.toLowerCase().includes(term)) results.push({type:"Client", label:c.name, goto:"clients"});
  });
  DB.projects.forEach(p=>{
    if((currentUserRole==="boss" || p.ownerId===currentUser.uid) && p.title && p.title.toLowerCase().includes(term)) results.push({type:"Project", label:p.title, goto:"projects"});
  });
  DB.tasks.forEach(k=>{
    if((currentUserRole==="boss" || k.assigneeId===currentUser.uid) && k.title && k.title.toLowerCase().includes(term)) results.push({type:"Task", label:k.title, goto:"tasks"});
  });
  DB.team.forEach(m=>{
    if(currentUserRole==="boss" && m.name && m.name.toLowerCase().includes(term)) results.push({type:"Team", label:m.name, goto:"team"});
  });

  if(!results.length){
    resultsEl.innerHTML = `<div class="gsr-empty">No matches</div>`;
  }else{
    resultsEl.innerHTML = results.slice(0,8).map(r=>`
      <div class="gsr-item" data-goto="${r.goto}">
        <span class="gsr-type">${r.type}</span>
        <span class="gsr-label">${esc(r.label)}</span>
      </div>`).join("");
    resultsEl.querySelectorAll("[data-goto]").forEach(el=>{
      el.onclick = ()=>{
        view = el.dataset.goto;
        $("#globalSearch").value="";
        resultsEl.innerHTML=""; resultsEl.style.display="none";
        render();
      };
    });
  }
  resultsEl.style.display="block";
});

document.addEventListener("click", e=>{
  if(!e.target.closest(".global-search-wrap")){
    $("#globalSearchResults").style.display="none";
  }
});

function tableShell(cols, rowsHtml, count){
  return `
    <div class="tablewrap">
      <div class="tabletools">
        <span class="count">${count} ${count===1?"record":"records"}</span>
        <span class="spacer"></span>
        <button class="linkbtn" id="exportBtn">Export CSV</button>
      </div>
      <table>
        <thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}
function emptyRow(span,msg){
  return `<tr><td colspan="${span}"><div class="empty"><b>Nothing here yet</b>${msg}</div></td></tr>`;
}
function acts(id){
  return `<div class="rowacts">
    <button class="iconbtn" data-edit="${id}">Edit</button>
    <button class="iconbtn del" data-del="${id}">Delete</button>
  </div>`;
}
function match(obj){
  if(!q) return true;
  return JSON.stringify(obj).toLowerCase().includes(q.toLowerCase());
}

function renderClients(){
  const rows = DB.clients.filter(c=>match({...c,_n:c.name}));

  const cardsHtml = rows.length ? rows.map(c=>{
    const clientProjects = DB.projects.filter(p=>p.clientId===c.id);
    const openCount = clientProjects.filter(isOpenProject).length;
    const totalValue = clientProjects.filter(isOpenProject).reduce((s,p)=>s+(Number(p.fee)||0),0) + (Number(c.retainer)||0);
    return `
    <div class="client-card" data-client-jump="${esc(c.name)}">
      <div class="client-card-top">
        <div>
          <div class="client-name">${esc(c.name)}</div>
          <div class="client-industry">${esc(c.industry||"\u2014")}</div>
        </div>
        ${statusPill(c.status)}
      </div>
      <div class="client-card-mid">
        <div class="client-stat"><div class="client-stat-val">${openCount}</div><div class="client-stat-lbl">Open projects</div></div>
        <div class="client-stat"><div class="client-stat-val">${money(totalValue)}</div><div class="client-stat-lbl">Total value</div></div>
      </div>
      <div class="client-card-bottom">
        <span class="client-contact">${c.contact ? "Contact: "+esc(c.contact) : "No contact listed"}</span>
        <div class="client-icons">
          <span class="ticon" data-edit="${c.id}" title="Edit">&#9998;</span>
          ${currentUserRole==="boss" ? `<span class="ticon del" data-del="${c.id}" title="Delete">&#10005;</span>` : ""}
        </div>
      </div>
    </div>`;
  }).join("") : `<div class="empty"><b>Nothing here yet</b>Add your first client to get started.</div>`;

  $("#content").innerHTML = `
    <div class="tabletools">
      <span class="count">${rows.length} ${rows.length===1?"client":"clients"}</span>
      <span class="spacer"></span>
      <button class="linkbtn" id="exportBtn">Export CSV</button>
    </div>
    <div class="client-cards">${cardsHtml}</div>
  `;

  $("#content").querySelectorAll("[data-edit]").forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); openModal("clients",b.dataset.edit); });
  $("#content").querySelectorAll("[data-del]").forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); del("clients",b.dataset.del); });
  $("#content").querySelectorAll("[data-client-jump]").forEach(card=>{
    card.onclick = ()=>{
      q = card.dataset.clientJump;
      view = "projects";
      render();
    };
  });

  $("#exportBtn").onclick=()=>exportCSV("clients",DB.clients,
    [["name","Client"],["industry","Industry"],["contact","Contact"],["status","Status"],["retainer","Retainer"],["notes","Notes"]]);
}

function renderProjects(){
  const rows = DB.projects.filter(p=>match({...p,_c:clientName(p.clientId),_o:teamName(p.ownerId)}));
  const visibleProjects = currentUserRole==="boss" ? rows : rows.filter(p=>p.ownerId===currentUser.uid);
  const projectsWithTasks = visibleProjects.map(p=>{
    const projTasks = DB.tasks.filter(t=>t.projectId===p.id);
    const doneCount = projTasks.filter(t=>t.status==="Done").length;
    return { ...p, _tasks: projTasks, _doneCount: doneCount, _totalCount: projTasks.length };
  });

  const cardsHtml = projectsWithTasks.length ? projectsWithTasks.map(p=>{
    const pct = p._totalCount ? Math.round(p._doneCount/p._totalCount*100) : 0;
    const isDone = p._totalCount>0 && p._doneCount===p._totalCount;
    return `
    <div class="ptrack-project ${isDone?'done':''}">
      <div class="ptrack-head" data-proj-toggle="${p.id}">
        <div class="ptrack-emoji">${isDone?"&#127881;":"&#128193;"}</div>
        <div class="ptrack-title-wrap">
          <div class="ptrack-name">${esc(p.title)}</div>
          <div class="ptrack-meta">${esc(clientName(p.clientId))}</div>
        </div>
        <div class="ptrack-bar-wrap">
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="ptrack-count">${p._doneCount} / ${p._totalCount}</div>
        </div>
        <span class="ticon ptrack-del-icon" data-del-proj="${p.id}" title="Delete project">&#10005;</span>
        <span class="ptrack-chev">&#9656;</span>
      </div>
      <div class="ptrack-tasks">
        ${p._tasks.map(t=>`
          <div class="ptrack-task ${t.status==="Done"?'checked':''}">
            <div class="task-check ${t.status==="Done"?'checked':''}" data-ptrack-toggle="${t.id}">${t.status==="Done"?"&#10003;":""}</div>
            <div class="ptrack-task-body">
              <div class="ptrack-task-text">${esc(t.title)}</div>
              <textarea class="ptrack-note" data-note-id="${t.id}" placeholder="Add a note...">${esc(t.note||"")}</textarea>
            </div>
            <span class="ticon del" data-del-task="${t.id}" title="Remove task">&#10005;</span>
          </div>
        `).join("")}

      </div>
    </div>`;
  }).join("") : `<div class="empty"><b>Nothing here yet</b>Add a project to start tracking delivery.</div>`;

  $("#content").innerHTML = `
    <div class="tabletools">
      <span class="count">${visibleProjects.length} ${visibleProjects.length===1?"project":"projects"}</span>
    </div>
    <div class="ptrack-list">${cardsHtml}</div>
  `;

  $("#content").querySelectorAll("[data-proj-toggle]").forEach(head=>{
    head.onclick = (e)=>{
      if(e.target.closest("[data-del-proj]")) return;
      head.closest(".ptrack-project").classList.toggle("open");
    };
  });

  $("#content").querySelectorAll("[data-del-proj]").forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); del("projects",b.dataset.delProj); });

  $("#content").querySelectorAll("[data-ptrack-toggle]").forEach(el=>{
    el.onclick = async (e)=>{
      e.stopPropagation();
      const id = el.dataset.ptrackToggle;
      const task = DB.tasks.find(t=>t.id===id);
      if(!task) return;
      const newStatus = task.status==="Done" ? "To do" : "Done";
      await saveRecord("tasks", {...task, status:newStatus});
    };
  });

  $("#content").querySelectorAll("[data-del-task]").forEach(el=>{
    el.onclick = async (e)=>{
      e.stopPropagation();
      if(!confirm("Remove this task?")) return;
      await del("tasks", el.dataset.delTask);
    };
  });

  $("#content").querySelectorAll("[data-note-id]").forEach(el=>{
    el.addEventListener("click", e=>e.stopPropagation());
    el.addEventListener("input", async ()=>{
      const id = el.dataset.noteId;
      const task = DB.tasks.find(t=>t.id===id);
      if(!task) return;
      await saveRecord("tasks", {...task, note: el.value});
    });
  });
}

function renderTeam(){
const allMembers = DB.users.filter(u=>u.role==="employee" || u.role==="boss").filter(u=>match(u)).map(u=>({
  id: u.id, name: u.name || u.email.split("@")[0], role: u.role==="boss"?"Boss":"Employee", source: "users"
}));

  const cardsHtml = allMembers.length ? allMembers.map(m=>{
    const op=DB.projects.filter(p=>p.ownerId===m.id&&isOpenProject(p)).length;
    const ot=DB.tasks.filter(k=>k.assigneeId===m.id&&isOpenTask(k)).length;
    return `
    <div class="team-card" data-member-jump="${esc(m.name)}">
      <div class="avatar-circle team-avatar">${esc((m.name||"?").charAt(0).toUpperCase())}</div>
      <div class="team-card-info">
        <div class="team-card-name">${esc(m.name)}</div>
        <div class="team-card-role">${esc(m.role||"\u2014")}</div>
      </div>
      <div class="team-card-stats">
        <div class="team-stat"><div class="team-stat-val">${op}</div><div class="team-stat-lbl">Projects</div></div>
        <div class="team-stat"><div class="team-stat-val">${ot}</div><div class="team-stat-lbl">Tasks</div></div>
      </div>
      ${m.source==="team" ? `
      <div class="team-card-icons">
        <span class="ticon" data-edit="${m.id}" title="Edit">&#9998;</span>
        ${currentUserRole==="boss" ? `<span class="ticon del" data-del="${m.id}" title="Delete">&#10005;</span>` : ""}
      </div>` : ""}
    </div>`;
  }).join("") : `<div class="empty"><b>Nothing here yet</b>Add your team members.</div>`;

  let usersHtml = "";
  if(currentUserRole === "boss"){
    const userRows = DB.users.map(u=>{
      const initial = (u.name || u.email || "?").charAt(0).toUpperCase();
      return `
      <div class="access-row">
        <div class="avatar-circle access-avatar">${esc(initial)}</div>
        <div class="access-info">
          <div class="access-name">${esc(u.name || u.email.split("@")[0])}</div>
          <div class="access-email">${esc(u.email)}</div>
        </div>
        <select class="access-select" data-role-uid="${u.id}">
          <option value="pending" ${u.role==="pending"?"selected":""}>Pending</option>
          <option value="employee" ${u.role==="employee"?"selected":""}>Employee</option>
          <option value="boss" ${u.role==="boss"?"selected":""}>Boss</option>
        </select>
      </div>`;
    }).join("");
    usersHtml = `
      <div class="panel" style="margin-top:18px">
        <h3>User access</h3>
        <div class="body access-list">${userRows}</div>
      </div>`;
  }

  $("#content").innerHTML = `
    <div class="tabletools">
      <span class="count">${allMembers.length} ${allMembers.length===1?"member":"members"}</span>
      <span class="spacer"></span>
      <button class="linkbtn" id="exportBtn">Export CSV</button>
    </div>
    <div class="team-cards">${cardsHtml}</div>
  ` + usersHtml;

  $("#content").querySelectorAll("[data-edit]").forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); openModal("team",b.dataset.edit); });
  $("#content").querySelectorAll("[data-del]").forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); del("team",b.dataset.del); });
  $("#content").querySelectorAll("[data-member-jump]").forEach(card=>{
    card.onclick = ()=>{
      q = card.dataset.memberJump;
      view = "tasks";
      render();
    };
  });

  $("#exportBtn").onclick=()=>exportCSV("team",DB.team,[["name","Name"],["role","Role"]]);

  if(currentUserRole === "boss"){
    $("#content").querySelectorAll("[data-role-uid]").forEach(sel=>{
      sel.onchange = async ()=>{
        const uid = sel.dataset.roleUid;
        const newRole = sel.value;
        await setDoc(doc(db,"users",uid), { role:newRole }, { merge:true });
        toast("Role updated.");
      };
    });
  }
}
function renderTasks(){
  const visibleTasks = currentUserRole==="boss" ? DB.tasks : DB.tasks.filter(k=>k.assigneeId===currentUser.uid);
  const rows = visibleTasks.filter(k=>match({...k,_p:projTitle(k.projectId),_a:teamName(k.assigneeId)}));

  const cardsHtml = rows.length ? rows.map(k=>{
    const isDone = k.status==="Done";
    const isDoing = k.status==="Doing";
    return `
    <div class="task-card ${isDone?'done':''}">
      <div class="task-check ${isDone?'checked':''}" data-toggle-done="${k.id}">${isDone?"&#10003;":""}</div>
      <div class="task-body">
        <div class="task-card-top">
          <div>
            <div class="task-card-title">${esc(k.title)}</div>
            <div class="task-card-meta">${esc(projTitle(k.projectId))} &middot; ${esc(teamName(k.assigneeId))}</div>
          </div>
          <span class="when ${dueClass(k.due,isOpenTask(k))}">${k.due?dueLabel(k.due):"\u2014"}</span>
        </div>
        <div class="task-card-bottom">
          <div class="doing-tag ${isDoing?'active':''} ${isDone?'disabled':''}" data-toggle-doing="${k.id}">Doing</div>
        <div class="task-icons">
  <span class="ticon" data-report="${k.id}" title="Report">&#128172;</span>
  <span class="ticon" data-edit="${k.id}" title="Edit">&#9998;</span>
  ${currentUserRole==="boss" ? `<span class="ticon del" data-del="${k.id}" title="Delete">&#10005;</span>` : ""}
        </div>
        </div>
      </div>
    </div>`;
  }).join("") : `<div class="empty"><b>Nothing here yet</b>Add a task to build your workstream.</div>`;

  $("#content").innerHTML = `
    <div class="tabletools">
      <span class="count">${rows.length} ${rows.length===1?"task":"tasks"}</span>
      <span class="spacer"></span>
      <button class="linkbtn" id="exportBtn">Export CSV</button>
    </div>
    <div class="task-cards">${cardsHtml}</div>
  `;
  $("#content").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openModal("tasks",b.dataset.edit));
  $("#content").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>del("tasks",b.dataset.del));
  $("#content").querySelectorAll("[data-report]").forEach(b=>b.onclick=()=>openReportModal(b.dataset.report));

  $("#content").querySelectorAll("[data-toggle-done]").forEach(el=>{
    el.onclick = async ()=>{
      const id = el.dataset.toggleDone;
      const task = DB.tasks.find(t=>t.id===id);
      if(!task) return;
      const newStatus = task.status==="Done" ? "To do" : "Done";
      await saveRecord("tasks", {...task, status:newStatus});
    };
  });

  $("#content").querySelectorAll("[data-toggle-doing]").forEach(el=>{
    el.onclick = async ()=>{
      const id = el.dataset.toggleDoing;
      const task = DB.tasks.find(t=>t.id===id);
      if(!task || task.status==="Done") return;
      const newStatus = task.status==="Doing" ? "To do" : "Doing";
      await saveRecord("tasks", {...task, status:newStatus});
    };
  });

  $("#exportBtn").onclick=()=>exportCSV("tasks",DB.tasks,
    [["title","Task"],["_project","Project"],["_assignee","Assignee"],["status","Status"],["due","Due"]],
    k=>({...k,_project:projTitle(k.projectId),_assignee:teamName(k.assigneeId)}));
}
function wireRows(coll){
  $("#content").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openModal(coll,b.dataset.edit));
  $("#content").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>del(coll,b.dataset.del));
}

function exportCSV(name, arr, cols, mapper){
  const data = mapper? arr.map(mapper):arr;
  const head = cols.map(c=>c[1]).join(",");
  const body = data.map(o=>cols.map(c=>{
    let v=o[c[0]]; v=v==null?"":String(v);
    return '"'+v.replace(/"/g,'""')+'"';
  }).join(",")).join("\n");
  const blob=new Blob([head+"\n"+body],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="origami-"+name+".csv";
  a.click();
  toast("Exported "+name+".csv");
}

const FORMS = {
  clients:{title:"client", fields:[
    {k:"name",l:"Client name",t:"text",req:true},
    {k:"industry",l:"Industry",t:"text"},
    {k:"contact",l:"Primary contact",t:"text"},
    {k:"status",l:"Status",t:"select",opts:["Active","Prospect","Dormant"]},
    {k:"retainer",l:"Retainer (ETB)",t:"number"},
    {k:"notes",l:"Notes",t:"textarea",full:true},
  ]},
  projects:{title:"project", fields:[
    {k:"title",l:"Project title",t:"text",req:true,full:true},
    {k:"clientId",l:"Client",t:"ref",ref:"clients"},
   {k:"ownerId",l:"Owner",t:"ref",ref:"users"},
    {k:"status",l:"Status",t:"select",opts:["Not started","In progress","Review","Delivered"]},
    {k:"priority",l:"Priority",t:"select",opts:["High","Medium","Low"]},
    {k:"due",l:"Due date",t:"date"},
    {k:"progress",l:"Progress %",t:"number"},
    {k:"fee",l:"Fee (ETB)",t:"number"},
  ]},
  team:{title:"member", fields:[
    {k:"name",l:"Name",t:"text",req:true},
    {k:"role",l:"Role",t:"text"},
  ]},
  tasks:{title:"task", fields:[
    {k:"title",l:"Task",t:"text",req:true,full:true},
    {k:"projectId",l:"Project",t:"ref",ref:"projects"},
  {k:"assigneeId",l:"Assignee",t:"ref",ref:"users"},
    {k:"status",l:"Status",t:"select",opts:["To do","Doing","Done"]},
    {k:"due",l:"Due date",t:"date"},
  ]},
};
function refLabel(coll,o){
  if(coll==="projects") return o.title;
  if(coll==="users") return o.name || o.email;
  return o.name;
}

function openModal(coll, id){
  const cfg=FORMS[coll];
  const rec = id? DB[coll].find(x=>x.id===id):{};
  const editing=!!id;
  const fieldsHtml = cfg.fields.map(f=>{
    const val = rec[f.k]!=null?rec[f.k]:"";
    let input="";
  if(f.t==="select"){
    input=`<select name="${f.k}">${f.opts.map(o=>`<option ${o===val?"selected":""}>${o}</option>`).join("")}</select>`;
}else if(f.t==="ref"){
  let list=DB[f.ref];
  if(f.ref==="users"){
    list = list.filter(u=>u.role==="employee" || u.role==="boss");
  }
  input=`<select name="${f.k}"><option value="">\u2014</option>${list.map(o=>`<option value="${o.id}" ${o.id===val?"selected":""}>${esc(refLabel(f.ref,o))}</option>`).join("")}</select>`;
}else if(f.t==="textarea"){
  input=`<textarea name="${f.k}">${esc(val)}</textarea>`;
}else{
  input=`<input type="${f.t}" name="${f.k}" value="${esc(val)}" ${f.req?"required":""} ${f.t==="number"?'min="0"':""}/>`;
}
return `<div class="field" style="${f.full?'grid-column:1/-1':''}"><label>${f.l}</label>${input}</div>`;
}).join("");

  $("#modal").innerHTML=`
    <header><div class="eyebrow">${editing?"Edit":"New"} ${cfg.title}</div><h2>${editing?esc(rec[cfg.fields[0].k]||""):"Add "+cfg.title}</h2></header>
    <div class="form"><div class="grid2">${fieldsHtml}</div></div>
    <footer>
      <button class="btn ghost" id="cancelBtn">Cancel</button>
      <button class="btn" id="saveBtn">${editing?"Save changes":"Add "+cfg.title}</button>
    </footer>`;
  $("#overlay").classList.add("show");
  $("#cancelBtn").onclick=closeModal;
 $("#saveBtn").onclick=async ()=>{
  const data = id? {...rec}:{id:uid()};
  let ok=true;
  cfg.fields.forEach(f=>{
    const el=$(`[name="${f.k}"]`,$("#modal"));
    let v=el.value;
    if(f.t==="number") v=v===""?0:Number(v);
    if(f.req && !String(v).trim()){ ok=false; el.style.borderColor="var(--red)"; }
    data[f.k]=v;
  });
  if(!ok){ toast("Please fill in the required field."); return; }

  if(coll==="projects"){
    const isNew = !id;
    const statusChanged = !isNew && rec.status !== data.status;
    if(isNew){
      data.lastActivity = { type:"created", timestamp:Date.now(), detail:"Project created" };
    } else if(statusChanged){
      data.lastActivity = { type:"status_change", timestamp:Date.now(), detail:`Status changed to "${data.status}"` };
    }
  }

  const success = await saveRecord(coll, data);
  if(success){ closeModal(); toast(id?"Saved.":"Added."); }
};
}
function closeModal(){ $("#overlay").classList.remove("show"); $("#modal").innerHTML=""; }

async function del(coll,id){
  const rec=DB[coll].find(x=>x.id===id);
  const nm = rec? (rec.name||rec.title):"this record";
  if(!confirm(`Delete "${nm}"? This cannot be undone.`)) return;
  const success = await deleteRecord(coll, id);
  if(success) toast("Deleted.");
}

let toastT;
function toast(msg){
  const el=$("#toast"); el.textContent=msg; el.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("show"),2200);
}

$("#nav").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  view=b.dataset.view; q=""; render();
});
$("#addBtn").onclick=()=>openModal(view,null);
$("#overlay").addEventListener("click",e=>{ if(e.target.id==="overlay") closeModal(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeModal(); });

function showApp(){
  $("#authwrap").style.display="none";
  $("#pendingScreen").style.display="none";
  $("#side").style.display="flex";
  $("#main").style.display="flex";
  $("#whoEmail").textContent = currentUser.email;

  const myUserDoc = DB.users.find(u=>u.id===currentUser.uid) || {};
  const displayName = myUserDoc.name || currentUser.email.split("@")[0];
  $("#psName").textContent = displayName;
  $("#psRole").textContent = currentUserRole==="boss" ? "Boss" : "Employee";
  $("#avatarInitial").textContent = displayName.charAt(0).toUpperCase();
  $("#profileSnippet").onclick = ()=>{ view="profile"; render(); };
}
function showAuth(){
  $("#authwrap").style.display="flex";
  $("#pendingScreen").style.display="none";
  $("#side").style.display="none";
  $("#main").style.display="none";
}
function showPending(){
  $("#authwrap").style.display="none";
  $("#side").style.display="none";
  $("#main").style.display="none";
  $("#pendingScreen").style.display="flex";
}

$("#loginBtn").onclick = async ()=>{
  const email = $("#loginEmail").value.trim();
  const pass = $("#loginPass").value;
  $("#loginErr").textContent = "";
  if(!email || !pass){ $("#loginErr").textContent = "Enter your email and password."; return; }
  try{
    await signInWithEmailAndPassword(auth, email, pass);
  }catch(e){
    $("#loginErr").textContent = "Could not sign in \u2014 check your email and password.";
  }
};
$("#loginPass").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#loginBtn").click(); });
$("#loginEmail").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#loginBtn").click(); });
$("#signOutBtn").onclick = async ()=>{
  try{
    stopSync();
    await signOut(auth);
  }catch(e){
    console.log("Sign out FAILED:", e);
  }
};
$("#pendingSignOutBtn").onclick = async ()=>{
  await signOut(auth);
};
$("#signupBtn").onclick = async () => {
  const email = $("#loginEmail").value.trim();
  const pass = $("#loginPass").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const derivedName = email.split("@")[0];
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      name: derivedName,
      role: "pending"
    });
    console.log("USER CREATED, role: pending");
  } catch (e) {
    console.log(e.message);
  }
};
onAuthStateChanged(auth, async (user)=>{
  if(user){
    console.log("AUTH STATE FIRED. user:", user ? user.email : "null");
    currentUser = user;

    const userDocSnap = await getDoc(doc(db, "users", user.uid));
    if(userDocSnap.exists()){
      currentUserRole = userDocSnap.data().role;
    } else {
      currentUserRole = "pending";
    }
    console.log("Logged in as:", user.email, "role:", currentUserRole);

    if(currentUserRole === "pending"){
      showPending();
      return;
    }

    showApp();
    await seedIfEmpty();
    startSync();
    render();
  }else{
    currentUser = null;
    currentUserRole = null;
    stopSync();
    showAuth();
  }
});

function renderProfile(){
  const myUserDoc = DB.users.find(u=>u.id===currentUser.uid) || {};
  $("#content").innerHTML = `
    <div class="panel" style="max-width:480px">
      <h3>Your profile</h3>
      <div class="form">
        <div class="field">
          <label>Name</label>
          <input type="text" id="profileName" value="${esc(myUserDoc.name||"")}" />
        </div>
        <div class="field">
          <label>Email</label>
          <input type="email" id="profileEmail" value="${esc(currentUser.email||"")}" />
        </div>
        <div class="field">
          <label>New password (leave blank to keep current)</label>
          <input type="password" id="profilePassword" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
        </div>
        <div class="field">
          <label>Current password (required to save email/password changes)</label>
          <input type="password" id="profileCurrentPassword" placeholder="Confirm it's you" />
        </div>
        <div class="autherr" id="profileErr"></div>
        <button class="btn" id="profileSaveBtn" style="width:100%">Save changes</button>
      </div>
    </div>
  `;
  wireProfileForm();
}
function wireProfileForm(){
  $("#profileSaveBtn").onclick = async ()=>{
    const newName = $("#profileName").value.trim();
    const newEmail = $("#profileEmail").value.trim();
    const newPassword = $("#profilePassword").value;
    const currentPassword = $("#profileCurrentPassword").value;
    $("#profileErr").textContent = "";

    const emailChanged = newEmail !== currentUser.email;
    const passwordChanged = newPassword.length > 0;

    if((emailChanged || passwordChanged) && !currentPassword){
      $("#profileErr").textContent = "Enter your current password to change email or password.";
      return;
    }

    try{
      if(emailChanged || passwordChanged){
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
      }
      if(emailChanged){
        await updateEmail(currentUser, newEmail);
      }
      if(passwordChanged){
        await updatePassword(currentUser, newPassword);
      }
      await setDoc(doc(db,"users",currentUser.uid), { name:newName, email:newEmail }, { merge:true });

      toast("Profile updated.");
      $("#profilePassword").value="";
      $("#profileCurrentPassword").value="";
    }catch(e){
      console.log(e);
      $("#profileErr").textContent = "Could not save \u2014 " + (e.code==="auth/wrong-password" ? "current password is incorrect." : e.code==="auth/requires-recent-login" ? "please sign out and back in, then try again." : "please try again.");
    }
  };
}

let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

function renderCalendar(){
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth+1, 0).getDate();
  const todayStr = today();

  const dueItems = [
    ...DB.projects.filter(p=>isOpenProject(p) && p.due && (currentUserRole==="boss" || p.ownerId===currentUser.uid)).map(p=>({date:p.due, label:p.title, type:"Project"})),
    ...DB.tasks.filter(k=>isOpenTask(k) && k.due && (currentUserRole==="boss" || k.assigneeId===currentUser.uid)).map(k=>({date:k.due, label:k.title, type:"Task"}))
  ];

  let cells = "";
  for(let i=0;i<startWeekday;i++){
    cells += `<div class="cal-cell empty"></div>`;
  }
  for(let day=1; day<=daysInMonth; day++){
    const dateStr = `${calendarYear}-${String(calendarMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const dayItems = dueItems.filter(it=>it.date===dateStr);
    const isToday = dateStr===todayStr;
    cells += `
      <div class="cal-cell ${isToday?"today":""}">
        <div class="cal-daynum">${day}</div>
        ${dayItems.map(it=>`<div class="cal-item ${it.type.toLowerCase()}">${esc(it.label)}</div>`).join("")}
      </div>`;
  }

  $("#content").innerHTML = `
    <div class="cal-header">
      <button class="btn ghost" id="calPrevBtn">&lt; Prev</button>
      <h2>${monthNames[calendarMonth]} ${calendarYear}</h2>
      <button class="btn ghost" id="calNextBtn">Next &gt;</button>
    </div>
    <div class="cal-grid">
      <div class="cal-weekday">Sun</div><div class="cal-weekday">Mon</div><div class="cal-weekday">Tue</div>
      <div class="cal-weekday">Wed</div><div class="cal-weekday">Thu</div><div class="cal-weekday">Fri</div><div class="cal-weekday">Sat</div>
      ${cells}
    </div>
  `;

  $("#calPrevBtn").onclick = ()=>{
    calendarMonth--;
    if(calendarMonth<0){ calendarMonth=11; calendarYear--; }
    renderCalendar();
  };
  $("#calNextBtn").onclick = ()=>{
    calendarMonth++;
    if(calendarMonth>11){ calendarMonth=0; calendarYear++; }
    renderCalendar();
  };
}
function openReportModal(taskId){
  const task = DB.tasks.find(t=>t.id===taskId);
  if(!task) return;
  const reports = task.reports || [];

  const entriesHtml = reports.length ? reports.map(r=>`
    <div class="report-entry">
      <div class="report-entry-head">
        <span class="report-author">${esc(r.author)}</span>
        <span class="report-time">${new Date(r.timestamp).toLocaleString()}</span>
      </div>
      <div class="report-text">${esc(r.text)}</div>
    </div>
  `).join("") : `<div class="empty"><b>No updates yet</b>Be the first to add a report on this task.</div>`;

  $("#modal").innerHTML = `
    <header><div class="eyebrow">Task report</div><h2>${esc(task.title)}</h2></header>
    <div class="form">
      <div class="report-log">${entriesHtml}</div>
      <div class="field" style="margin-top:16px">
        <label>Add an update</label>
        <textarea id="reportNewText" placeholder="What's the latest on this task?"></textarea>
      </div>
    </div>
    <footer>
      <button class="btn ghost" id="cancelBtn">Close</button>
      <button class="btn" id="reportSaveBtn">Add entry</button>
    </footer>
  `;
  $("#overlay").classList.add("show");
  $("#cancelBtn").onclick = closeModal;
  $("#reportSaveBtn").onclick = async ()=>{
    const text = $("#reportNewText").value.trim();
    if(!text) return;
    const myUserDoc = DB.users.find(u=>u.id===currentUser.uid) || {};
    const newEntry = {
      author: myUserDoc.name || currentUser.email.split("@")[0],
      authorRole: currentUserRole,
      text: text,
      timestamp: Date.now()
    };
    const updatedReports = [...reports, newEntry];
    const success = await saveRecord("tasks", {...task, reports: updatedReports});
    if(success){
      toast("Update added.");
      openReportModal(taskId);
    }
  };
}