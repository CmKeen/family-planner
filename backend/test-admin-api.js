import fetch from 'node:fetch';

async function testAdminAPI() {
  try {
    // This would require authentication, but let's see the structure
    const response = await fetch('http://localhost:3001/admin/api/resources/MealScheduleTemplate/actions/list');
    const data = await response.json();
    console.log('API Response Status:', response.status);
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAdminAPI();
