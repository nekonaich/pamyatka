/* Логика сайта: вкладки, поиск, чтение уставов, экзамен. */
/* ============ утилиты ============ */
var $ = function(s,r){return (r||document).querySelector(s)};
function esc(s){return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function plain(html){var d=document.createElement("div");d.innerHTML=html;return d.textContent.replace(/\s+/g," ").trim()}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}

function cardEl(c,from){
  var a=document.createElement("article");
  a.className="card"+(c.wide?" wide":"");
  a.innerHTML=(from?'<span class="from">'+from+'</span>':'')+(c.topic?'<span class="tag">'+esc(c.topic)+'</span>':'')+'<h3>'+esc(c.title)+'</h3>'+c.html;
  return a;
}

function highlight(root,q){
  if(!q) return;
  var re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"giu");
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),nodes=[],n;
  while((n=w.nextNode())) nodes.push(n);
  nodes.forEach(function(node){
    if(!re.test(node.nodeValue)){re.lastIndex=0;return}
    re.lastIndex=0;
    var frag=document.createDocumentFragment(),last=0,m,txt=node.nodeValue;
    while((m=re.exec(txt))){
      if(m[0]==="")break;
      frag.appendChild(document.createTextNode(txt.slice(last,m.index)));
      var mk=document.createElement("mark");mk.textContent=m[0];frag.appendChild(mk);
      last=m.index+m[0].length;
    }
    frag.appendChild(document.createTextNode(txt.slice(last)));
    node.parentNode.replaceChild(frag,node);
  });
}

/* ============ вкладки ============ */
var tabs={memo:"t-memo",ustav:"t-ustav",lec:"t-lec",exam:"t-exam"};
function showTab(k){
  Object.keys(tabs).forEach(function(key){
    var on=key===k;
    $("#"+tabs[key]).setAttribute("aria-selected",on);
    $("#p-"+key).hidden=!on;
  });
  $("#p-search").hidden=true;
  $("#q").value="";$("#clr").style.display="none";
  try{history.replaceState(null,"","#"+k)}catch(e){}
}
Object.keys(tabs).forEach(function(k){$("#"+tabs[k]).addEventListener("click",function(){showTab(k)})});

/* ============ памятка ============ */
var curTopic="Все";
function renderMemo(){
  var g=$("#memo-grid");g.innerHTML="";
  MEMO.filter(function(c){return curTopic==="Все"||c.topic===curTopic}).forEach(function(c){g.appendChild(cardEl(c))});
}
function renderChips(){
  var box=$("#chips");box.innerHTML="";
  TOPICS.forEach(function(t){
    var b=document.createElement("button");b.type="button";b.className="chip";b.textContent=t;
    b.setAttribute("aria-pressed",t===curTopic);
    b.onclick=function(){curTopic=t;renderChips();renderMemo()};
    box.appendChild(b);
  });
}

/* ============ лекция ============ */
function renderLecture(){
  var toc=$("#toc"),body=$("#lec-body");toc.innerHTML="";body.innerHTML="";
  LECTURE.forEach(function(s){
    var a=document.createElement("a");a.href="#"+s.id;a.textContent=s.title.replace(/^\d+\.\s*/,"");
    a.onclick=function(e){e.preventDefault();document.getElementById(s.id).scrollIntoView({behavior:"smooth",block:"start"})};
    toc.appendChild(a);
    var c=cardEl({title:s.title,html:s.html});c.id=s.id;body.appendChild(c);
  });
}

/* ============ поиск ============ */
var INDEX=[];
MEMO.forEach(function(c){INDEX.push({src:"Памятка",c:c,text:(c.topic+" "+c.title+" "+plain(c.html)).toLowerCase()})});
USTAV.forEach(function(d){d.cats.forEach(function(cat){cat.arts.forEach(function(a){
  var tok=a.num?(" ст. "+a.num+" ст "+a.num+" статья "+a.num):"";
  INDEX.push({src:d.abbr,c:{topic:cat.title,title:a.title,html:a.html},text:(d.abbr+" "+d.name+" "+cat.title+" "+a.title+" "+plain(a.html)+tok).toLowerCase()});
})})});
LECTURE.forEach(function(c){INDEX.push({src:"Лекция",c:c,text:(c.title+" "+plain(c.html)).toLowerCase()})});

function runSearch(){
  var raw=$("#q").value.trim(),box=$("#p-search");
  $("#clr").style.display=raw?"block":"none";
  if(!raw){
    box.hidden=true;
    var cur=Object.keys(tabs).filter(function(k){return $("#"+tabs[k]).getAttribute("aria-selected")==="true"})[0]||"memo";
    $("#p-"+cur).hidden=false;return;
  }
  Object.keys(tabs).forEach(function(k){$("#p-"+k).hidden=true});
  box.hidden=false;
  var q=raw.toLowerCase();
  var hits=INDEX.filter(function(x){return x.text.indexOf(q)>-1});
  box.innerHTML="";
  var h=document.createElement("h2");h.className="results-head";
  h.textContent=hits.length?("Найдено: "+hits.length):"Ничего не найдено";
  box.appendChild(h);
  if(!hits.length){
    var e=document.createElement("div");e.className="empty";
    e.textContent="Попробуйте короче или другое слово, например «строй», «приказ», «выговор».";
    box.appendChild(e);return;
  }
  var grid=document.createElement("div");grid.className="grid";
  hits.forEach(function(x){
    var el=cardEl(x.c,x.src);el.classList.remove("wide");highlight(el,raw);grid.appendChild(el);
  });
  box.appendChild(grid);
}
$("#q").addEventListener("input",runSearch);
$("#clr").addEventListener("click",function(){$("#q").value="";runSearch();$("#q").focus()});
document.addEventListener("keydown",function(e){
  if(e.key==="/"&&document.activeElement.tagName!=="INPUT"){e.preventDefault();$("#q").focus()}
  if(e.key==="Escape"&&document.activeElement===$("#q")){$("#q").value="";runSearch();$("#q").blur()}
});

