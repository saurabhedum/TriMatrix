const fs = require('fs');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

let rules = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // ===============================================================
    // Helper Functions
    // ===============================================================
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isDocOwner() {
      return isAuthenticated() && request.auth.uid == resource.data.uid;
    }

    function uidUnchanged() {
      return !('uid' in request.resource.data) || request.resource.data.uid == request.auth.uid;
    }

    function uidNotModified() {
      return !('uid' in request.resource.data) || request.resource.data.uid == resource.data.uid;
    }

    function hasOnlyAllowedFields(fields) {
      return request.resource.data.keys().hasOnly(fields);
    }

    function isValidEmail(email) {
      return email is string && email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");
    }

    function isAdmin() {
      return isAuthenticated() && (request.auth.token.email == "saurabhmotalkar2021@gmail.com" && request.auth.token.email_verified == true);
    }

    // ===============================================================
    // Domain Validators
    // ===============================================================
`;

const getTypeValidator = (prop) => {
  if (prop.format === 'date-time') return 'is timestamp';
  if (prop.type === 'string') return 'is string';
  if (prop.type === 'number') return 'is number';
  if (prop.type === 'boolean') return 'is bool';
  return '!= null';
};

for (const [entityName, entityDef] of Object.entries(blueprint.entities)) {
  const fields = Object.keys(entityDef.properties);
  const allowedFieldsArray = `[${fields.map(f => `'${f}'`).join(', ')}]`;
  
  let validatorBody = `      return hasOnlyAllowedFields(${allowedFieldsArray})`;
  
  for (const [fieldName, prop] of Object.entries(entityDef.properties)) {
    const isRequired = entityDef.required && entityDef.required.includes(fieldName);
    const typeVal = getTypeValidator(prop);
    
    if (isRequired) {
      validatorBody += ` &&\n             data.${fieldName} ${typeVal}`;
      if (prop.type === 'string' && prop.format !== 'date-time' && fieldName !== 'uid' && fieldName !== 'id') {
         validatorBody += ` && data.${fieldName}.size() < 100000`; // safe limit
      }
    } else {
      validatorBody += ` &&\n             (!('${fieldName}' in data) || (data.${fieldName} ${typeVal}`;
      if (prop.type === 'string' && prop.format !== 'date-time' && fieldName !== 'uid' && fieldName !== 'id') {
         validatorBody += ` && data.${fieldName}.size() < 100000`;
      }
      validatorBody += `))`;
    }
    
    if (prop.enum) {
       validatorBody += ` &&\n             (!('${fieldName}' in data) || data.${fieldName} in [${prop.enum.map(e => `'${e}'`).join(', ')}])`;
    }
  }
  
  validatorBody += `;`;
  rules += `    function isValid${entityName}(data) {\n${validatorBody}\n    }\n\n`;
}

rules += `    // ===============================================================
    // Collections
    // ===============================================================
`;

for (const [path, pathDef] of Object.entries(blueprint.firestore)) {
  const ref = pathDef.schema.$ref;
  const entityName = ref.split('/').pop();
  
  let pathStr = path;
  let isDocOwnerCheck = "isDocOwner()";
  let uidMatchCheck = "(resource == null || resource.data.uid == request.auth.uid)";

  rules += `    match ${pathStr} {
      allow get: if isOwner(request.auth.uid) || isAdmin();
      allow list: if isAuthenticated() && (isAdmin() || request.auth.uid != null);
      allow create: if isAuthenticated() && isValid${entityName}(request.resource.data) && uidUnchanged();
      allow update: if isAuthenticated() && isValid${entityName}(request.resource.data) && ${uidMatchCheck} && 
                    uidNotModified() &&
                    (!('createdAt' in request.resource.data) || !('createdAt' in resource.data) || request.resource.data.createdAt == resource.data.createdAt);
      allow delete: if (isAdmin() || ${uidMatchCheck});
    }

`;
}

rules += `    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

fs.writeFileSync('firestore.rules', rules);
