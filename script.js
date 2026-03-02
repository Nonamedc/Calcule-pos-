/* STATE */
let a=0,b=0,op="+";
let score={ok:0,nok:0,streak:0,maxStreak:0,pts:0,divOk:0};
let sessionHist=[];
let guideSteps=[],guideIdx=0;
let currentTab="manuel",currentNiv="cp";
let chronoIv=null,chronoLeft=0,chronoTotal=0,chronoOn=false;
let cPts=0,cOk=0,cNok=0,cMaxStr=0,cStr=0;
let profils=JSON.parse(localStorage.getItem("cp_profils6")||"[]");
let curProfil=null;
let viewUsed=false;
let exerciceTermine=false;
let essaisRestants=0,maxEssais=3;
// Stats
let opStats={"+":{ok:0,total:0},"-":{ok:0,total:0},"*":{ok:0,total:0},"/":{ok:0,total:0}};
let erreurs={}; // expr -> count
let graphData=[]; // [{correct:bool, pts:int}]
// Theme
let currentTheme=localStorage.getItem("cp_theme")||"dark";
document.documentElement.setAttribute("data-theme",currentTheme);
const posed=document.getElementById("posed");

/* THEME */
function toggleTheme(){
  currentTheme=currentTheme==="dark"?"light":"dark";
  document.documentElement.setAttribute("data-theme",currentTheme);
  localStorage.setItem("cp_theme",currentTheme);
  document.querySelector(".theme-btn").textContent=currentTheme==="dark"?"🌙":"☀️";
}
document.querySelector(".theme-btn").textContent=currentTheme==="dark"?"🌙":"☀️";

/* NIVEAUX */
const NIV={
  cp:    {add:[1,20,1,20],sub:[5,20,1,10],mul:null,div:null,pts:2},
  ce1:   {add:[1,99,1,99],sub:[10,99,1,50],mul:[2,9,1,5],div:null,pts:3},
  ce2:   {add:[10,999,10,999],sub:[10,999,10,500],mul:[2,9,10,99],div:[2,9,1,5],pts:4},
  cm1:   {add:[100,9999,100,9999],sub:[100,9999,100,5000],mul:[10,99,2,9],div:[10,99,2,9],pts:5},
  cm2:   {add:[1000,99999,1000,99999],sub:[1000,99999,1000,50000],mul:[10,999,10,99],div:[100,999,2,19],pts:7},
  college:{add:[10000,999999,10000,999999],sub:[10000,999999,10000,500000],mul:[100,9999,10,999],div:[100,9999,2,99],pts:10},
};
const OP_PTS={"+":1,"-":1.2,"*":1.5,"/":2};

function calcPts(hintUsed){
  const base=NIV[currentNiv]?.pts||5;
  const opMul=OP_PTS[op]||1;
  const streakBonus=score.streak>=10?15:score.streak>=5?8:score.streak>=3?3:0;
  if(viewUsed)return 0;
  if(hintUsed)return Math.max(1,Math.round(base*opMul*0.3));
  return Math.round(base*opMul)+streakBonus;
}

/* PROFILS */
const EMOJIS=["🦊","🐼","🐸","🦁","🐯","🐻","🐨","🐙","🦋","🌟","🚀","⚡","🎯","🎮","🏆","🌈","🍕","🎸","🦄","🔥"];
function initProfils(){
  const g=document.getElementById("egrid");g.innerHTML="";
  EMOJIS.forEach(e=>{
    const d=document.createElement("div");d.className="eopt";d.textContent=e;
    d.onclick=()=>{document.querySelectorAll(".eopt").forEach(x=>x.classList.remove("sel"));d.classList.add("sel");};
    g.appendChild(d);
  });
  if(g.children[0])g.children[0].classList.add("sel");
  renderProfils();renderLB();renderBadges();
}
function renderProfils(){
  const l=document.getElementById("profil-list");l.innerHTML="";
  profils.forEach((p,i)=>{
    const d=document.createElement("div");d.className="pchip"+(curProfil&&curProfil.nom===p.nom?" active":"");
    d.innerHTML="<span>"+p.emoji+"</span><span>"+p.nom+"</span><span class='del' onclick='delProfil("+i+",event)'>✕</span>";
    d.onclick=e=>{if(e.target.classList.contains("del"))return;selectProfil(i);};
    l.appendChild(d);
  });
  if(!profils.length)l.innerHTML="<span style='color:var(--muted);font-size:.78rem;'>Aucun profil</span>";
}
function selectProfil(i){
  if(curProfil)saveProfil();
  curProfil=profils[i];
  score=Object.assign({ok:0,nok:0,streak:0,maxStreak:0,pts:0,divOk:0},curProfil.score||{});
  sessionHist=curProfil.history||[];
  opStats=curProfil.opStats||{"+":{"ok":0,"total":0},"-":{"ok":0,"total":0},"*":{"ok":0,"total":0},"/":{"ok":0,"total":0}};
  erreurs=curProfil.erreurs||{};
  graphData=curProfil.graphData||[];
  updateScore();renderHist();renderProfils();renderLB();renderBadges();renderStats();
}
function saveProfil(){
  if(!curProfil)return;
  const i=profils.findIndex(p=>p.nom===curProfil.nom);
  if(i>=0){
    profils[i].score=score;profils[i].history=sessionHist;
    profils[i].opStats=opStats;profils[i].erreurs=erreurs;profils[i].graphData=graphData;
    localStorage.setItem("cp_profils6",JSON.stringify(profils));
  }
}
function delProfil(i,e){
  e.stopPropagation();
  if(curProfil&&profils[i].nom===curProfil.nom)curProfil=null;
  profils.splice(i,1);localStorage.setItem("cp_profils6",JSON.stringify(profils));
  renderProfils();renderLB();
}
function openPM(){document.getElementById("pm").classList.add("open");document.getElementById("pname").focus();}
function closePM(){document.getElementById("pm").classList.remove("open");}
function savePM(){
  const nom=document.getElementById("pname").value.trim();
  if(!nom){alert("Entre un prénom !");return;}
  if(profils.find(p=>p.nom.toLowerCase()===nom.toLowerCase())){alert("Ce prénom existe déjà !");return;}
  const emoji=document.querySelector(".eopt.sel")?.textContent||"🦊";
  profils.push({nom,emoji,score:{ok:0,nok:0,streak:0,maxStreak:0,pts:0,divOk:0},history:[],opStats:{"+":{"ok":0,"total":0},"-":{"ok":0,"total":0},"*":{"ok":0,"total":0},"/":{"ok":0,"total":0}},erreurs:{},graphData:[]});
  localStorage.setItem("cp_profils6",JSON.stringify(profils));
  closePM();selectProfil(profils.length-1);document.getElementById("pname").value="";
}

