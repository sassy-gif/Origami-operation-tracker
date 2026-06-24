
"use strict";

/* =====================================================================
   FIREBASE SETUP
   Replace the values below with your own project's config.
   Get this from: Firebase Console -> Project settings -> General ->
   "Your apps" -> Web app -> SDK setup and configuration.
===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

/* ---------------------------------------------------------------- */

let DB = { clients:[], projects:[], team:[], tasks:[] };
let view = "dashboard";
let q = "";
let currentUser = null;
let unsubscribers = [];

const $ = (s,el=document)=>el.querySelector(s);
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today = ()=> new Date().toISOString().slice(0,10);
const money = n => (Number(n)||0).toLocaleString("en-US") + " ETB";
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const COLLECTIONS = ["clients","projects","team","tasks"];

/* ---------- Firestore live sync ---------- */
function startSync(){
  unsubscribers.forEach(u=>u());
  unsubscribers = [];
  let loadedCount = 0;
  COLLECTIONS.forEach(coll=>{
    const unsub = onSnapshot(collection(db, coll), snap=>{
      DB[coll] = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      loadedCount++;
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

/* ---------- one-time seed (only used if collections are empty) ---------- */
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

/* ---------- lookups ---------- */
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

/* ---------- render shell ---------- */
function render(){
  if(!currentUser) return;
  $("#nav").querySelectorAll("button").forEach(b=>b.classList.toggle("on", b.dataset.view===view));
  const titles={dashboard:"Dashboard",clients:"Clients",projects:"Projects",team:"Team",tasks:"Tasks"};
  const eyebrows={dashboard:"Command Center",clients:"Accounts",projects:"Engagements",team:"People",tasks:"Workstream"};
  $("#title").textContent=titles[view];
  $("#eyebrow").textContent=eyebrows[view];
  const onList = view!=="dashboard";
  $("#search").style.display = onList?"block":"none";
  $("#addBtn").style.display = onList?"block":"none";
  $("#addBtn").textContent = "+ Add " + ({clients:"client",projects:"project",team:"member",tasks:"task"}[view]||"");
  if(view==="dashboard") renderDashboard();
  if(view==="clients") renderClients();
  if(view==="projects") renderProjects();
  if(view==="team") renderTeam();
  if(view==="tasks") renderTasks();
}

/* ---------- dashboard ---------- */
function renderDashboard(){
  const activeClients = DB.clients.filter(c=>c.status==="Active").length;
  const openProjects = DB.projects.filter(isOpenProject);
  const overdue = openProjects.filter(p=>p.due && p.due<today()).length
                + DB.tasks.filter(k=>isOpenTask(k) && k.due && k.due<today()).length;
  const pipeline = openProjects.reduce((s,p)=>s+(Number(p.fee)||0),0);
  const dueWeek = DB.tasks.filter(k=>isOpenTask(k) && k.due && k.due>=today() && k.due<=plus(7)).length;

  const statuses=["Not started","In progress","Review","Delivered"];
  const counts=statuses.map(s=>DB.projects.filter(p=>p.status===s).length);
  const maxc=Math.max(1,...counts);

  const workload = DB.team.map(m=>{
    const n = DB.projects.filter(p=>p.ownerId===m.id && isOpenProject(p)).length
            + DB.tasks.filter(k=>k.assigneeId===m.id && isOpenTask(k)).length;
    return {name:m.name, n};
  });
  const maxw=Math.max(1,...workload.map(w=>w.n));

  const due = [
    ...openProjects.filter(p=>p.due).map(p=>({type:"Project",label:p.title,due:p.due,open:true})),
    ...DB.tasks.filter(k=>isOpenTask(k)&&k.due).map(k=>({type:"Task",label:k.title,due:k.due,open:true}))
  ].sort((a,b)=>a.due<b.due?-1:1).slice(0,7);

  $("#content").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="label">Active clients</div><div class="val">${activeClients}</div><div class="sub">${DB.clients.length} total accounts</div></div>
      <div class="kpi"><div class="label">Open projects</div><div class="val">${openProjects.length}</div><div class="sub">${DB.projects.length} all-time</div></div>
      <div class="kpi ${overdue?'alert':''}"><div class="label">Overdue</div><div class="val">${overdue}</div><div class="sub">projects + tasks past due</div></div>
      <div class="kpi"><div class="label">Active value</div><div class="val" style="font-size:22px">${money(pipeline)}</div><div class="sub">across open projects</div></div>
      <div class="kpi"><div class="label">Due this week</div><div class="val">${dueWeek}</div><div class="sub">tasks in next 7 days</div></div>
    </div>
    <div class="panels">
      <div class="panel">
        <h3>Projects by status</h3>
        <div class="body">
          ${statuses.map((s,i)=>`
            <div class="bar-row">
              <div class="nm">${s}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${counts[i]/maxc*100}%;${s==='Delivered'?'background:var(--green)':s==='Review'?'background:var(--gold)':''}"></div></div>
              <div class="ct">${counts[i]}</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="panel">
        <h3>Team workload</h3>
        <div class="body">
          ${workload.map(w=>`
            <div class="bar-row">
              <div class="nm">${esc(w.name)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${w.n/maxw*100}%"></div></div>
              <div class="ct">${w.n}</div>
            </div>`).join("")}
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:18px">
      <h3>Due soon &amp; overdue</h3>
      <div class="body">
        ${due.length? `<ul class="duelist">${due.map(d=>{
          const cl=dueClass(d.due,true);
          return `<li>${statusPill(d.type==="Project"?"Review":"Doing").replace(/Review|Doing/,d.type)}<span>${esc(d.label)}</span><span class="when ${cl}">${dueLabel(d.due)}</span></li>`;
        }).join("")}</ul>` : `<div class="empty"><b>Nothing pending</b>You're all caught up.</div>`}
      </div>
    </div>
  `;
}

/* ---------- generic list helpers ---------- */
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

/* ---------- clients ---------- */
function renderClients(){
  const rows = DB.clients.filter(c=>match({...c,_n:c.name}));
  const html = rows.length? rows.map(c=>`
    <tr>
      <td><div class="name">${esc(c.name)}</div><div class="meta">${esc(c.industry||"\u2014")}</div></td>
      <td>${esc(c.contact||"\u2014")}</td>
      <td>${statusPill(c.status)}</td>
      <td>${Number(c.retainer)?money(c.retainer):"\u2014"}</td>
      <td>${DB.projects.filter(p=>p.clientId===c.id&&isOpenProject(p)).length}</td>
      <td>${acts(c.id)}</td>
    </tr>`).join("") : emptyRow(6,"Add your first client to get started.");
  $("#content").innerHTML = tableShell(["Client","Contact","Status","Retainer","Open projects",""], html, rows.length);
  wireRows("clients");
  $("#exportBtn").onclick=()=>exportCSV("clients",DB.clients,
    [["name","Client"],["industry","Industry"],["contact","Contact"],["status","Status"],["retainer","Retainer"],["notes","Notes"]]);
}

/* ---------- projects ---------- */
function renderProjects(){
  const rows = DB.projects.filter(p=>match({...p,_c:clientName(p.clientId),_o:teamName(p.ownerId)}));
  const html = rows.length? rows.map(p=>`
    <tr>
      <td><div class="name">${esc(p.title)}</div><div class="meta">${esc(clientName(p.clientId))}</div></td>
      <td>${esc(teamName(p.ownerId))}</td>
      <td>${statusPill(p.status)}</td>
      <td>${prioPill(p.priority)}</td>
      <td><span class="when ${dueClass(p.due,isOpenProject(p))}" style="font-weight:700">${p.due?dueLabel(p.due):"\u2014"}</span></td>
      <td><div class="prog"><div class="t"><div class="f" style="width:${Number(p.progress)||0}%"></div></div><div class="p">${Number(p.progress)||0}%</div></div></td>
      <td>${Number(p.fee)?money(p.fee):"\u2014"}</td>
      <td>${acts(p.id)}</td>
    </tr>`).join("") : emptyRow(8,"Add a project to start tracking delivery.");
  $("#content").innerHTML = tableShell(["Project","Owner","Status","Priority","Due","Progress","Fee",""], html, rows.length);
  wireRows("projects");
  $("#exportBtn").onclick=()=>exportCSV("projects",DB.projects,
    [["title","Project"],["_client","Client"],["_owner","Owner"],["status","Status"],["priority","Priority"],["due","Due"],["progress","Progress %"],["fee","Fee"]],
    p=>({...p,_client:clientName(p.clientId),_owner:teamName(p.ownerId)}));
}

/* ---------- team ---------- */
function renderTeam(){
  const rows = DB.team.filter(m=>match(m));
  const html = rows.length? rows.map(m=>{
    const op=DB.projects.filter(p=>p.ownerId===m.id&&isOpenProject(p)).length;
    const ot=DB.tasks.filter(k=>k.assigneeId===m.id&&isOpenTask(k)).length;
    return `<tr>
      <td><div class="name">${esc(m.name)}</div></td>
      <td>${esc(m.role||"\u2014")}</td>
      <td>${op}</td>
      <td>${ot}</td>
      <td>${acts(m.id)}</td>
    </tr>`;}).join("") : emptyRow(5,"Add your team members.");
  $("#content").innerHTML = tableShell(["Name","Role","Open projects","Open tasks",""], html, rows.length);
  wireRows("team");
  $("#exportBtn").onclick=()=>exportCSV("team",DB.team,[["name","Name"],["role","Role"]]);
}

/* ---------- tasks ---------- */
function renderTasks(){
  const rows = DB.tasks.filter(k=>match({...k,_p:projTitle(k.projectId),_a:teamName(k.assigneeId)}));
  const html = rows.length? rows.map(k=>`
    <tr>
      <td><div class="name">${esc(k.title)}</div><div class="meta">${esc(projTitle(k.projectId))}</div></td>
      <td>${esc(teamName(k.assigneeId))}</td>
      <td>${statusPill(k.status)}</td>
      <td><span class="when ${dueClass(k.due,isOpenTask(k))}" style="font-weight:700">${k.due?dueLabel(k.due):"\u2014"}</span></td>
      <td>${acts(k.id)}</td>
    </tr>`).join("") : emptyRow(5,"Add a task to build your workstream.");
  $("#content").innerHTML = tableShell(["Task","Assignee","Status","Due",""], html, rows.length);
  wireRows("tasks");
  $("#exportBtn").onclick=()=>exportCSV("tasks",DB.tasks,
    [["title","Task"],["_project","Project"],["_assignee","Assignee"],["status","Status"],["due","Due"]],
    k=>({...k,_project:projTitle(k.projectId),_assignee:teamName(k.assigneeId)}));
}

function wireRows(coll){
  $("#content").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openModal(coll,b.dataset.edit));
  $("#content").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>del(coll,b.dataset.del));
}

/* ---------- CSV ---------- */
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

/* ---------- modal / forms ---------- */
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
    {k:"ownerId",l:"Owner",t:"ref",ref:"team"},
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
    {k:"assigneeId",l:"Assignee",t:"ref",ref:"team"},
    {k:"status",l:"Status",t:"select",opts:["To do","Doing","Done"]},
    {k:"due",l:"Due date",t:"date"},
  ]},
};
function refLabel(coll,o){ return coll==="projects"?o.title:o.name; }

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
      const list=DB[f.ref];
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

/* ---------- toast ---------- */
let toastT;
function toast(msg){
  const el=$("#toast"); el.textContent=msg; el.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("show"),2200);
}

/* ---------- events ---------- */
$("#nav").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  view=b.dataset.view; q=""; $("#search").value=""; render();
});
$("#addBtn").onclick=()=>openModal(view,null);
$("#search").addEventListener("input",e=>{ q=e.target.value; render(); });
$("#overlay").addEventListener("click",e=>{ if(e.target.id==="overlay") closeModal(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeModal(); });

/* ---------- auth ---------- */
function showApp(){
  $("#authwrap").style.display="none";
  $("#side").style.display="flex";
  $("#main").style.display="flex";
  $("#whoEmail").textContent = currentUser.email;
}
function showAuth(){
  $("#authwrap").style.display="flex";
  $("#side").style.display="none";
  $("#main").style.display="none";
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
  stopSync();
  await signOut(auth);
};

onAuthStateChanged(auth, async (user)=>{
  if(user){
    currentUser = user;
    showApp();
    await seedIfEmpty();
    startSync();
    render();
  }else{
    currentUser = null;
    stopSync();
    showAuth();
  }
});
