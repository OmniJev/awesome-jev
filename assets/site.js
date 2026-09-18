
(function(){
  var root=document.documentElement, tb=document.getElementById('theme');
  function cur(){return root.getAttribute('data-theme')||
    (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}
  if(tb) tb.addEventListener('click',function(){
    root.setAttribute('data-theme', cur()==='dark'?'light':'dark');});

  var q=document.getElementById('q'),
      cards=[].slice.call(document.querySelectorAll('.card')),
      groups=[].slice.call(document.querySelectorAll('.group[data-group]')),
      wraps=[].slice.call(document.querySelectorAll('.gwrap[data-gwrap]')),
      navs=[].slice.call(document.querySelectorAll('.nav-links a')),
      mechs=[].slice.call(document.querySelectorAll('.badges.mechrow a')),
      out=document.getElementById('shown'), empty=document.getElementById('empty'), active='';

  function paint(){
    navs.forEach(function(a){
      var g=a.dataset.g||'';
      if((active&&g===active)||(!active&&a.getAttribute('href')==='#top')) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    mechs.forEach(function(a){
      var sec=a.dataset.g, w=document.getElementById(sec), grp=w?w.closest('.gwrap').dataset.gwrap:'';
      a.style.opacity=(!active||sec===active||grp===active)?'1':'.42'; });
  }
  function apply(){
    var t=(q&&q.value||'').toLowerCase().trim(), n=0;
    cards.forEach(function(c){
      var on=(!active||c.dataset.g===active||c.dataset.grp===active)&&(!t||(c.dataset.s||'').indexOf(t)>-1);
      c.classList.toggle('is-hidden',!on); if(on) n++;
    });
    groups.forEach(function(g){ g.hidden=!g.querySelectorAll('.card:not(.is-hidden)').length; });
    wraps.forEach(function(w){ w.hidden=!w.querySelectorAll('.card:not(.is-hidden)').length; });
    if(out) out.textContent=n+(n===1?' entry':' entries');
    if(empty) empty.hidden=n>0;
    paint();
  }
  navs.forEach(function(a){
    a.addEventListener('click',function(){ active=a.dataset.g||''; apply(); });
  });
  mechs.forEach(function(a){
    a.addEventListener('click',function(){ active=(active===a.dataset.g)?'':a.dataset.g; apply(); });
  });
  if(q) q.addEventListener('input', apply);
  var m=location.search.match(/[?&]q=([^&]+)/);
  if(m&&q){ q.value=decodeURIComponent(m[1].replace(/\+/g,' ')); }
  apply();
})();