/* ESSAIS */
function initEssais(){
  maxEssais=parseInt(document.getElementById("max-essais").value)||0;
  essaisRestants=maxEssais;
  const row=document.getElementById("essais-row");
  const dots=document.getElementById("essais-dots");
  if(maxEssais===0){row.style.display="none";return;}
  row.style.display="flex";dots.innerHTML="";
  for(let i=0;i<maxEssais;i++){
    const d=document.createElement("div");d.className="essai-dot";dots.appendChild(d);
  }
}
function updateEssaisDots(){
  const dots=document.querySelectorAll(".essai-dot");
  dots.forEach((d,i)=>d.classList.toggle("used",i>=essaisRestants));
}

/* CHRONO */
let audioCtx=null;
function beep(freq,dur,type){
  try{
    audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);
    o.frequency.value=freq;o.type=type||"sine";
    g.gain.setValueAtTime(0.15,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur);
    o.start();o.stop(audioCtx.currentTime+dur);
  }catch(e){}
}
function startChrono(){
  chronoTotal=parseInt(document.getElementById("chrono-dur").value);
  chronoLeft=chronoTotal;cPts=0;cOk=0;cNok=0;cMaxStr=0;cStr=0;
  currentNiv=document.getElementById("chrono-niv").value;
  document.getElementById("chrono-bar").classList.add("on");
  chronoOn=true;updChrono();
  genChrono();
  clearInterval(chronoIv);
  chronoIv=setInterval(()=>{
    chronoLeft--;updChrono();
    if(chronoLeft===30||chronoLeft===10)beep(660,0.2);
    if(chronoLeft<=0)endChrono();
  },1000);
  ["panel-manuel","panel-alea","panel-chrono","panel-stats"].forEach(id=>document.getElementById(id).style.display="none");
}
function genChrono(){
  const savedNiv=currentNiv;
  currentNiv=document.getElementById("chrono-niv").value;
  const savedOp=document.getElementById("op-alea").value;
  document.getElementById("op-alea").value=document.getElementById("chrono-op").value;
  generer(true);
  currentNiv=savedNiv;
  document.getElementById("op-alea").value=savedOp;
}
function updChrono(){
  const m=String(Math.floor(chronoLeft/60)).padStart(2,"0");
  const s=String(chronoLeft%60).padStart(2,"0");
  const el=document.getElementById("chrono-disp");
  el.textContent=m+":"+s;
  el.className="chrono-disp"+(chronoLeft<=10?" danger":chronoLeft<=30?" warn":"");
  const pct=(chronoLeft/chronoTotal)*100;
  const pb=document.getElementById("cprog-bar");
  pb.style.width=pct+"%";pb.style.background=chronoLeft<=10?"var(--red)":chronoLeft<=30?"var(--orange)":"var(--teal)";
  document.getElementById("chrono-score").textContent=cPts+" pts";
}
function stopChrono(){clearInterval(chronoIv);chronoOn=false;document.getElementById("chrono-bar").classList.remove("on");}
function endChrono(){
  stopChrono();
  document.getElementById("end-pts").textContent=cPts+" pts";
  document.getElementById("end-ok").textContent=cOk;
  document.getElementById("end-nok").textContent=cNok;
  document.getElementById("end-str").textContent=cMaxStr;
  document.getElementById("end-msg").textContent=cPts>=80?"🏆 Excellent !":cPts>=40?"👍 Bien joué !":"💪 Continue !";
  document.getElementById("end-modal").classList.add("open");
  if(curProfil){score.pts+=cPts;score.ok+=cOk;score.nok+=cNok;score.maxStreak=Math.max(score.maxStreak,cMaxStr);updateScore();saveProfil();renderLB();renderBadges();}
}
function closeEnd(){document.getElementById("end-modal").classList.remove("open");}

/* GENERER */
function rnd(mn,mx){return Math.floor(Math.random()*(mx-mn+1))+mn;}
function generer(fromChrono){
  const opSel=document.getElementById("op-alea").value;
  const niv=NIV[currentNiv];
  const keyMap={"+":"add","-":"sub","*":"mul","/":"div"};
  let ops=opSel==="mixte"?["+","-","*","/"].filter(o=>niv[keyMap[o]]):[opSel];
  if(!ops.length){alert("Opération non disponible pour ce niveau.");return;}
  op=ops[Math.floor(Math.random()*ops.length)];
  const range=niv[keyMap[op]];if(!range){alert("Opération non disponible.");return;}
  let av,bv;
  if(op==="+"){av=rnd(range[0],range[1]);bv=rnd(range[2],range[3]);}
  else if(op==="-"){av=rnd(range[0],range[1]);bv=rnd(range[2],range[3]);if(bv>av){let t=av;av=bv;bv=t;}}
  else if(op==="*"){av=rnd(range[0],range[1]);bv=rnd(range[2],range[3]);}
  else{bv=rnd(range[2],range[3]);av=rnd(Math.ceil(range[0]/bv),Math.floor(range[1]/bv))*bv;}
  a=av;b=bv;
  document.getElementById("n1").value=a;document.getElementById("n2").value=b;document.getElementById("op").value=op;
  poserCalc();
  if(!fromChrono)document.getElementById("btn-suiv").style.display="inline-block";
}

