// Script to create a test user for our application
import fetch from 'node-fetch';

async function createTestUser() {
  try {
    const userData = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      fullName: "Test User"
    };

    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log('User created:', data);
    
    return data;
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

async function run() {
  const user = await createTestUser();
  if (user) {
    console.log('Test user created successfully. You can now use these credentials to log in:');
    console.log('Username: testuser');
    console.log('Password: password123');
  }
}

run().catch(console.error);