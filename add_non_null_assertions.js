const fs = require('fs');
const path = require('path');

// Read the routes.ts file
const routesFilePath = path.join(__dirname, 'server/routes.ts');
let content = fs.readFileSync(routesFilePath, 'utf8');

// Replace all instances of req.user.id with req.user!.id
content = content.replace(/req\.user\.id/g, 'req.user!.id');

// Write the updated content back to the file
fs.writeFileSync(routesFilePath, content, 'utf8');

console.log('Added non-null assertions to routes.ts');
