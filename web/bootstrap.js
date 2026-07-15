fetch('/api/auth/status',{credentials:'same-origin'}).then(response=>response.json()).then(auth=>{
  if(auth.authenticated)return;
  document.getElementById('authLoading').hidden=true;
  document.getElementById(auth.configured?'loginForm':'setupForm').hidden=false;
}).catch(()=>{
  document.querySelector('#authLoading p').textContent='Le service local ne répond pas. Relancez Aster puis rechargez cette page.';
});
