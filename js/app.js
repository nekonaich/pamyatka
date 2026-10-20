/* Логика сайта: вкладки, поиск, чтение уставов, экзамен. */
/* ============ утилиты ============ */
var $ = function(s,r){return (r||document).querySelector(s)};
function esc(s){return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function plain(html){var d=document.createElement("div");d.innerHTML=html;return d.textContent.replace(/\s+/g," ").trim()}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}

var OATH={name:"",id:""};
function applyOath(root,skip){
  root=root||document;
  Array.prototype.forEach.call(root.querySelectorAll('.ph[data-ph="name"]'),function(e){e.textContent=OATH.name||"(фамилия имя)";e.classList.toggle("filled",!!OATH.name)});
  Array.prototype.forEach.call(root.querySelectorAll('.ph[data-ph="id"]'),function(e){e.textContent=OATH.id||"static id";e.classList.toggle("filled",!!OATH.id)});
  Array.prototype.forEach.call(root.querySelectorAll("input[data-oath]"),function(i){
    var k=i.getAttribute("data-oath");
    if(i!==skip&&i.value!==OATH[k])i.value=OATH[k];
  });
}
document.addEventListener("input",function(e){
  var t=e.target,k=t.getAttribute&&t.getAttribute("data-oath");
  if(!k)return;
  if(k==="id"){var d=t.value.replace(/[^0-9]/g,"");if(d!==t.value)t.value=d;OATH.id=d}
  else{OATH.name=t.value.replace(/\s+/g," ").trim()}
  applyOath(document,t);
});

