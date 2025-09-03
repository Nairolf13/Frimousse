// Use global fetch available in Node 18+
(async()=>{
  try{
    const API='http://localhost:4000';
    const email='e2e_register_'+Date.now()+'@example.com';
    console.log('registering',email);
    const initRes = await fetch(API+'/api/auth/register-subscribe/init',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email,password:'pass1234',name:'E2E Register',role:'admin',centerName:'E2E Center',plan:'decouverte'})
    });
    const initJson = await initRes.json().catch(()=>null);
    console.log('init status', initRes.status, initJson);
    if(!initRes.ok){ console.error('init failed'); process.exit(1); }
    const userId = initJson.userId;
    console.log('userId',userId);

    const completeRes = await fetch(API+'/api/auth/register-subscribe/complete',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId, plan: 'decouverte', paymentMethodId: 'pm_card_visa', mode: 'discovery', selectedPlan: 'essentiel' })
    });
    const completeJson = await completeRes.json().catch(()=>null);
    console.log('complete status', completeRes.status, completeJson);
  }catch(e){ console.error('error', e && e.message ? e.message : e); process.exit(1); }
})();
