// Script to login a user and get authenticated
import fetch from 'node-fetch';
import fs from 'fs';

async function loginUser(username, password) {
  try {
    const userData = {
      username,
      password
    };

    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log('Login successful:', data);
    
    // Save cookies to file
    const cookies = response.headers.raw()['set-cookie'];
    if (cookies) {
      fs.writeFileSync('cookies.txt', cookies.join('; '));
      console.log('Cookies saved to cookies.txt');
    }
    
    return data;
  } catch (error) {
    console.error('Error logging in:', error);
  }
}

async function run() {
  const username = process.argv[2] || 'testuser';
  const password = process.argv[3] || 'password123';
  
  console.log(`Attempting to login as ${username}...`);
  const user = await loginUser(username, password);
  
  if (user) {
    console.log('Login successful!');
  } else {
    console.log('Login failed. Please check credentials.');
  }
}

run().catch(console.error);