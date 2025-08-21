// Use global fetch available in Node 18+
(async()=>{
  try{
    const API='http://localhost:4000';
    const email='e2e_create_with_token_'+Date.now()+'@example.com';
    const password='pass1234';
    console.log('registering',email);
    const initRes = await fetch(API+'/api/auth/register-subscribe/init',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password,name:'E2E CreateWithToken',role:'admin',centerName:'E2E Center',plan:'decouverte'}) });
    const initJson = await initRes.json().catch(()=>null);
    console.log('init status', initRes.status, initJson);
    if(!initRes.ok){ console.error('init failed'); process.exit(1); }

    // attempt to login to get subscribeToken
    console.log('logging in to get subscribeToken');
    const loginRes = await fetch(API+'/api/auth/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const loginJson = await loginRes.json().catch(()=>null);
    console.log('login status', loginRes.status, loginJson);
    if(loginRes.status !== 402){ console.error('Expected 402 subscribe required but got', loginRes.status); process.exit(1); }
    const subscribeToken = loginJson.subscribeToken;
    if(!subscribeToken){ console.error('No subscribeToken returned'); process.exit(1); }

    // call create-with-token-test-pm
    console.log('calling create-with-token-test-pm to create subscription with server-side PM');
    const createRes = await fetch(API+'/api/subscriptions/create-with-token-test-pm',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ subscribeToken, plan: 'decouverte', selectedPlan: 'essentiel', mode: 'discovery' }) });
    const createJson = await createRes.json().catch(()=>null);
    console.log('create-with-token-test-pm status', createRes.status, createJson);
  }catch(e){ console.error('error', e && e.message ? e.message : e); process.exit(1); }
})();