/* PLACER */
function placer(){
  const v1=document.getElementById("n1").value.trim(),v2=document.getElementById("n2").value.trim();
  if(!v1||!v2){alert("Saisis les deux nombres !");return;}
  op=document.getElementById("op").value;
  a=parseFloat(v1);b=parseFloat(v2);
  if(op==="/"&&b===0){alert("Division par zéro impossible !");return;}
  poserCalc();
}
function poserCalc(){
  document.getElementById("result").textContent="";document.getElementById("hint").textContent="";
  document.getElementById("problem").textContent=fmt(a)+" "+opSym()+" "+fmt(b)+" = ?";
  document.getElementById("legend").style.display="none";
  document.getElementById("guide-box").className="guide-box";
  document.getElementById("guide-steps").innerHTML="";
  guideSteps=[];guideIdx=0;posed.innerHTML="";viewUsed=false;exerciceTermine=false;
  initEssais();
  if(op==="+"||op==="-")buildAddSub();
  else if(op==="*")buildMul();
  else buildDiv();
  buildGuide();setupColHighlight();
  // Focus sur la première case réponse la plus à droite
  setTimeout(()=>{
    const ansInps=Array.from(posed.querySelectorAll("input.answer:not([readonly])"));
    if(ansInps.length){
      const row=ansInps[ansInps.length-1].closest(".pgrow");
      if(row){
        const rowInps=Array.from(row.querySelectorAll("input.answer:not([readonly])"));
        if(rowInps.length)rowInps[rowInps.length-1].focus();
      }
    }
  },50);
}

/* UTILS */
const opSym=()=>({"+":"+","-":"−","*":"×","/":"÷"}[op]);
function fmt(n){if(Number.isInteger(n))return String(n);return parseFloat(n.toFixed(2)).toString();}
function dig(n){return fmt(Math.abs(n));}

function mkInp(cls,val,ro,small){
  const i=document.createElement("input");
  i.type="text";i.inputMode="numeric";i.maxLength=2;i.className=cls;
  if(val!==undefined&&val!=="")i.value=val;
  if(ro){i.readOnly=true;i.tabIndex=-1;}
  else addNav(i);
  return i;
}
function mkC(cls,val,ro,small){const d=document.createElement("div");d.className=small?"c sm":"c";d.appendChild(mkInp(cls,val,ro,small));return d;}
function mkE(small){const d=document.createElement("div");d.className=small?"c sm":"c";return d;}
function mkOp(s,small){const d=document.createElement("div");d.className=small?"op-sign sm":"op-sign";d.textContent=s;return d;}
function mkRow(){const d=document.createElement("div");d.className="pgrow";return d;}
function mkHB(w,thin){const d=document.createElement("div");d.className=thin?"hbar-thin":"hbar";d.style.width=w+"px";return d;}
function colEl(ae){const d=document.createElement("div");d.style.cssText="display:flex;flex-direction:column;align-items:"+(ae?"flex-end":"flex-start")+";";return d;}

/* NAVIGATION DROITE -> GAUCHE */
function addNav(inp){
  inp.addEventListener("input",function(){
    if(this.value.length>=1){
      const row=this.closest(".pgrow");
      if(!row){focusDir(this,false);return;}
      // Toutes les cases editables de cette ligne, de droite à gauche
      const rowInps=Array.from(row.querySelectorAll("input:not([readonly])"));
      const idx=rowInps.indexOf(this);
      // Chercher la case à gauche (index inférieur)
      if(idx>0){
        rowInps[idx-1].focus();
      } else {
        // Fin de ligne, aller sur la ligne du haut (retenues)
        focusDir(this,true);
      }
    }
  });
  inp.addEventListener("keydown",function(e){
    const row=this.closest(".pgrow");
    const rowInps=row?Array.from(row.querySelectorAll("input:not([readonly])")):[];
    const idx=rowInps.indexOf(this);
    if(e.key==="Backspace"&&this.value===""){
      // Reculer = aller à droite
      if(idx<rowInps.length-1){e.preventDefault();rowInps[idx+1].focus();}
    }
    // Flèche droite = case à droite (index plus grand)
    if(e.key==="ArrowRight"&&idx<rowInps.length-1){e.preventDefault();rowInps[idx+1].focus();}
    // Flèche gauche = case à gauche (index plus petit)
    if(e.key==="ArrowLeft"&&idx>0){e.preventDefault();rowInps[idx-1].focus();}
    if(e.key==="ArrowUp"){e.preventDefault();focusDir(this,true);}
    if(e.key==="ArrowDown"){e.preventDefault();focusDir(this,false);}
  });
}

function focusDir(el,up){
  const rect=el.getBoundingClientRect();let best=null,bestD=Infinity;
  allEds().filter(i=>i!==el).forEach(i=>{
    const r=i.getBoundingClientRect();
    const ok=up?(r.top<rect.top-6):(r.top>rect.top+6);
    if(ok){const d=Math.abs(r.left-rect.left)+Math.abs(r.top-rect.top)*0.15;if(d<bestD){bestD=d;best=i;}}
  });
  if(best)best.focus();
}
function allEds(){return Array.from(posed.querySelectorAll("input:not([readonly])"));}

function setupColHighlight(){
  allEds().forEach(inp=>{
    inp.addEventListener("focus",function(){
      const rect=this.getBoundingClientRect();const cx=rect.left+rect.width/2;
      posed.querySelectorAll(".c").forEach(c=>{const cr=c.getBoundingClientRect();c.classList.toggle("col-active",Math.abs(cr.left+cr.width/2-cx)<4);});
    });
    inp.addEventListener("blur",function(){posed.querySelectorAll(".c").forEach(c=>c.classList.remove("col-active"));});
  });
}

/* LIGNES */
function numRow(cls,numStr,cols,opSign,small){
  const r=mkRow();
  r.appendChild(opSign?mkOp(opSign,small):mkE(small));
  for(let c=0;c<cols;c++){
    if(!numStr){r.appendChild(mkC(cls,"",false,small));continue;}
    const di=c-(cols-numStr.length);
    r.appendChild(di>=0&&di<numStr.length?mkC(cls,numStr[di],true,small):mkE(small));
  }
  return r;
}

