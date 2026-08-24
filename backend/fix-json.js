const fs = require('fs');

try {
  const filePath = 'service-account.json';
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  if (data.private_key) {
    // Convert actual newlines to literal \n
    data.private_key = data.private_key.replace(/\n/g, '\\n');
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log('✅ Fixed service-account.json');
} catch (error) {
  console.error('❌ Error:', error.message);
}