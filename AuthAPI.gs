/* ============================================================
   AuthAPI.gs — Token-Based Authentication for External API
   
   Handles login, logout, token generation, and validation.
   Tokens are stored in PropertiesService.getScriptProperties().
   ============================================================ */

var AUTH_CONFIG = {
  TOKEN_LENGTH: 64,
  TOKEN_EXPIRY_HOURS: 24,
  MAX_ACTIVE_TOKENS: 5,
  TOKEN_PREFIX: 'api_token_',
  TOKEN_USER_PREFIX: 'api_tokens_'
};

/* ---- Token Generation ---- */

function generateApiToken(email, role, name, department) {
  var _t0 = Date.now();
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < AUTH_CONFIG.TOKEN_LENGTH; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  var props = PropertiesService.getScriptProperties();
  var now = new Date().toISOString();
  var expires = new Date(Date.now() + AUTH_CONFIG.TOKEN_EXPIRY_HOURS * 3600000).toISOString();
  var tokenData = JSON.stringify({
    email: email,
    role: role || '',
    name: name || '',
    department: department || '',
    created: now,
    expires: expires
  });
  var storeKey = AUTH_CONFIG.TOKEN_PREFIX + token;
  console.log('[TOKEN-GEN] Storing token key=' + storeKey.slice(0, 20) + '... for email=' + email);
  props.setProperty(storeKey, tokenData);
  var verifyRead = props.getProperty(storeKey);
  console.log('[TOKEN-GEN] Verify read after write: ' + (verifyRead ? 'OK (length=' + verifyRead.length + ')' : 'FAILED - null!'));

  var userTokensStr = props.getProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + email);
  var userTokens = [];
  try { userTokens = userTokensStr ? JSON.parse(userTokensStr) : []; } catch(e) { userTokens = []; }
  userTokens.push({ token: token, created: now });
  if (userTokens.length > AUTH_CONFIG.MAX_ACTIVE_TOKENS) {
    var removed = userTokens.splice(0, userTokens.length - AUTH_CONFIG.MAX_ACTIVE_TOKENS);
    for (var i = 0; i < removed.length; i++) {
      props.deleteProperty(AUTH_CONFIG.TOKEN_PREFIX + removed[i].token);
    }
  }
  props.setProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + email, JSON.stringify(userTokens));

  console.log('[TOKEN-GEN] Done in ' + (Date.now() - _t0) + 'ms. Token prefix=' + token.slice(0, 8) + '...');
  return token;
}

/* ---- Token Validation ---- */

function validateApiToken(token) {
  if (!token || typeof token !== 'string') {
    console.log('[TOKEN-VALIDATE] Rejecting: token is empty or not a string (type=' + typeof token + ')');
    return null;
  }
  var props = PropertiesService.getScriptProperties();
  var storeKey = AUTH_CONFIG.TOKEN_PREFIX + token;
  console.log('[TOKEN-VALIDATE] Looking up key=' + storeKey.slice(0, 20) + '... (full length=' + storeKey.length + ', token length=' + token.length + ')');
  var tokenDataStr = props.getProperty(storeKey);
  if (!tokenDataStr) {
    console.log('[TOKEN-VALIDATE] NOT FOUND in ScriptProperties!');
    var allProps = props.getProperties();
    var tokenKeys = [];
    for (var k in allProps) {
      if (k.indexOf(AUTH_CONFIG.TOKEN_PREFIX) === 0) tokenKeys.push(k.slice(0, 25) + '...');
    }
    console.log('[TOKEN-VALIDATE] All token keys in ScriptProperties (' + tokenKeys.length + '): ' + tokenKeys.join(', '));
    return null;
  }
  try {
    var tokenData = JSON.parse(tokenDataStr);
    if (new Date(tokenData.expires) < new Date()) {
      console.log('[TOKEN-VALIDATE] Token EXPIRED (expires=' + tokenData.expires + ')');
      invalidateApiToken(token);
      return null;
    }
    console.log('[TOKEN-VALIDATE] VALID for email=' + tokenData.email + ' role=' + tokenData.role);
    return tokenData;
  } catch(e) {
    console.log('[TOKEN-VALIDATE] JSON parse error: ' + e.message);
    props.deleteProperty(storeKey);
    return null;
  }
}

/* ---- Token Invalidation ---- */

function invalidateApiToken(token) {
  if (!token) return;
  var props = PropertiesService.getScriptProperties();
  var tokenDataStr = props.getProperty(AUTH_CONFIG.TOKEN_PREFIX + token);
  if (!tokenDataStr) return;
  try {
    var tokenData = JSON.parse(tokenDataStr);
    props.deleteProperty(AUTH_CONFIG.TOKEN_PREFIX + token);
    var userTokensStr = props.getProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + tokenData.email);
    if (userTokensStr) {
      var userTokens = JSON.parse(userTokensStr);
      userTokens = userTokens.filter(function(t) { return t.token !== token; });
      if (userTokens.length > 0) {
        props.setProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + tokenData.email, JSON.stringify(userTokens));
      } else {
        props.deleteProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + tokenData.email);
      }
    }
  } catch(e) {
    props.deleteProperty(AUTH_CONFIG.TOKEN_PREFIX + token);
  }
}

function invalidateAllUserTokens(email) {
  if (!email) return;
  var props = PropertiesService.getScriptProperties();
  var userTokensStr = props.getProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + email);
  if (!userTokensStr) return;
  try {
    var userTokens = JSON.parse(userTokensStr);
    for (var i = 0; i < userTokens.length; i++) {
      props.deleteProperty(AUTH_CONFIG.TOKEN_PREFIX + userTokens[i].token);
    }
  } catch(e) {}
  props.deleteProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + email);
}

/* ---- Login ---- */

function apiLogin(email, password) {
  var _t0 = Date.now();
  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }
  console.log('[LOGIN-API] apiLogin() start: ' + email);
  var result = loginUser(email, password);
  console.log('[LOGIN-API] loginUser() returned in ' + (Date.now() - _t0) + 'ms, success=' + result.success);
  if (result.success) {
    var token = generateApiToken(
      email,
      result.user.role,
      result.user.name,
      result.user.department
    );
    result.token = token;
    result.expires = new Date(Date.now() + AUTH_CONFIG.TOKEN_EXPIRY_HOURS * 3600000).toISOString();
  }
  console.log('[LOGIN-API] apiLogin() total: ' + (Date.now() - _t0) + 'ms');
  return result;
}

/* ---- Logout ---- */

function apiLogout(token) {
  if (!token) return { success: true, message: 'Already logged out.' };
  invalidateApiToken(token);
  return { success: true, message: 'Logged out successfully' };
}