/* ADDITION / SOUSTRACTION */
function buildAddSub(){
  const aS=dig(a),bS=dig(b);
  const res=op==="+"?(a+b):(a-b);
  const rS=dig(res);
  const C=Math.max(aS.length,bS.length,rS.length)+1;
  const CW=(C+1)*50;
  const W=colEl(true);
  W.appendChild(numRow("carry","",C,null,true));
  W.appendChild(numRow("given",aS,C,null));
  W.appendChild(numRow("given",bS,C,opSym()));
  if(op==="-"){W.appendChild(numRow("carry-bot","",C,null,true));document.getElementById("legend").style.display="flex";}
  W.appendChild(mkHB(CW));
  W.appendChild(numRow("answer","",C,null));
  posed.appendChild(W);
  document.getElementById("hint").textContent=op==="+"?"🟢 Vert = retenues • 🟡 Jaune = réponse":"🟢 Vert haut = chiffre après emprunt • 🩵 Bleu bas = emprunt noté • 🟡 Réponse";
}

/* MULTIPLICATION */
function buildMul(){
  const aS=dig(a),bS=dig(b);
  const bDigits=bS.replace(".","").split("").reverse();
  const totalS=dig(a*b);
  const C=Math.max(totalS.length+1,aS.length+bDigits.length+1);
  const CW=(C+1)*50;
  const W=colEl(true);
  W.appendChild(numRow("carry","",C,null,true));
  W.appendChild(numRow("given",aS,C,null));
  W.appendChild(numRow("given",bS,C,opSym()));
  W.appendChild(mkHB(CW));
  if(bDigits.length===1){
    W.appendChild(numRow("carry","",C,null,true));
    W.appendChild(numRow("answer","",C,null));
  } else {
    bDigits.forEach((d,i)=>{
      // Retenues propres au produit partiel i
      const rc=mkRow();rc.appendChild(mkE(true));
      for(let c=0;c<C;c++){
        if(c>=C-i)rc.appendChild(mkE(true));
        else rc.appendChild(mkC("carry","",false,true));
      }
      W.appendChild(rc);
      // Produit partiel décalé
      const rp=mkRow();rp.appendChild(mkE());
      for(let c=0;c<C;c++){
        if(c>=C-i){
          const ph=mkC("given","",true);
          ph.querySelector("input").style.background="transparent";
          ph.querySelector("input").style.borderColor="transparent";
          rp.appendChild(ph);
        } else rp.appendChild(mkC("partial","",false));
      }
      W.appendChild(rp);
      if(i<bDigits.length-1)W.appendChild(mkHB(CW,true));
    });
    W.appendChild(mkHB(CW));
    W.appendChild(numRow("answer","",C,null));
    document.getElementById("legend").style.display="flex";
    document.getElementById("hint").textContent="🟣 Violet = produit partiel • 🟢 Vert = retenues du partiel • 🟡 Jaune = résultat final";
  }
  posed.appendChild(W);
}

/* DIVISION */
function simDiv(dividend,divisor){
  const dS=String(Math.round(dividend));
  const steps=[];let cur=0;
  for(let i=0;i<dS.length;i++){
    cur=cur*10+parseInt(dS[i]);
    const qd=Math.floor(cur/divisor),sub=qd*divisor,rem=cur-sub;
    steps.push({curS:String(cur),qd,subS:String(sub),rem,remS:String(rem)});
    cur=rem;
  }
  return steps;
}
function buildDiv(){
  const A=Math.round(Math.abs(a)),B=Math.round(Math.abs(b));
  if(!B)return;
  const steps=simDiv(A,B);
  const qS=String(Math.floor(A/B));
  const divdS=String(A),divS=String(B);
  const W=colEl(false);
  const hRow=mkRow();
  for(const ch of divdS)hRow.appendChild(mkC("given",ch,true));
  const vbar=document.createElement("div");vbar.style.cssText="width:3px;min-height:50px;background:var(--muted);border-radius:2px;margin:0 8px;";
  hRow.appendChild(vbar);
  for(const ch of divS)hRow.appendChild(mkC("given",ch,true));
  W.appendChild(hRow);
  const s0=document.createElement("div");s0.style.cssText="width:"+divdS.length*50+"px;height:3px;background:var(--muted);border-radius:2px;margin:2px 0;";
  W.appendChild(s0);
  const qRow=mkRow();
  const sp=document.createElement("div");sp.style.width=(divdS.length*50+19)+"px";
  qRow.appendChild(sp);
  for(let i=0;i<qS.length;i++)qRow.appendChild(mkC("answer","",false));
  W.appendChild(qRow);
  steps.forEach((st,si)=>{
    const indent=si;
    // Valeur courante
    const rowCur=mkRow();
    for(let k=0;k<indent;k++)rowCur.appendChild(mkE());
    for(const ch of st.curS)rowCur.appendChild(mkC("given",ch,true));
    W.appendChild(rowCur);
    // Retenues hautes de la soustraction
    const rowCH=mkRow();
    for(let k=0;k<indent;k++)rowCH.appendChild(mkE(true));
    rowCH.appendChild(mkE(true));
    for(let i=0;i<st.subS.length;i++)rowCH.appendChild(mkC("carry","",false,true));
    W.appendChild(rowCH);
    // Soustraction
    const rowS=mkRow();
    for(let k=0;k<indent;k++)rowS.appendChild(mkE());
    rowS.appendChild(mkOp("−"));
    for(let i=0;i<st.subS.length;i++)rowS.appendChild(mkC("answer","",false));
    W.appendChild(rowS);
    // Retenues basses
    const rowCB=mkRow();
    for(let k=0;k<indent;k++)rowCB.appendChild(mkE(true));
    rowCB.appendChild(mkE(true));
    for(let i=0;i<st.subS.length;i++)rowCB.appendChild(mkC("carry-bot","",false,true));
    W.appendChild(rowCB);
    // Barre
    const rowBar=mkRow();
    for(let k=0;k<indent;k++)rowBar.appendChild(mkE());
    const bar=document.createElement("div");bar.style.cssText="width:"+(st.curS.length+1)*50+"px;height:2px;background:var(--border);border-radius:2px;margin:2px 0;";
    rowBar.appendChild(bar);W.appendChild(rowBar);
    if(si===steps.length-1){
      const rowR=mkRow();
      for(let k=0;k<indent;k++)rowR.appendChild(mkE());
      for(let i=0;i<st.remS.length;i++)rowR.appendChild(mkC("answer","",false));
      const lbl=document.createElement("span");lbl.style.cssText="font-size:.68rem;color:var(--muted);margin-left:6px;font-family:'Nunito',sans-serif;";lbl.textContent="reste";rowR.appendChild(lbl);
      W.appendChild(rowR);
    }
  });
  posed.appendChild(W);
  document.getElementById("legend").style.display="flex";
  document.getElementById("hint").textContent="Quotient (jaune) • Soustractions (jaune) • 🟢 Vert = emprunt reçu • 🩵 Bleu = emprunt noté";
}