function cardEl(c,from){
  var a=document.createElement("article");
  a.className="card"+(c.wide?" wide":"");
  a.innerHTML=(from?'<span class="from">'+from+'</span>':'')+(c.topic?'<span class="tag">'+esc(c.topic)+'</span>':'')+'<h3>'+esc(c.title)+'</h3>'+c.html;
  applyOath(a);
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
var tabs={memo:"t-memo",ustav:"t-ustav",dress:"t-dress",kpp:"t-kpp",lec:"t-lec",exam:"t-exam"};
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

/* ============ дресс-код ============ */
var curGroup="Все";
function renderDress(){
  var chips=$("#dress-chips");chips.innerHTML="";
  ["Все","Общее","ФСВНГ"].forEach(function(g){
    var b=document.createElement("button");b.type="button";b.className="chip";b.textContent=g;
    b.setAttribute("aria-pressed",g===curGroup);
    b.onclick=function(){curGroup=g;renderDress()};
    chips.appendChild(b);
  });
  var grid=$("#dress-grid");grid.innerHTML="";
  DRESS.filter(function(d){return curGroup==="Все"||d.group===curGroup}).forEach(function(d){
    var imgs=d.imgs||(d.img?[d.img]:[]);
    var c=document.createElement("article");c.className="card"+(d.wide?" wide":"");c.id=d.id;
    function im(src,cls){return '<img class="poster-img '+cls+'" src="'+src+'" alt="'+esc(d.alt||d.title)+'" title="Нажмите, чтобы открыть крупно" loading="lazy">'}
    var inner;
    if(imgs.length&&!d.html){
      inner=imgs.length>1?'<div class="gallery">'+imgs.map(function(x){return im(x,"")}).join("")+'</div>':im(imgs[0],"dress-solo");
    }else if(imgs.length){
      inner='<div class="poster-wrap dress-wrap">'+im(imgs[0],"")+'<div class="poster-text">'+d.html+'</div></div>';
    }else{inner=d.html}
    c.innerHTML='<span class="tag">'+esc(d.group||"Дресс-код")+'</span><h3>'+esc(d.title)+'</h3>'+inner;
    grid.appendChild(c);
  });
}

/* ============ КПП ============ */
function renderKpp(){
  var g=$("#kpp-grid");g.innerHTML="";
  KPP.forEach(function(c){g.appendChild(cardEl(c))});
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
Object.keys(BASIS).forEach(function(k){var b=BASIS[k];INDEX.push({src:k,c:{topic:"Итог",title:b.title,html:"<ul>"+b.items.map(function(t){return "<li>"+esc(t)+"</li>"}).join("")+"</ul>"},text:(k+" "+b.title+" "+b.items.join(" ")).toLowerCase()})});
DRESS.forEach(function(d){INDEX.push({src:"Форма",c:{topic:"Дресс-код",title:d.title,html:d.html||"<p>Фото формы смотрите во вкладке «Дресс-код».</p>"},text:("дресс-код форма "+(d.group||"")+" "+(d.unit||"")+" "+d.title+" "+plain(d.html||"")).toLowerCase()})});
KPP.forEach(function(c){INDEX.push({src:"КПП",c:c,text:(c.topic+" "+c.title+" "+plain(c.html)).toLowerCase()})});
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

document.addEventListener("click",function(e){
  var t=e.target;
  if(t.classList&&t.classList.contains("poster-img")){
    var o=document.createElement("div");o.className="lightbox";o.innerHTML='<img src="'+t.src+'" alt="'+esc(t.alt)+'">';
    o.onclick=function(){o.remove()};document.body.appendChild(o);
  }
});
document.addEventListener("keydown",function(e){if(e.key==="Escape"){var l=document.querySelector(".lightbox");if(l)l.remove()}});

function copyText(t,btn){
  function done(){var o=btn.textContent;btn.textContent="Скопировано";setTimeout(function(){btn.textContent="Копировать"},1500)}
  function fallback(){
    var a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();
    try{document.execCommand("copy");done()}catch(e){btn.textContent="Выделите и копируйте вручную"}
    document.body.removeChild(a);
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,fallback)}else{fallback()}
}
document.addEventListener("click",function(e){
  var b=e.target.closest&&e.target.closest(".copy");if(!b)return;
  copyText(b.parentNode.querySelector("pre").textContent,b);
});

/* ============ старт ============ */
renderChips();renderMemo();renderUstav();renderDress();renderKpp();renderLecture();quizHome();
var h=(location.hash||"").slice(1);if(tabs[h])showTab(h);

/* ============ проверка обновлений сайта ============ */
(function(){
  var meta=document.querySelector('meta[name="build"]');
  var cur=meta&&meta.content;
  if(!cur||location.protocol==="file:")return;
  var shown=false;
  var LABELS=[["added","Добавлено"],["changed","Изменено"],["removed","Убрано"]];
  function collect(text){
    var m=text.match(/<script type="application\/json" id="changelog">([\s\S]*?)<\/script>/);
    if(!m)return [];
    var list;try{list=JSON.parse(m[1])}catch(e){return []}
    var out=[];
    for(var i=0;i<list.length;i++){if(list[i].id===cur)break;out.push(list[i])}
    if(out.length===list.length&&out.length>3)out=out.slice(0,3);
    return out;
  }
  function banner(entries){
    if(document.getElementById("upd"))return;
    var chg="";
    LABELS.forEach(function(l){
      var items=[];
      entries.forEach(function(e){(e[l[0]]||[]).forEach(function(t){if(items.indexOf(t)<0)items.push(t)})});
      if(items.length)chg+='<h4>'+l[1]+'</h4><ul>'+items.map(function(t){return '<li>'+esc(t)+'</li>'}).join("")+'</ul>';
    });
    var b=document.createElement("div");b.id="upd";b.className="upd";
    b.innerHTML='<div class="box" role="dialog" aria-modal="true" aria-labelledby="upd-t"><h3 id="upd-t">Доступна новая версия сайта</h3>'
      +(chg?'<div class="chg">'+chg+'</div>':'<p>Обновите страницу, чтобы увидеть последнюю версию.</p>')
      +'<div class="btns"><button type="button" class="go">Обновить</button><button type="button" class="x">Позже</button></div></div>';
    function onKey(e){if(e.key==="Escape")close()}
    function close(){b.remove();document.removeEventListener("keydown",onKey)}
    b.querySelector(".go").onclick=function(){location.reload()};
    b.querySelector(".x").onclick=close;
    b.onclick=function(e){if(e.target===b)close()};
    document.addEventListener("keydown",onKey);
    document.body.appendChild(b);
    var go=b.querySelector(".go");if(go&&go.focus)go.focus();
  }
  function check(){
    if(shown||document.hidden)return;
    var url=location.href.split("#")[0].split("?")[0]+"?_="+Date.now();
    fetch(url,{cache:"no-store"}).then(function(r){return r.ok?r.text():""}).then(function(t){
      var m=t.match(/<meta name="build" content="([^"]+)"/);
      if(m&&m[1]!==cur){shown=true;banner(collect(t))}
    }).catch(function(){});
  }
  setTimeout(check,10000);
  setInterval(check,60000);
  document.addEventListener("visibilitychange",function(){if(!document.hidden)check()});
})();