/* ============ экзамен ============ */
var qz={list:[],i:0,score:0,wrong:[],locked:false};
function quizHome(){
  var box=$("#quiz");
  box.innerHTML='<div class="setup"><div class="card"><span class="tag">Экзамен</span><h3>Проверьте себя</h3><p>«Экзамен»: 15 случайных вопросов из банка в '+EXAM.length+' вопросов. «Проверь себя»: все вопросы подряд. После каждого ответа показываю, почему он верный.</p><div class="row" id="modes"></div></div></div>';
  var m=$("#modes");
  function add(label,fn,alt){var b=document.createElement("button");b.className="btn"+(alt?" alt":"");b.textContent=label;b.onclick=fn;m.appendChild(b)}
  add("Экзамен: 15 вопросов",function(){startQuiz(shuffle(EXAM).slice(0,15))});
  add("Проверь себя",function(){startQuiz(shuffle(EXAM))},true);
}
function startQuiz(list){qz={list:list,i:0,score:0,wrong:[],locked:false};showQ()}
function showQ(){
  var box=$("#quiz"),item=qz.list[qz.i];
  var opts=shuffle(item.a.map(function(t,idx){return {t:t,ok:idx===0}}));
  box.innerHTML='<div class="qbar"><span>Вопрос '+(qz.i+1)+' из '+qz.list.length+'</span><span>Верно: '+qz.score+'</span></div><div class="progress"><i style="width:'+(qz.i/qz.list.length*100)+'%"></i></div><div class="qcard"><span class="tag">'+esc(item.t)+'</span><h2>'+esc(item.q)+'</h2><div class="opts" id="opts"></div><div id="fb"></div></div>';
  var o=$("#opts"),letters="АБВГ";
  opts.forEach(function(op,idx){
    var b=document.createElement("button");b.className="opt";b.type="button";
    b.innerHTML='<span class="l">'+letters[idx]+'</span><span>'+esc(op.t)+'</span>';
    b.onclick=function(){answer(b,op,opts,item)};
    o.appendChild(b);
  });
  qz.locked=false;
}
function answer(btn,op,opts,item){
  if(qz.locked)return;qz.locked=true;
  var btns=$("#opts").children;
  for(var i=0;i<btns.length;i++){
    btns[i].disabled=true;
    if(opts[i].ok)btns[i].classList.add("right");
  }
  if(op.ok){qz.score++}else{btn.classList.add("wrong");qz.wrong.push(item)}
  var last=qz.i===qz.list.length-1;
  $("#fb").innerHTML='<div class="why"><b>'+(op.ok?"Верно. ":"Неверно. ")+'</b>'+esc(item.why)+'</div><div class="row"><button class="btn" id="next">'+(last?"Показать результат":"Дальше")+'</button></div>';
  $("#next").focus();
  $("#next").onclick=function(){qz.i++;last?finish():showQ()};
}
function finish(){
  var n=qz.list.length,p=Math.round(qz.score/n*100);
  var verdict=p>=90?"Отлично, можно сдавать.":p>=70?"Хорошо, повторите ошибки.":"Пока рано, перечитайте памятку и лекцию.";
  var box=$("#quiz");
  box.innerHTML='<div class="qcard"><span class="tag">Результат</span><div class="score">'+qz.score+' / '+n+'</div><p>'+p+'%. '+verdict+'</p><div id="mist"></div><div class="row" id="fin"></div></div>';
  if(qz.wrong.length){
    var ul='<h3 style="margin:14px 0 8px">Разбор ошибок</h3><ul class="mistakes">';
    qz.wrong.forEach(function(x){ul+='<li><b>'+esc(x.q)+'</b><small>Верно: '+esc(x.a[0])+'</small><small>'+esc(x.why)+'</small></li>'});
    $("#mist").innerHTML=ul+'</ul>';
  }
  var f=$("#fin");
  function add(label,fn,alt){var b=document.createElement("button");b.className="btn"+(alt?" alt":"");b.textContent=label;b.onclick=fn;f.appendChild(b)}
  if(qz.wrong.length)add("Повторить только ошибки",function(){startQuiz(shuffle(qz.wrong))});
  add("Новый экзамен",function(){startQuiz(shuffle(EXAM).slice(0,15))},true);
  add("В меню",quizHome,true);
  window.scrollTo({top:0,behavior:"smooth"});
}

/* ============ старт ============ */
renderChips();renderMemo();renderUstav();renderLecture();quizHome();
var h=(location.hash||"").slice(1);if(tabs[h])showTab(h);