/* GUIDE */
function buildGuide(){
  guideSteps=[];
  if(op==="+"){
    const aS=dig(a),bS=dig(b),C=Math.max(aS.length,bS.length);
    guideSteps.push({t:"Écris "+fmt(a)+" sur la 1ʳᵉ ligne, aligné à droite."});
    guideSteps.push({t:"Écris "+fmt(b)+" dessous, aligné à droite. Pose le signe +."});
    guideSteps.push({t:"Commence par les unités (colonne de droite) et avance vers la gauche."});
    for(let col=C-1;col>=0;col--){
      const da=parseInt(dig(a).padStart(C,"0")[col]);
      const db=parseInt(dig(b).padStart(C,"0")[col]);
      const nm=["unités","dizaines","centaines","milliers","dizaines de milliers"][C-1-col]||"rang "+(C-col);
      const s=da+db;
      guideSteps.push({t:nm+" : "+da+" + "+db+" = "+s+"."+(s>=10?" → Retenue "+Math.floor(s/10)+" ! Écris "+(s%10)+", note la retenue verte.":"")});
    }
    guideSteps.push({t:"Résultat : "+dig(a+b)});
  } else if(op==="-"){
    const aS=dig(a),bS=dig(b),C=Math.max(aS.length,bS.length);
    guideSteps.push({t:"Écris "+fmt(a)+" sur la 1ʳᵉ ligne. Écris "+fmt(b)+" dessous avec −."});
    for(let col=C-1;col>=0;col--){
      const da=parseInt(dig(a).padStart(C,"0")[col]);
      const db=parseInt(dig(b).padStart(C,"0")[col]);
      const nm=["unités","dizaines","centaines","milliers","dizaines de milliers"][C-1-col]||"rang "+(C-col);
      if(da>=db)guideSteps.push({t:nm+" : "+da+" − "+db+" = "+(da-db)+"."});
      else guideSteps.push({t:nm+" : "+da+" < "+db+" → Emprunt ! "+da+"+10="+(da+10)+" − "+db+" = "+(da+10-db)+". Note +10 en vert au-dessus, note l'emprunt en bleu sous le soustracteur."});
    }
    guideSteps.push({t:"Résultat : "+dig(a-b)});
  } else if(op==="*"){
    const bS=dig(b);const bDigs=bS.split("").reverse();
    guideSteps.push({t:"Pose "+fmt(a)+" × "+fmt(b)+"."});
    bDigs.forEach((d,i)=>{
      const pos=["unités","dizaines","centaines","milliers"][i]||"rang "+i;
      const partial=Math.round(Math.abs(a))*parseInt(d);
      guideSteps.push({t:"Chiffre des "+pos+" de "+fmt(b)+" = "+d+". Calcule "+fmt(a)+" × "+d+" = "+partial+". Écris-le décalé de "+i+" case(s) (ligne violette). Retenues en vert sur la ligne du dessus."});
    });
    guideSteps.push({t:"Additionne tous les produits partiels. Résultat final : "+dig(a*b)});
  } else {
    const A=Math.round(Math.abs(a)),B=Math.round(Math.abs(b));
    const steps=simDiv(A,B);
    guideSteps.push({t:"Pose "+A+" ÷ "+B+". Diviseur ("+B+") à droite de la barre."});
    steps.forEach((st,si)=>{
      guideSteps.push({t:"Étape "+(si+1)+" : Combien de fois "+B+" entre dans "+st.curS+" ? → "+st.qd+" fois. Écris "+st.qd+" dans le quotient."});
      guideSteps.push({t:st.qd+" × "+B+" = "+st.subS+". Soustrais : "+st.curS+" − "+st.subS+". Utilise les retenues si besoin. Résultat : "+st.remS+"."});
    });
    guideSteps.push({t:"Quotient : "+Math.floor(A/B)+"  Reste : "+steps[steps.length-1].rem});
  }
  renderGuide();
}
function renderGuide(){
  const c=document.getElementById("guide-steps");c.innerHTML="";
  guideSteps.forEach((s,i)=>{
    const d=document.createElement("div");d.className="gstep "+(i<guideIdx?"done":i===guideIdx?"cur":"pending");
    d.innerHTML="<span class='sn'>"+(i+1)+".</span>"+s.t;c.appendChild(d);
  });
}
function toggleGuide(){const b=document.getElementById("guide-box");b.classList.toggle("on");if(b.classList.contains("on")&&!guideSteps.length)buildGuide();}
function gNext(){if(guideIdx<guideSteps.length-1){guideIdx++;renderGuide();}}
function gPrev(){if(guideIdx>0){guideIdx--;renderGuide();}}

