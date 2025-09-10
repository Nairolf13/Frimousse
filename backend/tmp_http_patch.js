const fetch = require('node-fetch');

(async () => {
  try {
    const id = 'f5718339-260d-42d0-89e9-b681ce8ab420'; 
    const res = await fetch('http://localhost:4001/api/payment-history/' + id + '/paid', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': "accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg4YjJlZjVlLTUzZWEtNGQ2Ny1iZWE3LTg0ZmQzMDAxMjJmNyIsImVtYWlsIjoiZmJfZHVfMTNAbGl2ZS5mciIsInJvbGUiOiJhZG1pbiIsImNlbnRlcklkIjoiNWYxOTdiN2MtMjI4Ni00YWEwLTlkZGUtNzNlY2I2OGExNmFkIiwiaWF0IjoxNzU3NTIxMTg0LCJleHAiOjE3NTc1MjIwODR9.WbD0cDKNletRbWGNND4udLVrwbqW44jYjfK146iml5A; refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg4YjJlZjVlLTUzZWEtNGQ2Ny1iZWE3LTg0ZmQzMDAxMjJmNyIsImNlbnRlcklkIjoiNWYxOTdiN2MtMjI4Ni00YWEwLTlkZGUtNzNlY2I2OGExNmFkIiwiaWF0IjoxNzU3NTIxMTg0LCJleHAiOjE3NTgxMjU5ODR9.ECXEER9YyOh_b9IcQOSY7r1ZMFBKNds_rwhjk8V05aM"
      },
      body: JSON.stringify({ paid: true })
    });
    console.log('status', res.status);
    const j = await res.text();
    console.log('body', j);
  } catch (e) {
    console.error(e);
  }
})();