/* INDICE */
function indice(){
  const inps=allEds().filter(i=>i.value===""&&i.classList.contains("answer"));
  if(!inps.length){document.getElementById("hint").textContent="Toutes les cases réponse sont remplies !";return;}
  const v=getCorrectFor(inps[0]);
  if(v!==null){inps[0].value=v;inps[0].classList.add("hint-shown");inps[0].readOnly=true;inps[0].tabIndex=-1;}
  score.pts=Math.max(0,score.pts-10);updateScore();
  document.getElementById("hint").textContent="💡 Indice révélé — 10 points";
}
function getCorrectFor(inp){
  if(op==="+"||op==="-"){
    const exp=dig(op==="+"?(a+b):(a-b));
    const inps=Array.from(posed.querySelectorAll("input.answer"));
    const off=inps.length-exp.length,idx=inps.indexOf(inp),di=idx-off;
    return(di>=0&&di<exp.length)?exp[di]:null;
  } else if(op==="*"){
    const exp=dig(a*b);
    const rows=Array.from(posed.querySelectorAll(".pgrow"));
    const last=[...rows].reverse().find(r=>r.querySelector("input.answer:not([readonly])"));
    if(last){const inps=Array.from(last.querySelectorAll("input.answer"));const off=inps.length-exp.length,idx=inps.indexOf(inp),di=idx-off;return(di>=0&&di<exp.length)?exp[di]:null;}
  } else {
    const steps=simDiv(Math.abs(a),Math.abs(b));const qS=dig(Math.floor(Math.abs(a)/Math.abs(b)));
    let exp=[];for(const ch of qS)exp.push(ch);
    steps.forEach((st,si)=>{for(const ch of st.subS)exp.push(ch);if(si===steps.length-1)for(const ch of st.remS)exp.push(ch);});
    const inps=Array.from(posed.querySelectorAll("input.answer:not([readonly])"));const idx=inps.indexOf(inp);
    return(idx>=0&&idx<exp.length)?exp[idx]:null;
  }
  return null;
}

/* CORRIGER */
function ansInps(){return Array.from(posed.querySelectorAll("input.answer")).filter(i=>!i.readOnly&&!i.classList.contains("hint-shown"));}

function corriger(){
  if(!posed.innerHTML){alert("Pose d'abord un calcul !");return;}
  if(exerciceTermine)return;
  const res=document.getElementById("result");
  const hintUsed=posed.querySelectorAll("input.hint-shown").length>0;
  let correct=false;

  if(op==="+"||op==="-"){
    correct=checkRow(ansInps(),dig(op==="+"?(a+b):(a-b)),res);
  } else if(op==="*"){
    const rows=Array.from(posed.querySelectorAll(".pgrow"));
    const last=[...rows].reverse().find(r=>r.querySelector("input.answer:not([readonly])"));
    correct=checkRow(last?Array.from(last.querySelectorAll("input.answer:not([readonly])")):ansInps(),dig(a*b),res);
  } else {
    const steps=simDiv(Math.abs(a),Math.abs(b));const qS=dig(Math.floor(Math.abs(a)/Math.abs(b)));
    let exp=[];for(const ch of qS)exp.push(ch);
    steps.forEach((st,si)=>{for(const ch of st.subS)exp.push(ch);if(si===steps.length-1)for(const ch of st.remS)exp.push(ch);});
    const inps=Array.from(posed.querySelectorAll("input.answer")).filter(i=>!i.readOnly&&!i.classList.contains("hint-shown"));
    let ok=0;
    inps.forEach((inp,i)=>{rstSty(inp);if(i<exp.length){if(inp.value===exp[i]){setOk(inp);ok++;}else setNok(inp);}});
    const total=Math.min(inps.length,exp.length);
    correct=ok===total&&total>0;
    // Pas de réponse affichée si faux
    res.textContent=correct?"🎉 Parfait !":"❌ Pas tout à fait, recommence !";
    res.style.color=correct?"var(--green)":"var(--red)";
    if(correct&&op==="/")score.divOk=(score.divOk||0)+1;
  }

  // Essais
  if(!correct&&maxEssais>0){
    essaisRestants=Math.max(0,essaisRestants-1);
    updateEssaisDots();
    if(essaisRestants===0){
      document.getElementById("hint").textContent="Plus d'essais ! Utilise 'Voir réponse' pour continuer.";
      // Bloquer les inputs
      allEds().forEach(i=>{if(i.classList.contains("answer")){i.readOnly=true;i.tabIndex=-1;}});
    }
  }

  // Stats
  if(!opStats[op])opStats[op]={ok:0,total:0};
  opStats[op].total++;
  if(correct){
    opStats[op].ok++;
  } else {
    // Enregistrer l'erreur
    const expr=fmt(a)+" "+opSym()+" "+fmt(b);
    erreurs[expr]=(erreurs[expr]||0)+1;
  }

  // Score
  if(correct){
    exerciceTermine=true;
    score.ok++;score.streak++;score.maxStreak=Math.max(score.maxStreak,score.streak);
    const pts=calcPts(hintUsed);score.pts+=pts;
    const bonus=score.streak>=10?15:score.streak>=5?8:score.streak>=3?3:0;
    if(bonus>0)document.getElementById("hint").textContent="🔥 Série de "+score.streak+" ! +"+bonus+" pts bonus";
    if(chronoOn){cOk++;cStr++;cMaxStr=Math.max(cMaxStr,cStr);cPts+=pts;setTimeout(()=>genChrono(),700);}
    beep(880,0.15);
    graphData.push({correct:true,pts});
  } else {
    score.nok++;score.streak=0;
    if(chronoOn){cNok++;cStr=0;}
    beep(220,0.3,"sawtooth");
    graphData.push({correct:false,pts:0});
  }
  if(graphData.length>20)graphData=graphData.slice(-20);

  updateScore();addHist(correct);saveProfil();renderBadges();renderLB();renderStats();
}

function checkRow(inps,exp,res){
  const userStr=inps.map(i=>i.value||" ").join("").replace(/\s/g,"");
  const ok=Math.abs(parseFloat(userStr)-parseFloat(exp))<0.01;
  const off=inps.length-exp.length;
  inps.forEach((inp,ci)=>{rstSty(inp);if(inp.value==="")return;const di=ci-off;if(di>=0&&di<exp.length){if(inp.value===exp[di])setOk(inp);else setNok(inp);}else setNok(inp);});
  // Ne pas afficher la bonne réponse si faux
  res.textContent=ok?"🎉 Bravo, c'est correct !":"❌ Pas tout à fait, recommence !";
  res.style.color=ok?"var(--green)":"var(--red)";
  return ok;
}
function setOk(i){i.classList.remove("nok");i.classList.add("ok");}
function setNok(i){i.classList.remove("ok");i.classList.add("nok");}
function rstSty(i){i.classList.remove("ok","nok");}

/* VOIR RÉPONSE */
function montrerRep(){
  if(!posed.innerHTML)return;
  viewUsed=true;
  const res=document.getElementById("result");
  if(op==="+"||op==="-"){
    const exp=dig(op==="+"?(a+b):(a-b));
    fillRow(Array.from(posed.querySelectorAll("input.answer")).filter(i=>!i.readOnly),exp);
    res.textContent="📖 Réponse : "+exp;res.style.color="var(--blue)";
  } else if(op==="*"){
    const exp=dig(a*b);
    const rows=Array.from(posed.querySelectorAll(".pgrow"));
    const last=[...rows].reverse().find(r=>r.querySelector("input.answer:not([readonly])"));
    if(last)fillRow(Array.from(last.querySelectorAll("input.answer:not([readonly])")),exp);
    res.textContent="📖 Résultat : "+exp;res.style.color="var(--blue)";
  } else {
    const steps=simDiv(Math.abs(a),Math.abs(b));const qS=dig(Math.floor(Math.abs(a)/Math.abs(b)));
    let exp=[];for(const ch of qS)exp.push(ch);
    steps.forEach((st,si)=>{for(const ch of st.subS)exp.push(ch);if(si===steps.length-1)for(const ch of st.remS)exp.push(ch);});
    Array.from(posed.querySelectorAll("input.answer")).filter(i=>!i.readOnly).forEach((inp,i)=>{if(i<exp.length){inp.value=exp[i];setOk(inp);}});
    res.textContent="📖 Quotient : "+qS+"  reste : "+steps[steps.length-1].rem;res.style.color="var(--blue)";
  }
  score.pts=Math.max(0,score.pts-15);updateScore();
  document.getElementById("hint").textContent="👁 Réponse affichée — 15 points";
}
function fillRow(inps,str){
  const off=inps.length-str.length;
  inps.forEach((inp,ci)=>{rstSty(inp);const di=ci-off;if(di>=0&&di<str.length){inp.value=str[di];setOk(inp);}else inp.value="";});
}

/* EFFACER / NOUVEAU / SUIVANT */
function effacer(){
  posed.querySelectorAll("input:not([readonly])").forEach(i=>{i.value="";rstSty(i);});
  posed.querySelectorAll("input.hint-shown").forEach(i=>{i.value="";i.classList.remove("hint-shown","ok","nok");i.readOnly=false;i.tabIndex=0;});
  document.getElementById("result").textContent="";
  essaisRestants=maxEssais;updateEssaisDots();
}
function suivant(){if(currentTab==="alea"||chronoOn)generer();}
function nouveau(){
  a=0;b=0;op="+";["n1","n2"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("problem").textContent="";document.getElementById("result").textContent="";
  document.getElementById("hint").textContent="";document.getElementById("legend").style.display="none";
  document.getElementById("guide-box").className="guide-box";document.getElementById("btn-suiv").style.display="none";
  document.getElementById("essais-row").style.display="none";
  posed.innerHTML="";viewUsed=false;
}

/* SCORE & HISTORIQUE */
function updateScore(){
  document.getElementById("sc-ok").textContent=score.ok;
  document.getElementById("sc-nk").textContent=score.nok;
  document.getElementById("sc-str").textContent=score.streak;
  document.getElementById("sc-pts").textContent=score.pts;
}
function addHist(correct){
  const now=new Date();
  const pts=correct?calcPts(posed.querySelectorAll("input.hint-shown").length>0):0;
  sessionHist.unshift({expr:fmt(a)+" "+opSym()+" "+fmt(b),correct,pts,time:now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})});
  if(sessionHist.length>60)sessionHist.pop();
  renderHist();
}
function renderHist(){
  const l=document.getElementById("hist-list");
  if(!sessionHist.length){l.innerHTML="<div class='hist-empty'>Aucun exercice complété.</div>";return;}
  l.innerHTML=sessionHist.map(h=>"<div class='hitem'><span>"+(h.correct?"✅":"❌")+"</span><span class='expr'>"+h.expr+"</span>"+(h.correct?"<span class='ptsbdg'>+"+h.pts+"pts</span>":"")+"<span class='time'>"+h.time+"</span></div>").join("");
}
function clearHist(){
  sessionHist=[];score={ok:0,nok:0,streak:0,maxStreak:0,pts:0,divOk:0};
  opStats={"+":{"ok":0,"total":0},"-":{"ok":0,"total":0},"*":{"ok":0,"total":0},"/":{"ok":0,"total":0}};
  erreurs={};graphData=[];
  updateScore();renderHist();saveProfil();renderLB();renderBadges();renderStats();
}
function renderLB(){
  const sorted=[...profils].sort((a,b)=>(b.score?.pts||0)-(a.score?.pts||0));
  const el=document.getElementById("lb-list");
  if(!sorted.length){el.innerHTML="<div class='hist-empty'>Aucun profil.</div>";return;}
  const medals=["🥇","🥈","🥉"];
  el.innerHTML=sorted.slice(0,10).map((p,i)=>{
    const max=sorted[0].score?.pts||1;
    const pct=Math.round((p.score?.pts||0)/max*100);
    return "<div class='lb-row'><div class='lb-rank'>"+(medals[i]||i+1)+"</div><div style='flex:1'><div class='lb-name'>"+p.emoji+" "+p.nom+"</div><div style='margin-top:3px;height:5px;width:120px;background:var(--surface);border-radius:99px;overflow:hidden;'><div style='height:100%;width:"+pct+"%;background:var(--blue);border-radius:99px;'></div></div></div><div class='lb-info'>série max "+(p.score?.maxStreak||0)+"🔥</div><div class='lb-pts'>"+(p.score?.pts||0)+" pts</div></div>";
  }).join("");
}

/* BADGES */
const BADGE_DEFS=[
  {id:"first",icon:"⭐",label:"Premier calcul",cls:"b-blue",cond:s=>s.ok>=1},
  {id:"ten",icon:"🎯",label:"10 justes",cls:"b-blue",cond:s=>s.ok>=10},
  {id:"fifty",icon:"💯",label:"50 justes",cls:"b-gold",cond:s=>s.ok>=50},
  {id:"str3",icon:"🔥",label:"Série de 3",cls:"b-fire",cond:s=>s.maxStreak>=3},
  {id:"str10",icon:"💥",label:"Série de 10",cls:"b-fire",cond:s=>s.maxStreak>=10},
  {id:"pts50",icon:"🏅",label:"50 points",cls:"b-green",cond:s=>s.pts>=50},
  {id:"pts200",icon:"🏆",label:"200 points",cls:"b-gold",cond:s=>s.pts>=200},
  {id:"div",icon:"➗",label:"Division réussie",cls:"b-purple",cond:s=>(s.divOk||0)>=1},
];
function renderBadges(){
  const row=document.getElementById("badges-row");row.innerHTML="";
  const s={...score};
  BADGE_DEFS.forEach(bd=>{
    const earned=bd.cond(s);
    const d=document.createElement("div");d.className="badge "+bd.cls+(earned?" earned":"");
    d.title=bd.label;d.textContent=bd.icon+" "+bd.label;
    row.appendChild(d);
  });
}

/* STATS */
function renderStats(){
  // Cards
  const grid=document.getElementById("stats-grid");
  const total=score.ok+score.nok;
  const pct=total?Math.round(score.ok/total*100):0;
  grid.innerHTML="<div class='stat-card'><div class='stitle'>Taux de réussite</div><div class='sval'>"+pct+"%</div><div class='ssub'>"+score.ok+"/"+total+" exercices</div></div>"
    +"<div class='stat-card'><div class='stitle'>Meilleure série</div><div class='sval'>"+score.maxStreak+"</div><div class='ssub'>exercices consécutifs</div></div>"
    +"<div class='stat-card'><div class='stitle'>Points totaux</div><div class='sval'>"+score.pts+"</div><div class='ssub'>depuis le début</div></div>";

  // Stats par op
  const opEl=document.getElementById("op-stats");
  const ops=[{k:"+",lbl:"+",col:"var(--green)"},{k:"-",lbl:"−",col:"var(--teal)"},{k:"*",lbl:"×",col:"var(--purple)"},{k:"/",lbl:"÷",col:"var(--orange)"}];
  opEl.innerHTML=ops.map(o=>{
    const st=opStats[o.k]||{ok:0,total:0};
    const p=st.total?Math.round(st.ok/st.total*100):0;
    return "<div class='op-stat-row'><div class='op-lbl'>"+o.lbl+"</div><div class='op-bar-bg'><div class='op-bar-fill' style='width:"+p+"%;background:"+o.col+"'></div></div><div class='op-pct' style='color:"+o.col+"'>"+p+"%</div></div>";
  }).join("")+"<div style='font-size:.7rem;color:var(--muted);margin-top:6px;'>Basé sur les exercices complétés</div>";

  // Erreurs fréquentes
  const errEl=document.getElementById("err-list");
  const sorted=Object.entries(erreurs).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(!sorted.length){errEl.innerHTML="<div class='hist-empty'>Pas encore d'erreurs.</div>";}
  else errEl.innerHTML=sorted.map(([expr,cnt])=>"<div class='err-item'><span class='err-expr'>"+expr+"</span><span class='err-cnt'>"+cnt+"×</span></div>").join("");

  // Graphique
  renderGraph();
}

function renderGraph(){
  const wrap=document.getElementById("graph-wrap");
  const svg=document.getElementById("graph-svg");
  const empty=document.getElementById("graph-empty");
  if(graphData.length<3){empty.style.display="block";svg.style.display="none";return;}
  empty.style.display="none";svg.style.display="block";
  const W=wrap.offsetWidth||400,H=100;
  const n=graphData.length;
  const step=W/Math.max(n-1,1);
  // Calcul points
  let cumPts=0;const pts=graphData.map(d=>{cumPts+=d.pts;return cumPts;});
  const maxPts=Math.max(...pts,1);
  const points=pts.map((p,i)=>[i*step,(1-p/maxPts)*(H-10)+5]);
  const pathD="M"+points.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" L");
  // Cercles colorés
  const circles=graphData.map((d,i)=>"<circle cx='"+points[i][0].toFixed(1)+"' cy='"+points[i][1].toFixed(1)+"' r='4' fill='"+(d.correct?"var(--green)":"var(--red)")+"' opacity='.8'/>").join("");
  svg.innerHTML="<defs><linearGradient id='lg' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='var(--blue)' stop-opacity='.3'/><stop offset='100%' stop-color='var(--blue)' stop-opacity='0'/></linearGradient></defs>"
    +"<path d='"+pathD+" L"+((n-1)*step)+","+H+" L0,"+H+" Z' fill='url(#lg)'/>"
    +"<path d='"+pathD+"' fill='none' stroke='var(--blue)' stroke-width='2' stroke-linejoin='round'/>"
    +circles;
}

/* TABS */
function setTab(t){
  currentTab=t;
  const tabs=["manuel","alea","chrono","stats"];
  document.querySelectorAll(".tab").forEach((b,i)=>b.classList.toggle("active",tabs[i]===t));
  tabs.forEach(id=>document.getElementById("panel-"+id).style.display=id===t?"block":"none");
  if(t==="stats")renderStats();
}
function setNiv(btn){currentNiv=btn.dataset.niv;document.querySelectorAll(".niv-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");}

/* INIT */
initProfils();
